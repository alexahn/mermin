var fs = require('fs'),
    async = require('async'),
    path = require('path'),
    parser = require('uglify-js').parser,
    uglify = require('uglify-js').uglify,
    csso = require('csso'),
    less = require('less');
    

// taking out less processor for now, test results are very unstable

// instantiate global variables for this module
// namely, default file types (js, css, less)
var mermin = {

    types : {
        'js' : jsProcessor,
        'css' : cssProcessor
        //'less' : lessProcessor
    },

    tree : {
    },

    q : async.queue(function (task, callback) {
        var args = [];
        // convert task.args into an array, and then push a callback function onto it
        async.forEach(Object.keys(task.args), function (index, cb) {
            args[index] = task.args[index];
            cb();
        }, function (err) {
            args.push(function (err) {
                callback();
            });
            console.log(mermin.tree);
            mermin[task.name].apply(mermin, args);
        });
    }, 1),
    
    // init mermin (create base tree based on types)
        /*
        source of the form:
        {
            'js' : {
                'project_1' : [
                    'filepath_1_1.js',
                    ..,
                    'filepath_1_n.js'
                ],
                ..,
                'project_m' : [
                    'filepath_m_1.js',
                    ..,
                    'filepath_m_n.js'
                ]
            }
        }
        */
        // vertical or horizontal and mixed are acceptable
    init : function (basepath, source, callback) {
        var self = this;
        async.forEach(Object.keys(self.types), function (type, cb_type) {
            mermin.tree[type] = {};
            cb_type();
        }, function (err_type) {
            async.forEachSeries(Object.keys(source), function (level_one, cb_one) {
                async.forEachSeries(Object.keys(source[level_one]), function (level_two, cb_two) {
                    // need to find out which key is a type and which is a category
                    var type = (Object.keys(self.types).indexOf(level_one) >= 0) 
                            ? level_one 
                            : ((Object.keys(self.types).indexOf(level_two) >= 0) ? level_two : null),
                        category = (Object.keys(self.types).indexOf(level_one) < 0) 
                            ? level_one 
                            : ((Object.keys(self.types).indexOf(level_two) < 0) ? level_two : null);
                    if (type && category && !(type === category)) {
                        console.log(self.tree);
                        if (!self.tree[type][category]) {
                            self.tree[type][category] = {
                                paths : []
                            };
                        }
                        async.forEachSeries(source[level_one][level_two], function (source_file, cb_file) {
                            if (!self.tree[type][category].output) {
                                var source_path = source_file.split('/');
                                source_path.pop();
                                source_path.push(category + '.merged.' + type);
                                self.tree[type][category].output = basepath + source_path.join('/');
                            }
                            fs.exists(basepath + source_file, function (exists) {
                                if (exists) {
                                    self.tree[type][category].paths.push(basepath + source_file);
                                }
                                cb_file();
                            });
                        }, function (err_file) {
                            cb_two(err_file)
                        });
                    }
                }, function (err_two) {
                    cb_one(err_two);
                });
            }, callback);
        });
    },
    
    // merge tree
    merge : function (minify, callback) {
        var self = this;
        async.forEach(Object.keys(self.tree), function (type, cb_type) {
            async.forEach(Object.keys(self.tree[type]), function (category, cb_category) {
                var merged_file = '';
                async.forEach(self.tree[type][category].paths, function (tree_file, cb_file) {
                    //console.log(tree_file);
                    fs.readFile(tree_file, 'ascii', function (err, data) {
                        //console.log(err);
                        merged_file = merged_file + '\n' + data;
                        cb_file();
                    });
                }, function (err_file) {
                    // do something with merged_file;
                    console.log(merged_file);
                    self.types[type](merged_file, self.tree[type][category].output, minify, function (err) {
                        cb_category(err_file);
                    });
                });
            }, function (err_category) {
                cb_type(err_category);
            });
        }, callback);
    },

    // extend mermin
    extend : function (type, processor, callback) {
        mermin.types[type] = processor;
        callback(null);
    }

}

function jsProcessor (data, write_path, minify, cb) {
    if (minify) {
        var ast = parser.parse(data);
        ast = uglify.ast_mangle(ast, { except : ["$"] });
        ast = uglify.ast_squeeze(ast);
        var final_output = uglify.gen_code(ast);
        fs.writeFile(write_path, final_output, cb);
    }
    else {
        fs.writeFile(write_path, data, cb);
    }
}


function cssProcessor (data, write_path, minify, cb) {
    if (minify) {
        var final_output = csso.justDoIt(data);
        fs.writeFile(write_path, final_output, cb);
    }
    else {
        fs.writeFile(write_path, data, cb);
    }
}

// take out less type for now, test results are unstable
/*
function lessProcessor (data, write_path, minify, cb) {
    if (minify) {
        less.render(data, function (error, css) {
            console.log(error);
            console.log(css);
            if (!error) {
                cssProcessor(css, write_path, minify, cb);
            }
        });
    }
    else {
        less.render(data, function (error, css) {
            if (!error) {
                fs.writeFile(write_path, css, cb);
            }
        });
    }
}
*/

module.exports = function (basepath, source) {
    mermin.q.push({ name : 'init', args : arguments });
};

module.exports.merge = function (minify) {
    mermin.q.push({ name : 'merge', args : arguments });
};

module.exports.extend = function (type, processor) {
    mermin.q.push({ name : 'extend', args : arguments });
};

module.exports.dynamicHelper = {
    mermin : function (req, res) {
        return mermin.tree;
    }
}
