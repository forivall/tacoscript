if (process.browser) {
  require("../lib/browser");
  require("./generation");
  require("./transformation");
  require("./traverse");
  require("./util");
}
