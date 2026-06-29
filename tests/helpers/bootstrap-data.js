const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadBootstrapData(root = path.resolve(__dirname, "..", "..")) {
  const context = { window: {} };
  context.window.window = context.window;
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "assets", "js", "bootstrap-data.js"), "utf8"),
    context,
    { filename: "bootstrap-data.js" }
  );
  return JSON.parse(JSON.stringify(context.window.CAIXA_LOTERIAS_BOOTSTRAP_DATA));
}

module.exports = { loadBootstrapData };
