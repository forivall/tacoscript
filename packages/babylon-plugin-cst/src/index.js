
// broken after babylon v6.3.27. Use v6.3.26 or switch to cstify
import { plugins as babylonPlugins } from "babylon/lib/parser";
import plugin from "./plugin";

export function install() {
  babylonPlugins.cst = plugin;
}
