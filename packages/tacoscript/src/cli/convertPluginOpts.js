
import map from "lodash/map";
import omit from "lodash/omit";

export default function convertPluginOpts(opts) {
  opts = [].concat(opts); // ensure wrapped in array
  return map(opts, (pluginArg) => {
    if (typeof pluginArg === 'string') {
      return pluginArg;
    }
    if (pluginArg[""].length !== 1) throw new Error("Invalid plugin configuration");
    return [pluginArg[""][0], omit(pluginArg, "")];
  });
}
