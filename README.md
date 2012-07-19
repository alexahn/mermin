# mermin
    
Simple merger/minifier/compiler resource manager for cluster/express.

## Installation

```bash
$ npm install mermin
```

## Dependencies

Resmin depends on the following libraries:

- [uglify-js](https://github.com/mishoo/UglifyJS)
- [csso](https://github.com/css/csso/)
- [async](https://github.com/caolan/async/)
- [less](https://github.com/cloudhead/less.js)

## Basic usage

Mermin is simple to use.

###Example configuration:

```javascript
var merminConfig = {
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
;
```
    
Instantiate mermin, init, merge, and add the dynamic helper to connect/express.
    
    var mermin = require('mermin'),
        minify = true;
    mermin.init(merminConfig);
    mermin.merge(minify);
    app.dynamicHelpers(mermin.dynamicHelper);

The mermin variable is now accessible through your template engine of choice.

###Example when using jade/haml:

```yaml
- each url in mermin.css.project\_1
  link(rel='stylesheet', href=url)
- each url in mermin.js.project\_1
  script(src=url)
```

###Example when using ejs:

```html
<% for (url in mermin.css.project\_1) { %>
    <link rel="stylesheet" href="<%= mermin.css.project_1[url] %>">
<% } %>
<% for (url in mermin.js.project\_1) { %>
    <script src="<%= mermin.js.project_1[url] %>"></script>
<% } %>
```

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