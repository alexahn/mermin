var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    parser = require('uglify-js').parser,
    uglify = require('uglify-js').uglify,
    csso = require('csso'),
    less = require('less');

// instantiate context for this module
var mermin = {

    types : {
        'js' : jsProcessor,
        'css' : cssProcessor,
        'less' : lessProcessor
    },

    tree : {
    },
    
    output : {
    },

    basepath : '',

    // init mermin to create tree
    init : function (basepath, source) {
        var self = this;
        self.basepath = basepath;
        for (var index = 0, type_arr = Object.keys(self.types), type_length = type_arr.length; index < type_length; index += 1) {
            self.tree[type_arr[index]] = {};
            self.output[type_arr[index]] = {};
        }
        for (var depth_one_index = 0,
        depth_one_keys = Object.keys(source),
        depth_one_length = depth_one_keys.length; depth_one_index < depth_one_length; depth_one_index += 1) {
            var depth_one = depth_one_keys[depth_one_index];
            for (var depth_two_index = 0,
            depth_two_keys = Object.keys(source[depth_one]),
            depth_two_length = depth_two_keys.length; depth_two_index < depth_two_length; depth_two_index += 1) {
                var depth_two = depth_two_keys[depth_two_index],
                    types_arr = Object.keys(self.types),
                    type = (types_arr.indexOf(depth_one) >= 0)
                        ? depth_one
                        : ((types_arr.indexOf(depth_two) >= 0) ? depth_two : null),
                    category = (types_arr.indexOf(depth_one) < 0)
                        ? depth_one
                        : ((types_arr.indexOf(depth_two) < 0) ? depth_two : null);
                // initialization for category in tree
                if (self.tree[type] && (!self.tree[type][category])) {
                    self.tree[type][category] = [];
                }
                for (var file_index = 0,
                file_array = source[depth_one][depth_two],
                file_length = file_array.length; file_index < file_length; file_index += 1) {
                    var file_path = file_array[file_index];
                    // initialize output path for first occurence of category for each type
                    if (!self.output[type][category] && !file_path.match(/^(http[s]?:\/\/|\/\/)/i)) {
                        var stats = fs.statSync(path.join(basepath, file_path));
                        if (stats.isFile()) {
                            self.output[type][category] = '/' + path.join(path.dirname(file_path), category + '.merged.' + type);
                            self.tree[type][category].splice(0, 0, path.join(basepath, file_path));
                        }
                        else if (stats.isDirectory()) {
                            self.output[type][category] = '/' + path.join(file_path, category + '.merged.' + type);
                        }
                    }
                    else {
                        // check file path to see if it is an URI
                        if (file_path.match(/^(http[s]?:\/\/|\/\/)/i)) {
                            self.tree[type][category].push(file_path);
                        }
                        else {
                            self.tree[type][category].splice(0, 0, path.join(basepath, file_path));
                        }
                    }
                }
            }
        }
    },
    
    // merge tree
    merge : function (minify) {
        var self = this;
        for (var type_index = 0,
        type_arr = Object.keys(self.tree),
        type_length = type_arr.length; type_index < type_length; type_index += 1) {
            var type = type_arr[type_index];
            for (var category_index = 0,
            category_arr = Object.keys(self.tree[type]),
            category_length = category_arr.length; category_index < category_length; category_index += 1) {
                var category = category_arr[category_index],
                    merged = '';
                // iterate backwards because we will be using splice
                for (var file_arr = self.tree[type][category],
                file_index = (file_arr.length - 1); file_index >= 0; file_index -= 1) {
                    var file_path = file_arr[file_index];
                    if (file_path.match(/^(http[s]?:\/\/|\/\/)/i)) {
                        // logic for URIs
                    }
                    else {
                        var file_data = fs.readFileSync(file_path);
                        if (file_data) {
                            merged += '\n' + file_data;
                            console.log('merged :' + file_path);
                        }
                        else {
                            console.log('invalid path: ' + file_path);
                            // logic for files that could not be found or are empty
                        }
                        self.tree[type][category].splice(file_index, 1);
                    }
                }
                self.tree[type][category].push(self.output[type][category]);
                self.types[type](merged, path.join(self.basepath, self.output[type][category]), minify);
            }
        }
    },

    // extend mermin
    extend : function (type, processor) {
        mermin.types[type] = processor;
    },

    dynamicHelper : {
        mermin : function (req, res) {
            return mermin.tree;
        }
    },

    middleware : function (req, res, next) {
        res.locals({ mermin : mermin.tree });
        next();
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
    console.log('compiled: ' + write_path);
}

function cssProcessor (data, write_path, minify) {
    if (minify) {
        var final_output = csso.justDoIt(data);
        fs.writeFileSync(write_path, final_output);
    }
    else {
        fs.writeFileSync(write_path, data);
    }
    console.log('compiled: ' + write_path);
}

function lessProcessor (data, write_path, minify) {
    if (minify) {
        async.series([
            function (callback) {
                var less_parser = new(less.Parser);
                less_parser.parse(data, function (error, tree) {
                    if (error) {
                        console.log(error);
                    }
                    else {
                        cssProcessor(tree.toCSS({ compress : true }), write_path, minify);
                        //fs.writeFileSync(write_path, tree.toCSS({ compress: true }));
                    }
                    callback(null, null);
                });
            }
        ]);
    }
    else {
        less.render(data, function (error, css) {
            if (!error) {
                fs.writeFileSync(write_path, css);
            }
        });
    }
    console.log('compiled: ' + write_path);
}

module.exports = mermin;
