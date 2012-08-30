var mermin = require('../index'),
    csso = require('csso'),
    fs = require('fs');

// output directory for each merged group of leaves is the first item for the category is a directory, or the directory of the first item if it is a file
// in our example, it would be /public for both js and css
// if you wish, you can specify a directory as the first item to output to that directory
// the tree can be flexibly defined so that types and categories can interexchanged as attributes
// files available as resources on the internet will be skipped in the merge process, but will be accessible via the helper
    
// mermin can be extended to support other file types by using the extend method
// extend mermin before you create any instance variables for efficiency
// the extend method takes as arguments a string for the file extension string, and a function for the processor
// the processor function takes as arguments a string for the merged data, a string for the write_path, and a boolean for minify

mermin.extend('images', function (data, write_path, minify) {
    // empty function because we will not be merging
    // types will not be recognized unless we extend mermin
});

var mediaConfig = {
    'images' : {
        'octocat' : [
            'public/octocat.png'
        ]
    }
};
    
var media = new mermin({
    config : mediaConfig,
    path_root : __dirname,
    merge : false,
    minify : false,
    name : 'media'
});
//console.log(media);

var resourcesConfig = 
{
    'js' : {
        'project1' : [
            '//ajax.googleapis.com/ajax/libs/jquery/1.6.2/jquery.min.js',
            'public/js1.js'
        ]
    },
    'css' : {
        'project1' : [
            'public/css1.css'
        ]
    },
    'less' : {
        'project1' : [
            'public/less1.less'
        ]
    },
    'project1' : {
        'js' : [
            'public/js2.js'
        ],
        'css' : [
            'public/css2.css'
        ],
        'less' : [
            'public/less2.less'
        ]
    }
};

var resources = new mermin({
    path : __dirname,
    config : resourcesConfig,
    merge : true,
    minify : true,
    watch : true
});
//console.log(resources);

//media.middleware();
//resources.middleware();

// change js, css, or less files in public folder to see if it rebuilds merged files

