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
    'css' : {
        'project1' : [
            'test/style1.css'
        ]
    },
    'project1' : {
        'js' : [
            'test/file2.js'
        ],
        'css' : [
            'test/style2.css'
        ]
    }
};

// tested if extends works by commenting out base css type in mermin
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

mermin.init(__dirname + '/', tree);

mermin.merge(true);
