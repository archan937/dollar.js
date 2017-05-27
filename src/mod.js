var mod, define;

mod = (function() {
  'use strict';

  var modules = {};

  return {
    define: function(name, mod) {
      modules[name] = (typeof(mod) == 'function') ? mod : function() { return mod; };
    },
    construct: function(identifier, init) {
      var
        fn = '__fn__', prop = '__prop__', body = [],
        i, mod, module;

      body.push('var IDENTIFIER = \'' + identifier + '\', ' + fn + ' = {};');
      body.push('');

      for (i = 2; i < arguments.length; i++) {
        mod = arguments[i];
        module = modules[mod];

        if (mod.match(/\./)) {
          mod = mod.replace('.', '_');
        }

        body.push('var ' + mod + ' = (' + module.toString() + '());');
        body.push('');
        body.push('for (var ' + prop + ' in ' + mod + ') { ');
        body.push('  eval(\'var \' + ' + prop + ' + \' = ' + mod + '.\' + ' + prop + ');');
        body.push('  eval(\'' + fn + '.\' + ' + prop + ' + \' = ' + mod + '.\' + ' + prop + ');');
        body.push('}');
        body.push('');
      }

      body.push(init.toString().split('\n').slice(1, -1).join('\n').replace(/(^\s*|\s*$)/, ''));

      return (new Function(body.join('\n'))());
    }
  };
}());

define = mod.construct;
