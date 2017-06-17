mod.define('Identifier', function() {
  var
    objects = [undefined];

  Object.defineProperty(Object.prototype, '_id', {
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

  return {
    getobject: function(id) {
      if (typeof(id) == 'number') {
        return objects[id];
      }
    },
    objectid: function(object) {
      return object._id();
    }
  };
});
