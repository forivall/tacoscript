/* @noflow */

import {normalisePlugin} from "./plugin-normalize"
import msg from "../messages";
import Store from "../store";
import traverse from "comal-traverse";
import assign from "lodash/assign";
import clone from "lodash/clone";

const GLOBAL_VISITOR_PROPS: Array = ["enter", "exit"];

export default class Plugin {
  constructor(plugin: Object, key?: string) {
    this.store = new Store();

    this.initialized = false;
    this.raw         = assign({}, plugin);
    this.key         = key;

    this.manipulateOptions = this.take("manipulateOptions");
    this.post              = this.take("post");
    this.pre               = this.take("pre");
    this.visitor           = this.normaliseVisitor(clone(this.take("visitor")) || {});
  }

  initialized: boolean;
  raw: Object;
  manipulateOptions: ?Function;
  post: ?Function;
  pre: ?Function;
  visitor: Object;

  // proxy store
  get(key) { return this.store.get(key); }
  set(key, value) { return this.store.set(key, value); }
  setDynamic(key, value) { return this.store.setDynamic(key, value); }

  take(key) {
    let val = this.raw[key];
    delete this.raw[key];
    return val;
  }

  chain(target, key) {
    if (!target[key]) return this[key];
    if (!this[key]) return target[key];

    let fns: Array<?Function> = [target[key], this[key]];

    return function (...args) {
      let val;
      for (let fn of fns) {
        if (fn) {
          let ret = fn.apply(this, args);
          if (ret != null) val = ret;
        }
      }
      return val;
    };
  }

  maybeInherit(loc: string) {
    let inherits = this.take("inherits");
    if (!inherits) return;

    inherits = normalisePlugin(inherits, loc, "inherits");

    this.manipulateOptions = this.chain(inherits, "manipulateOptions");
    this.post = this.chain(inherits, "post");
    this.pre = this.chain(inherits, "pre");
    this.visitor = traverse.visitors.merge([inherits.visitor, this.visitor]);
  }

  /**
   * We lazy initialise parts of a plugin that rely on contextual information such as
   * position on disk and how it was specified.
   */

  init(loc: string, i: number) {
    if (this.initialized) return;
    this.initialized = true;

    this.maybeInherit(loc);

    for (let key in this.raw) {
      throw new Error(msg("pluginInvalidProperty", loc, i, key));
    }
  }

  normaliseVisitor(visitor: Object): Object {
    for (let key of GLOBAL_VISITOR_PROPS) {
      if (visitor[key]) {
        throw new Error("Plugins aren't allowed to specify catch-all enter/exit handlers. Please target individual nodes.");
      }
    }

    traverse.explode(visitor);
    return visitor;
  }
}
