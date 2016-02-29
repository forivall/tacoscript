// TODO: abstract this out into an external module

import path from "path";

import getV8Flags from "v8flags";

const scriptPath = path.join(__dirname, "../../../bin/_tacoscript-node.js");

// adapted from babel-node
export default function(defaults, args, cb) {
  // TODO: convert defaults into appropriate arguments

  const cmd = [scriptPath];
  const nodeFlags = [];
  const argSeparator = args.indexOf("--");
  const combinedArgs = argSeparator > -1 ? args.slice(argSeparator) : args;
  const explicitArgs = argSeparator > -1 ? args.slice(0, argSeparator) : [];

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
          if (v8Flags.indexOf(arg) >= 0 || arg.indexOf("--trace") === 0) {
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
