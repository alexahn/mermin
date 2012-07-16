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

    basepath : '',

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
        self.basepath = basepath;
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
                    if (!self.tree[type][category].output && !file_path.match(/^(http[s]?:\/\/|\/\/)/i)) {
                        /*
                        var path_arr = file_path.split('/');
                        path_arr.pop();
                        path_arr.push(category + '.merged.' + type);
                        self.tree[type][category].output = path.join(basepath, path_arr.join('/'));
                        */
                        var stats = fs.statSync(path.join(basepath, file_path));
                        if (stats.isFile()) {
                            self.tree[type][category].output = '/' + path.join(path.dirname(file_path), category + '.merged.' + type);
                            self.tree[type][category].paths.splice(0, 0, path.join(basepath, file_path));
                        }
                        else if (stats.isDirectory()) {
                            self.tree[type][category].output = '/' + path.join(file_path, category + '.merged.' + type);
                        }
                    }
                    else {
                        if (file_path.match(/^(http[s]?:\/\/|\/\/)/i)) {
                            self.tree[type][category].paths.push(file_path);
                        }
                        else {
                            self.tree[type][category].paths.splice(0, 0, path.join(basepath, file_path));
                        }
                    /*
                    if (fs.existsSync(basepath + file_path)) {
                        self.tree[type][category].paths.push(path.join(basepath, file_path));
                    }
                    */
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
                for (var file_arr = self.tree[type][category].paths,
                file_index = (file_arr.length - 1); file_index >= 0; file_index -= 1) {
                    var file_path = file_arr[file_index];
                    if (file_path.match(/^(http[s]?:\/\/|\/\/)/i)) {

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
                        self.tree[type][category].paths.splice(file_index, 1);
                    }
                }
                self.tree[type][category].paths.push(self.tree[type][category].output);
                self.types[type](merged, path.join(self.basepath, self.tree[type][category].output), minify);
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
    console.log('compiled: ' + write_path);
}

module.exports = mermin;
