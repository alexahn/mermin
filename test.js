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
        fs.writeFile(write_path, final_output, cb);
    }
    else {
        fs.writeFile(write_path, data, cb);
    }
});
*/

// output directory for each merged group of leaves is the directory of the first item for the category of each type
// in our example, it would be /test for both js and css
// if you wish, you can specify a file that doesn't exist in the desired directory to output to that directory
// the tree can be flexibly defined so that types and categories can interexchanged as attributes

var tree = 
{
    'js' : {
        'project1' : [
            'test/file1.js'
        ]
    },
    'css' : {
        'project1' : [
            'test/style1.css'
        ]
    },
    /*
    'less' : {
        'project1' : [
            'test/style1.less'
        ]
    },
    */
    'project1' : {
        'js' : [
            'test/file2.js'
        ],
        'css' : [
            'test/style2.css'
        ]
        /*,
        'less' : [
            'test/style2.less'
        ]
        */
    }
};

mermin.init(__dirname + '/', tree);

mermin.merge(true);
