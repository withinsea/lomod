node-lomod
==================
Loading modules from not only 'node_modules' but also 'lib' folders, which usually contains project's local modules.


Install
----------

    npm install lomod


Usage
-----------

    project/
      + common/
      |  + lib/
      |     + common-util.js
      + app/
         + lib/
         |  + app-util.js
         + submod/
         |  + lib/
         |  |  + libdir/
         |  |  |  + dir-util.js
         |  |  + sub-util.js
         |  + test.js
         + package.json


** app/submod/test.js **

```js 
var lomod = require('lomod');

// use as a replacement of original require
var fs = lomod('fs');

var sutil = lomod('sub-util');        
var dutil = lomod('libdir/dir-util');        
var autil = lomod('app-util');
var cutil = lomod('common-util');
```

** app/package.json **

```js
{
  "name": "proj-app",
  "version": "1.0.0",
  "localDependencies": [
    "../common"
  ]
}
```


Looking-up Modules
------------------
Any module identifier passed to lomod() will be tried on original require first. 

If this failed, and the module identifier does not begin with '/', '../', or './', then lomod starts at the current directory, adds **/lib**, and attempts to load the module from that location.

If it is not found there, then it moves to the parent directory, and so on, until the root of the tree is reached, or a package.json with property **localDependencies** was found (check the next chapter). 

For example, if the file at '/home/ry/projects/foo.js' called lomod('bar.js'), then lomod would look in the following locations, in this order:

    try to require('bar.js')
    /home/ry/projects/lib/bar.js
    /home/ry/lib/bar.js
    /home/lib/bar.js
    /lib/bar.js

This is almost same with the original require, just consider it as you got another group of module directories named 'lib'.


Local Dependencies
------------------
A "localDependencies" property with string array value in **package.json** stop the recusive moving to parent directory. Instead of it, lomod start looking up from each path in this array.

For example, if the file at '/home/ry/projects/foo.js' called lomod('bar.js'), and the file at '/home/ry/package.json' contains localDependencies  assigned <code>['/share', '/usr/share']</code>, then lomod would look in the following locations, in this order:

    try to require('bar.js')
    /home/ry/projects/lib/bar.js
    /home/ry/lib/bar.js    (stop moving to parent, go to localDependencies) 
    /share/lib/bar.js
    /lib/bar.js
    /usr/share/lib/bar.js
    /usr/lib/bar.js
    /lib/bar.js            (has been scaned, ignore)

Lomod ignored '/home/lib/bar.js' in this example. You can simply prevent it by append '..' to the localDependencies array.


Support Other File Formats
--------------------------
Any format supported by original require will be inherited to lomod.

    project/
      + node_modules/
      |  + res.yaml
      + lib/
      |  + lores.yaml
      + test.js

** test.js **
```js
require('require-yaml');

var res = require('res');
var lores = lomod('lores')
```

### some format modules

> <span class="icon icon-alert"></span> These modules support extra formats by adding handlers to [require.extensions](http://nodejs.org/api/all.html#all_require_extensions) which is a **deprecated** feature in node's module system. Since the module system is locked, this feature will probably never go away but may have subtle bugs. Use on your own risk.

- [better-require](https://www.npmjs.com/package/better-require) (a multiple formats bundle)
- [require-yaml](https://github.com/olalonde/require-yaml)
- [require-csv](https://github.com/olalonde/require-csv)
- [require-xml](https://github.com/olalonde/require-xml)
- [require-ini](https://github.com/olalonde/require-ini)
