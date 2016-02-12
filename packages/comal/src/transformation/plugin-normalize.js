import msg from "../messages";
import resolve from "../helpers/resolve";

import Plugin from "./plugin";

const pluginCache = [];

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

function memoisePluginContainer(fn, loc, i, alias, context) {
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

function isValidPlugin(plugin) {
  return typeof plugin === "function" || (typeof plugin === "object" && plugin !== null);
}

export function normalisePlugin(plugin, loc, i, alias, context) {
  if (!(plugin instanceof Plugin)) {
    // allow plugin containers to be specified so they don't have to manually require
    if (isValidPlugin(plugin)) {
      plugin = memoisePluginContainer(plugin, loc, i, alias, context);
    } else {
      throw new TypeError(msg("pluginNotFunction", loc, i, typeof plugin));
    }
  }

  plugin.init(loc, i);

  return plugin;
}

function normalisePluginModule(meta, plugin) {
  const pluginProp = meta.loader.pluginProp;
  if (plugin.__esModule) {
    if (pluginProp) {
      return plugin[pluginProp];
    } else {
      return plugin.default;
    }
  } else if (pluginProp && isValidPlugin(plugin[pluginProp])) {
    return plugin[pluginProp];
  } else {
    return plugin;
  }
}

export function normalisePlugins(meta, loc, dirname, plugins, context, prefix: (string|false) = false) {
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
        // TODO: load plugins with systemjs + async optionally instead
        plugin = require(pluginLoc);
      } else {
        throw new ReferenceError(msg("pluginUnknown", plugin, loc, i, dirname));
      }
    }

    plugin = normalisePluginModule(meta, plugin);

    plugin = normalisePlugin(plugin, loc, i, alias, context);

    return [plugin, options];
  });
}
