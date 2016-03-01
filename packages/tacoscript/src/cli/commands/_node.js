
import Module from "module";
import util from "util";
import vm from "vm";

import camelize from "camelize";
import {coreOptions as comalCoreOptions} from "comal";
const comalCoreOptionNames = Object.keys(comalCoreOptions);
import cloneDeep from "lodash/cloneDeep";
import omit from "lodash/omit";
import pick from "lodash/pick";
import trimEnd from "lodash/trimEnd";
import subarg from "subarg";
import * as requireHook from "tacoscript-require-hook";

import baseArgs from "../base-args";
import argsWithComalOpts from "../convertComalOpts";
import convertPluginOpts from "../convertPluginOpts";

import compose from "../../compose/api";

export default function(defaults, argv, cb) {
  /// PARSE ARGUMENTS

  const comalUnknownOptionNames = [];

  const opts = cloneDeep(baseArgs);
  opts.boolean.push();
  opts.string.push("extensions");
  opts.alias["extensions"] = ["x"];
  opts.alias["plugin"] = ["p"];
  opts.alias["eval"] = ["e", "exec"];
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

  /// RUN

  const transformer = compose.createTransform(comalOpts);

  // TODO: see if this needs to be createContext(Object.create(global))
  const ctx = vm.createContext(global);
  function evalInContext(code, filename) {
    code = trimEnd(code);
    if (!code) return undefined;

    const js = compose.exec(transformer, code, {filename}).code;

    return vm.runInContext(js, ctx, {filename});
  }

  if (args.eval || args.print) {
    const code = args.eval ? (args.eval === true ? args.print : args.eval) : args.print;

    ctx.__filename = "[eval]";
    ctx.__dirname = process.cwd();

    const module = new Module(ctx.__filename);
    module.filename = ctx.__filename;
    module.paths = Module._nodeModulePaths(ctx.__dirname);

    ctx.exports = module.exports;
    ctx.module = module;
    ctx.require = module.require.bind(module);

    const result = evalInContext(code, ctx.__filename);

    if (args.print) {
      const output = util.inspect(result);
      process.stdout.write(output + "\n");
    }

    return cb();
  }

  cb();
}
