mod.define('Identifier', function() {
  var
    objects = [undefined],

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

  extend(Object.prototype);

  return {
    getobject: function(id) {
      if (typeof(id) == 'number') {
        return objects[id];
      }
    },
    setobject: function(object) {
      objects[object._id()] = object;
      return object;
    },
    objectid: function(object) {
      if (!object._id)
        extend(object);
      return object._id();
    }
  };
});
