require('source-map-support').install();

var spawn = require("child_process").spawn;
var concat = require("concat-stream");
var path = require("path");
var sourceMap = require("source-map");

var assert = require("chai").assert;

var cli = require("../lib/cli/tacoscript");

function testRun(args, exitCode, err) {
  if (exitCode == null) exitCode = 0;
  return function(done) {
    process.chdir(__dirname);

    var ps = spawn(process.execPath, [
      path.resolve(__dirname, '../bin/tacoscript.js'),
    ].concat(args));

    var hasOutput = false;
    ps.stdout.pipe(concat(function (body) {
      if (body) hasOutput = true;
    }));

    var stderr;
    if (!err) ps.stderr.pipe(process.stderr);
    else ps.stderr.pipe(concat(function (body) {
      stderr = body;
    }))

    ps.on('exit', function (code) {
      assert.ok(hasOutput);
      assert.equal(code, exitCode);
      if (err) assert.match(stderr, err);
      done();
    });

    ps.stdin.end();
  }
}

suite("cli", function () {

  setup(function () {
    this.cwd = process.cwd();
  });

  teardown(function () {
    process.chdir(this.cwd);
  });

  test("help", testRun(['-h']));
  test("help compose", testRun(['-h', 'compose']));
  test("help compose 2", testRun(['compose', '-h']));
  test("help compose advanced", testRun(['compose', '-h', 'advanced']));
  test("version", testRun(['-V']));
  test("versions", testRun(['--VV']));
  test("versions 2", testRun(['version']));
  test("unknown command", testRun(['_blah'], 1, /Unknown command/));
  test("unknown command 2", testRun(['blah'], 1, /Unknown command/));
  test("unknown command 3", testRun(['index'], 1, /Unknown command/));
});
