import * as parser from "./parser";
import * as lexer from "./lexer";

// TODO: move this pattern into a standard horchata parser loader module.

export function init(pp, lp) {
  // TODO: error if overriding
  for (let method in lexer) {
    if (!/^extend[A-Z]/.test(method)) {
      lp[method] = lexer[method];
    }
  }

  for (let method in parser) {
    if (!/^extend[A-Z]/.test(method)) {
      pp[method] = parser[method];
    }
  }
}

export function load(instance, options) {
  for (let method in lexer) {
    if (/^extend[A-Z]/.test(method)) {
      instance.extend(removeExtendPrefix(method), lexer[method]);
    }
  }

  if (instance.__isParser) for (let method in parser) {
    if (/^extend[A-Z]/.test(method)) {
      instance.extend(removeExtendPrefix(method), parser[method]);
    }
  }
}

function removeExtendPrefix(s) {
  return String.fromCharCode(s.charCodeAt(6) + 32) + s.slice(7);
}
