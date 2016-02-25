
import kebabCase from "kebab-case";

export default function(optConfig, argConf, extra = {}) {
  for (const optName in optConfig) {
    const optConf = optConfig[optName];
    if (optConf.hidden) continue;
    const optNameKebab = kebabCase(optName);

    switch (optConf.type) {
      case "string": case "filename": case "list":
        argConf.string.push(optNameKebab);

      break; case "boolean":
        argConf.boolean.push(optNameKebab);

      /*fallthrough*/ case "booleanString":
        if (extra.default) argConf.default[optNameKebab] = false;
    }

    if (extra.default && "default" in optConf) {
      argConf.default[optNameKebab] = optConf.default;
    }

    if ("shorthand" in optConf) {
      (argConf.alias[optNameKebab] || (argConf.alias[optNameKebab] = [])).push(optConf.shorthand);
    }

    if ("alias" in optConf) {
      const aliasKebab = kebabCase(optConf.alias);
      (argConf.alias[aliasKebab] || (argConf.alias[aliasKebab] = [])).push(optNameKebab);
    }
  }

  return argConf;
}
