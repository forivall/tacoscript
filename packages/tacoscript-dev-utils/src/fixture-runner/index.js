/* global test */
/* global suite */

import path from "path";
// import getFixtures from "mocha-fixtures-generic";
import getFixtures from "babel-helper-fixtures";
import sourceMap from "source-map";
import codeFrame from "babel-code-frame";
import * as helpers from "./helpers";
import chai from "chai";
import _ from "lodash";
// import type {Api} from "comal";

function run(api, task) {
  let actual = task.actual;
  let expect = task.expect;
  let exec   = task.exec;
  let opts   = task.options;

  function getOpts(self) {
    let newOpts = _.merge({
      filename: self.loc,
    }, opts);

    return newOpts;
  }

  let execCode = exec.code;
  let result;

  if (execCode) {
    let execOpts = getOpts(exec);
    result = api.transform(execCode, execOpts);
    execCode = result.code;

    try {
      runExec(api, execOpts, execCode);
    } catch (err) {
      err.message = exec.loc + ": " + err.message;
      err.message += codeFrame(execCode);
      throw err;
    }
  }

  let actualCode = actual.code;
  let expectCode = expect.code;
  if (!execCode || actualCode) {
    result     = api.transform(actualCode, getOpts(actual));
    actualCode = result.code.trim();

    try {
      chai.expect(actualCode).to.be.equal(expectCode, actual.loc + " !== " + expect.loc);
    } catch (err) {
      //require("fs").writeFileSync(expect.loc, actualCode);
      throw err;
    }
  }

  if (task.sourceMap) {
    chai.expect(result.map).to.deep.equal(task.sourceMap);
  }

  if (task.sourceMappings) {
    let consumer = new sourceMap.SourceMapConsumer(result.map);

    _.each(task.sourceMappings, function (mapping) {
      let actual = mapping.original;

      let expect = consumer.originalPositionFor(mapping.generated);
      chai.expect({ line: expect.line, column: expect.column }).to.deep.equal(actual);
    });
  }
}

function runExec(api, opts, execCode) {
  let sandbox = {
    ...helpers,
    assert: chai.assert,
    transform: api.transform,
    opts,
    exports: {},
  };

  let fn = new Function(...Object.keys(sandbox), execCode);
  return fn.apply(null, Object.values(sandbox));
}

export default function (
  api,
  fixturesLoc: string,
  name: string,
  suiteOpts = {},
  taskOpts = {},
  dynamicOpts?: Function,
) {
  // let suites = getFixtures(fixturesLoc, getFixtures.presets.babel);
  let suites = getFixtures(fixturesLoc);

  for (let testSuite of suites) {
    if (_.includes(suiteOpts.ignoreSuites, testSuite.title)) continue;

    suite(name + "/" + testSuite.title, function () {
      for (let task of testSuite.tests) {
        if (_.includes(suiteOpts.ignoreTasks, task.title) ||
            _.includes(suiteOpts.ignoreTasks, testSuite.title + "/" + task.title)) continue;

        test(task.title, !task.disabled && function () {
          function runTask() {
            run(api, task);
          }

          _.defaults(task.options, {
            filenameRelative: task.expect.filename,
            sourceFileName:   task.actual.filename,
            sourceMapTarget:  task.expect.filename,
            suppressDeprecationMessages: true,
            dotfiles: false,
            sourceMap: !!(task.sourceMappings || task.sourceMap),
          });

          _.extend(task.options, taskOpts);

          if (dynamicOpts) dynamicOpts(task.options, task);

          let throwMsg = task.options.throws;
          if (throwMsg) {
            // internal api doesn't have this option but it's best not to pollute
            // the options object with useless options
            delete task.options.throws;

            chai.assert.throws(runTask, function (err) {
              return throwMsg === true || err.message.indexOf(throwMsg) >= 0;
            });
          } else {
            runTask();
          }
        });
      }
    });
  }
}
