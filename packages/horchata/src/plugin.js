// Plugin registry API

import Lexer from "./lexer";
import Parser from "./parser";

// Flexible API
export function registerPlugin(name, load, init) {
  Parser.addPlugin(name, load);
  if (init != null) init(Parser.prototype, Lexer.prototype);
}

// Simplified module API
export function registerPluginModule(name, parser, lexer) {
  registerPlugin(name, loadModule(parser, lexer), initModule(parser, lexer));
}

export function loadModule(parserModule, lexerModule) {
  const parserExtenders = [];
  const lexerExtenders = [];

  if (lexerModule) for (let method in lexerModule) {
    if (method !== '__esModule' && /^extend[A-Z]/.test(method)) {
      let extender = {name: removeExtendPrefix(method), function: lexerModule[method]};
      parserExtenders.push(extender);
      lexerExtenders.push(extender);
    }
  }

  for (let method in parserModule) {
    if (method !== '__esModule' && /^extend[A-Z]/.test(method)) {
      let extender = {name: removeExtendPrefix(method), function: parserModule[method]};
      parserExtenders.push(extender);
    }
  }

  return function(instance) {
    if (instance.__isParser) {
      for (const extender of (parserExtenders: Array)) {
        instance.extend(extender.name, extender.function);
      }
    } else {
      for (const extender of (lexerExtenders: Array)) {
        instance.extend(extender.name, extender.function);
      }
    }
  }
}

function removeExtendPrefix(s) {
  return String.fromCharCode(s.charCodeAt(6) + 32) + s.slice(7);
}

export function initModule(parserModule, lexerModule) {
  return function(pp, lp) {
    // TODO: error if overriding
    if (lexerModule) for (let method in lexerModule) {
      if (method !== '__esModule' && !/^extend[A-Z]/.test(method)) {
        lp[method] = lexerModule[method];
      }
    }

    for (let method in parserModule) {
      if (method !== '__esModule' && !/^extend[A-Z]/.test(method)) {
        pp[method] = parserModule[method];
      }
    }
  }
}
