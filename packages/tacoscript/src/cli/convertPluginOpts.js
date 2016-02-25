
import map from "lodash/map";
import omit from "lodash/omit";
import camelize from "camelize";

export default function convertPluginOpts(opts) {
  opts = [].concat(opts); // ensure wrapped in array
  return map(opts, (pluginArg) => {
    if (typeof pluginArg === 'string') {
      return pluginArg;
    }
    if (pluginArg._.length !== 1) throw new Error("Invalid plugin configuration");
    return [pluginArg._[0], camelize(omit(pluginArg, "_"))];
  });
}
