module.exports = function(grunt) {
  grunt.initConfig({
    concat: {
      js: {
        src: ['src/lib.js', 'src/calculate.js', 'src/scripts.js'],
        dest: 'lib/scripts.js'
      },
    }
  });
};
