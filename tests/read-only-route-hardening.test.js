const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const routes = read("public", "index.php");

const hardened = {
  configuracoes: "configuracoes.php",
  relatorios: "relatorios.php",
  "resumo-executivo": "resumo-executivo.php",
  "visao-trimestral": "visao-trimestral.php"
};

for (const [route, handler] of Object.entries(hardened)) {
  const escapedRoute = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedHandler = handler.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(
    routes,
    new RegExp(`\\$router->get\\('/api/${escapedRoute}', \\$legacyApi\\('${escapedHandler}'\\)\\);`),
    `${route} deve aceitar somente GET`
  );
  assert.doesNotMatch(routes, new RegExp(`\\$router->any\\('/api/${escapedRoute}'`));
}

for (const route of ["database", "homologacoes", "indicadores", "lancamentos", "usuarios-acesso"]) {
  assert.match(routes, new RegExp(`'${route}'`), `${route} deve permanecer no agrupamento any`);
}
for (const route of [
  "/logout",
  "/api/indicadores/{id}",
  "/api/lancamentos/{id}",
  "/api/homologacoes/{id}",
  "/api/administracao/{resource}",
  "/api/administracao/{resource}/{id}",
  "/api/prazos-apuracao",
  "/api/prazos-apuracao/{id}"
]) {
  assert.ok(routes.includes(`$router->any('${route}'`), `${route} nao deve ser convertido nesta etapa`);
}

assert.match(read("api", "configuracoes.php"), /Auth::requireApiProfiles\(array\('administrador', 'homologador', 'consultor_diretoria', 'unidade_apuradora'\)\)/);
assert.match(read("api", "relatorios.php"), /Auth::requireApiProfiles\(array\('administrador'\)\)/);
assert.match(read("api", "resumo-executivo.php"), /DashboardApiController\(\)\)->handle\('resumo'\)/);
assert.match(read("api", "visao-trimestral.php"), /Auth::requirePermission\('visao_trimestral', 'visualizar', true\)/);

const assetRoots = [path.join(root, "assets", "js"), path.join(root, "public", "assets", "js")];
for (const assetRoot of assetRoots) {
  for (const file of fs.readdirSync(assetRoot).filter((name) => name.endsWith(".js"))) {
    const source = fs.readFileSync(path.join(assetRoot, file), "utf8");
    for (const route of Object.keys(hardened)) {
      const mutation = new RegExp(`api/${route}[\\s\\S]{0,250}method\\s*:\\s*["'](?:POST|PUT|PATCH|DELETE)["']`, "i");
      assert.doesNotMatch(source, mutation, `${file} nao pode mutar ${route}`);
    }
  }
}

console.log("Rotas somente leitura registradas com GET explicito e consumidores preservados");
