mod.define('Render', function() {
  var
    nodes = {},
    objects = {},

  scanPaths = function(el) {
    var
      paths = [],
      walker = document.createTreeWalker(
        el,
        NodeFilter.SHOW_ALL, {
          acceptNode: function(node) {
            if (!node.hasAttribute || !node.hasAttribute('data-in')) {
              return NodeFilter.FILTER_ACCEPT;
            }
          }
        },
        false
      ),
      node;

    while (node = walker.nextNode()) {
      if ((node.nodeType == Node.TEXT_NODE) && /\{\{.*?\}\}/.test(node.nodeValue)) {
        paths.push(node);
      }
    }

    return paths;
  },

  scanCollections = function(el) {
    var
      collections = [],
      walker = document.createTreeWalker(
        el,
        NodeFilter.SHOW_ALL, {
          acceptNode: function(node) {
            if (node.parentNode.hasAttribute && node.parentNode.hasAttribute('data-in')) {
              return NodeFilter.FILTER_REJECT;
            } else {
              return NodeFilter.FILTER_ACCEPT;
            }
          }
        },
        false
      ),
      node;

    while (node = walker.nextNode()) {
      if (node.hasAttribute && node.hasAttribute('data-in')) {
        collections.push(node);
      }
    }

    return collections;
  },

  join = function() {
    return Array.prototype.join.call(arguments, '.');
  },

  split = function(html) {
    var parts = [];

    each(html.split(/(.*?)(\{\{.*?\}\})/g), function(text) {
      if (text.length && text != '\n') {
        parts.push(text);
      }
    });

    return parts;
  },

  bindPaths = function(prefix, el, object) {
    each(scanPaths(el[0]), function(node) {
      var $node = $(node), match;

      each(split(node.nodeValue), function(text) {
        var textNode = document.createTextNode(text), path;

        if (match = text.match(/\{\{\s*(.*?)\s*\}\}/)) {
          path = match[1];
          bind(prefix, object, path, textNode);
        }

        $node.before(textNode);
      });

      $node.remove();
    });
  },

  bindCollections = function(prefix, el, object) {
    each(scanCollections(el[0]), function(collection) {
      var
        $collection = $(collection),
        tag = collection.nodeName.toLowerCase(),
        prop = $collection.attr('data-in'),
        html = $collection.html(),
        template = $collection.replace(
          $('<template>').attr('data-tag', tag).attr('data-prop', prop).html(html)
        );

      bind(prefix, object, prop, template);
    });
  },

  bind = function(prefix, object, path, node) {
    register(join(prefix, path), node);
    observe(prefix, object, path);
    trigger(join(prefix, path));
  },

  register = function(path, node) {
    var
      registered = nodes[path] || (nodes[path] = []);

    each((node instanceof Array) ? node : [node], function(textNode) {
      if (indexOf(textNode, registered) == -1) {
        registered.push(textNode);
      }
    });
  },

  observe = function(prefix, object, path) {
    if (object && typeof(object) == 'object')
      objects[prefix] = object._id();
    else
      delete objects[prefix];

    if (!object || !path)
      return;

    if (path == '.') {
      objects[join(prefix, path)] = object._id();
      return;
    }

    var
      segments = path.match(/(\w+)\.?([\w+\.]*)/),
      prop = segments[1],
      rest = segments[2],
      descriptor, path, value;

    if (typeof(object) == 'object') {
      descriptor = Object.getOwnPropertyDescriptor(object, prop);
      path = join(prefix, prop);
      value = object[prop];

      if (!descriptor || !descriptor.set) {
        value = parseValue(path, value);
        Object.defineProperty(object, prop, {
          get: function() {
            return value;
          },
          set: function(val) {
            value = parseValue(path, val);
            observe(path, value, rest);
            trigger(path);
          }
        });
      }

      observe(path, value, rest);
    }
  },

  parseValue = function(path, value) {
    if (value instanceof Array) {
      value = new Proxy(value, {
        set: function(array, key, val) {
          array[key] = val;
          if (/^\d+$/.test(key))
            update(path, key);
          return true;
        }
      });
    }
    return value;
  },

  trigger = function(identifier) {
    each(keys(nodes), function(path) {
      if (path.startsWith(identifier)) {
        update(path);
      }
    });
  },

  update = function(path, index) {
    var
      segments = path.match(/(.*?)\.([^\.]*\.?)$/),
      object = getobject(objects[segments[1]]) || {},
      prop = segments[2],
      value = ((prop == '.') ? getobject(objects[path]) : object[prop]),
      registered = (nodes[path] || []);

    each(registered, function(node) {
      if (node.nodeType == Node.TEXT_NODE)
        node.nodeValue = value || '';
      else
        updateCollection(path, node, value || [], index);
    });
  },

  updateCollection = function(path, template, array, index) {
    var
      el = $(template),
      tag = el.attr('data-tag'),
      prop = el.attr('data-prop'),
      html = el.html(),
      all = typeof(index) == 'undefined',
      index = parseInt(index, 10),
      next;

    each(array || [], function(object, i) {
      next = el.next('[data-for=' + prop + ']');

      if (!next.length) {
        next = $('<' + tag + '>').attr('data-for', prop);
        el.after(next);
      }
      el = next;

      if (all || (i == index)) {
        $.t(html, object, el, path + '[' + i + ']');
      }
    });

    var i = array.length;

    while ((next = el.next('[data-for=' + prop + ']')).length) {
      delete objects[path + '[' + i + ']'];
      next.remove();
      i++;
    }
  },

  render = function(arg, object, replace, prefix) {
    var el, template;

    if (arguments.length == 1) {
      el = $('template')[0];
      object = arguments[0];
      replace = true;
    }

    el || (el = document.getElementById(arg));

    if (el)
      el = $(el);
    else
      el = $(/\<(\w+)(.+(\<\/\1|\/?))?\>$/.test(arg) ? arg : ('<span>' + arg + '</span>'));

    template = el.html();

    if (replace)
      el = (replace == true) ? el.outerWrap('div') : replace;
    else
      el = $('<div>');

    prefix || (prefix = object._id());

    el.html(template);
    bindPaths(prefix, el, object);
    bindCollections(prefix, el, object);

    return el;
  };

  return {
    render: render
  };
});
