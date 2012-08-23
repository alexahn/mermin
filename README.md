# mermin

Simple merger/minifier/compiler resource manager for cluster/express.

## Installation

```bash
$ npm install mermin
```

## Dependencies

Mermin depends on the following libraries:

- [async](https://github.com/caolan/async/)
- [csso](https://github.com/css/csso/)
- [less](https://github.com/cloudhead/less.js)
- [uglify-js](https://github.com/mishoo/UglifyJS)

## Types

Mermin supports three types/extensions by default: js, css, and less. Types are used as key names to build the mermin config object.

## Basic usage

Mermin is simple to use. Load mermin, extend, instantiate, and add the middleware to connect/express.

### Load
```javascript
var mermin = require('mermin');
```

### Extend
Mermin can be extended to support other file types by using the extend method. The extend method takes as arguments a string for the file extension, and a function for the processor. The input processor function takes as arguments a string for the merged data, a string for the write path, and a boolean for minify.

```javascript
mermin.extend('css', function (data, write_path, minify) {
    if (minify) {
        var final_output = csso.justDoIt(data);
        fs.writeFileSync(write_path, final_output);
    }
    else {
        fs.writeFileSync(write_path, data);
    }
});
```

### Configuration Template:

```javascript
var merminConfig = {
    'js' : {
        'project_1' : [
            '/js/project_1/file_1.js',
            ..,
            '/js/project_1/file_n.js'
        ],
        ..,
        'project_m' : [
            '/js/project_m/file_1.js',
            ..,
            '/js/project_m/file_n.js'
        ]
    },
    'css' : {
        'project_1' : [
            '/css/project_1/file_1.css',
            ..,
            '/css/project_m/file_n.css'
        ],
        ..,
        'project_m' : [
            '/css/project_m/file_1.css',
            ..,
            '/css/project_m/file_n.css'
        ]
    },   
    'project_1' : {
        'js' : [
            '/project_1/js/file_1.js',
            ..,
            '/project_1/js/file_n.js'
        ],
        'css' : [
            '/project_1/css/file_1.css',
            ..,
            '/project_1/css/file_n.css'
        ]
    },
    ..,
    'project_m' : {
        'js' : [
            '/project_m/js/file_1.js',
            ..,
            '/project_m/js/file_n.js'
        ],
        'css' : [
            '/project_m/css/file_1.css',
            ..,
            '/project_m/css/file_n.css'
        ]
    }
};
```

Categories/projects and types can be inter-exchanged when defining the config object.

### Instantiate
```javascript
var resources = new mermin({
    path_root : __dirname + '/public/',
    config : merminConfig,
    merge : true,
    minify : true,
    name : 'resources'
});
```
The name attribute specifies the name of the local variable mermin will use in the middleware; specifically, the name of the variable in the template engine.

### Middleware
```javascript
app.use(resources.middleware);
```

The 'resources' (or 'mermin' by default) variable is now accessible through your template engine of choice.

### Example when using jade/haml:

```yaml
- each url in resources.css.project_1
    link(rel='stylesheet', href=url)
- each url in resources.js.project_1
    script(src=url)
```

### Example when using ejs:

```html
<% for (url in resources.css.project_1) { %>
    <link rel="stylesheet" href="<%= resources.css.project_1[url] %>">
<% } %>
<% for (url in resources.js.project_1) { %>
    <script src="<%= resources.js.project_1[url] %>"></script>
<% } %>
```

## Extended Use Cases

### Content Grouping

It is possible to use mermin to group together static content, such as images. It would be wise, though not necessary, to define a new type associated with these contents.

```
var mermin = require('mermin');

mermin.extend('images', function (data, write_path, minify) {
    // empty function because we will not be merging
    // types will not be recognized unless we extend mermin
});

var mediaConfig = {
    'images' : {
        'headers' : [
            '/images/headers/header_1.jpg',
            ...
            '/images/headers/header_2.jpg'
        ],
        'background' : [
            '/images/background.jpg'
        ]
    }
}

var media = new mermin({
    path_root : __dirname + '/public/',
    config : mediaConfig,
    merge : false,
    minify : false,
    name : 'media'
});

app.use(media.middleware);
```

Example when using jade/haml:
```yaml
img(src=media.images.headers[0]);
img(src=media.images.background[0]);
```



## File Output
The output directory for each subgroup (of type and group/project) is the directory of the first item for each subgroup, or the first item if it is a directory. Mermin will traverse the config object synchronously via depth-first exhaustion. The format of the file names will be [project].merged.[type]. Files available as resources on the internet will be skipped in the merge process, but will be accessible via the helper.

## License

Copyright (c) 2012 Alex Ahn, https://github.com/alexahn

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.