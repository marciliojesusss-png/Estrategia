const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const migrationPath = path.join(
  root,
  "database",
  "sqlserver",
  "migrations",
  "20261025_006_indicador01_regularizacao_tecnica.sql"
);
const migration = fs.readFileSync(migrationPath, "utf8");

assert.match(migration, /SET XACT_ABORT ON/);
assert.match(migration, /BEGIN TRY[\s\S]*BEGIN TRANSACTION/);
assert.match(migration, /COMMIT TRANSACTION/);
assert.match(migration, /BEGIN CATCH[\s\S]*ROLLBACK TRANSACTION[\s\S]*THROW;/);
assert.match(migration, /DB_NAME\(\) <> N'Estrategia'/);
assert.match(migration, /compatibility_level[\s\S]*<> 130/);
assert.doesNotMatch(migration, /\bFLOAT\b/i);
assert.match(migration, /DECIMAL\(38,18\)/);

assert.match(migration, /id=@indicadorId AND numero=1/);
assert.match(migration, /tipo_consolidacao=N'ultima_posicao_trimestral'/);
assert.match(migration, /PASS inicial=1\/3\/1, PASS final=0\/0\/0/);
assert.match(migration, /estado parcial; somente o estado inicial integral ou final integral é aceito/);
assert.match(migration, /JÁ APLICADA — SEM DML/);

assert.match(migration, /CAST\(CAST\(1241587 AS DECIMAL\(20,10\)\)\/CAST\(2773599 AS DECIMAL\(20,10\)\) AS DECIMAL\(38,18\)\)/);
assert.match(migration, /CAST\(CAST\(2371981 AS DECIMAL\(20,10\)\)\/CAST\(3018556 AS DECIMAL\(20,10\)\) AS DECIMAL\(38,18\)\)/);

for (const [id, source, documentaryResult, documentaryPerformance] of [
  [3, "0029", "0.4476", "4.4764"],
  [6, "0056", "0.7858", "7.858"],
  [9, "0078", "0.8379", "8.379"]
]) {
  assert.match(migration, new RegExp(`N'${id}'`));
  assert.match(migration, new RegExp(`resultadoDocumentalOfertasPersonalizadas\\\":${documentaryResult}`));
  assert.match(migration, new RegExp(`percentualAtingidoOficialOfertasPersonalizadas\\\":${documentaryPerformance}`));
  assert.match(migration, new RegExp(`${source}\\/2026`));
}

assert.match(migration, /id=N'3'[\s\S]*status=N'Homologado'/);
assert.match(migration, /id=N'3'[\s\S]*status=N'Em preenchimento'/);
assert.match(migration, /id=N'9'[\s\S]*resultado_calculado IS NULL/);
assert.match(migration, /JSON_VALUE\(dados_entrada_json,'\$\.baseClientesAtivosCompetencia'\) IS NULL/);
assert.match(migration, /id=N'12'[\s\S]*status=N'Não iniciado'[\s\S]*resultado_calculado IS NULL/);

assert.match(migration, /\(SELECT COUNT\(\*\) FROM OPENJSON\(@metasAntes\)[\s\S]*<>12/);
assert.match(migration, /@metasDepois<>@metasAntes/);
assert.doesNotMatch(migration, /UPDATE\s+dbo\.configuracoes\s+SET\s+valor_json=@metas/i);
assert.match(migration, /JSON_MODIFY\(@regrasAntes,'\$\[0\]'/);

const finalRuleMatch = migration.match(/SET @regraFinal=N'(\{.*?\})';\s*\r?\n\s*IF ISJSON/s);
assert.ok(finalRuleMatch, "regra final deve estar declarada e validada");
const finalRule = JSON.parse(finalRuleMatch[1].replace(/''/g, "'"));
assert.equal(finalRule.indicadorId, 1);
assert.equal(finalRule.tipoCalculo, "percentual_direto");
assert.equal(finalRule.tipoConsolidacao, "ultima_posicao_trimestral");
assert.equal(finalRule.metaAnualValor, 0.1);
assert.equal(finalRule.parametrosCalculo.metaReferencia, 0.1);
assert.equal(finalRule.parametrosCalculo.sentidoMeta, "quanto_maior_melhor");
assert.deepEqual(finalRule.parametrosCalculo.mesesFechamentoTrimestral, [3, 6, 9, 12]);
assert.equal(finalRule.parametrosCalculo.apresentacoesOficiaisTrimestrais["1TRI/2026"].resultadoOficialReportado, 0.4476);
assert.equal(finalRule.parametrosCalculo.apresentacoesOficiaisTrimestrais["2TRI/2026"].percentualAtingidoOficialReportado, 7.858);
assert.equal(finalRule.parametrosCalculo.apresentacoesOficiaisTrimestrais["3TRI/2026"].resultadoOficialReportado, 0.8379);
assert.equal(finalRule.parametrosCalculo.apresentacoesOficiaisTrimestrais["4TRI/2026"].resultadoOficialReportado, null);
assert.equal(finalRule.resultadoOficial, "ultima_posicao_fechamento_homologada");
assert.equal(finalRule.exigirHomologacaoTransacionalVersaoAtual, true);
const bootstrapRule = loadBootstrapData(root).regrasIndicadores.find((item) => Number(item.indicadorId) === 1);
assert.deepEqual(finalRule, bootstrapRule, "a regra SQL final deve ser idêntica à fonte vigente do bootstrap");

assert.match(migration, /Snapshot por quantidade \+ SHA-256/);
assert.match(migration, /HASHBYTES\('SHA2_256'/);
for (const protectedName of [
  "indicadores_outros", "lancamentos_protegidos", "configuracoes_outras",
  "metas_integrais", "regras_outros", "homologacoes", "evidencias",
  "auditoria", "retificacoes", "reaberturas", "usuarios_acesso",
  "usuarios_validacao", "acessos_log"
]) {
  assert.match(migration, new RegExp(protectedName));
}

assert.doesNotMatch(
  migration,
  /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|MERGE\s+(?:INTO\s+)?)\s*dbo\.(?:homologacoes|evidencias|auditoria|retificacoes|solicitacoes_reabertura|usuarios_acesso|usuarios_validacao|acessos_log)/i
);
assert.doesNotMatch(migration, /\b(?:INSERT\s+INTO|DELETE\s+FROM|MERGE\s+(?:INTO\s+)?)\s*dbo\./i);

const classifyState = (parts) => {
  if (parts.every((part) => part === "initial")) return "execute";
  if (parts.every((part) => part === "final")) return "noop";
  return "abort";
};
assert.equal(classifyState(["initial", "initial", "initial"]), "execute");
assert.equal(classifyState(["final", "final", "final"]), "noop");
assert.equal(classifyState(["initial", "final", "initial"]), "abort");
assert.equal(classifyState(["final", "initial", "final"]), "abort");

assert.equal((migration.match(/UPDATE dbo\.indicadores/g) || []).length, 1);
assert.equal((migration.match(/UPDATE l SET/g) || []).length, 1);
assert.equal((migration.match(/UPDATE dbo\.configuracoes SET/g) || []).length, 1);

console.log("indicator01-migration.test.js: OK");
