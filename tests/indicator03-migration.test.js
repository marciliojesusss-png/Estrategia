const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const migrationPath = path.join(
  root,
  "database",
  "sqlserver",
  "migrations",
  "20261027_001_indicador03_regularizacao_tecnica.sql"
);
const sql = fs.readFileSync(migrationPath, "utf8");

assert.match(sql, /PREPARADA, NÃO EXECUTADA/);
assert.match(sql, /compatibility level 130/);
assert.match(sql, /tipo_consolidacao=N'ultima_posicao'/);
assert.match(sql, /periodicidade=N'Não especificada'/);
assert.match(sql, /Crescer 28% na quantidade média mensal de clientes ativos no ano/);

assert.match(sql, /@indiceRegra<>N'2'/);
assert.match(sql, /JSON_VALUE\(@regrasAntes,'\$\[2\]\.indicadorId'\)/);
assert.match(sql, /JSON_MODIFY\(@regrasAntes,'\$\[2\]',JSON_QUERY\(@regraFinal\)\)/);
assert.doesNotMatch(sql, /N?'\$2(?:'|\.)/, "'$2' não é um path válido para o índice 2 do array");
assert.match(sql, /A340E78AB12B5E783BF811469FDC5AA2F64306F5684B327B0D7F48C01D2C3676/);
assert.match(sql, /F1E97EE6CC17EAB69CD1531DE170732C8FE1E6AC7B42315FEBD961CC3D5751CB/);
assert.match(sql, /"mesesFechamentoTrimestral":\[3,6,9,12\]/);
assert.match(sql, /"exigirHomologacaoTransacionalVersaoAtual":true/);
assert.match(sql, /"exigeEvidenciaNosFechamentos":true/);
assert.match(sql, /"acompanhamentoMensal":true/);
assert.match(sql, /"qmaatuCampo":"qmaatu"/);
assert.match(sql, /"qmaantCampo":"qmaant"/);

const ruleModifyCalls = [...sql.matchAll(/JSON_MODIFY\s*\(\s*@[A-Za-z0-9_]+\s*,\s*(N?'[^']+')\s*,/gi)];
assert.equal(ruleModifyCalls.length, 10, "esperadas nove inclusões de metas e uma substituição de regra");
for (const call of ruleModifyCalls) {
  assert.ok(["'append $'", "'$[2]'"].includes(call[1]), `path JSON não literal/esperado: ${call[1]}`);
}
assert.doesNotMatch(sql, /JSON_MODIFY\s*\([^,]+,\s*(?:CONCAT\s*\(|@[A-Za-z0-9_]+)/i);

for (const id of [7, 8, 9, 232, 233, 234, 235, 236, 237, 238, 239, 240]) {
  assert.match(sql, new RegExp(`N?'${id}'|\\"id\\":${id}`));
}
assert.match(sql, /\(SELECT COUNT\(\*\) FROM OPENJSON\(@metasDepois\)\)<>222/);
assert.match(sql, /WHERE JSON_VALUE\(value,'\$\.indicadorId'\)=@indicadorId\)<>12/);
assert.match(sql, /A migration produziu duplicidade lógica de metas/);

for (const id of [25, 26, 27]) {
  assert.match(sql, new RegExp(`id=N'${id}'`));
}
assert.match(sql, /SELECT \* INTO #ids25a27Antes/);
assert.match(sql, /IDs 25–27 foram alterados/);
assert.match(sql, /ids_25_27_alterados/);

for (const id of [28, 29, 30, 31, 32, 33, 34, 35, 36]) {
  assert.match(sql, new RegExp(`\\(N'${id}',`));
}
const targetValues = sql.match(/INSERT INTO @alvos VALUES([\s\S]*?);\r?\n\r?\n  IF/);
assert.ok(targetValues, "bloco canônico de alvos não encontrado");
assert.deepEqual(
  [...targetValues[1].matchAll(/\(N'(\d+)'/g)].map((match) => Number(match[1])),
  [28, 29, 30, 31, 32, 33, 34, 35, 36],
  "somente IDs 28–36 podem compor o UPDATE de lançamentos"
);
const launchUpdate = sql.match(
  /UPDATE l SET[\s\S]*?FROM dbo\.lancamentos l INNER JOIN @alvos a ON a\.id=l\.id[\s\S]*?WHERE l\.indicador_id=@indicadorId;/
);
assert.ok(launchUpdate, "UPDATE protegido de lançamentos não encontrado");
assert.doesNotMatch(launchUpdate[0], /N'(?:25|26|27)'/, "IDs 25–27 não podem aparecer no UPDATE");
assert.match(launchUpdate[0], /INNER JOIN @alvos a ON a\.id=l\.id/);
assert.match(sql, /@linhasLancamentos<>@esperadoLancamentos/);
assert.match(sql, /esperado inicial=1\/9\/2 ou final=0\/0\/0/);
assert.match(sql, /JÁ APLICADA — SEM DML/);
assert.match(sql, /Estado parcial\/misto detectado/);

assert.match(sql, /0\.7046/);
assert.match(sql, /2\.5164/);
assert.match(sql, /0\.7309/);
assert.match(sql, /2\.6104/);
assert.match(sql, /0\.621559993919400047/);
assert.match(sql, /0\.6216/);
assert.match(sql, /2\.22/);
assert.match(sql, /0\.5813/);
assert.match(sql, /2\.0761/);
assert.match(sql, /0\.5534/);
assert.match(sql, /1\.9764/);
assert.match(sql, /0\.526990958214971514/);
assert.match(sql, /0\.5270/);
assert.match(sql, /1\.8821/);
assert.match(sql, /Planilha 16\.10\(3\)\.xlsx/);
assert.match(sql, /Informe DILOT\/GERIN nº 0056\/2026/);
assert.match(sql, /Informe DILOT\/GERIN nº 0078\/2026/);
assert.doesNotMatch(sql, /\bAS\s+(?:FLOAT|REAL)\b/i);

for (const table of ["homologacoes", "evidencias", "auditoria", "retificacoes", "solicitacoes_reabertura"]) {
  const writePattern = new RegExp(
    `(?:INSERT\\s+INTO|UPDATE|DELETE\\s+FROM|MERGE\\s+INTO)\\s+dbo\\.${table}\\b`,
    "i"
  );
  assert.doesNotMatch(sql, writePattern, `migration não pode escrever em dbo.${table}`);
}
assert.doesNotMatch(sql, /\b(?:CREATE|ALTER|DROP)\s+TABLE\b/i);

console.log("Indicador 03: migration técnica, guards, precisão e governança validados.");
