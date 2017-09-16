mod.define('Render', function() {
  var
    nodes = {},
    objects = {},
    binaryExpression = function(env, captures) {
      var
        left = captures.left,
        operator = captures.operator,
        right = captures.right;

      switch(operator) {
      case '&&':
        return left && right;
      case '||':
        return left || right;
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        return left / right;
      case '<':
        return left < right;
      case '<=':
        return left <= right;
      case '==':
        return left == right;
      case '!=':
        return left != right;
      case '>':
        return left > right;
      case '>=':
        return left >= right;
      }
    },
    lexer = new reLexer({
      space: /\s+/,
      path: /(\.|(\$|[a-zA-Z](\w*))\.?([\w+\.]+)?)/,
      string: /(["'])(?:(?=(\\?))\2.)*?\1/,
      number: /-?\d+(\.\d+)?/,
      boolean: /(true|false)/,
      primitive: ':boolean|:number|:string|:path',
      multiplyDivideExpression: [
        ':expression>left',
        ':space?',
        '*|/>operator',
        ':space?',
        ':expression>right'
      ],
      addSubtractExpression: [
        ':expression>left',
        ':space?',
        '+|->operator',
        ':space?',
        ':expression>right'
      ],
      comparisonExpression: [
        ':expression>left',
        ':space?',
        '<|<=|==|!=|>=|>>operator',
        ':space?',
        ':expression>right'
      ],
      logicalOperator: or(
        '&&',
        '||'
      ),
      logicalExpression: [
        ':expression>left',
        ':space?',
        ':logicalOperator>operator',
        ':space?',
        ':expression>right'
      ],
      ternaryExpression: [
        ':expression>statement',
        ':space?', '?', ':space?',
        ':expression>true&',
        ':space?', ':', ':space?',
        ':expression>false&'
      ],
      conditionalExpression: [
        ':expression>expression&',
        ':space?',
        'if|unless>operator',
        ':space?',
        ':expression>statement'
      ],
      encapsulation: [
        '(', ':space?', ':expression>expression&', ':space?', ')'
      ],
      expression: or(
        ':encapsulation',
        ':conditionalExpression/1',
        ':ternaryExpression/2',
        ':logicalExpression/3',
        ':comparisonExpression/4',
        ':addSubtractExpression/5',
        ':multiplyDivideExpression/6',
        ':primitive'
      )
    }, 'expression', {
      path: function(env, path) {
        var
          properties = path.split('.'),
          value, i, p;

        if (properties[0] == '$') {
          properties.shift();
          value = env.$;
        } else {
          value = env.object;
        }

        if (path == '.') return value;

        for (i = 0; i < properties.length; i++) {
          p = properties[i];
          if (value && value.hasOwnProperty(p))
            value = value[p];
          else
            return;
        }

        return value;
      },
      string: function(env, string) {
        return eval(string);
      },
      number: function(env, number) {
        var type = number.match(/\./) ? 'Float' : 'Int';
        return Number['parse' + type](number);
      },
      boolean: function(env, bool) {
        return bool == 'true';
      },
      multiplyDivideExpression: function(env, captures) {
        return binaryExpression(env, captures);
      },
      addSubtractExpression: function(env, captures) {
        return binaryExpression(env, captures);
      },
      comparisonExpression: function(env, captures) {
        return binaryExpression(env, captures);
      },
      logicalExpression: function(env, captures) {
        return binaryExpression(env, captures);
      },
      ternaryExpression: function(env, captures) {
        return captures.statement ? captures.true : captures.false;
      },
      conditionalExpression: function(env, captures) {
        var bool = captures.statement;
        if (captures.operator == 'unless')
          bool = !bool;
        if (bool)
          return captures.expression;
      },
      encapsulation: function(env, captures) {
        return captures.expression;
      }
    }),

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

      bind(prefix, object, prop, template[0]);
    });
  },

  bind = function(prefix, object, expression, node) {
    var $ = prefix.toString().split('.')[0];

    node.__prefix__ = prefix;
    node.__expression__ = expression;

    lexer.parse(expression, {}, {
      path: function(env, path) {
        var identifier = join(
          path.match(/^\$\./) ? $ : prefix,
          path.replace(/^\$\./, '')
        );
        register(identifier, node);
        observe(prefix, object, path);
        trigger(identifier);
      },
      '*': function(env, captures) {
        switch (typeof(captures)) {
        case 'function':
          captures = captures();
          break;
        case 'object':
          if (captures)
            each(Object.keys(captures), function(key) {
              captures[key];
            });
          break;
        }
        return captures;
      }
    });
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
    if (object && ((typeof(object) == 'object') || (path == '.')))
      objects[prefix] = object._id();
    else
      delete objects[prefix];

    if (!object || !path || (path.length == 1))
      return;

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
      registered = nodes[path] || [],
      $ = getobject(objects[path.split('.')[0]]),
      object, value;

    each(registered, function(node) {

      object = getobject(objects[node.__prefix__]);
      value = lexer.parse(node.__expression__, {$: $, object: object});

      if (node.nodeType == Node.ATTRIBUTE_NODE || node.nodeType == Node.TEXT_NODE) {
        node.nodeValue = value || '';
      } else {
        updateCollection(node, value, index);
      }

    });
  },

  updateCollection = function(node, collection, index) {
    collection || (collection = []);

    var
      el = $(node),
      property = el.attr('data-property'),
      html = el.html(),
      path = node.__prefix__ + '.' + property,
      all = typeof(index) == 'undefined',
      index = parseInt(index, 10),
      next, tmp;

    each(collection, function(object, i) {
      next = el.next('[data-for-property=' + property + ']');

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

    var i = collection.length;

    while ((next = el.next('[data-for-property=' + property + ']')).length) {
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
    } else {
      el = document.getElementById(arg);
    }

    template = el ? el.innerHTML : arg;

    if (replace)
      el = (replace == true) ? $(el).outerWrap('div') : replace;
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
