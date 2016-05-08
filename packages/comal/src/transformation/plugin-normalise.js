import msg from "../messages";
import resolve from "../helpers/resolve";

import Plugin from "./plugin";

import compact from "lodash/compact";

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

function getModuleProp(prop, module) {
  if (module.__esModule) {
    if (prop) {
      return module[prop];
    } else {
      return module.default;
    }
  } else if (prop && isValidPlugin(module[prop])) {
    return module[prop];
  } else {
    return false;
  }
}

function normalisePluginModule(prop, plugin) {
  return getModuleProp(prop, plugin) || plugin;
}

// TODO: async, support System.import
function loadPlugin(prefix, id, dirname, loc, i) {
  let pluginLoc = prefix && resolve(`${prefix}-${id}`, dirname) || resolve(id, dirname);
  if (pluginLoc) {
    return require(pluginLoc);
  } else {
    throw new ReferenceError(msg("pluginUnknown", id, loc, i, dirname));
  }
}

export function normalisePlugins(meta, loc, dirname, plugins, context) {
  const prefix = meta.loader.pluginModulePrefix != null ? meta.loader.pluginModulePrefix : false;
  return plugins.map(function (val, i) {
    let plugin, options;

    if (!val) {
      throw new TypeError("Falsy value found in plugins");
    }

    // destructure plugins
    if (Array.isArray(val)) {
      [plugin, options] = val;
    } else {
      plugin = val;
    }

    // allow plugins to be specified as strings
    if (typeof plugin === "string") {
      plugin = loadPlugin(prefix, plugin, dirname, loc, i);
    }
    plugin = normalisePluginModule(meta.loader.pluginProp, plugin);

    let alias = typeof plugin === "string" ? plugin : `${loc}$${i}`;
    plugin = normalisePlugin(plugin, loc, i, alias, context);

    return [plugin, options];
  });
}

export function normaliseGeneratorPlugins(meta, dirname, plugins, fromCorePlugins = false) {
  const prefix = meta.loader.pluginModulePrefix != null ? meta.loader.pluginModulePrefix : false;
  let normalised = plugins.map(function (val, i) {
    let plugin;

    // destructure plugins
    const destructured = Array.isArray(val);
    if (destructured) {
      [plugin] = val;
    } else {
      plugin = val;
    }

    // allow plugins to be specified as strings
    if (typeof plugin === "string") {
      plugin = loadPlugin(prefix, plugin, dirname, i);
    }
    if (fromCorePlugins) {
      return getModuleProp(meta.loader.generatorPluginProp, plugin);
    } else {
      return normalisePluginModule(meta.loader.generatorPluginProp, plugin);
    }
  });
  if (fromCorePlugins) {
    return compact(normalised);
  }
  return normalised;
}
