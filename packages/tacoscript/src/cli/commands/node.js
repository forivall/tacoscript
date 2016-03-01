// TODO: abstract this out into an external module

import path from "path";

import {coreOptions as comalCoreOptions} from "comal";
import includes from "lodash/includes";
import subarg from "subarg";
import getV8Flags from "v8flags";

import usage from "../usage";
import usageAdvanced from "../usage/comal";

const scriptPath = path.join(__dirname, "../../../bin/_tacoscript-node.js");

// adapted from babel-node
export default function(defaults, argv, cb) {
  if (includes(argv, "--help") || includes(argv, "-h")) {
    if (subarg(argv, {alias: {"help": ["h"]}}).help === "advanced") {
      return usageAdvanced(comalCoreOptions, cb);
    } else {
      return usage("node", cb);
    }
  }

  const cmd = [scriptPath];

  // convert defaults into appropriate arguments
  if (defaults["debug-internal"]) cmd.push("--debug-internal");
  if (defaults["verbose"]) cmd.push("--verbose");
  if (defaults["quiet"]) cmd.push("--quiet");

  const nodeFlags = [];
  const argSeparator = argv.indexOf("--");
  const combinedArgs = argSeparator > -1 ? argv.slice(argSeparator) : argv;
  const explicitArgs = argSeparator > -1 ? argv.slice(0, argSeparator) : [];

  let forceChild = false;

  getV8Flags((err, v8Flags) => {
    combinedArgs.forEach((arg) => {
      const [flag] = arg.split("=");

      switch (flag) {
        case "-d":
          nodeFlags.push("--debug"); break;

        case "debug": case "--debug": case "--debug-brk":
          nodeFlags.push(arg); break;

        case "--gc": case "--expose-gc":
          nodeFlags.push("--expose-gc"); break;

        case "--nolazy":
          nodeFlags.push("--nolazy"); break;

        // TODO
        // case "-c": case "--child":
        //   forceChild = true;

        default:
          if (includes(v8Flags, arg) || arg.indexOf("--trace") === 0) {
            nodeFlags.push(arg);
          } else {
            cmd.push(arg);
          }
      }
    });

    const childArgs = [].concat(nodeFlags, cmd, explicitArgs);

    let kexec;
    if (!forceChild) {
      try {
        kexec = require("kexec");
      } catch (e) {
        if (e.code !== "MODULE_NOT_FOUND" || e.message !== "Cannot find module 'kexec'") {
          throw e;
        }
      }
    }

    if (kexec) {
      kexec(process.execPath, childArgs);
    } else {
      const childProcess = require("child_process");
      const proc = childProcess.spawn(process.execPath, childArgs, {stdio: "inherit"});
      proc.on("exit", (code, signal) => {
        // TODO: document why this is needed -- as is, was used in babel-node
        process.on("exit", () => {
          if (signal) {
            process.kill(process.pid, signal);
          } else {
            cb(code);
          }
        });
      });
    }
  });
}
