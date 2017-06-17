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
    if (typeof(arguments[0]) == 'number')
      return __fn__.getobject.apply(this, arguments);
    else
      return __fn__.$.apply(this, arguments);
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
