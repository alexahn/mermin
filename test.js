var mermin = require('./index'),
    csso = require('csso'),
    fs = require('fs');

// notes : extend mermin before calling init, otherwise the tree will not contain any of the extended types

// mermin can be extended to support other file types by using the extend method
// the extend method takes as arguments a string for the file extension string, and a function for the processor
// the processor function takes as arguments a string for the merged data, a string for the write_path, and a boolean for minify

/*
mermin.extend('css', function (data, write_path, minify) {
    if (minify) {
        var final_output = csso.justDoIt(data);
        fs.writeFileSync(write_path, final_output);
    }
    else {
        fs.writeFileSync(write_path, data);
    }
});
*/

// output directory for each merged group of leaves is the first item for the category is a directory, or the directory of the first item if it is a file
// in our example, it would be /test for both js and css
// if you wish, you can specify a directory as the first item to output to that directory
// the tree can be flexibly defined so that types and categories can interexchanged as attributes
// files available as resources on the internet will be skipped in the merge process, but will be accessible via the helper

var tree = 
{
    'js' : {
        'project1' : [
            '//ajax.googleapis.com/ajax/libs/jquery/1.6.2/jquery.min.js',
            'test/js1.js'
        ]
    },
    'css' : {
        'project1' : [
            'test/css1.css'
        ]
    },
    'less' : {
        'project1' : [
            'test/less1.less'
        ]
    },
    'project1' : {
        'js' : [
            'test/js2.js'
        ],
        'css' : [
            'test/css2.css'
        ],
        'less' : [
            'test/less2.less'
        ]
    }
};

// extend mermin here
var resources = new mermin({
    root : __dirname + '/',
    config : tree,
    merge : true,
    minify : false
});
//resources.merge();
//mermin.init(__dirname + '/', tree);

//mermin.merge(true);

//console.log(mermin.tree);
