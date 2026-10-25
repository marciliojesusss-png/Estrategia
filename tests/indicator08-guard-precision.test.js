const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const migration = fs.readFileSync(
  path.join(root, "database", "sqlserver", "migrations", "20261024_003_indicador08_regularizacao_tecnica.sql"),
  "utf8"
);

const roundCanonical = (value, scale) => Number(Number(value).toFixed(scale));
const cases = [
  {
    id: 85,
    monthly: 624392611.64 / 2030288935.15,
    accumulated: 624392611.64 / 2030288935.15,
    meta: 0.2770,
    storedMonthly: 0.307539,
    storedAccumulated: 0.307539,
    storedPerformance: 1.11025
  },
  {
    id: 86,
    monthly: 580582876.90 / 1954616641.35,
    accumulated: (624392611.64 + 580582876.90) / (2030288935.15 + 1954616641.35),
    meta: 0.2829,
    storedMonthly: 0.297032,
    storedAccumulated: 0.302385,
    storedPerformance: 1.06888
  },
  {
    id: 87,
    monthly: 565188124.10 / 1982006914.05,
    accumulated: (624392611.64 + 580582876.90 + 565188124.10)
      / (2030288935.15 + 1954616641.35 + 1982006914.05),
    meta: 0.2805,
    storedMonthly: 0.285160,
    storedAccumulated: 0.296663,
    storedPerformance: 1.05762
  }
];

for (const item of cases) {
  assert.equal(roundCanonical(item.monthly, 6), item.storedMonthly, `resultado mensal do ID ${item.id}`);
  assert.equal(roundCanonical(item.accumulated, 6), item.storedAccumulated, `resultado acumulado do ID ${item.id}`);
  assert.equal(roundCanonical(item.accumulated / item.meta, 5), item.storedPerformance, `atingimento do ID ${item.id}`);
}

assert.equal(roundCanonical(0.3075387945183621, 6), 0.307539);
assert.equal(roundCanonical(1.110248355661957, 5), 1.11025);

const guard52805 = migration.match(/DECLARE @janMar TABLE[\s\S]*?THROW 52805[^;]+;/);
assert.ok(guard52805, "guard 52805 deve ser localizavel");
assert.match(guard52805[0], /totalMes DECIMAL\(19,2\)/);
assert.match(guard52805[0], /canaisMes DECIMAL\(19,2\)/);
assert.match(guard52805[0], /TRY_CONVERT\(DECIMAL\(10,4\),l\.meta_referencia\)=a\.meta/);
assert.match(guard52805[0], /TRY_CONVERT\(DECIMAL\(19,2\),JSON_VALUE\(l\.dados_entrada_json,'\$\.arrecadacaoTotalProdutosLoteriasMes'\)\)=a\.totalMes/);
assert.match(guard52805[0], /TRY_CONVERT\(DECIMAL\(19,2\),JSON_VALUE\(l\.dados_entrada_json,'\$\.arrecadacaoCanaisEletronicosMes'\)\)=a\.canaisMes/);
assert.match(guard52805[0], /ROUND\(calculo\.mensalExato,6\)/);
assert.match(guard52805[0], /ROUND\(calculo\.acumuladoExato,6\)/);
assert.match(guard52805[0], /ROUND\([\s\S]*calculo\.acumuladoExato[\s\S]*,5\s*\)/);
assert.doesNotMatch(guard52805[0], /FLOAT/i);
assert.doesNotMatch(guard52805[0], /0\.000000000001/);
assert.match(guard52805[0], /l\.status=N'Retificado'/);
assert.match(guard52805[0], /l\.versao_atual=2/);
assert.match(guard52805[0], /l\.situacao=N'Atingido'/);

console.log("Indicator 08 guard precision tests passed.");
