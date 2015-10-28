var shell = require('shelljs')
var gulp = require('gulp')
var changed = require('gulp-changed')
var babel = require('gulp-babel')
var size = require('gulp-size')
var sourcemaps = require('gulp-sourcemaps')
var watch = require('gulp-watch')
var plumber = require('gulp-plumber')
var rename = require('gulp-rename')

gulp.task('clean', function() {
  shell.ls('packages').forEach(function(dir) {
    shell.rm('-r', 'packages/' + dir + '/lib/*');
  });
  // shell.rm('-r', 'packages/*/lib/*');
})

var buildFn = function(options) { return function() {
  var s = gulp.src('packages/*/src/**/*.js').pipe(plumber());
  if (options.watch) s = s.pipe(watch('packages/*/src/**/*.js'));
  // if (!options.force) s = s.pipe(changed('packages'));
  return s.pipe(sourcemaps.init())
  .pipe(babel())
  .pipe(rename(function(path) {
    path.dirname = path.dirname.replace("/src", "/lib");
  }))
  .pipe(size({showFiles: true}))
  .pipe(sourcemaps.write('packages', {includeContent: false, sourceRoot: process.cwd()}))
  .pipe(gulp.dest('packages'))
}}

gulp.task('default', buildFn({}))
gulp.task('watch', buildFn({watch: true}))
gulp.task('force', buildFn({force: true}))
