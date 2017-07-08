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
