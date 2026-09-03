const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const calculations = {
  formatarPercentual(value) { return `${Number(value) * 100}%`; },
  formatarValor(value, unit) {
    if (unit === "moeda") return `R$ ${Number(value).toFixed(2)}`;
    return String(Number(value));
  }
};
const context = {
  window: { PageModules: {}, Calculations: calculations },
  Calculations: calculations
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "assets", "js", "launches.js"), "utf8"), context);
const internals = context.window.__LAUNCHES_FILTER_TEST_INTERNALS__;

assert.deepEqual(
  JSON.parse(JSON.stringify(internals.quarterlyMetaDetail(
    { metaTrimestral: 2, unidadeMedida: "quantidade" },
    { tipoCalculo: "plano_acao_por_elementos", unidadeMedida: "quantidade" },
    { trimestre: "2TRI/2026", mes: 6 }
  ))),
  ["Meta do 2TRI", "2 elementos acumulados"]
);
assert.deepEqual(
  JSON.parse(JSON.stringify(internals.quarterlyMetaDetail(
    { metaTrimestral: 0.01, unidadeMedida: "percentual" },
    { tipoCalculo: "incremento_rede_loterica_base_2025", unidadeMedida: "percentual" },
    { mes: 6 }
  ))),
  ["Meta trimestral de incremento", "1%"]
);
assert.deepEqual(
  JSON.parse(JSON.stringify(internals.quarterlyMetaDetail(
    { metaTrimestral: 2500, unidadeMedida: "moeda" },
    { tipoCalculo: "valor_financeiro_acumulado", unidadeMedida: "moeda" },
    { mes: 9 }
  ))),
  ["Meta trimestral", "R$ 2500.00"]
);
assert.equal(internals.quarterLabel({ mes: 12 }), "4TRI");

const view = fs.readFileSync(path.join(root, "views", "frontend", "lancamentos.php"), "utf8");
assert.match(view, /Registro dos dados pelas unidades apuradoras\./);
assert.match(view, /<th>Mês \/ competência<\/th>/);
assert.match(view, /<th>Resultado da competência<\/th>/);
assert.match(view, /id="launchResultadoMensalLabel">Resultado da competência</);
assert.match(view, /id="launchPercentualCalculadoLabel">% da meta atingida</);
assert.match(view, /id="launchPercentualAcumuladoLabel">% da meta atingida anual</);
assert.match(view, /id="resultadoAnualWrapper"/);
assert.match(view, /documentation-fields\.js\?v=DOCUMENTACAO-CENTRAL-001/);
assert.match(view, /launches\.js\?v=LUCRO-RECORRENTE-MENSAL-001/);

const dataStoreSource = fs.readFileSync(path.join(root, "assets", "js", "dataStore.js"), "utf8");
assert.match(dataStoreSource, /nome: "tipoPosicaoCapacitacao"/);
assert.match(dataStoreSource, /Acompanhamento sem nova medição/);
assert.match(dataStoreSource, /nome: "acoesAcompanhamentoCapacitacao"/);
assert.match(dataStoreSource, /nome: "quantidadeCursosMinimaCapacitacao"[^\n]+somenteLeitura: true/);

const launchesSource = fs.readFileSync(path.join(root, "assets", "js", "launches.js"), "utf8");
assert.match(launchesSource, /function updateCapacitacaoPositionFields/);
assert.match(launchesSource, /Informe as ações realizadas ou o andamento antes de enviar/);
assert.match(launchesSource, /async function persistLaunch\(action\) \{\s+const lancamento = getSelectedLaunch\(\);/);
assert.match(launchesSource, /Evidência anexada, mas não foi possível salvar o lançamento/);

const approvalsSource = fs.readFileSync(path.join(root, "assets", "js", "approvals.js"), "utf8");
assert.match(approvalsSource, /Acompanhamento sem nova medição/);
assert.match(approvalsSource, /Ações realizadas \/ andamento/);
assert.match(approvalsSource, /"Em acompanhamento"/);

console.log("Testes de apresentação da tela de lançamentos OK");
