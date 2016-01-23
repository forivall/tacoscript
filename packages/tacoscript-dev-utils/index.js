// borrowed from babel/packages/babylon/test.js
// TODO: move to external library

var fs = require('fs')

function ppJSON(v) {
  return v instanceof RegExp ? v.toString() : JSON.stringify(v, null, 2);
}

function addPath(str, pt) {
  if (str.charAt(str.length - 1) == ")") {
    var idx = str.lastIndexOf("(.");
    return str.slice(0, idx + 2)  + pt + "." + str.slice(idx + 2, str.length - 1) + ")";
  } else {
    return str + " (." + pt + ")";
  }
}

function misMatch(exp, act) {
  var mis;
  if (!exp || !act || (typeof exp != "object") || (typeof act != "object")) {
    if (exp !== act && typeof exp != "function")
      return ppJSON(exp) + " !== " + ppJSON(act);
  } else if (exp instanceof RegExp || act instanceof RegExp) {
    var left = ppJSON(exp), right = ppJSON(act);
    if (left !== right) return left + " !== " + right;
  } else if (exp.splice) {
    if (!act.slice) return ppJSON(exp) + " != " + ppJSON(act);
    if (act.length != exp.length) return "array length mismatch " + exp.length + " != " + act.length;
    for (var i = 0; i < act.length; ++i) {
      mis = misMatch(exp[i], act[i]);
      if (mis) return addPath(mis, i);
    }
  } else {
    for (var prop in exp) {
      mis = misMatch(exp[prop], act[prop]);
      if (mis) return addPath(mis, prop);
    }
  }
}

function chaiHelper(chai, utils) {
  var Assertion = chai.Assertion
  Assertion.addMethod('matches', function(ast) {
    var obj = this._obj
    var mismatched = misMatch(ast, obj)
    this.assert(!mismatched, mismatched, "expected ast to not be equal", ast, obj)
  })
}


function removeLocInfo(json) {
  if (Object.prototype.toString.call(json) === '[object Array]') {
    // for (var i = 0, len = json.length; i < len; i++) {
    // walk backwards so that duplicate trailingComments are removed
    for (var i = json.length - 1; i >= 0; i--) {
      if (json[i] != null) removeLocInfo(json[i]);
    }
  } else {
    delete json.start;
    delete json.end;
    delete json.loc;
    delete json.tokenStart;
    delete json.tokenEnd;
    delete json.sourceElements;
    delete json.sourceElementsTACO;
    if (json.leadingComments == null) delete json.leadingComments;
    if (json.innerComments == null) delete json.innerComments;
    if (json.trailingComments == null) delete json.trailingComments;
    if (json.type === "BlockStatement" && json.directives != null && json.directives.length === 0) {
      delete json.directives;
    }
    for (var k in json) {
      if (json[k] != null && (typeof json[k]) === 'object') {
        removeLocInfo(json[k]);
        if (k === "extra") {
          delete json.extra.rawValue;
          delete json.extra.parenStart;
          if (Object.keys(json.extra).length === 0) delete json.extra;
        }
      }
    }
  }
  // TODO: store this modified JSON
  return json;
}

function saveAst(filepath, ast) {
  delete ast.tokens
  delete ast.source
  removeLocInfo(ast)
  fs.writeFileSync(filepath, JSON.stringify(ast, null, '  '), 'utf-8')
  throw new Error("Unverified ast file: " + filepath)
}

exports.ppJSON = ppJSON;
exports.addPath = addPath;
exports.misMatch = misMatch;
exports.chaiHelper = chaiHelper;
exports.removeLocInfo = removeLocInfo;
exports.saveAst = saveAst;
