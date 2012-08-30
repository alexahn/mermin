var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    parser = require('uglify-js').parser,
    uglify = require('uglify-js').uglify,
    csso = require('csso'),
    less = require('less');

// core class (for memory efficiency)
var Core = function () {
    var self = this;

    var types = {
        'js' : jsProcessor,
        'css' : cssProcessor,
        'less' : lessProcessor
    };
    var instances = [];
    
    self._register = function (instance) {
        instances.push(instance);
    };
    
    // init builds tree (the normalized config object), template, output, and adds watchers to files
    self._init = function () {
        console.log('\n init called! \n');
        var scope = this;
        scope.tree = {};
        scope.output = {};
        scope.template = {};
        var types_keys = Object.keys(types),
            depth_one_keys = Object.keys(scope.config);
        types_keys.forEach(function (type, i, arr) {
            scope.tree[type] = {};
            scope.output[type] = {};
            scope.template[type] = {};
        });
        depth_one_keys.forEach(function (depth_one, i) {
            var depth_two_keys = Object.keys(scope.config[depth_one]);
            depth_two_keys.forEach(function (depth_two, j) {
                var type = (types_keys.indexOf(depth_one) >= 0)
                        ? depth_one
                        : ((types_keys.indexOf(depth_two) >= 0) ? depth_two : null),
                    category = (types_keys.indexOf(depth_one) < 0)
                        ? depth_one
                        : ((types_keys.indexOf(depth_two) < 0) ? depth_two : null);
                // initialization for category in tree
                if (scope.tree[type] && (!scope.tree[type][category])) {
                    scope.tree[type][category] = [];
                    scope.template[type][category] = [];
                }
                scope.config[depth_one][depth_two].forEach(function (file_path, k) {
                    if (file_path.match(/^(http[s]?:\/\/|\/\/)/i)) {
                            scope.template[type][category].push(file_path);
                            scope.tree[type][category].push(file_path);
                    }
                    else {
                        try {
                            var stats = fs.statSync(path.join(scope.path, file_path));
                            if (stats.isFile()) {
                                if (scope.output[type][category]) {
                                    scope.tree[type][category].push(file_path);
                                }
                                else {
                                    if (scope.watch && scope.merge && (scope.watchlist.indexOf(file_path) < 0)) {
                                        scope.watchlist.push(file_path);
                                        fs.watch(path.join(scope.path, file_path), function (event) {
                                            if (event === 'change') {
                                                if (!scope.lock) {
                                                    scope.lock = true;
                                                    scope.q.push('_merge');
                                                    console.log('\n[mermin] ' + file_path + ' change\n');
                                                }
                                            }
                                        });
                                    }
                                    scope.template[type][category].push(path.join(path.dirname(file_path), category + '.merged.' + type));
                                    scope.output[type][category] = path.join(path.dirname(file_path), category + '.merged.' + type);
                                    scope.tree[type][category].push(file_path);
                                }
                            }
                            else if (stats.isDirectory()) {
                                if (scope.output[type][category]) {
                                    scope.tree[type][category].push(file_path);
                                }
                                else {
                                    scope.template[type][category].push(path.join(file_path, category + '.merged.' + type));
                                    scope.output[type][category] = path.join(file_path, category + '.merged.' + type);
                                }
                            }
                        } catch (err) {
                            console.log(err);
                            if (scope.template[type] && scope.template[type][category])
                                scope.template[type][category].push(file_path);
                            if (scope.tree[type] && scope.tree[type][category])
                                scope.tree[type][category].push(file_path);
                        }
                    }
                });
            });
        });
    }

    self._merge = function () {
        var scope = this;
        self._init.apply(scope, []);
        var types_keys = Object.keys(types);
        types_keys.forEach(function (type, i) {
            var category_keys = Object.keys(scope.tree[type]);
            category_keys.forEach(function (category, j) {
                var merged = '';
                scope.tree[type][category].forEach(function (file, k) {
                    if (!file.match(/^(http[s]?:\/\/|\/\/)/i)) {
                        try {
                            var file_data = fs.readFileSync(path.join(scope.path, file));
                            if (file_data) {
                                merged += '\n' + file_data;
                                console.log('[mermin] merged : ' + file);
                            }
                            else {
                                console.log('[mermin] empty file : ' + file);
                            }
                        } catch (err) {
                            console.log('[mermin] invalid path : ' + file);
                        }
                    }
                });
                types[type](merged, path.join(scope.path, scope.output[type][category]), scope.minify);
            });
        });
    };
    
    self.middleware = function (req, res, next) {
        if (typeof res.local === 'function') {
            res.local(this.name, (this.merge) ? output : tree);
        }
        else if (typeof res.locals === 'function') {
            var inject = {};
            inject[this.name] = (this.merge) ? template : tree;
            res.locals(inject);
        }
        else {
            res.locals[this.name] = (this.merge) ? template : tree;
        }
        next();
    };
    
    self.extend = function (type, processor) {
        types[type] = processor;
        for (var i = 0, l = instances.length; i < l; i += 1) {
            instances[i].init();
        }
    };

}
var mermin_core = new Core();

// mermin class
var Mermin = function (opt) {
    if (!(this instanceof arguments.callee)) {
        throw new Error("Constructor called as a function");
    }
    var self = this;
    // instance variables
    self.path = (typeof opt.path === 'string') ? opt.path : '.';
    self.config = (typeof opt.config === 'object') ? opt.config : {};
    self.minify = (typeof opt.minify === 'boolean') ? opt.minify : true;
    self.merge = (typeof opt.merge === 'boolean') ? opt.merge : true;
    self.watch = (typeof opt.watch === 'boolean') ? opt.watch : false;
    self.name = (typeof opt.name === 'string') ? opt.name : 'mermin';
    self.tree = {};
    self.output = {};
    self.template = {};
    self.watchlist = [];
    self.lock = false;
    self.q = async.queue(function (opts, callback) {
        var args = (typeof opts === 'object') ? (opts.args || []) : [],
            call = (typeof opts === 'object') ? opts.call : opts;
        if (self[call]) {
            self[call].apply(self, args);
            setTimeout(function () {
                callback();
            }, 1000);

        }
        else {
            callback();
        }
    }, 1);
    self.q.drain = function () {
        self.lock = false;
    };
    self.q.saturated = function () {
        self.lock = true;
    };
    self.init = function () {
        if (self.merge) {
            self._merge.apply(self, []);
        }
        else {
            self._init.apply(self, []);
        }
    };
    self._register(self);
    self.init();

}
Mermin.prototype = mermin_core;

// processors
function jsProcessor (data, write_path, minify) {
    if (minify) {
        var ast = parser.parse(data);
        ast = uglify.ast_mangle(ast, { except : ["$"] });
        ast = uglify.ast_squeeze(ast);
        var final_output = uglify.gen_code(ast);
        fs.writeFileSync(write_path, final_output);
    }
    else {
        fs.writeFileSync(write_path, data);
    }
    console.log('[mermin] compiled: ' + write_path);
}

function cssProcessor (data, write_path, minify) {
    if (minify) {
        var final_output = csso.justDoIt(data);
        fs.writeFileSync(write_path, final_output);
    }
    else {
        fs.writeFileSync(write_path, data);
    }
    console.log('[mermin] compiled: ' + write_path);
}

function lessProcessor (data, write_path, minify) {
    if (minify) {
        async.series([
            function (callback) {
                var less_parser = new(less.Parser);
                less_parser.parse(data, function (error, tree) {
                    if (error) return callback(error);
                    callback(null, tree.toCSS({ compress : true }));
                });
            }
        ], function (err, results) {
            if (err) return console.log(err);
            cssProcessor(results[0], write_path, minify)
        });
    }
    else {
        less.render(data, function (error, css) {
            if (!error) {
                fs.writeFileSync(write_path, css);
            }
        });
    }
    console.log('[mermin] compiled: ' + write_path);
}

// extend mermin
function extend (type, processor) {
    mermin_core.extend(type, processor);
};

module.exports = Mermin;
module.exports.extend = extend;
