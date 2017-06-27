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
      for (var i = 0; i < array.length; i += 1) {
        if (val === array[i]) {
          return i;
        }
      }
      return -1;
    },

    each: function(array, f) {
      for (var i = 0; i < array.length; i += 1) {
        f(array[i], i, i == array.length - 1);
      }
    },

    collect: function(array, f) {
      var result = [];
      each(array, function() {
        result.push(f.apply(this, arguments));
      });
      return result;
    },

    select: function(array, f) {
      var selected = [];
      each(array, function(el) {
        if (f(el)) {
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
        this.style.display = 'initial';
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
        var classes = isArray(arguments[0]) ? arguments[0] : arguments;
        classes = Array.prototype.join.call(classes, ' ');
        this.classList.add.apply(this.classList, classes.trim().split(/\s+/));
      },

      removeClass: function() {
        var classes = [], i, name, regexp;

        if (arguments[0] instanceof RegExp) {
          regexp = arguments[0];
          for (i = 0; i < this.classList.length; i += 1) {
            name = this.classList[i];
            if (name.match(regexp))
              classes.push(name);
          }
        } else {
          classes = isArray(arguments[0]) ? arguments[0] : arguments;
        }

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
        bind.apply(window, [this].concat(Array.prototype.slice.call(arguments)));
      },

      unbind: function() {
        unbind.apply(window, [this].concat(Array.prototype.slice.call(arguments)));
      },

      once: function() {
        once.apply(window, [this].concat(Array.prototype.slice.call(arguments)));
      },

      on: function() {
        var args = Array.prototype.slice.call(arguments);
        args[3] || (args[3] = root(this));
        on.apply(window, args);
      },

      trigger: function() {
        trigger.apply(window, [this].concat(Array.prototype.slice.call(arguments)));
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
        return bounds.apply(window, [this].concat(Array.prototype.slice.call(arguments)));
      },

      style: function() {
        return this.style;
      },

      computedStyle: function() {
        return computedStyle.apply(window, [this].concat(Array.prototype.slice.call(arguments)));
      },

      cssRules: function() {
        return cssRules.apply(window, [this].concat(Array.prototype.slice.call(arguments)));
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

      removeAttr: function(attr) {
        var regexp, i;

        if (attr instanceof RegExp) {
          regexp = attr;
          for (i = 0; i < this.attributes.length; i += 1) {
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
            return computedStyle.apply(window, [this].concat(Array.prototype.slice.call(arguments)))[key];
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

  search = function(sel, context) {
    context || (context = document);

    var i, found = [], array = [], parents,
        f = {'#': 'ById', '.': 'sByClassName', '@': 'sByName'}[sel.charAt(0)],
        s = (f ? sel.slice(1) : sel),
        fn = 'getElement' + (f || 'sByTagName');

    if (sel.match(/(\[|\(|\=|\:)/) || sel.match(/[^\s](\#|\@|\.)/)) {
      if (context.querySelectorAll) {
        return context.querySelectorAll(sel);
      }
    }

    if (sel.match(/\s/)) {
      array = sel.split(' '), parents = $(array.shift(), context);
      for (i = 0; i < parents.length; i += 1) {
        found = found.concat($(array.join(' '), parents[i]));
      }
    } else {
      if (context[fn])
        found = context[fn](s);
      else {
        if (f == 'ById') {
          f = null;
          s = '[id="' + s + '"]';
        }
        found = context.querySelectorAll(s);
      }
      if (f == 'ById') {
        found = [found];
      } else {
        for (i = 0; i < found.length; i += 1) {
          array.push(found[i]);
        }
        found = array;
      }
    }

    for (i = 0; i < found.length; i++) {
      if (!found[i]) {
        found.splice(i, 1);
      }
    }

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
          results = results.concat(Array.prototype.slice.call(result));
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

      for (i = 0; i < pairs.length; i += 1) {
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
      return window.getComputedStyle(el);
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

      if (index != -1 && (all || (i == index))) {
        render(html, object, el, path + '[' + i + ']');
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
