
// Warning: this plugin signature may change significantly before 1.0

export default function () {
  return {
    manipulateOptions(opts, parserOpts) {
      parserOpts.features.push("strudelThisMember");
    }
  };
}
