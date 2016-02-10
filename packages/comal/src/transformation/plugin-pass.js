import type Plugin from "./plugin";
import Store from "../store";
import traverse from "comal-traverse";
import type Transformation from "./index";
import type File from "../file";

export default class PluginPass {
  constructor(transformer: Transformation, plugin: Plugin, options: Object = {}) {
    this.store = new Store();
    this.plugin = plugin;
    this.transformer = transformer;
    this.opts = options;
    this.file = null;
  }

  plugin: Plugin;
  transformer: Transformation;
  opts: Object;
  file: ?File;

  open(file: File) { this.file = file; }
  close() { this.file = null; }

  transform(file) {
    this.transformer.log.debug(`Start plugin pass ${this.key}`);
    traverse(file.ast, this.plugin.visitor, file.scope, file);
    this.transformer.log.debug(`Finish plugin pass ${this.key}`);
  }

  addHelper(...args) {
    return this.file.addHelper(...args);
  }

  addImport(...args) {
    return this.file.addImport(...args);
  }

  getModuleName(...args) {
    return this.file.getModuleName(...args);
  }

  buildCodeFrameError(...args) {
    return this.file.buildCodeFrameError(...args);
  }
}
