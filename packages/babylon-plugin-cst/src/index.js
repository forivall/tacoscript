
import { plugins as babylonPlugins } from "babylon/lib/parser";
console.log(require.resolve('babylon/lib/parser'))
import plugin from "./plugin";

export function install() {
  babylonPlugins.cst = plugin;
}
