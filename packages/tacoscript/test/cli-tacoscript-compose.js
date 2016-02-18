require('source-map-support').install();

var spawn = require("child_process").spawn;
var concat = require("concat-stream");
var path = require("path");
var vm = require('vm');
var fs = require('fs');
var sourceMap = require("source-map");

var assert = require("chai").assert;

var cli = require("../lib/cli/tacoscript");

var temp = require("temp");
temp.track();

suite("cli", function () {
  var tempdir;

  suiteSetup(function(done) {
    temp.mkdir('tacoscript-test', function(err, path) {
      if (err) return done(err);
      tempdir = path;
      done();
    });
  })

  suiteTeardown(function(done) {
    temp.cleanup(done);
  })

  setup(function () {
    this.cwd = process.cwd();
  });

  teardown(function () {
    process.chdir(this.cwd);
  });

  test("stdin - stdout", function(done) {
    process.chdir(__dirname);

    var ps = spawn(process.execPath, [
      path.resolve(__dirname, '../bin/tacoscript.js'),
      "compose"
    ]);

    var hasOutput = false;
    var ranCode = false;
    ps.stdout.pipe(concat(function (body) {
      hasOutput = true;
      var c = { console: {
        log: function (msg) {
          ranCode = true;
          assert.equal(msg, 'hello');
        }
      } };
      vm.runInNewContext(body, c);
    }));
    ps.stderr.pipe(process.stderr);

    ps.on('exit', function (code) {
      assert.ok(hasOutput);
      assert.ok(ranCode);
      assert.equal(code, 0);
      done();
    });

    ps.stdin.write("console.log! 'hello'");

    ps.stdin.end();
  });

  test("stdin - fileout", function(done) {
    process.chdir(__dirname);

    var outfile = path.join(tempdir, "console-log.js");

    var ps = spawn(process.execPath, [
      path.resolve(__dirname, '../bin/tacoscript.js'),
      "compose", "-o", outfile
    ]);

    ps.stderr.pipe(process.stderr);

    ps.on('exit', function (code) {
      assert.equal(code, 0);

      fs.readFile(outfile, function(err, body) {
        if (err) throw err;

        var ranCode = false;
        var c = { console: {
          log: function (msg) {
            ranCode = true;
            assert.equal(msg, 'hello');
          }
        } };
        vm.runInNewContext(body, c);

        assert.ok(ranCode);

        done();
      });
    });

    ps.stdin.write("console.log! 'hello'");

    ps.stdin.end();
  });

  test("filein - stdout", function(done) {
    process.chdir(__dirname);

    var ps = spawn(process.execPath, [
      path.resolve(__dirname, '../bin/tacoscript.js'),
      "compose", "./fixtures/cli/console-log.taco"
    ]);

    var hasOutput = false;
    var ranCode = false;
    ps.stdout.pipe(concat(function (body) {
      hasOutput = true;
      var c = { console: {
        log: function (msg) {
          ranCode = true;
          assert.equal(msg, 'hello');
        }
      } };
      vm.runInNewContext(body, c);
    }));
    ps.stderr.pipe(process.stderr);

    ps.on('exit', function (code) {
      assert.ok(hasOutput);
      assert.ok(ranCode);
      assert.equal(code, 0);
      done();
    });

    ps.stdin.end();
  });

  test("filein - fileout", function(done) {
    process.chdir(__dirname);

    var outfile = path.join(tempdir, "console-log-2.js");

    var ps = spawn(process.execPath, [
      path.resolve(__dirname, '../bin/tacoscript.js'),
      "compose", "./fixtures/cli/console-log.taco", "-o", outfile
    ]);

    ps.stderr.pipe(process.stderr);

    ps.on('exit', function (code) {
      assert.equal(code, 0);

      fs.readFile(outfile, function(err, body) {
        if (err) throw err;

        var ranCode = false;
        var c = { console: {
          log: function (msg) {
            ranCode = true;
            assert.equal(msg, 'hello');
          }
        } };
        vm.runInNewContext(body, c);

        assert.ok(ranCode);

        done();
      });
    });

    ps.stdin.end();
  });
});
