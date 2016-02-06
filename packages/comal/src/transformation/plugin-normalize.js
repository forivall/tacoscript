import * as context from "../index";
import msg from "../messages";
import resolve from "../helpers/resolve";

import Plugin from "./plugin";

const pluginCache = {};

type PluginObject = {
  pre?: Function;
  post?: Function;
  manipulateOptions?: Function;

  visitor: ?{
    [key: string]: Function | {
      enter?: Function | Array<Function>;
      exit?: Function | Array<Function>;
    }
  };
};

function memoisePluginContainer(fn, loc, i, alias) {
  for (let cacheItem of (pluginCache: Array<Object>)) {
    if (cacheItem.container === fn) return cacheItem.plugin;
  }

  let obj: ?PluginObject;

  if (typeof fn === "function") {
    obj = fn(context);
  } else {
    obj = fn;
  }

  if (typeof obj === "object") {
    let plugin = new Plugin(obj, alias);
    pluginCache.push({
      container: fn,
      plugin: plugin
    });
    return plugin;
  } else {
    throw new TypeError(msg("pluginNotObject", loc, i, typeof obj) + loc + i);
  }
}

export function normalisePlugin(plugin, loc, i, alias) {
  plugin = plugin.__esModule ? plugin.default : plugin;

  if (!(plugin instanceof Plugin)) {
    // allow plugin containers to be specified so they don't have to manually require
    if (typeof plugin === "function" || typeof plugin === "object") {
      plugin = memoisePluginContainer(plugin, loc, i, alias);
    } else {
      throw new TypeError(msg("pluginNotFunction", loc, i, typeof plugin));
    }
  }

  plugin.init(loc, i);

  return plugin;
}

export function normalisePlugins(loc, dirname, plugins, prefix: (string|false) = false) {
  return plugins.map(function (val, i) {
    let plugin, options;

    // destructure plugins
    if (Array.isArray(val)) {
      [plugin, options] = val;
    } else {
      plugin = val;
    }

    let alias = typeof plugin === "string" ? plugin : `${loc}$${i}`;

    // allow plugins to be specified as strings
    if (typeof plugin === "string") {
      let pluginLoc = prefix && resolve(`${prefix}-${plugin}`, dirname) || resolve(plugin, dirname);
      if (pluginLoc) {
        plugin = require(pluginLoc);
      } else {
        throw new ReferenceError(msg("pluginUnknown", plugin, loc, i, dirname));
      }
    }

    plugin = normalisePlugin(plugin, loc, i, alias);

    return [plugin, options];
  });
}
