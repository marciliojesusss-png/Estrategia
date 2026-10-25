const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const migration = fs.readFileSync(
  path.join(root, "database", "sqlserver", "migrations", "20261024_003_indicador08_regularizacao_tecnica.sql"),
  "utf8"
);

const guardCondition = (number) => {
  const throwMarker = `THROW ${number}`;
  const throwIndex = migration.indexOf(throwMarker);
  assert.notEqual(throwIndex, -1, `guard ${number} deve existir`);
  const ifIndex = migration.lastIndexOf("\n    IF ", throwIndex);
  assert.notEqual(ifIndex, -1, `condição do guard ${number} deve existir`);
  return migration.slice(ifIndex, throwIndex);
};

const guard52812 = guardCondition(52812);
assert.match(guard52812, /@linhasIndicador<>1/);
assert.match(guard52812, /@linhasLancamentos<>9/);
assert.match(guard52812, /@linhasConfiguracoes<>2/);

const guard52813 = guardCondition(52813);
assert.match(migration, /DECLARE @cadastroFinalCorreto BIT/);
assert.match(migration, /DECLARE @quantidadeLancamentosFinais INT/);
assert.match(guard52813, /@cadastroFinalCorreto<>1/);
assert.match(guard52813, /@quantidadeLancamentosFinais<>9/);
assert.doesNotMatch(guard52813, /@quantidadeLancamentosFinais\s*=\s*9/);

const shouldThrow52813 = (cadastroFinalCorreto, quantidadeLancamentosFinais) => (
  cadastroFinalCorreto !== 1 || quantidadeLancamentosFinais !== 9
);
assert.equal(shouldThrow52813(1, 9), false, "cadastro correto e 9 lançamentos devem passar");
assert.equal(shouldThrow52813(1, 8), true, "8 lançamentos devem abortar");
assert.equal(shouldThrow52813(1, 10), true, "10 lançamentos devem abortar");
assert.equal(shouldThrow52813(1, 8), true, "um dos 9 divergente reduz a contagem válida e deve abortar");
assert.equal(shouldThrow52813(0, 9), true, "cadastro incorreto deve abortar");

const guard52814 = guardCondition(52814);
assert.match(guard52814, /COUNT\(\*\)[\s\S]*<>12/);
assert.match(guard52814, /tipoConsolidacao'\)<>N'razao_acumulada_no_periodo'/);
assert.match(guard52814, /mesesFechamentoTrimestral'\)<>N'\[3,6,9,12\]'/);

const guard52815 = guardCondition(52815);
assert.match(guard52815, /@janMarAntes<>@janMarDepois/);
assert.match(guard52815, /@governancaAntes<>@governancaDepois/);

assert.match(migration, /@linhasIndicador AS linhas_indicadores/);
assert.match(migration, /@linhasLancamentos AS linhas_lancamentos/);
assert.match(migration, /@linhasConfiguracoes AS linhas_configuracoes/);
assert.doesNotMatch(migration, /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|MERGE\s+(?:INTO\s+)?)\s*dbo\.(?:homologacoes|evidencias|auditoria|retificacoes|solicitacoes_reabertura)/i);

console.log("Indicator 08 post-DML guard tests passed.");
