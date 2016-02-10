var gulp = require('gulp');
var babel = require('gulp-babel');
var newer = require('gulp-newer');
var plumber = require('gulp-plumber');
var rename = require('gulp-rename');
var size = require('gulp-size');
var sourcemaps = require('gulp-sourcemaps');
var gutil = require('gulp-util');
var gwatch = require('gulp-watch');
var rimraf = require('rimraf');
var path = require('path');

function srcToLib(pathInfo) {
  pathInfo.dirname = pathInfo.dirname.replace("/src", "/lib");
}
function srcToLibStr(filePath) {
  var pathInfo = path.parse(filePath);
  pathInfo.dir = pathInfo.dir.replace("/src", "/lib");
  return path.format(pathInfo);
}

function buildFn(options) { return function() {
  var watch = !!options.watch, dist = !!options.dist, force = !!options.force;
  var s = gulp.src('packages/*/src/**/*.js');
  s = s.pipe(plumber({errorHandler: function (err) { gutil.log(err.stack); }}));
  if (watch) s = s.pipe(gwatch('packages/*/src/**/*.js'));
  if (!dist) s = s.pipe(sourcemaps.init());
  if (!force) s = s.pipe(newer({dest: 'packages', map: srcToLibStr}));
  s = s.pipe(babel());
  s = s.pipe(rename(srcToLib));
  s = s.pipe(size({showFiles: true}));
  if (!dist) s = s.pipe(sourcemaps.write('.', {includeContent: false, sourceRoot: process.cwd() + "/packages"}));
  s = s.pipe(gulp.dest('packages'));
  return s;
}}

function copyFn(options) { return function() {
  var watch = !!options.watch, force = !!options.force;
  var s = gulp.src('packages/*/src/**/!(*.js)');
  s = s.pipe(plumber({errorHandler: function (err) { gutil.log(err.stack); }}));
  // TODO: gwatch passes this directly to chokidar, which doesn't use minimatch
  if (watch) s = s.pipe(gwatch('packages/*/src/**/*.json'));
  if (!force) s = s.pipe(newer({dest: 'packages', map: srcToLibStr}));
  s = s.pipe(rename(srcToLib));
  s = s.pipe(size({showFiles: true}));
  s = s.pipe(gulp.dest('packages'));
  return s;
}}

gulp.task('default', buildFn({}));
gulp.task('clean-build', ['clean'], buildFn({}));
gulp.task('clean-watch', ['clean'], buildFn({watch: true}));
gulp.task('watch-build', buildFn({watch: true}));
gulp.task('watch-copy', copyFn({watch: true}));
gulp.task('watch', ['watch-build', 'watch-copy']);
gulp.task('force', buildFn({force: true}));
gulp.task('dist', ['clean'], buildFn({force: true, dist: true}));
gulp.task('clean', function(cb) { rimraf('packages/*/lib', cb); });
