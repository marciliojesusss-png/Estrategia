const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = {
  URLSearchParams,
  Calculations: {
    formatarValor(value, unit) {
      if (value === null || value === undefined || value === "") return "-";
      if (unit === "moeda") {
        return Number(value).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      }
      return String(value);
    },
    calcularStatusDesempenho(value) {
      if (value === null || value === undefined || value === "") return "Sem cálculo";
      return Number(value) >= 1 ? "Atingido" : "Abaixo da meta";
    }
  },
  window: {
    __INDICATORS_TEST__: true,
    PageModules: {},
    location: { search: "" }
  }
};

vm.createContext(context);
const indicatorsSource = fs.readFileSync(
  path.join(__dirname, "..", "assets", "js", "indicators.js"),
  "utf8"
);
vm.runInContext(
  indicatorsSource,
  context
);

assert.equal(
  (indicatorsSource.match(/IndicatorFormulas\.calcularIndicador/g) || []).length,
  1,
  "Todo cálculo usado pela tela deve passar pelo fallback de dados persistidos"
);

const {
  resolveMonthlyCalculation,
  resolveAccumulatedCalculation,
  resolveAccumulatedGoalCalculation,
  mergeCalculationForDisplay,
  resolveMonthlySituation,
  performanceBadge,
  resolveGrowthTrackingModes,
  usesAccumulatedGoalCurve,
  formatInputValue,
  renderInputData
} = context.window.IndicatorsInternals;

assert.equal(formatInputValue(119377680.03, { tipo: "moeda" }), "R$ 119.377.680,03");
assert.equal(formatInputValue(null, { tipo: "moeda" }), "-");
const legacyCurrencyMarkup = renderInputData(
  {},
  {
    camposEntrada: [{ nome: "lucroLiquidoRecorrenteCompetencia", rotulo: "Lucro mensal", tipo: "moeda" }],
    camposEntradaLegados: [{ nome: "lucroLiquidoRecorrenteAcumulado", rotulo: "Lucro acumulado", tipo: "moeda" }]
  },
  {
    camposEntrada: {
      lucroLiquidoRecorrenteAcumulado: 222011430.58,
      lucroLiquidoRecorrenteCompetencia: 102633750.55
    }
  }
);
assert.match(legacyCurrencyMarkup, /Lucro acumulado[\s\S]*R\$ 222\.011\.430,58/);
assert.match(legacyCurrencyMarkup, /Lucro mensal[\s\S]*R\$ 102\.633\.750,55/);

context.window.location.search = "?view=detalhe&id=12&origem=resumo-executivo&escopo=geral";
assert.equal(context.window.IndicatorsInternals.requestedDetailScope(), "geral");
assert.equal(context.window.IndicatorsInternals.isGeneralDetailRequest(), true);
context.window.location.search = "?view=detalhe&id=12&escopo=geral";
assert.equal(context.window.IndicatorsInternals.isGeneralDetailRequest(), false, "Escopo geral sem origem esperada nao deve ativar o carregamento institucional no frontend");
context.window.location.search = "";

const persisted = resolveMonthlyCalculation(
  { resultadoMensal: null, percentualAtingidoMensal: null, statusCalculo: "erro" },
  {
    resultadoMensal: "0.25666942198745996",
    percentualAtingido: "2.5666942198745994",
    situacaoCalculada: "Atingido"
  }
);
assert.equal(persisted.resultadoMensal, "0.25666942198745996");
assert.equal(persisted.percentualAtingido, "2.5666942198745994");
assert.equal(persisted.situacao, "Atingido");

const recalculated = resolveMonthlyCalculation(
  { resultadoMensal: 0.30, percentualAtingidoMensal: 3, situacao: "Atingido" },
  { resultadoMensal: 0.25, percentualAtingido: 2.5, situacaoCalculada: "Atingido" }
);
assert.equal(recalculated.resultadoMensal, 0.30);
assert.equal(recalculated.percentualAtingido, 3);

const empty = resolveMonthlyCalculation(null, null);
assert.equal(empty.resultadoMensal, null);
assert.equal(empty.percentualAtingido, null);
assert.equal(resolveMonthlySituation(null, empty), "Sem cálculo");
assert.equal(performanceBadge("Atingido"), "ok");
assert.equal(performanceBadge("Abaixo da meta"), "warn");
assert.equal(performanceBadge("Sem cálculo"), "info");

const actualZero = resolveMonthlyCalculation(
  { resultadoMensal: 0, percentualAtingidoMensal: 0 },
  null
);
assert.equal(actualZero.resultadoMensal, 0, "Resultado real zero não pode ser tratado como ausência de apuração");
assert.equal(actualZero.percentualAtingido, 0, "Percentual real zero não pode ser substituído por hífen");
assert.equal(resolveMonthlySituation(null, actualZero), "Abaixo da meta");

assert.match(indicatorsSource, /<th>Meta mensal\/referência<\/th>\s*<th>Resultado mensal<\/th>\s*<th>% atingido<\/th>\s*<th>Situação<\/th>\s*<th>Status mensal<\/th>/);
assert.match(indicatorsSource, /isPrincipiosJogoResponsavel \? `[\s\S]*?<th>Trimestre\/competência<\/th>[\s\S]*?<th>Status da competência<\/th>/);
assert.doesNotMatch(
  indicatorsSource.match(/` : `\s*<th>Mês<\/th>[\s\S]*?<th>Ação<\/th>\s*`;/)?.[0] || "",
  /Realizado mensal/,
  "O fallback genérico não deve exibir a coluna Realizado mensal"
);

const socialTransfer = resolveAccumulatedCalculation(
  { resultadoMensal: null, percentualAtingidoMensal: null, statusCalculo: "erro" },
  {
    metaReferencia: "737118539.3",
    resultadoMensal: "769496203.1",
    percentualAtingido: "1.0439246363695416",
    situacaoCalculada: "Atingido"
  }
);
assert.equal(socialTransfer.metaReferencia, "737118539.3");
assert.equal(socialTransfer.resultadoAcumulado, "769496203.1");
assert.equal(socialTransfer.percentualAtingido, "1.0439246363695416");
assert.equal(socialTransfer.situacao, "Atingido");

const recurringProfit = resolveAccumulatedGoalCalculation(
  {
    resultadoOficialAnual: "119377680.03",
    percentualAtingidoAnual: "0.09874084369727047",
    situacao: "Abaixo da meta"
  },
  {
    metaReferencia: "89555555.56",
    resultadoOficialAnual: "119377680.03",
    percentualAtingido: "0.09874084369727047",
    situacaoCalculada: "Abaixo da meta"
  }
);
assert.ok(Math.abs(recurringProfit.percentualAtingido - (119377680.03 / 89555555.56)) < 0.000001);
assert.equal(recurringProfit.situacao, "Atingido");

const mergedPersisted = mergeCalculationForDisplay(
  {
    resultadoMensal: null,
    resultadoOficialAnual: null,
    percentualAtingidoMensal: null,
    percentualAtingidoAnual: null,
    metaReferenciaMensal: null,
    statusCalculo: "erro"
  },
  {
    metaReferencia: "60",
    resultadoMensal: "55",
    resultadoOficialAnual: "55",
    percentualAtingido: "0.9166666667",
    situacaoCalculada: "Atenção"
  }
);
assert.equal(mergedPersisted.metaReferenciaMensal, "60");
assert.equal(mergedPersisted.resultadoMensal, "55");
assert.equal(mergedPersisted.resultadoOficialAnual, "55");
assert.equal(mergedPersisted.percentualAtingidoMensal, "0.9166666667");
assert.equal(mergedPersisted.percentualAtingidoAnual, "0.9166666667");
assert.equal(mergedPersisted.situacao, "Atenção");
assert.equal(mergedPersisted.statusCalculo, "erro");

const mergedRecalculated = mergeCalculationForDisplay(
  {
    resultadoMensal: 60,
    resultadoOficialAnual: 62,
    percentualAtingidoMensal: 1,
    percentualAtingidoAnual: 1.1,
    metaReferenciaMensal: 60,
    situacao: "Atingido"
  },
  {
    metaReferencia: 50,
    resultadoMensal: 45,
    resultadoOficialAnual: 46,
    percentualAtingido: 0.9,
    situacaoCalculada: "Atenção"
  }
);
assert.equal(mergedRecalculated.metaReferenciaMensal, 60);
assert.equal(mergedRecalculated.resultadoMensal, 60);
assert.equal(mergedRecalculated.resultadoOficialAnual, 62);
assert.equal(mergedRecalculated.percentualAtingidoMensal, 1);
assert.equal(mergedRecalculated.percentualAtingidoAnual, 1.1);
assert.equal(mergedRecalculated.situacao, "Atingido");

const ecosystemGrowth = resolveGrowthTrackingModes({
  tipoCalculo: "crescimento_comparado_base_2025"
});
assert.equal(ecosystemGrowth.isBase2025Growth, true);
assert.equal(ecosystemGrowth.isEcossistemaScenario, false);

const lotteryNetworkGrowth = resolveGrowthTrackingModes({
  tipoCalculo: "crescimento_rede_loterica_base_2025"
});
assert.equal(lotteryNetworkGrowth.isBase2025Growth, true);
assert.equal(lotteryNetworkGrowth.isRedeLotericaIncrement, false);

const legacyScenario = resolveGrowthTrackingModes({
  tipoCalculo: "participacao_ecossistema_com_cenarios"
});
assert.equal(legacyScenario.isEcossistemaScenario, true);
assert.equal(legacyScenario.isBase2025Growth, false);

assert.equal(usesAccumulatedGoalCurve({
  tipoCalculo: "valor_financeiro_acumulado",
  parametrosCalculo: {}
}), true, "Indicadores financeiros acumulados devem manter a tabela acumulada mesmo sem metaTipo no servidor");
assert.equal(usesAccumulatedGoalCurve({
  tipoCalculo: "lucro_recorrente_mensal",
  parametrosCalculo: { metaTipo: "curva_mensal_por_competencia" }
}), false, "Lucro recorrente mensal não deve usar a tabela acumulada");
assert.equal(usesAccumulatedGoalCurve({
  tipoCalculo: "percentual_direto",
  parametrosCalculo: { metaTipo: "curva_acumulada_por_competencia" }
}), true);
assert.equal(usesAccumulatedGoalCurve({
  tipoCalculo: "percentual_direto",
  parametrosCalculo: {}
}), false);

console.log("Testes da composicao mensal do indicador OK");
