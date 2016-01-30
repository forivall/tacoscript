// Plugin registry API

import Lexer from "./lexer";
import Parser from "./parser";
import {types as tt} from "./lexer/types";
import {types as ct} from "./lexer/context-types";
import {added} from "./lexer/serialization";

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

function defaultUpdateContext(type) {
  this.state.exprAllowed = type.beforeExpr;
}

export function initModule(parserModule, lexerModule) {
  return function(pp, lp) {

    if (lexerModule) {

      if (lexerModule.tokenTypes) {
        for (let typeKey in lexerModule.tokenTypes) {
          if (typeKey in tt) throw new Error(`Token type "${typeKey}" already defined`);
          tt[typeKey] = lexerModule.tokenTypes[typeKey];
        }
        added();
      }

      if (lexerModule.contextTypes) {
        for (let typeKey in lexerModule.contextTypes) {
          if (typeKey in ct) throw new Error(`Context type "${typeKey}" already defined`);
          ct[typeKey] = lexerModule.contextTypes[typeKey];
        }
      }

      if (lexerModule.updateContext) {
        for (let ttKey in lexerModule.updateContext) {
          tt[ttKey].updateContext = lexerModule.updateContext[ttKey](tt[ttKey].updateContext || defaultUpdateContext);
        }
      }

      for (let method in lexerModule) {
        if (method !== '__esModule' && !/^extend[A-Z]|^(token|context)Types$|^updateContext$/.test(method)) {
          if (method in lp) throw new Error(`Lexer method "${method}" already defined`);
          lp[method] = lexerModule[method];
        }
      }
    }

    for (let method in parserModule) {
      if (method !== '__esModule' && !/^extend[A-Z]/.test(method)) {
        if (method in pp) throw new Error(`Parser method "${method}" already defined`);
        pp[method] = parserModule[method];
      }
    }
  }
}
