const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const migrationPath = path.join(
  root,
  "database",
  "sqlserver",
  "migrations",
  "20261025_004_indicador23_regularizacao_tecnica.sql"
);
const migration = fs.readFileSync(migrationPath, "utf8");

assert.match(migration, /SET XACT_ABORT ON/);
assert.match(migration, /BEGIN TRY[\s\S]*BEGIN TRANSACTION/);
assert.match(migration, /COMMIT TRANSACTION/);
assert.match(migration, /BEGIN CATCH[\s\S]*ROLLBACK TRANSACTION[\s\S]*THROW;/);
assert.match(migration, /SELECT compatibility_level FROM sys\.databases WHERE name=DB_NAME\(\)\) <> 130/);
assert.doesNotMatch(migration, /\bFLOAT\b/i);
assert.equal(
  (migration.match(/CAST\([^\n]+ AS DECIMAL\(20,10\)\)\/CAST\([^\n]+ AS DECIMAL\(20,10\)\)/g) || []).length,
  6,
  "as três razões e seus pós-guards devem preservar precisão com operandos DECIMAL(20,10)"
);
assert.doesNotMatch(migration, /AS DECIMAL\(38,18\)\)\/CAST\([^\n]+ AS DECIMAL\(38,18\)/);

for (const id of Array.from({ length: 12 }, (_, index) => 265 + index)) {
  assert.match(migration, new RegExp(`N'${id}'`), `lançamento ${id} deve estar protegido`);
}
for (const [id, month, initial, final] of [
  [265, 1, "0.0050", "1.0050"], [266, 2, "0.0050", "1.0050"],
  [267, 3, "0.0050", "1.0050"], [268, 4, "0.0100", "1.0100"],
  [269, 5, "0.0100", "1.0100"], [270, 6, "0.0100", "1.0100"],
  [271, 7, "0.0150", "1.0150"], [272, 8, "0.0150", "1.0150"],
  [273, 9, "0.0150", "1.0150"], [274, 10, "0.0200", "1.0200"],
  [275, 11, "0.0200", "1.0200"], [276, 12, "0.0200", "1.0200"]
]) {
  assert.ok(
    migration.includes(`(N'${id}',${month},${initial},${final}`),
    `curva inicial/final ausente para ${id}`
  );
}

assert.match(migration, /arrecadacaoRedeLoterica2025'\)\)=3000000000\.00/);
assert.match(migration, /arrecadacaoRedeLoterica2026'\)\)=3017079000\.00/);
assert.match(migration, /metaTrimestral'\)\)=0\.5000/);
assert.match(migration, /dados_entrada_json=N'\{\"arrecadacaoRedeLoterica2025\":3000000000,\"arrecadacaoRedeLoterica2026\":3017079000,\"metaTrimestral\":0\.5\}'/);

for (const [id, meta, result, official, source] of [
  [267, "1.0050", "1.0057", "1.1386", "0029"],
  [270, "1.0100", "0.9880", "0.9784", "0056"],
  [273, "1.0150", "0.9816", "0.9671", "0078"]
]) {
  assert.match(migration, new RegExp(`id=N'${id}'[\\s\\S]*meta_referencia\\)=${meta}`));
  assert.match(migration, new RegExp(`id=N'${id}'[\\s\\S]*resultado_oficial\\)=${result}`));
  assert.match(migration, new RegExp(`id=N'${id}'[\\s\\S]*${official}[\\s\\S]*${source}\/2026`));
}
assert.match(migration, /id=N'276'[\s\S]*resultado_calculado IS NULL[\s\S]*percentual_atingido IS NULL/);
assert.match(migration, /PASS = 8 intermediários vazios; THROW = quantidade <> 8/);
assert.match(migration, /PASS = 12 lançamentos finais; THROW = quantidade <> 12/);

assert.match(migration, /IDs lógicos 214–222 colidem/);
assert.match(migration, /O array atual possui 195 objetos \(índices 0–194\); os novos itens são anexados/);
assert.match(migration, /\(SELECT COUNT\(\*\) FROM OPENJSON\(@metasAntes\)\)=195/);
assert.match(migration, /\(SELECT COUNT\(\*\) FROM OPENJSON\(@metasAntes\)\)=204/);
for (let id = 214; id <= 222; id += 1) {
  assert.match(migration, new RegExp(`\\"id\\":${id},\\"indicadorId\\":23`));
}
for (const index of Array.from({ length: 9 }, (_, offset) => 195 + offset)) {
  assert.match(migration, new RegExp(`\\(${index},N'`));
}
assert.match(migration, /'\$\[147\]\.metaMensal'/);
assert.match(migration, /'\$\[149\]\.fonte'/);
assert.match(migration, /'append \$'/);
assert.match(migration, /'\$\[22\]'/);

const finalRuleMatch = migration.match(/SET @regraFinal=N'(\{.*?\})';\s*\r?\n\s*IF ISJSON/s);
assert.ok(finalRuleMatch, "regra final deve estar declarada e validada");
const finalRule = JSON.parse(finalRuleMatch[1].replace(/''/g, "'"));
assert.equal(finalRule.indicadorId, 23);
assert.equal(finalRule.nome, "Participação da Rede Lotérica nos Negócios da CAIXA Loterias");
assert.equal(finalRule.tipoCalculo, "crescimento_rede_loterica_base_2025");
assert.equal(finalRule.tipoConsolidacao, "acumulado_periodo_equivalente");
assert.equal(finalRule.metaAnualValor, 1.02);
assert.equal(finalRule.parametrosCalculo.sentidoMeta, "quanto_maior_melhor");
assert.deepEqual(finalRule.parametrosCalculo.mesesFechamentoTrimestral, [3, 6, 9, 12]);
assert.equal(finalRule.parametrosCalculo.metaTrimestral, undefined);
assert.equal(finalRule.parametrosCalculo.metaCrescimento, undefined);
assert.equal(finalRule.parametrosCalculo.apresentacoesOficiaisTrimestrais["1TRI"].metaOficialReportada, 0.005);
assert.equal(finalRule.parametrosCalculo.apresentacoesOficiaisTrimestrais["1TRI"].percentualAtingidoOficialReportado, 1.1386);
assert.equal(finalRule.parametrosCalculo.apresentacoesOficiaisTrimestrais["2TRI"].metaOficialReportada, 1.01);
assert.equal(finalRule.parametrosCalculo.apresentacoesOficiaisTrimestrais["2TRI"].percentualAtingidoOficialReportado, 0.9784);
assert.equal(finalRule.parametrosCalculo.apresentacoesOficiaisTrimestrais["3TRI"].metaOficialReportada, 1.015);
assert.equal(finalRule.parametrosCalculo.apresentacoesOficiaisTrimestrais["3TRI"].percentualAtingidoOficialReportado, 0.9671);
assert.equal(finalRule.parametrosCalculo.apresentacoesOficiaisTrimestrais["4TRI"].resultadoTecnicoIndice, null);

const throwNumbers = Array.from(migration.matchAll(/THROW\s+(529\d{2})/g), (match) => Number(match[1]));
assert.deepEqual(throwNumbers, Array.from({ length: 39 }, (_, index) => 52901 + index));

for (const table of [
  "indicadoresOutrosAntes", "lancamentosOutrosAntes", "configuracoesOutrasAntes",
  "homologacoesAntes", "evidenciasAntes", "auditoriaAntes", "retificacoesAntes",
  "reaberturasAntes", "usuariosAcessoAntes", "usuariosValidacaoAntes", "acessosLogAntes"
]) {
  assert.match(migration, new RegExp(`#${table}`), `snapshot ${table} deve existir`);
}
assert.doesNotMatch(
  migration,
  /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|MERGE\s+(?:INTO\s+)?)\s*dbo\.(?:homologacoes|evidencias|auditoria|retificacoes|solicitacoes_reabertura|usuarios_acesso|usuarios_validacao|acessos_log)/i
);
assert.doesNotMatch(migration, /\b(?:INSERT\s+INTO|DELETE\s+FROM|MERGE\s+(?:INTO\s+)?)\s*dbo\./i);
assert.match(migration, /@estadoInicialIntegral=1[\s\S]*@esperadoIndicador[\s\S]*1/);
assert.match(migration, /@estadoFinalIntegral=1[\s\S]*JÁ APLICADA — SEM DML/);
assert.match(migration, /estado parcial; somente o estado inicial integral ou final integral é aceito/);
assert.match(migration, /@linhasIndicador<>@esperadoIndicador/);
assert.match(migration, /PASS inicial=1\/12\/2, PASS final=0\/0\/0/);

const classifyState = (parts) => {
  const initial = parts.every((part) => part === "initial");
  const final = parts.every((part) => part === "final");
  if (initial) return "execute";
  if (final) return "noop";
  return "abort";
};
assert.equal(classifyState(["initial", "initial", "initial", "initial"]), "execute");
assert.equal(classifyState(["final", "final", "final", "final"]), "noop");
assert.equal(classifyState(["initial", "final", "initial", "initial"]), "abort");

console.log("indicator23-migration.test.js: OK");
