const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const config = read("app", "config", "config.php");
const helpers = read("app", "helpers", "helpers.php");
const appSource = read("assets", "js", "app.js");
const appPublic = read("public", "assets", "js", "app.js");
const cssSource = read("assets", "css", "styles.css");
const cssPublic = read("public", "assets", "css", "styles.css");
const phpHeader = read("views", "components", "header.php");

assert.match(config, /define\('APP_VERSION',\s*getenv\('APP_VERSION'\)\s*\?:\s*'1\.0\.0'\);/);
assert.equal((config.match(/'1\.0\.0'/g) || []).length, 1, "a versão deve ter um único valor padrão");
assert.match(helpers, /data-app-version=/, "a versão deve ser publicada no documento HTML");
assert.doesNotMatch(phpHeader, /v1\.0\.0/, "o cabeçalho PHP não deve duplicar o valor da versão");
assert.match(phpHeader, /v<\?= e\(APP_VERSION\) \?>/);

const context = {
  URLSearchParams,
  console,
  window: {},
  document: {
    documentElement: { dataset: { appVersion: "1.0.0" } },
    body: { classList: { add() {} }, insertAdjacentHTML() {} },
    addEventListener() {}
  }
};
vm.createContext(context);
vm.runInContext(appSource, context);

const internals = context.window.__APP_HEADER_TEST_INTERNALS__;
assert.ok(internals, "os utilitários testáveis do cabeçalho devem estar disponíveis");
for (const perfil of ["Administrador", "Unidade Apuradora", "Diretoria Homologadora", "Consulta/Gestão"]) {
  const brand = internals.renderBrand(`/logo-${perfil}.png`);
  assert.match(brand, /Indicadores Estratégicos[\s\S]*class="system-version"[\s\S]*v1\.0\.0/);
  assert.equal((brand.match(/system-version/g) || []).length, 1, `versão duplicada para ${perfil}`);
}

assert.match(appSource, /\$\{renderBrand\(logoUrl\)\}/, "o shell compartilhado deve renderizar a marca versionada");
assert.equal(appSource, appPublic, "assets/js e public/assets/js devem ser idênticos");
assert.equal(cssSource, cssPublic, "assets/css e public/assets/css devem ser idênticos");
assert.match(cssSource, /\.system-version[\s\S]*font-size:\s*12px/);
assert.match(cssSource, /@media \(max-width: 480px\)[\s\S]*\.system-version[\s\S]*display:\s*none/);

const frontendViews = [
  "administracao.php",
  "homologacao.php",
  "indicadores.php",
  "lancamentos.php",
  "login.php",
  "relatorios.php",
  "resumo-executivo.php",
  "visao-trimestral.php"
];
for (const view of frontendViews) {
  const contents = read("views", "frontend", view);
  assert.doesNotMatch(contents, /v1\.0\.0/, `${view} não deve declarar a versão diretamente`);
  assert.match(contents, /assets\/css\/styles\.css\?v=APP-VERSION-001/);
  assert.match(contents, /assets\/js\/app\.js\?v=APP-VERSION-001/);
}

console.log("app-version.test.js: OK");
