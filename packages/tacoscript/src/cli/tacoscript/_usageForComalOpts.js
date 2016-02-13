import wrap from "word-wrap";

import {coreOptions} from "comal";

import kebabCase from "kebab-case";

import transform from "lodash/transform"
import isArray from "lodash/isArray"

export default function(argConf, ...rest) {
  const cb = rest.pop();
  const extra = rest[0] || {};

  console.warn("Advanced Options:\n");

  if (extra.before) console.warn(wrap(extra.before, {width: 80}) + "\n");

  for (let optName in coreOptions) {
    let optConf = coreOptions[optName];
    if (optConf.hidden) continue;

    let opts = ["--" + kebabCase(optName)].concat(transform(coreOptions, (aliases, aliasConf, aliasName) => {
      if (aliasConf.alias === optName) aliases.push("--" + kebabCase(aliasName))
    }, []));

    if (optConf.shorthand) opts.push("-" + optConf.shorthand);

    console.warn(wrap(opts.join(', '), {indent: '  ', width: 78}));

    if (extra.default && optConf.default && (!isArray(optConf.default) || optConf.default.length)) {
      console.warn(wrap(`(default: ${optConf.default})`, {indent: '      ', width: 74}));
    }

    if (optConf.description) {
      console.warn(wrap(optConf.description, {indent: '    ', width: 76}));
    }

    console.warn();
  }

  if (extra.after) console.warn("\n" + wrap(extra.after, {width: 80}));

  cb({code: 1});
}
