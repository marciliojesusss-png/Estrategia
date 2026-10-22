const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const bootstrap = loadBootstrapData(root);
const byId = Object.fromEntries(bootstrap.indicadores.map((item) => [Number(item.id), item]));

const expected = {
  9: { nome: "Vendas com Meio de Pagamento PIX", unidade: "SULOT" },
  16: { nome: "Apoio ao Desenvolvimento Socioambiental", unidade: "GENOL" },
  17: { nome: "Repasse Social", unidade: "SULOT" },
  19: { nome: "Incentivo Socioambiental", unidade: "GENOL" }
};

for (const [idText, scope] of Object.entries(expected)) {
  const indicator = byId[Number(idText)];
  assert.ok(indicator, `indicador ${idText} deve existir`);
  assert.equal(indicator.indicador, scope.nome);
  assert.equal(indicator.unidadeApuradora, scope.unidade);
  assert.equal(indicator.diretoriaResponsavel, "DICOT");
}

for (const [indicatorId, unit] of [[16, "GENOL"], [17, "SULOT"]]) {
  const launches = bootstrap.lancamentos.filter((item) => Number(item.indicadorId) === indicatorId);
  assert.equal(launches.length, 12, `indicador ${indicatorId} deve ter 12 lançamentos`);
  assert.ok(launches.every((item) => item.unidadeApuradora === unit));
  assert.ok(launches.every((item) => item.diretoriaResponsavel === "DICOT"));
}

const context = {
  URLSearchParams,
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  window: { location: { href: "", search: "" } },
  document: { body: { dataset: { page: "lancamentos" } } }
};
context.window.localStorage = context.localStorage;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "assets", "js", "auth.js"), "utf8"), context);

function scopedRelevantIndicators(unit) {
  return context.window.Auth.filterIndicatorsByUser(
    bootstrap.indicadores,
    { perfil: "Unidade Apuradora", unidadeApuradora: unit }
  )
    .filter((item) => [9, 16, 17, 19].includes(Number(item.id)))
    .map((item) => item.indicador)
    .sort();
}

assert.deepEqual(
  scopedRelevantIndicators("GENOL"),
  ["Apoio ao Desenvolvimento Socioambiental", "Incentivo Socioambiental"]
);
assert.deepEqual(
  scopedRelevantIndicators("SULOT"),
  ["Repasse Social", "Vendas com Meio de Pagamento PIX"]
);

const sourceBootstrap = fs.readFileSync(path.join(root, "assets", "js", "bootstrap-data.js"), "utf8");
const publicBootstrap = fs.readFileSync(path.join(root, "public", "assets", "js", "bootstrap-data.js"), "utf8");
assert.equal(sourceBootstrap, publicBootstrap, "os bootstraps fonte e público devem ser idênticos");

const migrationPath = path.join(
  root,
  "database",
  "sqlserver",
  "migrations",
  "20261022_002_corrige_responsabilidade_indicadores_16_17.sql"
);
const migration = fs.readFileSync(migrationPath, "utf8");
assert.match(migration, /BEGIN TRANSACTION/);
assert.match(migration, /COMMIT TRANSACTION/);
assert.match(migration, /ROLLBACK TRANSACTION/);
assert.match(migration, /id = N'9'.*unidade_apuradora = N'SULOT'.*diretoria_responsavel = N'DICOT'/s);
assert.match(migration, /id = N'19'.*unidade_apuradora = N'GENOL'.*diretoria_responsavel = N'DICOT'/s);
assert.match(migration, /WHERE id = N'16'/);
assert.match(migration, /WHERE id = N'17'/);
assert.match(migration, /WHERE indicador_id = N'16'/);
assert.match(migration, /WHERE indicador_id = N'17'/);
assert.match(migration, /dados_entrada_json contem responsabilidade organizacional/);

const updatedTables = [...migration.matchAll(/UPDATE\s+dbo\.([a-z_]+)/gi)].map((match) => match[1]);
assert.deepEqual(updatedTables, ["indicadores", "indicadores", "lancamentos", "lancamentos"]);
for (const protectedTable of ["homologacoes", "retificacoes", "evidencias", "auditoria", "configuracoes"]) {
  assert.doesNotMatch(migration, new RegExp(`(?:UPDATE|INSERT\\s+INTO|DELETE\\s+FROM)\\s+dbo\\.${protectedTable}`, "i"));
  assert.match(migration, new RegExp(`#${protectedTable}Antes`, "i"));
}

console.log("Responsabilidade organizacional dos indicadores 09, 16, 17 e 19: OK");
