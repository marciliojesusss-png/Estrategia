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
  },
  resolverMetaPercentualAcoesPropostas(rule, reference = {}) {
    if (rule?.tipoCalculo !== "execucao_acoes_propostas") return null;
    const quarter = reference.trimestre || `${Math.ceil(Number(reference.mes) / 3)}TRI/${reference.ano || 2026}`;
    const target = rule?.parametrosCalculo?.curvaTrimestralAcumulada?.[quarter] || {};
    if (target.metaPercentual !== null && target.metaPercentual !== undefined) return Number(target.metaPercentual);
    const quantity = Number(target.metaAcoesRealizadasAcumuladas ?? reference.metaReferencia ?? reference.metaMensal);
    const total = Number(rule?.parametrosCalculo?.totalAcoesPropostas);
    return Number.isFinite(quantity) && total > 0 ? quantity / total : null;
  }
};
const indicatorFormulas = { obterRegra() { return null; } };
const context = {
  window: { PageModules: {}, Calculations: calculations, IndicatorFormulas: indicatorFormulas },
  Calculations: calculations,
  IndicatorFormulas: indicatorFormulas
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "assets", "js", "launches.js"), "utf8"), context);
const internals = context.window.__LAUNCHES_FILTER_TEST_INTERNALS__;

const representationRule13 = { indicadorId: 13, tipoCalculo: "percentual_direto", unidadeMedida: "percentual" };
const representationRule14 = { indicadorId: 14, tipoCalculo: "percentual_direto", unidadeMedida: "percentual" };
const jogoResponsavelRule21 = { indicadorId: 21, tipoCalculo: "cobertura_capacitacao_jogo_responsavel", unidadeMedida: "percentual" };
const achievementPresentationRules = [
  { indicadorId: 3, tipoCalculo: "crescimento_media_mensal", unidadeMedida: "percentual" },
  { indicadorId: 11, tipoCalculo: "marco_projeto_percentual", unidadeMedida: "percentual" },
  { indicadorId: 20, tipoCalculo: "execucao_acoes_propostas", unidadeMedida: "percentual" }
];
const individuallyPendingAchievementRules = [
  { indicadorId: 8, tipoCalculo: "razao_canais_digitais", unidadeMedida: "percentual", camposEntrada: [{ nome: "arrecadacaoCanaisEletronicos" }] }
];
const pixAchievementRule = { indicadorId: 9, tipoCalculo: "razao_pix", unidadeMedida: "percentual", camposEntrada: [{ nome: "arrecadacaoPix" }] };
assert.equal(internals.isRepresentationIndicator({ id: 13 }, representationRule13), true);
assert.equal(internals.isRepresentationIndicator({ id: 14 }, representationRule14), true);
assert.equal(internals.isRepresentationIndicator({ id: 15 }, { indicadorId: 15 }), false);
assert.equal(internals.isJogoResponsavelIndicator({ id: 21 }, jogoResponsavelRule21), true);
assert.equal(internals.usesReadOnlyAchievementField({ id: 21 }, jogoResponsavelRule21), true);
assert.equal(internals.shouldHideGoalAchievementFields({ id: 13 }, representationRule13), false);
assert.equal(internals.shouldHideGoalAchievementFields({ id: 14 }, representationRule14), false);
assert.equal(internals.shouldHideGoalAchievementFields({ id: 21 }, jogoResponsavelRule21), false);
achievementPresentationRules.forEach((rule) => {
  const indicator = { id: rule.indicadorId };
  assert.equal(internals.usesReadOnlyAchievementField(indicator, rule), true, `Indicador ${rule.indicadorId} deve usar campo somente leitura`);
  assert.equal(internals.shouldHideGoalAchievementFields(indicator, rule), false, `Indicador ${rule.indicadorId} deve exibir % atingido`);
});
individuallyPendingAchievementRules.forEach((rule) => {
  const indicator = { id: rule.indicadorId };
  assert.equal(internals.usesReadOnlyAchievementField(indicator, rule), false, `Indicador ${rule.indicadorId} deve aguardar análise individual`);
  assert.equal(internals.shouldHideGoalAchievementFields(indicator, rule), true, `Indicador ${rule.indicadorId} não deve exibir o novo campo principal`);
});
assert.equal(internals.usesReadOnlyAchievementField({ id: 9 }, pixAchievementRule), true);
assert.equal(internals.shouldHideGoalAchievementFields({ id: 9 }, pixAchievementRule), false);
assert.equal(internals.usesReadOnlyAchievementField({ id: 8 }, individuallyPendingAchievementRules[0]), false);
assert.equal(internals.formatRepresentationAchievement(1.0230179028133), "102,30%");
assert.equal(internals.formatRepresentationAchievement((137 / 151) / 0.9), "100,81%");
assert.equal(internals.formatRepresentationAchievement((123 / 184) / 0.9), "74,28%");
assert.equal(internals.formatRepresentationAchievement((99 / 171) / 0.9), "64,33%");
assert.equal(internals.formatRepresentationAchievement(1), "100,00%");
assert.equal(internals.formatRepresentationAchievement(0.8), "80,00%");
assert.equal(internals.formatRepresentationAchievement(null), "-");
assert.equal(
  internals.resolveRepresentationAchievement(
    { id: 14 },
    representationRule14,
    { status: "Homologado", resultadoOficialAnual: 0.272727, percentualAtingido: 0.779221 },
    0.779142857
  ),
  0.779221,
  "lançamento histórico bloqueado deve reutilizar o percentual canônico da API"
);
assert.equal(
  internals.resolveRepresentationAchievement(
    { id: 14 },
    representationRule14,
    { status: "Em preenchimento", resultadoOficialAnual: 0.2609, percentualAtingido: 0.745428571429 },
    0.8
  ),
  0.8,
  "competência editável deve manter a prévia dinâmica"
);

assert.equal(
  internals.requiresListCalculation({ indicadorId: 6, tipoCalculo: "indice_inverso" }),
  true,
  "a listagem deve recalcular a situação do IEO com a meta vigente"
);
assert.equal(
  internals.requiresListCalculation({ indicadorId: 99, tipoCalculo: "indice_inverso" }),
  false,
  "a correção visual deve permanecer exclusiva do Indicador 06"
);
assert.equal(
  internals.requiresListCalculation({ indicadorId: 23, tipoCalculo: "crescimento_rede_loterica_base_2025" }),
  true,
  "a listagem do Indicador 23 deve resolver a precedência documental nos fechamentos"
);

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
    { metaTrimestral: 1.01, unidadeMedida: "percentual" },
    { tipoCalculo: "crescimento_rede_loterica_base_2025", unidadeMedida: "percentual" },
    { mes: 6 }
  ))),
  ["Meta trimestral", "101%"]
);

assert.deepEqual(
  JSON.parse(JSON.stringify(internals.indicator23CalculatedDetails({
    metaIndiceCrescimento: 1.005,
    indiceEmRelacaoA2025: 1.0057,
    crescimentoVs2025: 0.0057,
    percentualAtingidoTecnico: 1.0057 / 1.005,
    baseReferencia2025Periodo: 1000,
    realizado2026Periodo: 1005.7,
    resultadoDocumentalRedeLoterica: 0.0057,
    percentualAtingidoOficialRedeLoterica: 1.1386,
    escalaResultadoDocumentalRedeLoterica: "incremento",
    fonteResultadoRedeLoterica: "Informe 0029",
    situacao: "Atingido"
  }))),
  [
    ["Meta técnica em índice", "100.49999999999999%"],
    ["Resultado técnico", "100.57000000000001%"],
    ["Crescimento equivalente", "0.5700000000000001%"],
    ["Atingimento técnico", `${(1.0057 / 1.005) * 100}%`],
    ["ARL25 acumulada — memória técnica", "R$ 1000.00"],
    ["ARL26 acumulada — memória técnica", "R$ 1005.70"],
    ["Meta documental original", "0.49999999999998934%"],
    ["Resultado documental original", "0.5700000000000001%"],
    ["Atingimento oficial reportado", "113.86%"],
    ["Escala oficial", "incremento"],
    ["Fonte oficial", "Informe 0029"],
    ["Situação técnica", "Atingido"]
  ]
);

const indicator23Rule = {
  parametrosCalculo: {
    apresentacoesOficiaisTrimestrais: {
      "1TRI": { metaOficialReportada: 0.005, resultadoOficialReportado: 0.0057, percentualAtingidoOficialReportado: 1.1386, escalaResultadoDocumental: "incremento", situacao: "Atingido", fonte: "Informe 0029" },
      "2TRI": { resultadoOficialReportado: 0.988, percentualAtingidoOficialReportado: 0.9784, escalaResultadoDocumental: "indice", situacao: "Abaixo da meta", fonte: "Informe 0056" }
    }
  }
};
assert.deepEqual(
  JSON.parse(JSON.stringify(internals.indicator23OfficialPresentation(
    indicator23Rule,
    { mes: 3, metaReferencia: 1.005, camposEntrada: {} },
    { metaIndiceCrescimento: 1.005 }
  ))),
  { visible: true, complete: true, meta: 1.005, result: 1.0057, originalMeta: 0.005, originalResult: 0.0057, performance: 1.1386, scale: "incremento", situation: "Atingido", source: "Informe 0029" }
);
assert.deepEqual(
  JSON.parse(JSON.stringify(internals.indicator23OfficialPresentation(
    indicator23Rule,
    { mes: 6, metaReferencia: 1.01, camposEntrada: {} },
    { metaIndiceCrescimento: 1.01 }
  ))),
  { visible: true, complete: true, meta: 1.01, result: 0.988, originalMeta: 1.01, originalResult: 0.988, performance: 0.9784, scale: "indice", situation: "Abaixo da meta", source: "Informe 0056" }
);
assert.equal(internals.indicator23OfficialPresentation(indicator23Rule, { mes: 5 }, {}).visible, false);
const originalPercentageFormatter = calculations.formatarPercentual;
calculations.formatarPercentual = (value, minimumDigits) => `${(Number(value) * 100).toFixed(minimumDigits)}%`;
context.window.DataStore = {
  resolveMeta(indicatorId, year, month, metas, fallback) { return fallback; }
};
[
  [1, 1.005, "100.50%"],
  [3, 1.005, "100.50%"],
  [4, 1.01, "101.00%"],
  [6, 1.01, "101.00%"],
  [7, 1.015, "101.50%"],
  [9, 1.015, "101.50%"],
  [10, 1.02, "102.00%"],
  [12, 1.02, "102.00%"]
].forEach(([mes, metaReferencia, expected]) => {
  assert.equal(
    internals.formatDisplayMeta(
      { indicadorId: 23, tipoCalculo: "crescimento_rede_loterica_base_2025", unidadeMedida: "percentual" },
      { indicadorId: 23, ano: 2026, mes, metaReferencia },
      []
    ),
    expected
  );
});
calculations.formatarPercentual = originalPercentageFormatter;
assert.deepEqual(
  JSON.parse(JSON.stringify(internals.quarterlyMetaDetail(
    { metaTrimestral: 2500, unidadeMedida: "moeda" },
    { tipoCalculo: "valor_financeiro_acumulado", unidadeMedida: "moeda" },
    { mes: 9 }
  ))),
  ["Meta trimestral", "R$ 2500.00"]
);
assert.equal(internals.quarterLabel({ mes: 12 }), "4TRI");

assert.deepEqual(
  JSON.parse(JSON.stringify(internals.indicator01CalculatedDetails({
    metaReferencia: 0.10,
    resultadoTecnicoOfertasPersonalizadas: 2371981 / 3018556,
    percentualAtingidoTecnicoOfertasPersonalizadas: (2371981 / 3018556) / 0.10,
    resultadoDocumentalOfertasPersonalizadas: 0.7858,
    percentualAtingidoOficialOfertasPersonalizadas: 7.858,
    fonteResultadoOfertasPersonalizadas: "Informe 0056/2026",
    tipoPosicaoOfertasPersonalizadas: "fechamento_trimestral"
  }))),
  [
    ["Meta", "10%"],
    ["Resultado técnico", `${(2371981 / 3018556) * 100}%`],
    ["Atingimento técnico", `${((2371981 / 3018556) / 0.10) * 100}%`],
    ["Resultado oficial/documental", `${0.7858 * 100}%`],
    ["Atingimento oficial documental", "785.8%"],
    ["Fonte", "Informe 0056/2026"],
    ["Natureza da posição", "Fechamento trimestral"]
  ]
);

const indicator01MissingDocumentary = internals.indicator01CalculatedDetails({
  metaReferencia: 0.10,
  resultadoTecnicoOfertasPersonalizadas: null,
  percentualAtingidoTecnicoOfertasPersonalizadas: null,
  resultadoDocumentalOfertasPersonalizadas: null,
  percentualAtingidoOficialOfertasPersonalizadas: null
});
assert.equal(indicator01MissingDocumentary[1][1], "-");
assert.equal(indicator01MissingDocumentary[3][1], "-");
assert.equal(indicator01MissingDocumentary[4][1], "-");

const capacidadeTicRule = {
  indicadorId: 11,
  tipoCalculo: "marco_projeto_percentual",
  unidadeMedida: "percentual",
  metaAnualValor: 1,
  parametrosCalculo: {
    metaTipo: "curva_trimestral_percentual",
    curvaTrimestralPercentual: {
      "3TRI/2026": { metaPercentual: 0.85 },
      "4TRI/2026": { metaPercentual: 1 }
    }
  }
};
assert.equal(internals.getMetaLabel(capacidadeTicRule), "Meta do fechamento trimestral");
assert.equal(
  internals.getDisplayMeta(capacidadeTicRule, { indicadorId: 11, ano: 2026, mes: 8, metaMensal: null, camposEntrada: { metaReferenciaTrimestre: 0.85 } }, []),
  0.85,
  "AGO deve exibir a referência do fechamento, não a meta anual como meta mensal"
);
assert.equal(
  internals.getDisplayMeta(capacidadeTicRule, { indicadorId: 11, ano: 2026, mes: 12, metaMensal: 1, camposEntrada: { metaReferenciaTrimestre: 1 } }, []),
  1
);

const pixOfficialResultField = { nome: "resultadoOficialPix", tipo: "percentual" };
const pixOfficialPerformanceField = { nome: "percentualAtingidoOficialPix", tipo: "percentual" };
const pixPresentationSource = fs.readFileSync(path.join(root, "assets", "js", "launches.js"), "utf8");
assert.match(pixPresentationSource, /\["Meta técnica", technicalTarget/);
assert.doesNotMatch(pixPresentationSource, /Meta técnica da planilha/);
assert.equal(internals.usesDecimalPercentageEntry(pixOfficialResultField), true);
assert.equal(internals.formatEntryValue(pixOfficialResultField, 0.67), "67%");
assert.equal(internals.formatEntryValue(pixOfficialResultField, 0.6713), "67,13%");
assert.equal(internals.formatEntryValue(pixOfficialPerformanceField, 1.1009), "110,09%");
assert.ok(Math.abs(internals.parseEntryValue("percentual", "0,57%", "decimal") - 0.0057) < 1e-12);
assert.ok(Math.abs(internals.parseEntryValue("percentual", "98,8%", "decimal") - 0.988) < 1e-12);
assert.match(internals.renderEntryInput({ nome: "resultadoDocumentalRedeLoterica", tipo: "percentual", escalaPercentual: "decimal" }, 0.0057), /data-entry-percent-scale="decimal"/);
assert.equal(internals.formatEntryValue(pixOfficialPerformanceField, 1.0914), "109,14%");
assert.equal(internals.formatEntryValue(pixOfficialResultField, 0.6764), "67,64%");
assert.equal(internals.formatEntryValue(pixOfficialPerformanceField, 1.0737), "107,37%");
assert.equal(internals.parseEntryValue("percentual", "67,13"), 0.6713);
assert.equal(internals.parseEntryValue("percentual", "109,14"), 1.0914);
assert.equal(
  internals.parseEntryValue("percentual", internals.formatEntryValue(pixOfficialPerformanceField, 1.0914)),
  1.0914,
  "a conversão de ida e volta não pode multiplicar o atingimento novamente"
);
assert.match(internals.renderEntryInput(pixOfficialResultField, 0.6713), /type="text"/);
assert.match(internals.renderEntryInput(pixOfficialResultField, 0.6713), /value="67,13%"/);
assert.match(internals.renderEntryInput(pixOfficialPerformanceField, 1.0914), /value="109,14%"/);

const ieoInformedField = { nome: "ieoApuradoInformado", tipo: "percentual" };
assert.equal(internals.usesDecimalPercentageEntry(ieoInformedField), true);
assert.equal(internals.formatEntryValue(ieoInformedField, 0.1113), "11,13%");
assert.ok(Math.abs(internals.parseEntryValue("percentual", "11,13") - 0.1113) < Number.EPSILON * 10);
assert.ok(Math.abs(internals.parseEntryValue("percentual", "11,13%") - 0.1113) < Number.EPSILON * 10);
assert.equal(internals.parseEntryValue("percentual", "0.1113"), 0.1113);
assert.match(internals.renderEntryInput(ieoInformedField, 0.1113), /type="text"/);
assert.match(internals.renderEntryInput(ieoInformedField, 0.1113), /value="11,13%"/);

const capacitacaoOfficialPerformanceField = {
  nome: "percentualAtingidoOficialCapacitacao",
  tipo: "percentual",
  entradaPtBr: true
};
assert.equal(internals.isCapacitacaoAchievementField(capacitacaoOfficialPerformanceField), true);
assert.equal(internals.formatAchievementFactor(1), "100%");
assert.equal(internals.formatAchievementFactor(1.06), "106%");
assert.equal(internals.formatAchievementFactor(1.0355), "103,55%");
assert.equal(internals.formatAchievementFactor(null), "");
assert.equal(internals.formatAchievementFactor(100), "100%", "percentual direto não pode ser multiplicado novamente");
assert.equal(internals.formatAchievementFactor(106), "106%", "percentual direto não pode ser multiplicado novamente");
assert.equal(internals.formatEntryValue(capacitacaoOfficialPerformanceField, 1.06), "106%");
assert.equal(internals.formatEntryValue(capacitacaoOfficialPerformanceField, 106), "106%");
assert.equal(
  internals.parseEntryValue("percentual", internals.formatEntryValue(capacitacaoOfficialPerformanceField, 1.06)),
  1.06,
  "a conversão de ida e volta deve preservar o fator canônico"
);
assert.match(internals.renderEntryInput(capacitacaoOfficialPerformanceField, 1.0355), /value="103,55%"/);

const ieoDivergenceModel = internals.ieoReconciliationModel({
  resultadoCalculado: 0.1,
  resultadoInformado: 0.1113,
  resultadoOficial: 0.1113,
  diferencaIeo: 0.0113,
  divergenciaIeo: true
});
assert.equal(ieoDivergenceModel.visible, true);
assert.equal(ieoDivergenceModel.tone, "warning");
assert.equal(ieoDivergenceModel.title, "Divergência na apuração do IEO");
assert.match(ieoDivergenceModel.message, /11,13%/);
assert.match(ieoDivergenceModel.message, /10,00%/);
assert.equal(internals.isIeoSubmissionBlockedByDivergence("draft", { divergenciaIeo: true }), false);
assert.equal(internals.isIeoSubmissionBlockedByDivergence("send", { divergenciaIeo: true }), true);
assert.equal(internals.isIeoSubmissionBlockedByDivergence("send", { divergenciaIeo: false }), false);

const ieoRule = { indicadorId: 6, tipoCalculo: "indice_inverso" };
assert.equal(internals.ieoCalculatedPersistenceValue(ieoRule, { resultadoCalculado: 0.1, resultadoMensal: 0.1113 }), 0.1);
assert.equal(internals.ieoCalculatedPersistenceValue(ieoRule, { resultadoCalculado: null, resultadoMensal: 0.1113 }), null);
assert.equal(internals.ieoCalculatedPersistenceValue({ indicadorId: 7, tipoCalculo: "percentual_direto" }, { resultadoMensal: 0.42 }), 0.42);

const ieoConferredModel = internals.ieoReconciliationModel({
  resultadoCalculado: 0.1113,
  resultadoInformado: 0.1113,
  resultadoOficial: 0.1113,
  valoresConferidosIeo: true,
  divergenciaIeo: false
});
assert.equal(ieoConferredModel.title, "Valores conferidos");
assert.equal(ieoConferredModel.tone, "success");
assert.equal(ieoConferredModel.details.length, 2);
assert.equal(internals.normalizeRgfKey("  Orientação AO Jogador  "), "orientacao ao jogador");
assert.deepEqual(
  JSON.parse(JSON.stringify(internals.rgfRowsFromLaunch({ camposEntrada: {
    elementoRGF: "Pesquisa",
    statusAcao: "Concluída",
    acaoExecutada: "Ação legada"
  } }))),
  [{ elemento: "Pesquisa", status: "Concluída", acao: "Ação legada", data: "", evidencia: "" }]
);
assert.deepEqual(
  JSON.parse(JSON.stringify(internals.rgfRowsFromLaunch({ camposEntrada: {
    elementosRGFAtendidos: [{ elemento: "Pesquisa", status: "Homologada" }]
  } }))),
  [{ elemento: "Pesquisa", status: "Homologada", acao: "", data: "", evidencia: "" }]
);

const view = fs.readFileSync(path.join(root, "views", "frontend", "lancamentos.php"), "utf8");
assert.match(view, /Registro dos dados pelas unidades apuradoras\./);
assert.match(view, /<th>Mês \/ competência<\/th>/);
assert.match(view, /<th>Resultado da competência<\/th>/);
assert.match(view, /id="launchResultadoMensalLabel">Resultado da competência</);
assert.match(view, /id="launchPercentualCalculadoLabel">% da meta atingida</);
assert.match(view, /id="launchPercentualAcumuladoLabel">% da meta atingida anual</);
assert.match(view, /id="resultadoAnualWrapper"/);
assert.match(view, /documentation-fields\.js\?v=DOCUMENTACAO-COMPLEMENTAR-1TRI-001/);
assert.match(view, /styles\.css\?v=APP-VERSION-001/);
assert.match(view, /formulas\.js\?v=INDICADOR09-PIX-001/);
assert.match(view, /ieo-recorrente\.js\?v=INDICADOR06-CONFERENCIA-001/);
assert.match(view, /launches\.js\?v=INDICADOR23-APRESENTACAO-002/);
assert.match(view, /id="launchValidationFeedback"[^>]+role="alert"[^>]+aria-live="assertive"/);

const dataStoreSource = fs.readFileSync(path.join(root, "assets", "js", "dataStore.js"), "utf8");
assert.match(dataStoreSource, /nome: "tipoPosicaoCapacitacao"/);
assert.match(dataStoreSource, /Acompanhamento sem nova medição/);
assert.match(dataStoreSource, /nome: "acoesAcompanhamentoCapacitacao"/);
assert.match(dataStoreSource, /nome: "modoResultadoCapacitacao"/);
assert.match(dataStoreSource, /value: "oficial_informado"/);
assert.match(dataStoreSource, /nome: "resultadoOficialInformadoCapacitacao"[\s\S]+entradaPtBr: true/);
assert.match(dataStoreSource, /nome: "percentualAtingidoOficialCapacitacao"[\s\S]+entradaPtBr: true/);
assert.match(dataStoreSource, /nome: "quantidadeCursosMinimaCapacitacao"[^\n]+somenteLeitura: true/);
assert.match(dataStoreSource, /nome: "tipoPosicaoAprimoramento"/);
assert.match(dataStoreSource, /nome: "melhoriasImplementadasMes"[^\n]+Melhorias implementadas no período de apuração[^\n]+tipo: "inteiro"/);
assert.match(dataStoreSource, /nome: "melhoriasImplementadasAcumuladas"[^\n]+tipo: "inteiro"[^\n]+somenteLeitura: true/);
assert.match(dataStoreSource, /Descrição das melhorias implementadas no período/);
assert.match(dataStoreSource, /nome: "percentualEvolucaoPlataformaJogos"[^\n]+Percentual oficial de evolução do projeto[^\n]+tipo: "percentual"[^\n]+entradaPtBr: true/);
assert.match(dataStoreSource, /"2TRI\/2026": 1 \/ 3/);
assert.match(dataStoreSource, /Registro de Aposta finalizado em ambiente de desenvolvimento/);

const launchesSource = fs.readFileSync(path.join(root, "assets", "js", "launches.js"), "utf8");
assert.match(launchesSource, /function updateCapacitacaoPositionFields/);
assert.match(launchesSource, /resultMode === "oficial_informado"/);
assert.match(launchesSource, /Componente — \$\{curso\}/);
assert.match(launchesSource, /function updateNpsPositionFields/);
assert.match(launchesSource, /function updateAprimoramentoPositionFields/);
assert.match(launchesSource, /melhorias implementadas no período para o fechamento quantitativo/);
assert.match(launchesSource, /resultado\.origemNps === "componentes_formula"/);
assert.match(launchesSource, /Percentual de promotores − percentual de detratores/);
assert.match(launchesSource, /Informe as ações realizadas ou o andamento antes de enviar/);
assert.match(launchesSource, /async function persistLaunch\(action\) \{\s+const lancamento = getSelectedLaunch\(\);/);
assert.match(launchesSource, /Evidência anexada, mas não foi possível salvar o lançamento/);
assert.match(launchesSource, /meta_oficial_trimestral_projeto/);
assert.match(launchesSource, /Evolução oficial do projeto/);
assert.match(launchesSource, /const tableCalculation = requiresListCalculation\(regra\)/);
assert.match(launchesSource, /Não é possível enviar para homologação enquanto houver divergência entre o IEO informado pela Unidade/);
assert.match(launchesSource, /resultadoMensal: ieoCalculatedPersistenceValue\(calculation\.regra, calculation\.resultado\)/);
assert.match(launchesSource, /function updateSocioambientalInitiativeFields/);
assert.match(launchesSource, /function validateSocioambientalRequiredFields/);
assert.match(launchesSource, /Campo obrigatório para iniciativa apoiada\/realizada\./);
assert.match(dataStoreSource, /nome: "nomeIniciativaSocioambiental"[^\n]+obrigatorio: false/);

const socioambientalRule = {
  tipoCalculo: "iniciativas_apoiadas",
  parametrosCalculo: {
    campoStatus: "statusIniciativaSocioambiental",
    campoNome: "nomeIniciativaSocioambiental",
    campoDataApoio: "dataApoioIniciativa",
    statusQueConta: "Apoiada/realizada"
  }
};
function socioambientalValidation(values) {
  return JSON.parse(JSON.stringify(internals.socioambientalRequiredFieldState(socioambientalRule, values)));
}
assert.deepEqual(socioambientalValidation({ statusIniciativaSocioambiental: "Apoiada/realizada" }), {
  applies: true,
  missing: ["nomeIniciativaSocioambiental", "dataApoioIniciativa"],
  message: "Para registrar uma iniciativa como Apoiada/realizada, preencha:\n• Nome da iniciativa\n• Data de apoio/realização"
});
assert.deepEqual(socioambientalValidation({
  statusIniciativaSocioambiental: "Apoiada/realizada",
  nomeIniciativaSocioambiental: "Iniciativa A"
}), {
  applies: true,
  missing: ["dataApoioIniciativa"],
  message: "Informe a data de apoio/realização da iniciativa."
});
assert.deepEqual(socioambientalValidation({
  statusIniciativaSocioambiental: "Apoiada/realizada",
  dataApoioIniciativa: "2026-06-10"
}), {
  applies: true,
  missing: ["nomeIniciativaSocioambiental"],
  message: "Informe o nome da iniciativa apoiada/realizada."
});
assert.deepEqual(socioambientalValidation({
  statusIniciativaSocioambiental: "Apoiada/realizada",
  nomeIniciativaSocioambiental: "Iniciativa A",
  dataApoioIniciativa: "2026-06-10"
}), { applies: true, missing: [], message: "" });
["Em prospecção", "Em estruturação", "Em rito de governança"].forEach((status) => {
  assert.deepEqual(socioambientalValidation({ statusIniciativaSocioambiental: status }), {
    applies: false,
    missing: [],
    message: ""
  });
});

const socioambientalRuleWithDocumentedPeriod = {
  ...socioambientalRule,
  parametrosCalculo: {
    ...socioambientalRule.parametrosCalculo,
    campoDescricao: "descricaoAndamentoSocioambiental",
    permitirPeriodoNaDescricaoSemDataPontual: true
  }
};
assert.deepEqual(JSON.parse(JSON.stringify(internals.socioambientalRequiredFieldState(
  socioambientalRuleWithDocumentedPeriod,
  {
    statusIniciativaSocioambiental: "Apoiada/realizada",
    nomeIniciativaSocioambiental: "Brasil Ladies Cup 2026",
    dataApoioIniciativa: "",
    descricaoAndamentoSocioambiental: "Realizada no período de julho a setembro de 2026."
  }
))), { applies: true, missing: [], message: "" });

const approvalsSource = fs.readFileSync(path.join(root, "assets", "js", "approvals.js"), "utf8");
assert.match(approvalsSource, /\["nota_pesquisa_nps", "melhorias_acumuladas", "lucro_recorrente_mensal"\]\.includes\(regra\?\.tipoCalculo\)/);
assert.match(approvalsSource, /Acompanhamento sem nova medição/);
assert.match(approvalsSource, /Ações realizadas \/ andamento/);
assert.match(approvalsSource, /"Em acompanhamento"/);
assert.match(approvalsSource, /const componentesNps = isNps/);
assert.match(approvalsSource, /origemNps === "componentes_formula"/);
assert.match(approvalsSource, /Novas melhorias no período/);
assert.match(approvalsSource, /Melhorias implementadas acumuladas/);
assert.match(approvalsSource, /Base de melhorias mapeadas/);
assert.match(approvalsSource, /const detalhesPlataformaJogos = isPlataformaJogos/);
assert.match(approvalsSource, /Marco\/etapa atual/);

const actionOptionsHtml = internals.renderEntryInput({
  nome: "acaoPropostaVisibilidade",
  rotulo: "Ação proposta",
  tipo: "selecao",
  opcoes: [
    "Opção em texto",
    { value: "valor_label", label: "Opção value/label" },
    { id: "id_label", label: "Opção id/label" },
    { id: "relatorio_sorte_em_numeros_2025", nome: "Publicar relatório institucional \"A Sorte em Números — 2025\"" },
    { id: "campanha_repasses_sociais", nome: "Realizar campanha publicitária exclusiva com foco no repasse social das Loterias CAIXA" }
  ]
}, "relatorio_sorte_em_numeros_2025");
assert.match(actionOptionsHtml, /value="Opção em texto"[^>]*>Opção em texto<\/option>/);
assert.match(actionOptionsHtml, /value="valor_label"[^>]*>Opção value\/label<\/option>/);
assert.match(actionOptionsHtml, /value="id_label"[^>]*>Opção id\/label<\/option>/);
assert.match(actionOptionsHtml, /value="relatorio_sorte_em_numeros_2025"[^>]*selected[^>]*>Publicar relatório institucional &quot;A Sorte em Números — 2025&quot;<\/option>/);
assert.match(actionOptionsHtml, /value="campanha_repasses_sociais"[^>]*>Realizar campanha publicitária exclusiva com foco no repasse social das Loterias CAIXA<\/option>/);

const historicalTicMilestone = "Contratação adicional concluída - OS 25173021";
const historicalTicSelectHtml = internals.renderEntryInput({
  nome: "marcoAlcancadoTIC",
  rotulo: "Marco alcançado",
  tipo: "selecao",
  opcoes: ["Não iniciado", "Contrato assinado com fornecedor"]
}, historicalTicMilestone);
assert.match(
  historicalTicSelectHtml,
  /value="Contratação adicional concluída - OS 25173021" selected>Contratação adicional concluída - OS 25173021 \(valor histórico\)<\/option>/,
  "marco histórico do Indicador 11 deve permanecer selecionado sem alterar o dado persistido"
);
assert.doesNotMatch(
  historicalTicSelectHtml,
  /value="Não iniciado" selected/,
  "marco histórico não pode cair visualmente em Não iniciado"
);

const visibilityRule = {
  tipoCalculo: "execucao_acoes_propostas",
  unidadeMedida: "percentual",
  metaAnualValor: 1,
  parametrosCalculo: {
    curvaTrimestralAcumulada: {
      "2TRI/2026": { metaPercentual: 0.5, metaAcoesRealizadasAcumuladas: 1 }
    }
  }
};
assert.equal(internals.getDisplayMeta(visibilityRule, { ano: 2026, mes: 6, trimestre: "2TRI/2026" }), 0.5);
assert.deepEqual(
  JSON.parse(JSON.stringify(internals.quarterlyMetaDetail(
    { metaTrimestral: 1, metaPercentualTrimestral: 0.5, unidadeMedida: "percentual" },
    visibilityRule,
    { ano: 2026, mes: 6, trimestre: "2TRI/2026" }
  ))),
  ["Meta trimestral", "50%"]
);

console.log("Testes de apresentação da tela de lançamentos OK");
