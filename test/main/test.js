assert = require('assert');
path = require('path')

lomod = require('../../lib/lomod.js');
lomod_lib = lomod.in('lib');
lomod_empty = lomod.in('');

assert.equal('mod in local_modules', lomod('mod'));
assert.equal('mod in dep', lomod('mod-in-dep'));
assert.equal('mod in dep', lomod('mod', '../dep/'));
assert.equal('mod in dep', lomod('mod', path.resolve(__dirname, '../dep/')));
assert.equal('mod in lib', lomod_lib('mod'));
assert.equal('mod in local_modules', lomod_empty('local_modules/mod'));
assert.equal('mod in local_modules', lomod('../local_modules/mod'));
assert.equal('mod in local_modules', lomod(path.resolve(__dirname, '../local_modules/mod')));
assert.equal('mod in local_modules', lomod(path.resolve(__dirname, '../local_modules/mod')));
assert.throws(function () { lomod('mood'); });
