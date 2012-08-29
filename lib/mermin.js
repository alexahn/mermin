var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    parser = require('uglify-js').parser,
    uglify = require('uglify-js').uglify,
    csso = require('csso'),
    less = require('less');

// class variables
var types = {
    'js' : jsProcessor,
    'css' : cssProcessor,
    'less' : lessProcessor
};
// instantiate context for this module
var mermin = function (opt) {
    if (!(this instanceof arguments.callee)) {
        throw new Error("Constructor called as a function");
    }
    var self = this;
    // opt variables
    self.path = (typeof opt.path === 'string') ? opt.path : '.';
    self.config = opt.config || {};
    self.minify = (typeof opt.minify === 'boolean') ? opt.minify : true;
    self.merge = (typeof opt.merge === 'boolean') ? opt.merge : true;
    self.watch = (typeof opt.watch === 'boolean') ? opt.watch : false;
    self.name = (typeof opt.name === 'string') ? opt.name : 'mermin';
    // mermin instance variables
    var tree = {
        },
        output = {
        },
        template = {
        },
        q = async.queue(function (opts, callback) {
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
        }, 1),
        watchlist = [],
        lock = false;
    q.drain = function () {
        lock = false;
    };
    q.saturated = function () {
        lock = true;
    };
   
    // init builds inner tree, which is the normalized config object
    self._init = function () {
        tree = {};
        output = {};
        template = {};
        var types_keys = Object.keys(types),
            depth_one_keys = Object.keys(self.config);
        types_keys.forEach(function (type, i, arr) {
            tree[type] = {};
            output[type] = {};
            template[type] = {};
        });
        depth_one_keys.forEach(function (depth_one, i) {
            var depth_two_keys = Object.keys(self.config[depth_one]);
            depth_two_keys.forEach(function (depth_two, j) {
                var type = (types_keys.indexOf(depth_one) >= 0)
                        ? depth_one
                        : ((types_keys.indexOf(depth_two) >= 0) ? depth_two : null),
                    category = (types_keys.indexOf(depth_one) < 0)
                        ? depth_one
                        : ((types_keys.indexOf(depth_two) < 0) ? depth_two : null);
                // initialization for category in tree
                if (tree[type] && (!tree[type][category])) {
                    tree[type][category] = [];
                    template[type][category] = [];
                }
                self.config[depth_one][depth_two].forEach(function (file_path, k) {
                    if (file_path.match(/^(http[s]?:\/\/|\/\/)/i)) {
                            template[type][category].push(file_path);
                            tree[type][category].push(file_path);
                    }
                    else {
                        try {
                            var stats = fs.statSync(path.join(self.path, file_path));
                            if (stats.isFile()) {
                                if (output[type][category]) {
                                    tree[type][category].push(file_path);
                                }
                                else {
                                    if (self.watch && self.merge && (watchlist.indexOf(file_path) < 0)) {
                                        watchlist.push(file_path);
                                        fs.watch(path.join(self.path, file_path), function (event) {
                                            if (event === 'change') {
                                                if (!lock) {
                                                    lock = true;
                                                    q.push('_merge');
                                                    console.log('\n[mermin] ' + file_path + ' change\n');
                                                }
                                            }
                                        });
                                    }
                                    template[type][category].push(path.join(path.dirname(file_path), category + '.merged.' + type));
                                    output[type][category] = path.join(path.dirname(file_path), category + '.merged.' + type);
                                    tree[type][category].push(file_path);
                                }
                            }
                            else if (stats.isDirectory()) {
                                if (output[type][category]) {
                                    tree[type][category].push(file_path);
                                }
                                else {
                                    template[type][category].push(path.join(file_path, category + '.merged.' + type));
                                    output[type][category] = path.join(file_path, category + '.merged.' + type);
                                }
                            }
                        } catch (err) {
                            console.log(err);
                            template[type][category].push(file_path);
                            tree[type][category].push(file_path);
                        }
                    }
                });
            });
        });
    }

    self._merge = function () {
        self._init();
        var types_keys = Object.keys(types);
        types_keys.forEach(function (type, i) {
            var category_keys = Object.keys(tree[type]);
            category_keys.forEach(function (category, j) {
                var merged = '';
                tree[type][category].forEach(function (file, k) {
                    if (!file.match(/^(http[s]?:\/\/|\/\/)/i)) {
                        try {
                            var file_data = fs.readFileSync(path.join(self.path, file));
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
                types[type](merged, path.join(self.path, output[type][category]), self.minify);
            });
        });
    };

    self.middleware = function (req, res, next) {
        if (typeof res.local === 'function') {
            res.local(self.name, (self.merge) ? output : tree);
        }
        else if (typeof res.locals === 'function') {
            var inject = {};
            inject[self.name] = (self.merge) ? template : tree;
            res.locals(inject);
        }
        else {
            res.locals[self.name] = (self.merge) ? template : tree;
        }
        next();
    };
    
    // initialize instance
    if (self.merge) {
        self._merge();
    }
    else {
        self._init();
    }

}

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
    types[type] = processor;
};

module.exports = mermin;
module.exports.extend = extend;
