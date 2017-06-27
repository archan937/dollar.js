mod.define('Identifier', function() {
  var
    objects,

  extend = function(arg) {
    Object.defineProperty(arg, '_id', {
      enumerable: false,
      value: function() {
        var id = this.__id__;
        if (id == undefined) {
          Object.defineProperty(this, '__id__', {
            enumerable: false,
            writable: false,
            value: (id = objects.length)
          });
          objects.push(this);
        }
        return id;
      }
    });
  };

  if (!window.top.__objects__) {
    Object.defineProperty(window.top, '__objects__', {
      enumerable: false,
      writable: false,
      value: [undefined]
    });
  }

  objects = window.top.__objects__;

  extend(Object.prototype);

  return {
    getobject: function(id) {
      if (typeof(id) == 'number') {
        return objects[id];
      }
    },
    objectid: function(object) {
      if (!object._id)
        extend(object);
      return object._id();
    }
  };
});
