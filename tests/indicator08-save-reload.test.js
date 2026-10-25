const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const formulas = require("../assets/js/formulas.js");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const bootstrap = loadBootstrapData(root);
const indicator = bootstrap.indicadores.find((item) => Number(item.id) === 8);
const rule = bootstrap.regrasIndicadores.find((item) => Number(item.indicadorId) === 8);
const requests = [];
let persisted;

const context = {
  console,
  TextDecoder,
  URLSearchParams,
  setTimeout,
  clearTimeout,
  fetch: async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (String(url).includes("ping=1")) {
      return { ok: true, status: 200, json: async () => ({ ok: true, database: "sqlsrv", mode: "php_sqlserver" }) };
    }
    if (options.method === "PATCH") {
      const payload = JSON.parse(options.body);
      persisted = {
        ...payload,
        status: "Retificado",
        resultadoMensal: payload.resultadoMensal,
        resultadoOficialAnual: payload.resultadoOficialAnual,
        percentualAtingido: payload.percentualAtingido,
        situacaoCalculada: payload.situacaoCalculada
      };
      return { ok: true, status: 200, json: async () => ({ sucesso: true, dados: persisted }) };
    }
    throw new Error(`Requisicao inesperada: ${url}`);
  },
  window: {
    location: { protocol: "http:" },
    CAIXA_LOTERIAS_AUTH_USER: { csrfToken: "teste" },
    localStorage: {}
  }
};
context.window.window = context.window;
context.window.fetch = context.fetch;
context.window.appUrl = (value) => value;
vm.createContext(context);
for (const dependency of ["currency.js", "situations.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, "assets/js", dependency), "utf8"), context);
}
context.CurrencyBR = context.window.CurrencyBR;
context.Situations = context.window.Situations;
vm.runInContext(fs.readFileSync(path.join(root, "assets/js/dataStore.js"), "utf8"), context);
context.window.DataStore.salvarLancamentos = async () => true;
context.window.DataStore.saveLocal = async () => true;
vm.runInContext(fs.readFileSync(path.join(root, "assets/js/central-persistence.js"), "utf8"), context);

(async () => {
  const initial = context.window.DataStore.normalizeData("lancamentos", [{
    id: 85,
    indicadorId: 8,
    competencia: "2026-01",
    ano: 2026,
    mes: 1,
    trimestre: "1TRI/2026",
    plano: "PN",
    pilar: indicator.pilar,
    unidadeApuradora: "SUCOL",
    diretoriaResponsavel: "DICOT",
    status: "Em preenchimento",
    versaoAtual: 2,
    metaReferencia: 0.2805,
    camposEntrada: {
      arrecadacaoCanaisEletronicosMes: 624392611.64,
      arrecadacaoTotalProdutosLoteriasMes: 2030288935.15
    }
  }])[0];
  assert.equal(initial.metaMensal, 0.2770, "a curva deve prevalecer sobre o fallback persistido");

  const result = formulas.calcularIndicador(indicator, rule, initial, [initial]);
  assert.ok(Math.abs(result.resultadoAcumulado - 0.3075387945183621) < 1e-14);
  assert.ok(Math.abs(result.percentualAtingidoAnual - 1.110248355661957) < 1e-14);

  const payload = {
    ...initial,
    metaReferencia: result.metaReferencia,
    resultadoMensal: result.resultadoMensal,
    resultadoOficialAnual: result.resultadoOficialAnual,
    percentualAtingido: result.percentualAtingidoAnual,
    situacaoCalculada: result.situacao
  };
  await context.window.CentralPersistence.persistLaunchAction(
    "draft",
    [payload],
    85,
    { transactional: true, requiresRetification: true, correctionReason: "Correcao dos componentes oficiais" }
  );
  assert.equal(requests.filter((item) => item.options.method === "PATCH").length, 1);
  assert.equal(requests.some((item) => item.options.method === "POST" && !item.url.includes("ping=1")), false);

  const reloaded = context.window.DataStore.normalizeData("lancamentos", [persisted])[0];
  const rebuilt = formulas.calcularIndicador(indicator, rule, reloaded, [reloaded]);
  assert.equal(reloaded.metaMensal, 0.2770);
  assert.notEqual(reloaded.resultadoOficialAnual, null);
  assert.ok(Math.abs(rebuilt.resultadoAcumulado - 0.3075387945183621) < 1e-14);
  assert.ok(Math.abs(rebuilt.percentualAtingidoAnual - 1.110248355661957) < 1e-14);
  assert.equal(rebuilt.resultadoAcumuladoFormatado, "30,75%");
  assert.equal(rebuilt.situacao, "Atingido");
  assert.equal((rebuilt.percentualAtingidoAnual * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "111,02");

  console.log("Indicador 08: salvar via PATCH e recarregar preserva meta, resultado e situacao.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
