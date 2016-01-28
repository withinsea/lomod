var path = require('path');
var fs = require('fs');

// Feature

var Resolver = module.exports = function (pmod, lodirs) {
  this.pmod = pmod || module;
  this.pdir = path.dirname(pmod.filename);
  this.lodirs = lodirs;
}

var cache = Resolver.cache = {};

Resolver.prototype.require = function (modpath) {
  modpath = modpath.trim();
  if (/^(\.|\/|\\|\w+\:)/.test(modpath)) {
    return this.pmod.require(modpath);
  }
  var resolved;
  try {
    resolved = this.pmod.require.resolve(modpath);
  } catch (err) {
    var mod = this.requireLocal(modpath);
    if (mod) {
      return mod;
    } else {
      throw err;
    }
  }
  return resolved && require(resolved);
};

Resolver.prototype.requireLocal = function (modpath, basedir) {
  var resolved = this.resolveLocal(modpath, basedir);
  return resolved && require(resolved) || null;
};

Resolver.prototype.resolveLocal = function (modpath, basedir) {
  modpath = modpath.trim();
  if (/^(\.|\/|\\|\w+\:)/.test(modpath)) {
    return this.pmod.require.resolve(modpath);
  }
  var dir = path.normalize(basedir ? path.resolve(this.pdir, basedir) : this.pdir);
  var resolved;
  for (var i=0, len = this.lodirs.length; i<len; i++) {
    var lopath = path.join(this.lodirs[i], modpath);
    var key = dir + '\n' + lopath
    resolved = cache[key];
    if (!resolved) {
      resolved = cache[key] = _resolveLocal(dir, lopath, Object.keys(require.extensions), {});
    }
    if (resolved) {
      break;
    }
  }
  if (!resolved) {
    throw new Error("Cannot find local module '" + modpath + "'");
  }
  return resolved;
};

function _resolveLocal(dir, lopath, extnames, scaned) {
  dir = path.normalize(dir);
  if (scaned[dir] || !fs.existsSync(dir)) {
    return null;
  }
  scaned[dir] = true;
  var resolved = _resolveFile(dir, lopath, [''])
    || _resolveFile(dir, lopath, extnames)
    || _resolveFile(dir, lopath, [''], true);
  if (resolved) {
    return resolved;
  }
  var lodeps;
  try {
    lodeps = require(path.resolve(dir, 'package'))['localDependencies'];
    if (typeof lodeps === 'string') {
      lodeps = [lodeps];
    }
  } catch (err) {}
  if (lodeps) {
    for (var i = 0, len = lodeps.length; i < len; i += 1) {
      var depdir = /^(\/|\\|\w+\:)/.test(lodeps[i]) ? lodeps[i] : path.resolve(dir, lodeps[i]);
      resolved = _resolveLocal(depdir, lopath, extnames, scaned);
      if (resolved) {
        return resolved;
      }
    }
    return null;
  }
  var pdir = path.resolve(dir, '..');
  return (pdir && (pdir !== dir)) ? _resolveLocal(pdir, lopath, extnames, scaned) : null;
}

function _resolveFile(dir, lopath, extnames, is_dir) {
  for (var i = 0, len = extnames.length; i < len; i += 1) {
    var found = path.resolve(dir, lopath + extnames[i]);
    if (fs.existsSync(found) && fs.statSync(found)[is_dir ? 'isDirectory' : 'isFile']()) {
      return found;
    }
  }
}
