if (typeof(Dollar) == 'undefined') {

// *
// * dollar.js {version} (Uncompressed)
// * A minimalistic Javascript library for DOM manipulation, event binding, introspection.
// *
// * (c) {year} Paul Engel
// * dollar.js is licensed under MIT license
// *
// * $Date: {date} $
// *

Dollar = define('dollar.js', function() {
  var $ = function() {
    return __fn__.$.apply(this, arguments);
  };

  extend($, __fn__);

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
  'Elements',
  'Events',
  'Draggable',
  'Inject',
  'Config',
  'Ajax'
);

window.$ = Dollar;

}
