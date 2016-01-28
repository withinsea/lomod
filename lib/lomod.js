delete require.cache[__filename];
__pmod = module.parent || module;

var path = require('path');
var fs = require('fs');

var Resolver = require('./resolver');

var lomod = module.exports = _in();

lomod.in = _in;

function _in(lodirs) {
  var resolver = new Resolver(__pmod, _normalize(lodirs));
  fn = function (modpath, basedir) {
    return basedir ? resolver.requireLocal(modpath, basedir) : resolver.require(modpath);
  };
  _delegate(fn, resolver);
  _delegate(fn, __pmod.require);
  return fn;
}

function _normalize(lodirs) {
  if (typeof lodirs === 'string') {
    lodirs = Array.prototype.slice.apply(arguments);
  }
  lodirs = lodirs || [ 'local_modules', 'lib' ]
  var normlodirs = [];
  for (var i=0; i<lodirs.length; i++) {
    normlodirs.push(lodirs[i].toString().trim());
  }
  return normlodirs;
}

function _delegate(target, src) {
  for (var k in src) {
    var v = src[k];
    target[k] = (typeof v === 'function') ? v.bind(src) : v
  }
  return target;
}
