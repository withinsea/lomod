'use strict';

var path = require('path'),
    fs = require('fs'),
    caller_dir = function () {
        var origPst = Error.prepareStackTrace;
        try {
            Error.prepareStackTrace = function (err, stack) {
                return stack;
            };
            var stack = new Error().stack;
            Error.prepareStackTrace = origPst;
            while (stack.length && (stack[0].getFileName() === __filename)) {
                stack.shift();
            }
            return stack.length ? path.dirname(stack[0].getFileName()) : __dirname;
        } catch (err) {} finally {
            Error.prepareStackTrace = origPst;
        }
        return __dirname;
    };


var lomod = module.exports = function (modpath) {
    if (typeof modpath !== 'string' || modpath.startsWith('.') || modpath.startsWith('/')) {
        return require(modpath);
    }
    var abspath;
    try {
        abspath = require.resolve(modpath);
    } catch (err) {
        var mod = lomod.requireLocal(modpath);
        if (mod) {
            return mod;
        } else {
            throw err;
        }
    }
    return abspath && require(abspath);
};

lomod.main = require.main;
lomod.cache = require.cache;
lomod.resolve = require.resolve.bind(require);
lomod.extensions = require.extensions;
lomod.registerExtension = require.registerExtension.bind(require);

lomod.cacheLocal = {};
lomod.cacheDeps = {};

lomod.requireLocal = function (modpath) {
    modpath = path.normalize(modpath);
    var dir = caller_dir(),
        key = dir + '\n' + modpath,
        resolved = lomod.cacheLocal[key] || lomod.resolveLocal(dir, modpath, {});
    if (resolved) {
        lomod.cacheLocal[key] = resolved;
        return require(resolved);
    }
    return null;
};

var _opts = {
    lib: 'lib',
    pack: 'package.json',
    lodeps: 'localDependencies',
    extnames: Object.keys(require.extensions)
};

lomod.resolveLocal = function (dir, modpath) {
    return _resolveLocal(dir, modpath, {}, _opts);
};

function _resolveLocal(dir, modpath, scaned_dirs, opts) {
    if (!dir || !modpath || scaned_dirs[dir] || !fs.existsSync(dir)) {
        return null;
    }
    scaned_dirs[dir] = true;
    var find = function (basepath, extnames, is_dir) {
        for (var i = 0, len = extnames.length; i < len; i += 1) {
            var found = path.resolve(dir, basepath + extnames[i]);
            if (fs.existsSync(found) && fs.statSync(found)[is_dir ? 'isDirectory' : 'isFile']()) {
                return found;
            }
        }
    };
    var basepath = path.join(opts.lib, modpath),
        resolved = find(basepath, [''], false) || find(basepath, opts.extnames, false) || find(basepath, [''], true);
    if (resolved) {
        return resolved;
    }
    var lodeps = lomod.cacheDeps[dir];
    if (!lodeps) {
        var pack = path.resolve(dir, opts.pack);
        lodeps = fs.existsSync(pack) && (require(pack) || {})[opts.lodeps];
    }
    if (lodeps) {
        lomod.cacheDeps[dir] = lodeps;
        for (var i = 0, len = lodeps.length; i < len; i += 1) {
            var depdir = lodeps[i].startsWith('/') ?
                path.resolve(lodeps[i]) :
                path.resolve(dir, lodeps[i]);
            resolved = lomod.resolveLocal(depdir, modpath, scaned_dirs);
            if (resolved) {
                return resolved;
            }
        }
        return null;
    }
    var pdir = path.resolve(dir, '..');
    return (pdir && (pdir !== dir)) ? lomod.resolveLocal(pdir, modpath, scaned_dirs) : null;
};