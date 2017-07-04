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
            if (node.hasAttribute && node.hasAttribute('data-in')) {
              return NodeFilter.FILTER_REJECT;
            } else {
              return NodeFilter.FILTER_ACCEPT;
            }
          }
        },
        false
      ),
      node, i, attr;

    while (node = walker.nextNode()) {
      if (node.attributes) {
        for (i = 0; i < node.attributes.length; i++) {
          attr = node.attributes.item(i);
          if (/\{\{.*?\}\}/.test(attr.nodeValue)) {
            paths.push(attr);
          }
        }
      }
      if (node.nodeType == Node.TEXT_NODE && /\{\{.*?\}\}/.test(node.nodeValue)) {
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
    return toArray(arguments).join('.');
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
      var $node, match;

      if (node.nodeType == Node.ATTRIBUTE_NODE) {
        match = node.nodeValue.match(/\{\{\s*(.*?)\s*\}\}/);
        bind(prefix, object, match[1], node);

      } else {
        $node = $(node);

        each(split(node.nodeValue), function(text) {
          var textNode = document.createTextNode(text);
          if (match = text.match(/\{\{\s*(.*?)\s*\}\}/)) {
            bind(prefix, object, match[1], textNode);
          }
          $node.before(textNode);
        });

        $node.remove();
      }
    });
  },

  bindCollections = function(prefix, el, object) {
    each(scanCollections(el[0]), function(collection) {
      var
        $collection = $(collection),
        prop = $collection.attr('data-in'),
        html = $collection.removeAttr('data-in').attr('data-for-property', prop).parent().html(),
        template = $collection.replace(
          $('<template>').attr('data-property', prop).html(html)
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

    each(isArray(node) ? node : [node], function(textNode) {
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
    if (isArray(value)) {
      value = new Proxy(value, {
        set: function(array, key, val) {
          array[key] = val;
          if (/^\d+$/.test(key))
            update(path, key);
          if (key == 'length')
            update(path, -1);
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
      if (node.nodeType == Node.ATTRIBUTE_NODE || node.nodeType == Node.TEXT_NODE) {
        node.nodeValue = value || '';
      } else {
        updateCollection(path, node, value || [], index);
      }
    });
  },

  updateCollection = function(path, template, array, index) {
    var
      el = $(template),
      prop = el.attr('data-property'),
      html = el.html(),
      all = typeof(index) == 'undefined',
      index = parseInt(index, 10),
      next, tmp;

    each(array || [], function(object, i) {
      next = el.next('[data-for-property=' + prop + ']');

      if (!next.length) {
        next = $('<tmp>');
        el.after(next);
      }

      el = next;

      if (index != -1 && (all || (i == index))) {
        render(html, object, el, path + '[' + i + ']');
        if (el.children().attr('data-for-property')) {
          tmp = el;
          el = el.children();
          tmp.after(el).remove();
        }
      }
    });

    var i = array.length;

    while ((next = el.next('[data-for-property=' + prop + ']')).length) {
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
