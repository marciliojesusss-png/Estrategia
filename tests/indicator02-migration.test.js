const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const migrationPath = path.join(root, "database", "sqlserver", "migrations", "20261026_001_indicador02_regularizacao_tecnica.sql");
const sql = fs.readFileSync(migrationPath, "utf8");

assert.match(sql, /PREPARADA, NÃO EXECUTADA/);
assert.match(sql, /tipo_consolidacao=N'resultado_pesquisa_ou_ultima_posicao'/);
assert.match(sql, /WHEN N'16' THEN N'58' WHEN N'17' THEN N'58'/);
assert.match(sql, /WHEN id=N'18' THEN N'0\.9866'/);
assert.match(sql, /WHEN id IN\(N'19',N'20'\) THEN N'0\.986666666666666667'/);
assert.match(sql, /WHEN id=N'21' THEN N'0\.9866'/);
assert.match(sql, /homologadoDiretoriaHistorico/);
assert.match(sql, /fonteHomologacaoHistorica/);
assert.match(sql, /Planilha 16\.10/);
assert.match(sql, /Informe DILOT\/GERIN nº 0029\/2026/);
assert.match(sql, /Informe DILOT\/GERIN nº 0056\/2026/);
assert.match(sql, /Informe DILOT\/GERIN nº 0078\/2026/);
assert.match(sql, /"2026-04":58,"2026-05":58,"2026-06":60/);
assert.match(sql, /"mesesFechamentoTrimestral":\[3,6,9,12\]/);
assert.match(sql, /"exigirHomologacaoTransacionalVersaoAtual":true/);
assert.match(sql, /@linhasLancamentos<>12/);
assert.match(sql, /@linhasConfiguracoes<>2/);
assert.match(sql, /@hashGovernancaAntes<>@hashGovernancaDepois/);
assert.match(sql, /@hashProtegidoAntes<>@hashProtegidoDepois/);
assert.match(sql, /@hashAlvosProtegidosAntes<>@hashAlvosProtegidosDepois/);
assert.match(sql, /@indiceRegra<>N'1'/);
assert.match(sql, /HASHBYTES\('SHA2_256',CONVERT\(VARBINARY\(MAX\),@regraInicial\)\)/);
assert.match(sql, /JSON_MODIFY\(@regrasAntes,'\$\[1\]',JSON_QUERY\(@regraFinal\)\)/);
assert.doesNotMatch(sql, /JSON_MODIFY\s*\([^,]+,\s*(?:CONCAT\s*\(|@[A-Za-z0-9_]+)/i,
  "todo JSON_MODIFY deve usar path literal compativel com SQL Server 2016");

const jsonModifyCalls = [...sql.matchAll(/JSON_MODIFY\s*\(\s*@[A-Za-z0-9_]+\s*,\s*(N?'[^']+')\s*,/gi)];
assert.equal(jsonModifyCalls.length, 3, "as tres chamadas JSON_MODIFY devem usar paths literais");
assert.match(sql, /\(SELECT COUNT\(\*\) FROM OPENJSON\(@regrasDepois\)\)<>23/);
assert.match(sql, /JSON_VALUE\(@regrasDepois,'\$\[1\]\.indicadorId'\)<>N'2'/);
assert.match(sql, /As outras 22 regras ou sua ordem foram alteradas/);
assert.doesNotMatch(sql, /CAST\s*\(\s*55\.0\s*\/\s*58\.0\s+AS\s+DECIMAL/i,
  "o guard nao pode dividir literais numericos antes do CAST de alta precisao");
assert.match(sql, /TRY_CONVERT\(DECIMAL\(38,18\),percentual_atingido\) IS NULL/);
assert.match(sql, /TRY_CONVERT\(DECIMAL\(38,18\),percentual_atingido\)<>CAST\(N'0\.948275862068965517' AS DECIMAL\(38,18\)\)/);
assert.match(sql, /WHEN id IN\(N'19',N'20'\) THEN N'0\.986666666666666667'/);
assert.match(sql, /WHEN id=N'18' THEN N'0\.9866'/);
assert.match(sql, /WHEN id=N'21' THEN N'0\.9866'/);

for (const table of ["homologacoes", "evidencias", "auditoria", "retificacoes", "solicitacoes_reabertura"]) {
  const writePattern = new RegExp(`(?:INSERT\\s+INTO|UPDATE|DELETE\\s+FROM|MERGE\\s+INTO)\\s+dbo\\.${table}\\b`, "i");
  assert.doesNotMatch(sql, writePattern, `A migration não pode escrever em dbo.${table}`);
}
assert.doesNotMatch(sql, /\b(?:CREATE|ALTER|DROP)\s+TABLE\b/i);

console.log("Indicador 02: migration preparada com curva 55/58/60, guards e governança protegida.");
