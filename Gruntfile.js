// Based on http://mattwatson.codes/compile-scss-javascript-grunt/

(function () {
   'use strict';
}());

var util = require('util');

module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    concat: {
      options: {
        separator: '\n'
      },
      dist: {
        src: [
          'src/mod.js',
          'src/modules/*.js',
          'src/dollar.js'
        ],
        dest: 'build/dollar.js'
      }
    },

    watch: {
      files: ['Gruntfile.js', 'src/**/*.*'],
      tasks: ['concat']
    }

  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.registerTask('default', ['concat', 'watch']);

};
