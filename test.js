var mermin = require('./index'),
    csso = require('csso'),
    fs = require('fs');

var tree = 
{
    'js' : {
        'project1' : [
            'test/file1.js'
        ]
    },
    'project1' : {
        'js' : [
            'test/file2.js'
        ]
    },
    'css' : {
        'project1' : [
            'test/style1.css',
            'test/style2.css'
        ]
    }
};

/*
mermin.extend('css', function (data, write_path, minify, cb) {
    if (minify) {
        var final_output = csso.justDoIt(data);
        fs.writeFile(write_path, final_output, cb);
    }
    else {
        fs.writeFile(write_path, data, cb);
    }
});
*/
// extend seems to work

mermin(__dirname + '/', tree);

mermin.merge(true);
