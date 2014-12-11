'use strict';

var path = require('path'),
    fs = require('fs');

var lomod_dir = 'lib',
    lomod_package = 'package',
    lomod_deps = 'localDependencies',
    lomod_extnames = Object.keys(require.extensions);

var lomod = module.exports = function (modpath) {
    if (typeof modpath !== 'string' || modpath.startsWith('.') || modpath.startsWith('/')) {
        return require(modpath);
    }
    try {
        return require(modpath);
    } catch (err) {
        var mod = lomod.requireLocal(modpath);
        if (mod) {
            return mod;
        } else {
            throw err;
        }
    }
};

lomod.main = require.main;
lomod.cache = require.cache;
lomod.resolve = require.resolve.bind(require);
lomod.extensions = require.extensions;
lomod.registerExtension = require.registerExtension.bind(require);

lomod.cacheLocal = {};
lomod.cacheDeps = {};

lomod.requireLocal = function (modpath) {
    var dir = path.resolve('.'),
        ext = path.extname(modpath),
        base = path.normalize(modpath.substring(0, modpath.length - ext.length)),
        key = dir + '\n' + base + ext,
        resolved = lomod.cacheLocal[key] || lomod.resolveLocal(dir, base, (ext !== '') ? [ext] : lomod_extnames, {});
    if (resolved) {
        lomod.cacheLocal[key] = resolved;
        return require(resolved);
    }
};

lomod.resolveLocal = function (dir, base, exts, scaned_dirs) {
    if (scaned_dirs[dir] || !fs.existsSync(dir)) {
        return null;
    }
    var find = function (basepath) {
        for (var i = 0, len = exts.length; i < len; i += 1) {
            var found = path.resolve(dir, basepath + exts[i]);
            if (fs.existsSync(found)) {
                return found;
            }
        }
    };
    var modpath = find(path.join(lomod_dir, base));
    if (modpath) {
        return modpath;
    }
    var lodeps = lomod.cacheDeps[dir];
    if (!lodeps) {
        var packpath = find(lomod_package);
        lodeps = packpath && (require(packpath) || {})[lomod_deps];
    }
    if (lodeps) {
        lomod.cacheDeps[dir] = lodeps;
        for (var i = 0, len = lodeps.length; i < len; i += 1) {
            var depdir = lodeps[i].startsWith('/') ?
                path.resolve(lodeps[i]) :
                path.resolve(dir, lodeps[i]);
            modpath = lomod.resolveLocal(depdir, base, exts, scaned_dirs);
            if (modpath) {
                return modpath;
            }
        }
        return null;
    }
    var pdir = path.resolve(dir, '..');
    return (pdir && (pdir !== dir)) ? lomod.resolveLocal(pdir, base, exts, scaned_dirs) : null;
};
