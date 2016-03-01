
import Module from "module";
import path from "path";
import repl from "repl";
import util from "util";
import vm from "vm";

import babelPresetEs2015 from "babel-preset-es2015";
import babelPresetStage0 from "babel-preset-stage-0";
import camelize from "camelize";
import {coreOptions as comalCoreOptions} from "comal";
const comalCoreOptionNames = Object.keys(comalCoreOptions);
import cloneDeep from "lodash/cloneDeep";
import map from "lodash/map";
import omit from "lodash/omit";
import pick from "lodash/pick";
import trimEnd from "lodash/trimEnd";
import subarg from "subarg";
import * as requireHook from "tacoscript-require-hook";

import baseArgs from "../base-args";
import argsWithComalOpts from "../convertComalOpts";
import convertPluginOpts from "../convertPluginOpts";

import compose from "../../compose/api";
import compile from "../../compile/api";

export default function(defaults, argv, cb) {
  /// PARSE ARGUMENTS

  const comalUnknownOptionNames = [];

  const opts = cloneDeep(baseArgs);
  opts.boolean.push();
  opts.string.push("extensions");
  opts.alias["extensions"] = ["x"];
  opts.alias["plugin"] = ["p"];
  opts.alias["eval"] = ["e", "exec"];
  opts.alias["compile"] = ["c"];
  opts.alias["print"] = ["o"];
  opts.default = omit(defaults, "_");
  opts.unknown = (arg) => {
    const match = /^--([^=]+)=/.exec(arg) || /^--(?:no-)(.+)/.exec(arg);
    if (match) comalUnknownOptionNames.push(match[1]);
  };
  opts.stopEarly = true;

  const args = subarg(argv, argsWithComalOpts(comalCoreOptions, opts));

  const comalOpts = camelize(pick(args, comalCoreOptionNames, comalUnknownOptionNames));

  if (args.plugin) {
    try { comalOpts.plugins = convertPluginOpts(args.plugin) }
    catch (e) { return cb(e); }
  }

  if (args.extensions) {
    comalOpts.only = (comalOpts.only ? comalOpts.only + "," : "") +
      map(args.extensions.split(","), (e) => "*" + e).join(",");
  }

  comalOpts.compile = args.compile;

  /// RUN

  // TODO: share / use the same transformer / compiler as the require hook

  requireHook.enable(comalOpts);

  const transformer = compose.createTransform(comalOpts);

  // TODO: as with tacoscript-require-hook, use options from .babelrc etc.
  const compiler = args.compile && compile.createTransform({
    presets: [babelPresetEs2015, babelPresetStage0],
    compact: true
  });

  function evalInContext(code, filename, ctx) {
    code = trimEnd(code);
    if (!code) return undefined;

    let results = compose.exec(transformer, code, {filename});

    if (compiler) {
      results = compile.execFromAst(compiler, results.ast, code, {filename});
    }

    let js = results.code;

    if (!compiler) js = "'use strict';" + js;

    // TODO: add option for the auto-strict
    return vm.runInContext(js, ctx, {filename});
  }

  if (args.eval || args.print) {
    // TODO: see if this needs to be createContext(Object.create(global))
    const ctx = vm.createContext(global);

    const code = args.eval ? (args.eval === true ? args.print : args.eval) : args.print;

    ctx.__filename = "[eval]";
    ctx.__dirname = process.cwd();

    const module = new Module(ctx.__filename);
    module.filename = ctx.__filename;
    module.paths = Module._nodeModulePaths(ctx.__dirname);

    ctx.exports = module.exports;
    ctx.module = module;
    ctx.require = module.require.bind(module);

    const result = evalInContext(code, ctx.__filename, ctx);

    if (args.print) {
      const output = util.inspect(result);
      process.stdout.write(output + "\n");
    }

    return cb(0);
  }

  if (args._.length) {
    const childArgv = args._.slice();

    // make the filename absolute
    childArgv[0] = path.resolve(childArgv[0]);

    // replace our args with the child context
    // TODO: see how coffeescript does this, instead of babel-node
    process.argv = ["node"].concat(childArgv);
    process.execArgv.unshift(__filename);

    Module.runMain();
    return cb(0);
  }

  repl.start({
    prompt: "> ",
    input: process.stdin,
    output: process.stdout,
    eval: (code, ctx, filename, callback) => {
      let err;
      let result;

      try {
        // TODO: see coffeescript repl for line continuation logic
        result = evalInContext(code, filename, ctx);
      } catch (e) {
        err = e;
      }

      callback(err, result);
    }
  });
  return cb(0);
}
