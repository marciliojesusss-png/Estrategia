const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const migrationPath = path.join(root, "database", "sqlserver", "migrations", "20261027_002_indicador22_regularizacao_tecnica.sql");
const sql = fs.readFileSync(migrationPath, "utf8");

assert.match(sql, /PREPARADA, NÃO EXECUTADA/);
assert.match(sql, /SET XACT_ABORT ON/);
assert.match(sql, /BEGIN TRY[\s\S]*BEGIN TRANSACTION/);
assert.match(sql, /COMMIT TRANSACTION/);
assert.match(sql, /BEGIN CATCH[\s\S]*ROLLBACK TRANSACTION[\s\S]*THROW;/);
assert.match(sql, /compatibility_level FROM sys\.databases WHERE name=DB_NAME\(\)\)<>130/);
assert.doesNotMatch(sql, /\b(?:FLOAT|REAL)\b/i);
assert.match(sql, /DECIMAL\(20,2\)/);
assert.match(sql, /DECIMAL\(38,18\)/);

assert.match(sql, /tipo_calculo=N'participacao_ecossistema_lotex'/);
assert.match(sql, /tipo_consolidacao=N'ultima_posicao_acumulada'/);
assert.match(sql, /periodicidade=N'Mensal'/);
assert.match(sql, /JAN–JUL\/2026: ≥10%[\s\S]*AGO–DEZ\/2026: ≥1%/);
assert.match(sql, /JSON_VALUE\(@regrasAntes,'\$\[21\]\.indicadorId'\)/);
assert.match(sql, /JSON_MODIFY\(@regrasAntes,'\$\[21\]',JSON_QUERY\(@regraFinal\)\)/);
assert.match(sql, /D179130031FE1DA504969D61B480BCD399EAD6AC0EA7EC47DA90B61211C6D253/);
assert.match(sql, /\(SELECT COUNT\(\*\) FROM OPENJSON\(@regrasAntes\)\)<>23/);

const ruleMatch = sql.match(/SET @regraFinal=N'(\{.*?\})';\s*\r?\n\s*IF ISJSON/s);
assert.ok(ruleMatch, "regra final deve ser JSON literal e validável");
const rule = JSON.parse(ruleMatch[1].replace(/''/g, "'"));
assert.equal(rule.indicadorId, 22);
assert.equal(rule.tipoCalculo, "participacao_ecossistema_lotex");
assert.equal(rule.tipoConsolidacao, "ultima_posicao_acumulada");
assert.equal(rule.metaAnualValor, null);
assert.equal(rule.parametrosCalculo.sentidoMeta, "quanto_maior_melhor");
assert.equal(rule.parametrosCalculo.cenarioOficial, "lotex");
assert.equal(rule.parametrosCalculo.marketplaceAplicaAoCalculo, false);
assert.equal(rule.parametrosCalculo.acompanhamentoMensal, true);
assert.equal(rule.parametrosCalculo.permiteAcompanhamentoMensal, true);
assert.deepEqual(rule.parametrosCalculo.mesesFechamentoTrimestral, [3, 6, 9, 12]);
assert.deepEqual(rule.parametrosCalculo.vigenciasMeta.map((item) => item.fator), [1.1, 1.01]);
assert.equal(rule.parametrosCalculo.historicoRevisao.aplicaAoCalculo, false);
assert.equal(rule.parametrosCalculo.historicoRevisao.metasRetrospectivas["1TRI"], 0.0091);
assert.equal(rule.parametrosCalculo.historicoRevisao.metasRetrospectivas["2TRI"], 0.0079);
assert.equal(rule.parametrosCalculo.apresentacoesOficiaisTrimestrais["1TRI"].percentualAtingidoOficialReportado, 0.6712);
assert.equal(rule.parametrosCalculo.apresentacoesOficiaisTrimestrais["2TRI"].percentualAtingidoOficialReportado, 0.7112);
assert.equal(rule.parametrosCalculo.apresentacoesOficiaisTrimestrais["3TRI"].percentualAtingidoOficialReportado, 0.8);
assert.equal(rule.parametrosCalculo.apresentacoesOficiaisTrimestrais["4TRI"].resultadoOficialReportado, null);

for (let id = 253; id <= 264; id += 1) {
  assert.match(sql, new RegExp(`N'${id}'`), `lançamento ${id} deve estar protegido`);
}
for (const token of [
  "1683348694.70", "18372000.00", "44669058.91",
  "26612476457.00", "173831435.50", "746339639.03",
  "2030288935.15", "13719322.25", "77531427.39",
  "16122321231.05", "101554152.00", "595072496.25"
]) assert.ok(sql.includes(token), `componente ausente: ${token}`);

for (const value of [
  "0.012005355790887762", "0.011790587817069536", "0.009942355967711213",
  "0.008550687930999193", "0.007478975172947646", "0.006597272153107686"
]) assert.ok(sql.includes(value), `meta técnica ausente: ${value}`);
assert.match(sql, /resultadoDocumentalEcossistema\":0\.0067[\s\S]*metaDocumentalEcossistema\":0\.0099[\s\S]*0\.6712/);
assert.match(sql, /resultadoDocumentalEcossistema\":0\.0061[\s\S]*metaDocumentalEcossistema\":0\.0086[\s\S]*0\.7112/);
assert.match(sql, /resultadoDocumentalEcossistema\":0\.006[\s\S]*metaDocumentalEcossistema\":0\.0075[\s\S]*0\.8/);
assert.match(sql, /componentes 2026 foram fabricados para SET–DEZ/);
assert.equal(
  (sql.match(/cenarioApuracaoEcossistema\":\"lotex_marketplace\"/g) || []).length,
  1,
  "o cenário combinado deve aparecer somente no guard do estado inicial legado"
);

assert.match(sql, /\(SELECT COUNT\(\*\) FROM OPENJSON\(@metasAntes\)\)=222/);
assert.match(sql, /\(SELECT COUNT\(\*\) FROM OPENJSON\(@metasAntes\)\)=231/);
assert.match(sql, /IDs lógicos 241–249 já estão ocupados/);
for (let id = 241; id <= 249; id += 1) assert.match(sql, new RegExp(`\\"id\\":${id},\\"indicadorId\\":22`));
for (const index of [141, 142, 143]) assert.match(sql, new RegExp(`'\\$\\[${index}\\]\\.metaMensal'`));
assert.equal((sql.match(/'append \$'/g) || []).length, 9);

for (const table of ["homologacoes", "evidencias", "auditoria", "retificacoes", "solicitacoes_reabertura"]) {
  assert.doesNotMatch(sql, new RegExp(`(?:INSERT\\s+INTO|UPDATE|DELETE\\s+FROM|MERGE\\s+(?:INTO\\s+)?)dbo\\.${table}\\b`, "i"));
}
assert.match(sql, /@hashGovernancaAntes<>@hashGovernancaDepois/);
assert.match(sql, /@hashProtegidoAntes<>@hashProtegidoDepois/);
assert.match(sql, /@linhasIndicadores<>1 OR @linhasLancamentos<>12 OR @linhasConfiguracoes<>2/);
const guard53324 = sql.match(/IF \(SELECT COUNT\(\*\) FROM dbo\.lancamentos l JOIN @alvos a ON a\.id=l\.id[\s\S]*?THROW 53324,'Pós-condição inválida: lançamentos finais divergiram\.',1;/);
assert.ok(guard53324, "guard 53324 deve existir e validar os 12 lançamentos finais");
assert.match(guard53324[0], /\)<>12\s+THROW 53324/, "53324 deve falhar somente quando menos de 12 lançamentos coincidirem");
assert.doesNotMatch(guard53324[0], /\)=12\s+THROW 53324/, "53324 não pode falhar quando os 12 lançamentos coincidirem");
const guard53324Throws = (matchedLaunches) => matchedLaunches !== 12;
assert.equal(guard53324Throws(12), false, "12 lançamentos corretos não podem gerar 53324");
assert.equal(guard53324Throws(11), true, "11 lançamentos coincidentes devem gerar 53324");
assert.equal(guard53324Throws(0), true, "nenhum lançamento coincidente deve gerar 53324");
assert.match(sql, /JÁ APLICADA — SEM DML/);
assert.match(sql, /Estado parcial\/misto/);
assert.match(sql, /0 AS registros_criados,0 AS registros_removidos/);

const throwNumbers = Array.from(sql.matchAll(/THROW\s+(533\d{2})/g), (match) => Number(match[1]));
assert.deepEqual(throwNumbers, Array.from({ length: 34 }, (_, index) => 53301 + index));

console.log("indicator22-migration.test.js: OK");
