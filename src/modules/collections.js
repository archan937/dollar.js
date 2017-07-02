mod.define('Collections', function() {
  return {
    extend: function(target, object) {
      for (var prop in object) {
        target[prop] = object[prop];
      }
      return target;
    },

    keys: function(object) {
      var keys = [], prop;
      for (prop in object) {
        if (object.hasOwnProperty(prop)) {
          keys.push(prop);
        }
      }
      return keys;
    },

    indexOf: function(val, array) {
      for (var i = 0; i < array.length; i += 1) {
        if (val === array[i]) {
          return i;
        }
      }
      return -1;
    },

    each: function(enumerable, f) {
      if (isArray(enumerable)) {
        for (var i = 0; i < enumerable.length; i += 1) {
          f(enumerable[i], i, i == enumerable.length - 1);
        }
      } else {
        each(keys(enumerable), function(key, i, last) {
          f(enumerable[key], key, last);
        });
      }
    },

    collect: function(enumerable, f) {
      var result = [];
      each(enumerable, function() {
        result.push(f.apply(this, arguments));
      });
      return result;
    },

    select: function(enumerable, f) {
      var selected = [];
      each(enumerable, function() {
        if (f.apply(this, arguments)) {
          selected.push(el);
        }
      })
      return selected;
    },

    sample: function(array) {
      return array[Math.floor(Math.random() * array.length)];
    }
  };
});
