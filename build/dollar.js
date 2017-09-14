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

      body.push(init.toString().replace(/(^function\s*\(.*?\)\s*\{\s*|\s*$)/, '').replace(/\}$/, ''));

      return (new Function(body.join('\n'))());
    }
  };
}());

define = mod.construct;

if (typeof(reLexer) == 'undefined') {

// *
// * reLexer.js 0.1.2 (Uncompressed)
// * A very simple lexer and parser library written in Javascript.
// *
// * (c) 2017 Paul Engel
// * reLexer.js is licensed under MIT license
// *
// * $Date: 2017-09-14 22:43:36 +0100 (Thu, 14 September 2017) $
// *

reLexer = function(rules, root, defaultActions) {

  root || (root = Object.keys(rules).pop());

  var
    expression,
    actions,
    env,
    busy,
    matches,
    retried,
    stacktrace,
    u,//ndefined
    p,//recedence
    c = '_conj_',
    n = '_named_',
    f = 'ƒ',
    dummy = 'ﬁ',

  addMatch = function(identifier, expression, match) {
    if (identifier.indexOf(dummy) == -1)
      matches[identifier] = [expression, match];
  },

  matchPattern = function(pattern) {
    if (typeof(pattern) == 'string')
      pattern = new RegExp(pattern.replace(/[-\/\\^\$\*\+\?\.\(\)|\[\]\{\}]/g, '\\$&'));

    var
      match = expression.match(pattern);

    if (match && match.index == 0) {
      expression = expression.slice(match[0].length);
      return match[0];
    }
  },

  matchString = function(patternOrString, lazyParent) {
    var
      segments = patternOrString.match(/(.+?)(>(\w+))?(&)?(\?)?(\/(\d+))?$/) || [],
      pattern = segments[1],
      name = segments[3],
      lazy = lazyParent || !!segments[4],
      optional = !!segments[5],
      precedence = segments[7] ? parseInt(segments[7], 10) : u,
      rule = ((pattern || '').match(/:(\w+)/) || [])[1],
      match;

    if (name || optional || (rule && rules[rule])) {

      if (pattern.match(/\|/))
        pattern = reLexer.or.apply(null, pattern.split('|'));
      else
        pattern = pattern.replace(':', f);

      match = matchExpression(pattern, name, lazy, precedence);

      if ((match == u) && optional) {
        match = '';
      }

    } else {
      match = matchPattern(patternOrString);
    }

    return match;
  },

  matchConjunction = function(array, lazy) {
    array[c] || (array[c] = 'and');

    var
      initialExpression = expression,
      conjunction = array[c],
      i, pattern, match, captures = [];

    for (i = 0; i < array.length; i++) {
      pattern = array[i];
      match = matchExpression(pattern, null, lazy);

      if (match != u) {
        if (conjunction == 'and') {
          captures.push(match);
        } else {
          return match;
        }
      } else if (conjunction == 'and') {
        expression = initialExpression;
        return;
      }
    }

    if (captures.length)
      return captures;
  },

  matchExpression = function(ruleOrPattern, name, lazy, precedence) {
    if (expression == u)
      return;

    ruleOrPattern = ruleOrPattern || (f + root);

    var
      initialExpression = expression,
      initialPrecedence = p,
      rule = ((ruleOrPattern + '').indexOf(f) == 0 ? ruleOrPattern.slice(1) : u),
      isRootMatch = rule == root,
      pattern = rules[rule],
      action = actions && actions[rule],
      identifier, matched, match, parse,
      e, m, i, r;

    if (p && precedence && p > precedence)
      return;

    if (!pattern) {
      rule = u;
      pattern = ruleOrPattern;

    } else {
      identifier = rule + ': ' + expression;

      if (arguments.length && (matched = matches[identifier])) {
        expression = matched[0];
        return matched[1];

      } else if (busy[identifier])
        return;

      busy[identifier] = !isRootMatch;
    }

    if (precedence)
      p = precedence;

    if (expression.indexOf(dummy) == -1)
      stacktrace.push(expression + ' (#' + stacktrace.length + ') ' + (rule ? '(rule) ' + rule : pattern).toString());

    if (arguments.length && (matched = matches['>' + identifier])) {
      expression = matched[0];
      match = matched[1];

    } else {
      switch (pattern.constructor) {
      case RegExp:
        match = matchPattern(pattern);
        break;
      case String:
        match = matchString(pattern, lazy);
        break;
      case Array:
        match = matchConjunction(pattern, lazy);
        break;
      }
    }

    p = initialPrecedence;

    if (rule)
      busy[identifier] = false;

    if (!isRootMatch && identifier)
      addMatch(identifier, expression, match);

    if ((match != u) || (initialExpression != expression)) {
      if (rule || name) {
        if (!actions || action)
          match = normalizeMatch(name, lazy, rule, pattern, match);
        if (actions && action) {
          parse = function() {
            return action(env, this.captures, this);
          }.bind(match);
          match = lazy ? parse : parse();
        }
      }

      if (actions && name) {
        match = [name, match];
        match[n] = true;
      }

      if (expression != u) {
        if (!expression.length)
          expression = u;

        else if (rule && precedence != u && expression && expression.indexOf(dummy) == -1) {
          e = expression;
          m = match;
          i = '>' + root + ': ' + dummy + e;

          expression = dummy + e;
          matches[i] = [e, match];

          r = matchExpression.apply(this, arguments);

          if (r == u) {
            expression = e;
            match = m;
          } else {
            match = r;
          }

          delete matches[i];
        }
      }

      if (!isRootMatch && identifier)
        addMatch(identifier, expression, match);

      return match;
    }
  },

  normalizeMatch = function(name, lazy, rule, pattern, match) {
    var
      specs = {},
      object = {},
      capture, i;

    if (name)
      specs.name = name;

    if (lazy)
      specs.lazy = lazy;

    if (rule)
      specs.rule = rule;

    specs.pattern = pattern;

    if (pattern[c])
      specs.conjunction = pattern[c];

    if (actions && (match.constructor == Array)) {
      for (i = 0; i < match.length; i++) {
        capture = match[i];
        if (capture && capture[n]) {
          object[capture[0]] = capture[1];
        }
      }
    }

    specs.captures = Object.keys(object).length ? newProxy(object) : match;

    return specs;
  },

  newProxy = function(captures) {
    return new Proxy(captures, {
      get: function(object, key) {
        var value = object[key];
        return (value && value.constructor == Function) ? value() : value;
      }
    });
  },

  scan = function() {
    var match, index;

    try {
      p = u;
      match = matchExpression();

      if (expression != u) {
        if (retried == expression)
          throw 'Unable to match expression: ' + JSON.stringify(expression);
        else {
          retried = expression;
          matches['>' + root + ': ' + expression] = [expression, match];
          return scan();
        }
      } else
        return match;

    } catch(e) {
      index = e.message && e.message.match('Maximum call stack size exceeded') ? -30 : -15;
      console.error(e);
      console.error('Expressions backtrace:\n' + stacktrace.slice(index).reverse().join('\n'));
    }
  },

  lex = function(lexExpression, environment, definedActions) {
    lexExpression = lexExpression.trim();

    if (lexExpression) {
      expression = lexExpression;
      env = environment;
      actions = (arguments.length == 1) ? u : (definedActions || defaultActions);
      busy = {};
      retried = u;
      matches = {};
      stacktrace ? stacktrace.splice(0) : (stacktrace = []);
      return scan();
    }
  };

  this.tokenize = function(expression) {
    return lex(expression);
  };

  this.parse = function(expression, env, actions) {
    return lex(expression, env, actions);
  };

};

or = reLexer.or = function() {
  var array = [].slice.call(arguments);
  array._conj_ = 'or';
  return array;
};

}

mod.define('Ajax', function() {
  var
    ajax = function() {
      var
        options,
        request = new XMLHttpRequest();

      if (typeof(arguments[0]) == 'string') {
        options = arguments[1];
        options.url = arguments[0];
      } else {
        options = arguments[0];
      }

      request.onload = function(e) {
        var
          xhr = e.target,
          data = xhr.responseText,
          status = xhr.status,
          statusText = xhr.statusText;

        if (status >= 200 && status < 300) {
          switch (options.responseType) {
          case 'json':
            data = JSON.parse(data);
            break;
          }
          options.success && options.success(data, statusText, xhr);
        } else if (status >= 400) {
          options.error && options.error(xhr, statusText);
        }

        options.complete && options.complete(xhr, statusText);
      };

      request.open(
        options.method || 'GET',
        options.url,
        (options.async != undefined) ? options.async : true
      );

      options.beforeSend && options.beforeSend(request);
      request.send();
    };

  return {
    ajax: ajax,
    get: function(url, success) {
      return ajax({
        url: url,
        success: success
      });
    },
    post: function(url, success) {
      return ajax({
        method: 'POST',
        url: url,
        success: success
      });
    },
    getJSON: function(url, success) {
      return ajax({
        url: url,
        responseType: 'json',
        success: success
      });
    }
  };
});

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
      for (var i = 0; i < array.length; i++) {
        if (val === array[i]) {
          return i;
        }
      }
      return -1;
    },

    each: function(enumerable, f) {
      if (isArray(enumerable)) {
        for (var i = 0; i < enumerable.length; i++) {
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

mod.define('Config', function() {
  var
    registered = [];

  return {
    registerConfig: function(config) {
      for (var param in config) {
        registered.push({
          param: param,
          func: config[param]
        });
      }
    },

    configure: function() {
      var param, i, spec;
      for (param in script.params) {
        for (i = 0; i < registered.length; i++) {
          spec = registered[i];
          if (spec.param == param) {
            spec.func(script.params[param]);
          }
        }
      }
    }
  };
});

mod.define('Draggable', function() {
  var
    elements = [],
    configs = [],
    dragged,
    moved,
    deltaX,
    deltaY,

  init = function(el, config) {
    if (indexOf(el, elements) == -1) {
      elements.push(el);
      configs.push(config || {});
    }
  },

  stop = function(el) {
    var index = indexOf(el, elements);
    if (index != -1) {
      elements.splice(index, 1);
      configs.splice(index, 1);
    }
  },

  bind = function() {
    var removeSelection = function() {
      if (document.selection) {
        document.selection.empty();
      } else {
        window.getSelection().removeAllRanges();
      }
    };

    $('body').bind('mousedown', function(e, target) {
      if (!dragged && (e.which == 1) && (indexOf(target, elements) != -1)) {
        var config;

        dragged = $(target);
        moved = false;

        deltaX = e.pageX - dragged.bounds().left;
        deltaY = e.pageY - dragged.bounds().top;

        config = configs[indexOf(dragged.at(0), elements)];
        config.start && config.start(e, dragged);
      }
    });

    $('body').bind('mousemove', function(e) {
      if (dragged) {
        removeSelection();

        var
          parent = (dragged.parent().at(0).tagName.toLowerCase() != 'body') ? dragged.parent() : null,
          parentX = parent ? parent.bounds().left : 0,
          parentY = parent ? parent.bounds().top : 0,
          position = {
            top: (e.pageY - deltaY - parentY) + 'px',
            left: (e.pageX - deltaX - parentX) + 'px'
          },
          config = configs[indexOf(dragged.at(0), elements)];

        if (callOrValue(config.constraintY, dragged) == true)
          delete position.top;
        if (callOrValue(config.constraintX, dragged) == true)
          delete position.left;

        config.move && config.move(e, dragged, position);
        dragged.css(position);

        moved = true;
      }
    });

    $('body').bind('mouseup', function(e) {
      if (dragged && moved) {
        var config = configs[indexOf(dragged.at(0), elements)];
        config.stop && config.stop(e, dragged);
      }

      dragged = null;
      moved = false;
    });
  },

  callOrValue = function(val, el) {
    return (typeof(val) == 'function') ? val(el) : val;
  };

  ready(bind);

  return {
    Draggable: {
      init: init,
      stop: stop
    }
  };
});

mod.define('Elements', function() {
  var
    fn = {
      objectid: function() {
        return this._id();
      },

      find: function(selector) {
        return $(selector, this);
      },

      children: function() {
        var children = [], i;
        children.at = true;
        for (i = 0; i < this.childNodes.length; i++) {
          node = this.childNodes[i];
          if (node instanceof HTMLElement) {
            children.push(node);
          }
        }
        return children;
      },

      parent: function() {
        return wrap(this.parentNode);
      },

      siblings: function() {
        var siblings = [];
        each($(this).parent().children(), function(child) {
          if ((child.nodeName.toLowerCase() != 'template') && (child != this)) {
            siblings.push(child);
          }
        }.bind(this));
        return $(siblings);
      },

      closest: function(sel, elements, context) {
        context || (context = root(this));
        elements || (elements = $(sel, context));

        if (indexOf(this, elements) != -1) {
          return this;
        } else {
          return $(this.parentNode).closest(sel, elements, context);
        }
      },

      show: function() {
        var
          iframe = $('<iframe>').css({
            top: '-10px',
            left: '-10px',
            width: 0,
            height: 0,
            position: 'absolute',
            border: 0
          }).appendTo(document.body),
          el = $('<' + this.nodeName + '>').appendTo(iframe[0].contentWindow.document.body);

        this.style.display = el.computedStyle().display;
        iframe.remove();
      },

      hide: function() {
        this.style.display = 'none';
      },

      remove: function() {
        this.parentNode.removeChild(this);
      },

      is: function(sel) {
        return this.matches(sel);
      },

      html: function(val) {
        if (arguments.length) {
          this.innerHTML = val;
        } else {
          return this.innerHTML || this.innerText;
        }
      },

      val: function(val) {
        if (arguments.length) {
          this.value = val;
        } else {
          return this.value;
        }
      },

      root: function() {
        return root(this);
      },

      edit: function(edit) {
        if (edit == false) {
          this.removeAttribute('contenteditable');
        } else {
          this.setAttribute('contenteditable', 'true');
        }
      },

      addClass: function() {
        var
          classes = isArray(arguments[0]) ? arguments[0] : arguments;

        classes = toArray(classes).join(' ').trim().split(/\s+/);
        this.classList.add.apply(this.classList, classes);
      },

      removeClass: function() {
        var classes = [], i, name, regexp;

        if (arguments[0] instanceof RegExp) {
          regexp = arguments[0];
          for (i = 0; i < this.classList.length; i++) {
            name = this.classList[i];
            if (name.match(regexp))
              classes.push(name);
          }
        } else {
          classes = isArray(arguments[0]) ? arguments[0] : arguments;
        }

        classes = toArray(classes).join(' ').trim().split(/\s+/);
        this.classList.remove.apply(this.classList, classes);
      },

      hasClass: function(arg) {
        return this.classList.contains(arg);
      },

      innerWrap: function(tag, attributes) {
        var attrs = '', name;
        if (attributes) {
          for (name in attributes) {
            attrs += ' ' + name + '="' + attributes[name].toString().replace(/\n/g, "\\n").replace(/\"/g, "\\\"") + '"';
          }
        }
        this.innerHTML = '<' + tag + attrs + '>' + this.innerHTML + '</' + tag + '>';
      },

      outerWrap: function(tag, attributes) {
        var outerEl = document.createElement(tag), name;
        if (attributes) {
          for (name in attributes) {
            outerEl.setAttribute(name, attributes[name]);
          }
        }
        this.parentNode.insertBefore(outerEl, this);
        outerEl.appendChild(this);
        return wrap(outerEl);
      },

      focus: function() {
        this.focus();
      },

      bind: function() {
        bind.apply(window, [this].concat(toArray(arguments)));
      },

      unbind: function() {
        unbind.apply(window, [this].concat(toArray(arguments)));
      },

      once: function() {
        once.apply(window, [this].concat(toArray(arguments)));
      },

      on: function() {
        var args = toArray(arguments);
        args[3] || (args[3] = root(this));
        on.apply(window, args);
      },

      trigger: function() {
        trigger.apply(window, [this].concat(toArray(arguments)));
      },

      width: function() {
        var c = computedStyle(this);
        return parseInt(c.width) +
               parseInt(c.borderLeftWidth) +
               parseInt(c.paddingLeft) +
               parseInt(c.borderRightWidth) +
               parseInt(c.paddingRight);
      },

      height: function() {
        var c = computedStyle(this);
        return parseInt(c.height) +
               parseInt(c.borderTopWidth) +
               parseInt(c.paddingTop) +
               parseInt(c.borderBottomWidth) +
               parseInt(c.paddingBottom);
      },

      bounds: function() {
        return bounds.apply(window, [this].concat(toArray(arguments)));
      },

      style: function() {
        return this.style;
      },

      computedStyle: function() {
        return computedStyle.apply(window, [this].concat(toArray(arguments)));
      },

      cssRules: function() {
        return cssRules.apply(window, [this].concat(toArray(arguments)));
      },

      attr: function() {
        var key = arguments[0], value = arguments[1], attr;
        if (arguments.length == 1) {
          if (typeof(key) == 'string') {
            return this.getAttribute(key);
          } else {
            for (attr in key) {
              this.setAttribute(attr, key[attr]);
            }
          }
        } else {
          this.setAttribute(key, value);
        }
      },

      attrs: function() {
        var attrs = {}, i, node;

        for (i = 0; i < this.attributes.length; i++) {
          node = this.attributes.item(i);
          attrs[node.nodeName] = node.nodeValue;
        }

        return attrs;
      },

      removeAttr: function(attr) {
        var regexp, i;

        if (attr instanceof RegExp) {
          regexp = attr;
          for (i = 0; i < this.attributes.length; i++) {
            attr = this.attributes[i].localName;
            if (attr.match(regexp))
              this.removeAttribute(attr);
          }
        } else {
          this.removeAttribute(attr);
        }
      },

      css: function() {
        var key = arguments[0], value = arguments[1], prop;
        if (arguments.length == 1) {
          if (typeof(key) == 'string') {
            return computedStyle.apply(window, [this].concat(toArray(arguments)))[key];
          } else {
            for (prop in key) {
              this.style[prop] = key[prop];
            }
          }
        } else {
          this.style[key] = value;
        }
      },

      prev: function(selector) {
        var prev = $(this.previousElementSibling);
        if (selector && !prev.is(selector)) {
          return prev.prev(selector);
        } else {
          return prev;
        }
      },

      next: function(selector) {
        var next = $(this.nextElementSibling);
        if (selector && !next.is(selector)) {
          return next.next(selector);
        } else {
          return next;
        }
      },

      backward: function(selector) {
        var el = $(this).prev(selector);
        if (el.length) {
          this.parentNode.insertBefore(this, el.at(0));
        }
      },

      forward: function(selector) {
        var el = $(this).next(selector);
        if (el.length) {
          next = el.at(0).nextElementSibling;
          next ? this.parentNode.insertBefore(this, next) : this.parentNode.appendChild(this);
        }
      },

      prepend: function(child) {
        $(child).each(function(i, node) {
          var first = this.children[0];
          first ? this.insertBefore(node, first) : this.appendChild(node);
        }.bind(this));
      },

      prependTo: function(parent) {
        $(parent).each(function(i, node) {
          var first = node.children[0];
          first ? node.insertBefore(this, first) : node.appendChild(this);
        }.bind(this));
      },

      append: function(child) {
        $(child).each(function(i, node) {
          this.appendChild(node);
        }.bind(this));
      },

      appendTo: function(parent) {
        $(parent).each(function(i, node) {
          node.appendChild(this);
        }.bind(this));
      },

      before: function(el) {
        $(el).each(function(index, el) {
          this.parentNode.insertBefore(el, this);
        }.bind(this));
      },

      after: function(el) {
        $(el).each(function(index, el) {
          var next = this.nextElementSibling;
          if (next) {
            $(next).before(el);
          } else {
            this.parentNode.appendChild(el);
          }
        }.bind(this));
      },

      replace: function(el) {
        el = $(el);
        $(this).before(el);
        $(this).remove();
        return el;
      },

      replaceWith: function(el) {
        $(this).replace(el);
      },

      toShadowDom: function(id) {
        var body = document.body, el;
        if (body.createShadowRoot) {
          el = $('#' + id)[0];
          if (!el) {
            el = document.createElement('div');
            el.id = id;
            document.body.appendChild(el);
            el.createShadowRoot();
          }
          el.shadowRoot.appendChild(this);
        }
      },

      draggable: function(arg) {
        Draggable[(arg == false) ? 'stop' : 'init'](this, arg);
      }
    },

  newElement = function(html) {
    if ((typeof(html) == 'string') && html.match(/\<(\w+)(.+(\<\/\1|\/?))?\>$/m)) {
      var el = document.createElement('div');
      el.innerHTML = html;
      return wrap(el.childNodes[0]);
    }
  },

  search = function(selector, context) {
    context = context || document;

    var
      regex = /^(#?[\w-]+|\.[\w-.]+)$/,
      query = function(sel) {
        if (regex.test(sel)) {
          switch(sel[0]) {
          case '#':
            return [document.getElementById(sel.substr(1))];
          case '.':
            return toArray(context.getElementsByClassName(sel.substr(1).replace('.', ' ')));
          default:
            return toArray(context.getElementsByTagName(sel));
          }
        }
        return toArray(context.querySelectorAll(sel));
      },
      found = [];

    each(selector.split(/\s*,\s*/), function(sel) {
      found = found.concat(query(sel));
    });

    return found;
  },

  wrap = function(arg) {
    if ((arg === null) || (typeof(arg) == 'undefined')) {
      return wrap([]);
    }
    if (!arg.at) {
      if (arg.nodeType || !arg.entries) {
        arg = [arg];
      }
      for (var prop in fn) {
        if (fn.hasOwnProperty(prop)) {
          define(prop, arg);
        }
      }
      arg.at = function(i) {
        return this[i];
      };
      arg.each = function(f) {
        for (var i = 0; i < this.length; i++) {
          f.apply(this[i], [i, this[i]]);
        }
        return this;
      };
    }
    return arg;
  },

  define = function(name, elements) {
    elements[name] = function() {
      var
        func = fn[name],
        results = [],
        i, el, result;

      for (i = 0; i < elements.length; i++) {
        el = elements[i];
        result = func.apply(el, arguments);

        if (typeof(result) == 'undefined') {
          result = el;
        }

        if (result && result.nodeType) {
          results.push(result);
        } else if (result && result.at) {
          results = results.concat(toArray(result));
        } else {
          return result;
        }
      }

      return wrap(results);
    };
  };

  return {
    $: function(arg, context) {
      return newElement(arg) || wrap(
        (typeof(arg) == 'string') ? search(arg, context) : arg
      );
    }
  };
});

mod.define('Events', function() {
  var
    events = {};

  return {
    bind: function(el, type, f, remove) {
      var fn, id;

      if (typeof(f) == 'string') {
        fn = events[f];
      } else {
        id = objectid(el) + ':' + type + ':' + objectid(f);
        fn = events[id] || (events[id] = function(e) {
          e || (e = window.event);
          f(e, e.target || e.srcElement || window.event.target || window.event.srcElement);
        });
      }

      if (remove) {
        if (el.detachEvent)
          el.detachEvent('on' + type, fn);
        else
          el.removeEventListener(type, fn, false);
      } else {
        if (el.attachEvent)
          el.attachEvent('on' + type, fn);
        else
          el.addEventListener(type, fn, false);
      }
    },

    unbind: function(el, type, fn) {
      if (fn) {
        bind(el, type, fn, true);
      } else {
        var regexp = new RegExp('^' + objectid(el) + ':' + type), prop;
        for (prop in events) {
          if (events.hasOwnProperty(prop) && prop.match(regexp)) {
            unbind(el, type, prop);
          }
        }
      }
    },

    once: function(el, type, f) {
      var fn = function() {
        unbind(el, type, fn);
        f.apply(this, arguments);
      };
      bind(el, type, fn);
    },

    on: function(sel, type, fn, context) {
      context || (context = document);

      bind(context, type, function(e, target) {
        target = $(target).closest(sel);
        if (target.length) {
          fn(e, target);
        }
      });
    },

    trigger: function(el, name) {
      var event;

      if (document.createEvent) {
        event = document.createEvent('Event');
        event.initEvent(name, true, true);
      } else {
        event = document.createEventObject();
        event.eventType = name;
      }

      event.eventName = name;

      if (document.createEvent) {
        el.dispatchEvent(event);
      } else {
        el.fireEvent('on' + name, event);
      }
    },

    animationEnd: function() {
      var
        style = document.body.style,
        mapping = {
          'WebkitAnimation': 'webkitAnimationEnd',
          'OAnimation': 'oAnimationEnd',
          'msAnimation': 'MSAnimationEnd'
        },
        prop;

      for (prop in mapping) {
        if (mapping.hasOwnProperty(prop) && typeof(style[prop]) == 'string') {
          return mapping[prop];
        }
      }

      return 'animationend';
    },

    ready: function(fn) {
      if ((document.readyState == 'interactive') || (document.readyState == 'complete')) {
        setTimeout(fn, 0);
      } else {
        bind(document, 'DOMContentLoaded', function() { setTimeout(fn, 0) });
      }
    }
  };
});

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

mod.define('Inject', function() {
  var
    registered = {
      js: [], css: [], html: []
    },

  ensureHead = function() {
    if (!$('head').length) {
      document.body.parentNode.insertBefore(document.createElement('head'), document.body);
    }
    return $('head')[0];
  };

  return {
    registerJS: function() {
      registered.js.push(arguments);
    },

    registerCSS: function() {
      registered.css.push(arguments);
    },

    registerHTML: function(code) {
      registered.html.push(code);
    },

    injectCode: function() {
      var head = ensureHead(), i, el, val;

      for (i = 0; i < registered.js.length; i++) {
        val = registered.js[i];
        el = document.createElement('script');
        if (val[1])
          el.id = val[1];
        el.innerHTML = val[0];
        head.appendChild(el);
      }

      for (i = 0; i < registered.css.length; i++) {
        val = registered.css[i];
        el = document.createElement('style');
        if (val[1])
          el.id = val[1];
        el.innerHTML = val[0];
        head.appendChild(el);
      }

      for (i = 0; i < registered.html.length; i++) {
        el = document.createElement('div');
        el.innerHTML = registered.html[i];
        while (el.children.length > 0) {
          document.body.appendChild(el.children[0]);
        }
      }
    },

    injectCSS: function(selector, style) {
      var el = $('style.injected')[0], head, css = [], attr;

      if (!el) {
        head = ensureHead();
        el = document.createElement('style');
        $(el).addClass('injected');
        head.insertBefore(el, head.childNodes[0]);
      }

      css.push('\n' + selector + ' {');
      for (attr in style) {
        css.push('  ' + attr + ': ' + style[attr] + ';');
      };
      css.push('}');

      el.innerHTML += css.join('\n') + '\n';
    }
  };
});

mod.define('Introspect', function() {
  return {
    script: (function() {
      var id = 'dummy_script', dummy, script = document.getElementById(IDENTIFIER), src, params = {}, pairs, pair, key, i;

      if (!script) {
        document.write('<script id="' + id + '"></script>');
        dummy = document.getElementById(id);
        script = dummy.previousSibling;
        dummy.parentNode.removeChild(dummy);
      }

      src = script.getAttribute('src');
      pairs = ((src.match(/([\?]*)\?(.*)+/) || ['', '', ''])[2] || '').replace(/(^[0123456789]+|\.js(\s+)?$)/, '').split('&');

      for (i = 0; i < pairs.length; i++) {
        if (pairs[i] != '') {
          pair = pairs[i].split('=');
          key = pair[0].replace(/^\s+|\s+$/g, '').toLowerCase();
          params[key] = (pair.length == 1) || pair[1].replace(/^\s+|\s+$/g, '');
        }
      }

      return {
        el: script,
        src: src.toLowerCase().replace(/\?.*/, ''),
        path: src.toLowerCase().replace(/[^\/]+\.js.*/, ''),
        search: src.toLowerCase().replace(/^[^\?]+/, ''),
        params: params
      };
    }()),

    isArray: function(arg) {
      return Object.prototype.toString.call(arg) == '[object Array]';
    },

    isRetinaDisplay: function() {
      if (window.matchMedia) {
        var mq = window.matchMedia('only screen and (min--moz-device-pixel-ratio: 1.3), only screen and (-o-min-device-pixel-ratio: 2.6/2), only screen and (-webkit-min-device-pixel-ratio: 1.3), only screen  and (min-device-pixel-ratio: 1.3), only screen and (min-resolution: 1.3dppx)');
        return (mq && mq.matches || (window.devicePixelRatio > 1));
      }
      return false;
    },

    inFrame: function() {
      return parent !== window;
    },

    pageWidth: function() {
      return window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    },

    pageHeight: function() {
      return window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    },

    viewWidth: function() {
      return Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    },

    viewHeight: function() {
      return Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    },

    viewTop: function() {
      return window.pageYOffset;
    },

    viewLeft: function() {
      return window.pageXOffset;
    },

    bounds: function(el) {
      var
        rect = el.getBoundingClientRect(),
        bounds = {
          top: parseInt(rect.top + viewTop()),
          left: parseInt(rect.left + viewLeft()),
          width: parseInt(rect.width),
          height: parseInt(rect.height)
        };

      bounds.bottom = pageHeight() - bounds.top - bounds.height;
      bounds.right = pageWidth() - bounds.left - bounds.width;

      return bounds;
    },

    computedStyle: function(el) {
      return window.getComputedStyle(el, null);
    },

    cssRules: function(el) {
      var
        sheets = document.styleSheets,
        rules = [],
        i;

      function collectRules(cssRules) {
        var i, rule;
        for (i = 0; i < cssRules.length; i++) {
          rule = cssRules[i];
          if (rule instanceof CSSMediaRule) {
            if (window.matchMedia(rule.conditionText).matches) {
              collectRules(rule.cssRules);
            }
          } else if (rule instanceof CSSStyleRule) {
            if (el.matches(rule.selectorText)) {
              rules.push(rule);
            }
          }
        }
      };

      for (i = 0; i < sheets.length; i++) {
        collectRules(sheets[i].cssRules);
      }

      return rules;
    },

    root: function(el) {
      return el.parentNode ? root(el.parentNode) : el;
    }
  };
});

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
      encapsulation: [
        '(', ':space?', ':expression>expression&', ':space?', ')'
      ],
      expression: or(
        ':encapsulation',
        ':ternaryExpression/1',
        ':logicalExpression/2',
        ':comparisonExpression/3',
        ':addSubtractExpression/4',
        ':multiplyDivideExpression/5',
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
      ternaryExpression: function(env, captures) {
        return captures.statement ? captures.true : captures.false;
      },
      logicalExpression: function(env, captures) {
        return binaryExpression(env, captures);
      },
      comparisonExpression: function(env, captures) {
        return binaryExpression(env, captures);
      },
      multiplyDivideExpression: function(env, captures) {
        return binaryExpression(env, captures);
      },
      addSubtractExpression: function(env, captures) {
        return binaryExpression(env, captures);
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

mod.define('Utils', function() {
  return {
    vw: function(px) {
      return parseInt(px) / viewWidth() * 100;
    },

    vh: function(px) {
      return parseInt(px) / viewHeight() * 100;
    },

    vwPosition: function(el) {
      el = $(el);
      var bounds = el.bounds();
      el.css({
        top: (vh(bounds.top) * (viewHeight() / viewWidth())) + 'vw',
        left: vw(bounds.left) + 'vw',
      });
    },

    invertHex: function(color) {
      color = color.substring(1);            // remove '#'
      color = parseInt(color, 16);           // convert to integer
      color = 0xFFFFFF ^ color;              // invert three bytes
      color = color.toString(16);            // convert to hex
      color = ('000000' + color).slice(-6);  // pad with leading zeros
      color = '#' + color;                   // prepend '#'
      return color;
    },

    toArray: function(arg) {
      return Array.prototype.slice.call(arg);
    }
  };
});

if (typeof(Dollar) == 'undefined') {

// *
// * dollar.js {version} (Uncompressed)
// * A minimalistic Javascript library for DOM manipulation, template rendering (data binded), event binding, introspection.
// *
// * (c) {year} Paul Engel
// * dollar.js is licensed under MIT license
// *
// * $Date: {date} $
// *

Dollar = define('dollar.js', function() {
  var $ = function() {
    var fn;

    if (typeof(arguments[0]) == 'number')
      fn = __fn__.getobject;
    else
      fn = __fn__.$;

    return fn.apply(this, arguments);
  };

  extend($, __fn__);

  $.t = __fn__.render;
  $.version = '{version}';

  $.ready(function() {
    window.$ready && window.$ready();
  });

  return $;
},
  'Identifier',
  'Utils',
  'Introspect',
  'Collections',
  'Ajax',
  'Elements',
  'Config',
  'Inject',
  'Events',
  'Draggable',
  'Render'
);

window.$ = Dollar;

}
