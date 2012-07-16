var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    parser = require('uglify-js').parser,
    uglify = require('uglify-js').uglify,
    csso = require('csso'),
    less = require('less');

// todo : add watchers to all files in tree so that on change, remerge/reminify

// instantiate context for this module
var mermin = {

    types : {
        'js' : jsProcessor,
        'css' : cssProcessor,
        'less' : lessProcessor
    },

    tree : {
    },

    // init mermin to create tree
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
            },
            'project_1' : {
                'js' : [
                    'filepath_1_1.js',
                    ..,
                    'filepath_1_n.js'
                ]
            },
            ..,
            'project_m' : {
                'js' : [
                    'filepath_m_1.js',
                    ..,
                    'filepath_m_n.js'
                ]
            }
        }
        */
    init : function (basepath, source) {
        var self = this;
        for (var index = 0, type_arr = Object.keys(self.types), type_length = type_arr.length; index < type_length; index += 1) {
            mermin.tree[type_arr[index]] = {};
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
                    self.tree[type][category] = {
                        paths : []
                    }
                }
                for (var file_index = 0,
                file_array = source[depth_one][depth_two],
                file_length = file_array.length; file_index < file_length; file_index += 1) {
                    var file_path = file_array[file_index];
                    // initialize output path for first occurence of category for each type
                    if (!self.tree[type][category].output) {
                        var path_arr = file_path.split('/');
                        path_arr.pop();
                        path_arr.push(category + '.merged.' + type);
                        self.tree[type][category].output = path.join(basepath, path_arr.join('/'));
                    }
                    /*
                    if (fs.existsSync(basepath + file_path)) {
                        self.tree[type][category].paths.push(path.join(basepath, file_path));
                    }
                    */
                    self.tree[type][category].paths.push(path.join(basepath, file_path));
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
                for (var file_index = 0,
                file_arr = self.tree[type][category].paths,
                file_length = file_arr.length; file_index < file_length; file_index += 1) {
                    var file_path = file_arr[file_index],
                        file_data = fs.readFileSync(file_path);
                    if (file_data) {
                        merged += '\n' + file_data;
                    }
                    else {
                        
                    }
                }
                self.types[type](merged, self.tree[type][category].output, minify);
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
}

function cssProcessor (data, write_path, minify) {
    if (minify) {
        var final_output = csso.justDoIt(data);
        fs.writeFileSync(write_path, final_output);
    }
    else {
        fs.writeFileSync(write_path, data);
    }
}

function lessProcessor (data, write_path, minify) {
    if (minify) {
        async.series([
            function (callback) {
                less.render(data, function (error, css) {
                    if (error) {
                        console.log(error);
                    }
                    else {
                        cssProcessor(css, write_path, minify);
                        callback(null, null);
                    }
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
}

module.exports = mermin;
