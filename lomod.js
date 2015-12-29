var path = require('path');
var fs = require('fs');

// Util

var __callerdir = _callerdir();

function _callerdir() {
  var stack;
  var origPst = Error.prepareStackTrace;
  try {
    Error.prepareStackTrace = function (err, stack) { return stack; };
    stack = new Error().stack;
  } finally {
    Error.prepareStackTrace = origPst;
  }
  while (stack && stack.length && (stack[0].getFileName() === __filename)) {
    stack.shift();
  }
  return stack && stack.length && path.dirname(stack[0].getFileName()) || __dirname;
}

function _delegate(target, src) {
  for (var k in src) {
    var v = src[k];
    target[k] = (typeof v === 'function') ? v.bind(src) : v
  }
  return target;
}

// Feature

var Lomod = function (lodirs) {
  this.lodirs = lodirs;
  this.cacheLocal = {};
};

Lomod.prototype.require = function (modpath) {
  modpath = _normalize(modpath);
  if (/^(\/|\\|\w+\:)/.test(modpath)) {
    return require(modpath);
  }
  var abspath;
  try {
    abspath = require.resolve(modpath);
  } catch (err) {
    var mod = this.requireLocal(modpath);
    if (mod) {
      return mod;
    } else {
      throw err;
    }
  }
  return abspath && require(abspath);
};

Lomod.prototype.requireLocal = function (modpath) {
  var resolved = this.resolveLocal(modpath);
  return resolved && require(resolved) || null;
};

Lomod.prototype.resolveLocal = function (modpath) {
  modpath = _normalize(modpath);
  if (/^(\/|\\|\w+\:)/.test(modpath)) {
    return require.resolve(modpath);
  }
  var key = __callerdir + '\n' + modpath;
  var resolved = this.cacheLocal[key];
  if (!resolved) {
    for (var i=0, len = this.lodirs.length; i<len; i++) {
      resolved = _resolveLocal(__callerdir, path.join(this.lodirs[i], modpath), Object.keys(require.extensions), {});
      if (resolved) {
        this.cacheLocal[key] = resolved;
        break;
      }
    }
  }
  if (!resolved) {
    throw new Error("Cannot find local module '" + modpath + "'");
  }
  return resolved;
};

function _normalize(modpath) {
  if (typeof modpath !== 'string') {
    require(modpath);
  }
  modpath = path.normalize(modpath);
  if (/^\./.test(modpath)) {
    modpath = path.resolve(__callerdir, modpath);
  }
  return modpath;
}

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

// Export

var lomod = module.exports = _get();
lomod.in = _get;

var _getCache;
function _get(lodirs) {
  if (typeof lodirs === 'string') {
    lodirs = Array.prototype.slice.apply(arguments);
  }
  lodirs = lodirs || [ 'local_modules', 'lib' ]
  var normlodirs = [];
  for (var i=0; i<lodirs.length; i++) {
    normlodirs.push(lodirs[i].toString().trim());
  }
  _getCache = _getCache || {};
  var key = normlodirs.join('|');
  var fn = _getCache[key];
  if (!fn) {
    var obj = new Lomod(normlodirs);
    fn = _getCache[key] = function () {
      return obj.require.apply(obj, arguments);
    };
    _delegate(fn, obj);
    _delegate(fn, require);
  }
  return fn;
}
