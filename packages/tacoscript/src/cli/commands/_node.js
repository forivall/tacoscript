// TODO: abstract this out into an external module

export default function(defaults, args, cb) {
  console.log("_node called with args", args, defaults);
  cb();
}
