(function (root) {
  const STATUS_LANCAMENTO = Object.freeze({
    NAO_INICIADO: "Não iniciado",
    EM_PREENCHIMENTO: "Em preenchimento",
    ENVIADO_HOMOLOGACAO: "Enviado para homologação",
    DEVOLVIDO_AJUSTE: "Devolvido para ajuste",
    HOMOLOGADO: "Homologado",
    REABERTO: "Reaberto",
    CANCELADO: "Cancelado",
    SUBSTITUIDO: "Substituído"
  });
  const MONTHS = [
    [1, "Janeiro"], [2, "Fevereiro"], [3, "Março"], [4, "Abril"],
    [5, "Maio"], [6, "Junho"], [7, "Julho"], [8, "Agosto"],
    [9, "Setembro"], [10, "Outubro"], [11, "Novembro"], [12, "Dezembro"]
  ];
  const QUARTERS = [
    { number: 1, label: "1TRI", months: [1, 2, 3] },
    { number: 2, label: "2TRI", months: [4, 5, 6] },
    { number: 3, label: "3TRI", months: [7, 8, 9] },
    { number: 4, label: "4TRI", months: [10, 11, 12] }
  ];
  const YTD_TYPES = new Set([
    "quantidade_acumulada",
    "melhorias_acumuladas",
    "iniciativas_apoiadas",
    "plano_acao_por_elementos",
    "execucao_acoes_propostas",
    "ggr_formula",
    "lucro_recorrente_mensal"
  ]);
  const PIX_QUARTER_TARGETS = Object.freeze({
    "1TRI/2026": 0.61,
    "2TRI/2026": 0.62,
    "3TRI/2026": 0.63,
    "4TRI/2026": 0.65
  });

  function toNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function hasCurrentTransactionalHomologation(launch, governance = {}) {
    if (!launch) return false;
    const launchId = String(launch.id);
    const currentVersion = Number(launch.versaoAtual ?? launch.versao ?? 1);
    return (governance.governancaHomologacaoAtual || []).some((item) => (
      String(item.lancamentoId ?? item.lancamento_id) === launchId &&
      Number(item.versao ?? item.versao_lancamento) === currentVersion
    ));
  }

  function quarterNumber(value) {
    if (typeof value === "number") return value >= 1 && value <= 4 ? value : null;
    const match = String(value || "").match(/([1-4])\s*TRI/i);
    return match ? Number(match[1]) : null;
  }

  function obterTrimestrePorMes(mes, ano = 2026) {
    let monthNumber = toNumber(mes);
    if (monthNumber === null) {
      const normalized = String(mes || "").trim().toLocaleLowerCase("pt-BR");
      monthNumber = MONTHS.find(([, name]) => name.toLocaleLowerCase("pt-BR") === normalized)?.[0] ?? null;
    }
    const quarter = QUARTERS.find((item) => item.months.includes(monthNumber));
    return quarter ? `${quarter.label}/${ano}` : null;
  }

  function obterMesesDoTrimestre(trimestre) {
    const number = quarterNumber(trimestre);
    return QUARTERS.find((item) => item.number === number)?.months || [];
  }

  function getYear(trimestre, fallback = 2026) {
    const match = String(trimestre || "").match(/\/(\d{4})/);
    return match ? Number(match[1]) : fallback;
  }

  function lastByMonth(items) {
    return [...items].sort((a, b) => Number(a.mes) - Number(b.mes)).at(-1) || null;
  }

  function getOfficialResult(calculation, rule) {
    if (rule?.tipoCalculo === "lucro_recorrente_mensal") {
      return toNumber(calculation?.resultadoAcumulado);
    }
    if (rule?.tipoCalculo === "quantidade_acumulada") {
      const accumulatedQuantity = toNumber(calculation?.melhoriasEntreguesAcumuladas);
      if (accumulatedQuantity !== null) return accumulatedQuantity;
    }
    if (rule?.tipoCalculo === "execucao_acoes_propostas") {
      const accumulatedActions = toNumber(calculation?.acoesRealizadasAcumuladas);
      if (accumulatedActions !== null) return accumulatedActions;
    }
    return [
      calculation?.resultadoOficialAnual,
      calculation?.resultadoAcumulado,
      calculation?.resultadoMensal
    ].map(toNumber).find((value) => value !== null) ?? null;
  }

  function getOfficialPerformance(calculation, rule) {
    if (rule?.tipoCalculo === "lucro_recorrente_mensal") {
      return toNumber(calculation?.percentualAtingidoAcumulado);
    }
    const candidates = rule?.tipoCalculo === "plano_acao_por_elementos"
      ? [calculation?.percentualAtingidoAcumulado, calculation?.percentualAtingidoMensal, calculation?.percentualAtingidoAnual]
      : [calculation?.percentualAtingidoAnual, calculation?.percentualAtingidoAcumulado, calculation?.percentualAtingidoMensal];
    return candidates.map(toNumber).find((value) => value !== null) ?? null;
  }

  function competenciaKey(lancamento) {
    if (lancamento?.competencia) return String(lancamento.competencia);
    const ano = Number(lancamento?.ano);
    const mes = Number(lancamento?.mes);
    if (!ano || !mes) return "";
    return `${ano}-${String(mes).padStart(2, "0")}`;
  }

  function getMetaAcumuladaCompetencia(rule, lancamento) {
    const params = rule?.parametrosCalculo || {};
    const curva = params.metasAcumuladasPorCompetencia || params.curvaMetaAcumulada || {};
    const key = competenciaKey(lancamento);
    if (params.priorizarMetaCurvaConfigurada === true && Object.prototype.hasOwnProperty.call(curva, key)) {
      return toNumber(curva[key]);
    }
    const metaCompetencia = toNumber(lancamento?.metaReferencia ?? lancamento?.metaMensal);
    if (metaCompetencia !== null) return metaCompetencia;
    if (Object.prototype.hasOwnProperty.call(curva, key)) {
      return toNumber(curva[key]);
    }
    if (Number(lancamento?.mes) === 12) return toNumber(rule?.metaAnualValor);
    return null;
  }

  function getReferenciaNpsCompetencia(rule, lancamento) {
    const params = rule?.parametrosCalculo || {};
    const key = competenciaKey(lancamento);
    const referencias = params.referenciasPorCompetencia || {};
    if (Object.prototype.hasOwnProperty.call(referencias, key)) return toNumber(referencias[key]);
    return toNumber(params.metaAnualMetodologica ?? rule?.metaAnualValor);
  }

  function getReferenceMeta(rule, quarterLaunches, quarterNumberValue, quarterLabel) {
    const params = rule?.parametrosCalculo || {};
    const configuredPixQuarterTarget = toNumber(params.metasTrimestrais?.[quarterLabel] ?? PIX_QUARTER_TARGETS[quarterLabel]);
    if (rule?.tipoCalculo === "razao_pix" && configuredPixQuarterTarget !== null) return configuredPixQuarterTarget;
    const referenceLaunch = lastByMonth((quarterLaunches || []).filter((item) => item.status === STATUS_LANCAMENTO.HOMOLOGADO)) || lastByMonth(quarterLaunches || []);
    if (rule?.tipoCalculo === "participacao_ecossistema_lotex") {
      const quarterKey = quarterNumberValue ? `${quarterNumberValue}TRI` : String(quarterLabel || "").match(/([1-4])\s*TRI/i)?.[0]?.replace(/\s/g, "");
      const officialTarget = params.apresentacoesOficiaisTrimestrais?.[quarterKey]?.metaOficialReportada;
      if (toNumber(officialTarget) !== null) return toNumber(officialTarget);
      const competence = referenceLaunch?.competencia || (referenceLaunch ? `${referenceLaunch.ano}-${String(referenceLaunch.mes).padStart(2, "0")}` : null);
      return competence ? toNumber(params.metasTecnicasPorCompetencia?.[competence]) : null;
    }
    if (rule?.tipoCalculo === "lucro_recorrente_mensal") {
      const year = getYear(quarterLabel);
      const quarterEnd = QUARTERS.find((item) => item.number === quarterNumberValue)?.months.at(-1);
      const monthlyCurve = params.metasMensaisPorCompetencia || {};
      if (!quarterEnd) return null;
      let totalCents = 0;
      for (let month = 1; month <= quarterEnd; month += 1) {
        const value = toNumber(monthlyCurve[`${year}-${String(month).padStart(2, "0")}`]);
        if (value === null) return null;
        totalCents += Math.round(value * 100);
      }
      return totalCents / 100;
    }
    if (params.metaTipo === "curva_acumulada_por_competencia" && params.priorizarMetaCurvaConfigurada === true) {
      const metaCurva = referenceLaunch ? getMetaAcumuladaCompetencia(rule, referenceLaunch) : null;
      if (metaCurva !== null) return metaCurva;
    }
    if (rule?.tipoCalculo === "melhorias_acumuladas") {
      const quarterTarget = params.curvaTrimestralAcumulada?.[quarterLabel] || {};
      const quantity = toNumber(quarterTarget.metaQuantidadeAcumulada);
      const total = toNumber(params.totalMelhoriasPlano2026);
      if (quantity !== null && total > 0) return quantity / total;
    }
    const metaCompetencia = toNumber(referenceLaunch?.metaReferencia ?? referenceLaunch?.metaMensal);
    if (metaCompetencia !== null) return metaCompetencia;
    if (rule?.tipoCalculo === "participacao_ecossistema_com_cenarios") {
      const referenceLaunch = lastByMonth((quarterLaunches || []).filter((item) => item.status === STATUS_LANCAMENTO.HOMOLOGADO)) || lastByMonth(quarterLaunches || []);
      const rawScenario = "lotex";
      const normalizedScenario = String(rawScenario).toLocaleLowerCase("pt-BR");
      const scenario = normalizedScenario.includes("lotex") && normalizedScenario.includes("marketplace")
        ? "lotex_marketplace"
        : "lotex";
      const quarterKey = quarterNumberValue ? `${quarterNumberValue}TRI` : String(quarterLabel || "").match(/([1-4])\s*TRI/i)?.[0];
      const metaPontosPercentuais = params.curvasCenarios?.[scenario]?.[quarterKey]?.meta2026;
      return metaPontosPercentuais === undefined ? null : metaPontosPercentuais / 100;
    }
    if (rule?.tipoCalculo === "ggr_formula" && quarterNumberValue && quarterLabel) {
      const year = getYear(quarterLabel);
      const quarterEnd = QUARTERS.find((item) => item.number === quarterNumberValue)?.months.at(-1);
      return getMetaAcumuladaCompetencia(rule, { ano: year, mes: quarterEnd, competencia: `${year}-${String(quarterEnd).padStart(2, "0")}` });
    }
    if (params.metaTipo === "curva_acumulada_por_competencia") {
      const referenceLaunch = lastByMonth((quarterLaunches || []).filter((item) => item.status === STATUS_LANCAMENTO.HOMOLOGADO));
      return referenceLaunch ? getMetaAcumuladaCompetencia(rule, referenceLaunch) : null;
    }
    if (params.metaTipo === "curva_trimestral_acumulada") {
      const quarterTarget = params.curvaTrimestralAcumulada?.[quarterLabel] || {};
      if (rule?.tipoCalculo === "melhorias_acumuladas") {
        const quantity = toNumber(quarterTarget.metaQuantidadeAcumulada);
        const total = toNumber(params.totalMelhoriasPlano2026);
        return quantity !== null && total > 0 ? quantity / total : toNumber(quarterTarget.metaPercentual);
      }
      if (rule?.tipoCalculo === "iniciativas_apoiadas") return toNumber(quarterTarget.metaQuantidadeAcumulada);
      if (rule?.tipoCalculo === "plano_acao_por_elementos") return toNumber(quarterTarget.metaElementosAcumulados);
      if (rule?.tipoCalculo === "execucao_acoes_propostas") return toNumber(quarterTarget.metaAcoesRealizadasAcumuladas);
      return toNumber(quarterTarget.metaValorAcumulado ?? quarterTarget.metaPercentual ?? quarterTarget.metaQuantidadeAcumulada ?? quarterTarget.metaElementosAcumulados);
    }
    if (params.metaTipo === "curva_trimestral_percentual") {
      return toNumber(params.curvaTrimestralPercentual?.[quarterLabel]?.metaPercentual);
    }
    if (params.metaTipo === "meta_oficial_trimestral_projeto") {
      const metas = params.metasTrimestraisOficiais || {};
      return Object.prototype.hasOwnProperty.call(metas, quarterLabel) ? toNumber(metas[quarterLabel]) : null;
    }
    if (params.metaTipo === "curva_trimestral_quantidade_cursos") {
      return toNumber(params.curvaTrimestralCursos?.[quarterLabel]?.metaCobertura ?? params.metaCobertura ?? rule?.metaAnualValor);
    }
    if (params.metaTipo === "cobertura_com_quantidade_minima_de_iniciativas") {
      return toNumber(params.curvaJogoResponsavel2026?.[quarterLabel]?.metaCobertura ?? params.metaCobertura ?? rule?.metaAnualValor);
    }
    if (params.metaTipo === "marco_anual") return null;
    if (["baseline_com_meta_anual", "baseline_com_meta_anual_corrigida", "meta_absoluta_por_competencia"].includes(params.metaTipo)) {
      const year = getYear(quarterLabel);
      const quarterEnd = QUARTERS.find((item) => item.number === quarterNumberValue)?.months.at(-1);
      return getReferenciaNpsCompetencia(rule, { ano: year, mes: quarterEnd, competencia: `${year}-${String(quarterEnd).padStart(2, "0")}` });
    }
    if (rule?.tipoCalculo === "razao_canais_digitais") {
      const year = getYear(quarterLabel);
      const quarterEnd = QUARTERS.find((item) => item.number === quarterNumberValue)?.months.at(-1);
      const key = `${year}-${String(quarterEnd).padStart(2, "0")}`;
      return toNumber(params.metasPorCompetencia?.[key] ?? params.metaReferencia ?? rule.metaAnualValor);
    }
    const fixedMonthly = toNumber(params.metaMensalFixa ?? params.metaMensalPix);
    if (fixedMonthly !== null) return fixedMonthly * 3;

    const monthlyMeta = quarterLaunches
      .map((item) => toNumber(item.metaMensal))
      .filter((value) => value !== null);
    if (monthlyMeta.length && ["soma_acumulada_no_ano", "valor_acumulado_com_meta_dinamica"].includes(rule?.tipoConsolidacao)) {
      return monthlyMeta.reduce((sum, value) => sum + value, 0);
    }

    const annualMeta = toNumber(
      params.metaMinimaMelhoriasAno ??
      params.metaReferencia ??
      params.metaCrescimento ??
      params.metaIncremento ??
      rule?.metaAnualValor
    );
    if (annualMeta === null) return null;

    if (rule?.tipoCalculo === "quantidade_acumulada" || rule?.tipoCalculo === "melhorias_acumuladas") return annualMeta * (quarterNumberValue / 4);
    if (["soma_acumulada_no_ano", "valor_acumulado_com_meta_dinamica"].includes(rule?.tipoConsolidacao)) {
      return annualMeta / 4;
    }
    return annualMeta;
  }

  function getSituation(calculation, performance) {
    if (calculation?.situacao) {
      return root.Situations ? root.Situations.normalizarSituacao(calculation.situacao) : calculation.situacao;
    }
    if (performance === null) return "Sem cálculo";
    if (performance >= 1) return "Atingido";
    return "Abaixo da meta";
  }

  function getCalculationScope(rule, allLaunches, quarterMonths, year, quarterEnd) {
    if (YTD_TYPES.has(rule?.tipoCalculo)) {
      return allLaunches.filter((item) => (
        Number(item.ano) === year &&
        Number(item.mes) <= quarterEnd &&
        item.status === STATUS_LANCAMENTO.HOMOLOGADO
      ));
    }
    return allLaunches.filter((item) => (
      Number(item.ano) === year &&
      quarterMonths.includes(Number(item.mes)) &&
      item.status === STATUS_LANCAMENTO.HOMOLOGADO
    ));
  }

  function isQuantitativeNpsLaunch(rule, launch) {
    if (rule?.tipoCalculo !== "nota_pesquisa_nps") return true;
    const params = rule.parametrosCalculo || {};
    const fields = launch?.camposEntrada || {};
    const type = String(fields[params.campoTipoPosicao || "tipoPosicaoNPS"] || "");
    if (type.startsWith("Acompanhamento") || type === "Revisão metodológica") return false;
    const hasPromoters = toNumber(fields[params.campoPromotores || "percentualPromotores"]) !== null;
    const hasDetractors = toNumber(fields[params.campoDetratores || "percentualDetratores"]) !== null;
    if (hasPromoters || hasDetractors) return hasPromoters && hasDetractors;
    return [
      fields[params.campoNps || "npsApurado"],
      fields[params.campoResultadoDocumental || "resultadoDocumentalNPS"]
    ].some((value) => toNumber(value) !== null);
  }

  function isQuantitativeProjectLaunch(rule, launch) {
    if (rule?.parametrosCalculo?.metaTipo !== "meta_oficial_trimestral_projeto") return true;
    const field = rule.parametrosCalculo.campoPercentual || "percentualEvolucaoProjeto";
    const value = launch?.camposEntrada?.[field];
    return value !== null && value !== undefined && value !== "" && toNumber(value) !== null;
  }

  function isQualitativeAnnualResearchPosition(rule, launch) {
    if (rule?.tipoCalculo !== "nota_pesquisa_anual" || !launch) return false;
    if ([STATUS_LANCAMENTO.NAO_INICIADO, STATUS_LANCAMENTO.CANCELADO, STATUS_LANCAMENTO.SUBSTITUIDO].includes(launch.status)) return false;
    const params = rule.parametrosCalculo || {};
    const fields = launch.camposEntrada || {};
    const type = String(fields[params.campoTipoPosicao || "tipoPosicaoClima"] || "");
    const note = fields[params.campoNota || "notaClimaApurada"];
    return ["Acompanhamento", "Plano de ação", "Revisão metodológica"].includes(type) &&
      (note === null || note === undefined || note === "");
  }

  function buildMessage(status, count, names, hasReturned, expectedCount = 3) {
    if (status === "Sem dados") return "Nenhum mês homologado no trimestre.";
    if (status === "Fechado") return "Consolidado trimestral calculado com todas as competências oficiais homologadas.";
    const months = names.length ? `: ${names.join(", ")}` : "";
    const returned = hasReturned ? " Há mês devolvido para ajuste." : "";
    return `Consolidado parcial calculado com ${count} de ${expectedCount} competências oficiais homologadas${months}.${returned}`;
  }

  function consolidarTrimestre(indicador, regra, lancamentosDoIndicador, trimestre, governance = {}) {
    const number = quarterNumber(trimestre);
    const months = obterMesesDoTrimestre(trimestre);
    const configuredClosingMonths = regra?.parametrosCalculo?.mesesFechamentoTrimestral;
    const expectedMonths = months.filter((month) => (
      (!Array.isArray(configuredClosingMonths) || configuredClosingMonths.includes(month)) &&
      root.IndicatorPeriodicity?.isExpectedMonth(indicador, month) !== false
    ));
    const year = getYear(trimestre);
    const label = number ? `${number}TRI/${year}` : null;
    const quarterLaunches = (lancamentosDoIndicador || [])
      .filter((item) => Number(item.ano) === year && months.includes(Number(item.mes)))
      .sort((a, b) => Number(a.mes) - Number(b.mes));
    const officialQuarterLaunches = quarterLaunches.filter((item) => expectedMonths.includes(Number(item.mes)));
    const byMonth = Object.fromEntries(officialQuarterLaunches.map((item) => [Number(item.mes), item]));
    const monthlyComposition = expectedMonths.map((month) => ({
      mes: month,
      nomeMes: MONTHS.find(([value]) => value === month)?.[1] || month,
      lancamento: byMonth[month] || null,
      status: byMonth[month]?.status || STATUS_LANCAMENTO.NAO_INICIADO
    }));
    const legacyHomologatedInQuarter = officialQuarterLaunches.filter((item) => item.status === STATUS_LANCAMENTO.HOMOLOGADO);
    const requiresCurrentGovernance = regra?.exigirHomologacaoTransacionalVersaoAtual === true;
    const homologatedInQuarter = legacyHomologatedInQuarter.filter((item) => (
      !requiresCurrentGovernance || hasCurrentTransactionalHomologation(item, governance)
    ));
    const homologatedCount = homologatedInQuarter.length;
    const expectedCount = expectedMonths.length;
    const hasReturned = officialQuarterLaunches.some((item) => item.status === STATUS_LANCAMENTO.DEVOLVIDO_AJUSTE);
    const capacidadeTicEmFechamento = regra?.tipoCalculo === "marco_projeto_percentual" &&
      regra?.parametrosCalculo?.metaTipo === "curva_trimestral_percentual" &&
      officialQuarterLaunches.some((item) => item.status === STATUS_LANCAMENTO.EM_PREENCHIMENTO);
    const aprimoramentoEmFechamento = regra?.tipoCalculo === "melhorias_acumuladas" &&
      officialQuarterLaunches.some((item) => (
        item.status === STATUS_LANCAMENTO.EM_PREENCHIMENTO &&
        root.IndicatorFormulas?.resolverTipoPosicaoAprimoramento?.(item) === "fechamento_quantitativo"
      ));
    const ggrEmFechamento = regra?.tipoCalculo === "ggr_formula" &&
      officialQuarterLaunches.some((item) => (
        item.status === STATUS_LANCAMENTO.EM_PREENCHIMENTO &&
        toNumber(item?.camposEntrada?.[regra?.parametrosCalculo?.campoGgrAcumuladoDocumental || "ggrAcumuladoOficial"]) !== null
      ));
    const canaisDigitaisEmFechamento = regra?.tipoCalculo === "razao_canais_digitais" &&
      officialQuarterLaunches.some((item) => (
        [STATUS_LANCAMENTO.EM_PREENCHIMENTO, "Reaberto", "Retificado"].includes(item.status) &&
        (
          toNumber(item?.camposEntrada?.[regra?.parametrosCalculo?.campoDenominador || "arrecadacaoTotalProdutosLoteriasMes"]) !== null ||
          toNumber(item?.camposEntrada?.[regra?.parametrosCalculo?.campoResultadoAcumuladoDocumental || "resultadoAcumuladoDocumentalCanaisDigitais"]) !== null
        )
      ));
    const redeLotericaEmFechamento = regra?.tipoCalculo === "crescimento_rede_loterica_base_2025" &&
      officialQuarterLaunches.some((item) => (
        [STATUS_LANCAMENTO.EM_PREENCHIMENTO, "Reaberto", "Retificado"].includes(item.status) &&
        item?.camposEntrada?.tipoPosicaoRedeLoterica === "fechamento_trimestral"
      ));
    const ofertasPersonalizadasEmFechamento = Number(regra?.indicadorId) === 1 &&
      officialQuarterLaunches.some((item) => (
        [STATUS_LANCAMENTO.HOMOLOGADO, STATUS_LANCAMENTO.EM_PREENCHIMENTO, "Reaberto", "Retificado"].includes(item.status) &&
        (
          toNumber(item?.camposEntrada?.clientesUnicosComOfertaPersonalizadaCompetencia) !== null ||
          toNumber(item?.camposEntrada?.resultadoDocumentalOfertasPersonalizadas) !== null
        )
      ));
    const npsEmFechamento = regra?.tipoCalculo === "nota_pesquisa_nps" &&
      officialQuarterLaunches.some((item) => (
        [STATUS_LANCAMENTO.HOMOLOGADO, STATUS_LANCAMENTO.EM_PREENCHIMENTO, "Reaberto", "Retificado"].includes(item.status) &&
        isQuantitativeNpsLaunch(regra, item)
      ));
    const clientesAtivosEmFechamento = Number(regra?.indicadorId) === 3 &&
      officialQuarterLaunches.some((item) => (
        [STATUS_LANCAMENTO.HOMOLOGADO, STATUS_LANCAMENTO.EM_PREENCHIMENTO, "Reaberto", "Retificado"].includes(item.status) &&
        (
          toNumber(item?.camposEntrada?.qmaatu) !== null ||
          toNumber(item?.camposEntrada?.resultadoDocumentalClientesAtivos) !== null
        )
      ));
    const officialPresentation = root.IndicatorFormulas?.obterApresentacaoOficialTrimestre?.(regra, label) || null;
    const documentaryPositionAvailable = toNumber(officialPresentation?.resultadoOficialReportado) !== null;
    let quarterStatus = homologatedCount === 0
      ? (documentaryPositionAvailable && requiresCurrentGovernance
        ? "Documental"
        : capacidadeTicEmFechamento || aprimoramentoEmFechamento || ggrEmFechamento || canaisDigitaisEmFechamento || redeLotericaEmFechamento || ofertasPersonalizadasEmFechamento || npsEmFechamento || clientesAtivosEmFechamento ? "Parcial" : "Sem dados")
      : homologatedCount === expectedCount ? "Fechado" : "Parcial";
    const homologatedNames = monthlyComposition
      .filter((item) => item.status === STATUS_LANCAMENTO.HOMOLOGADO)
      .map((item) => item.nomeMes);
    let meta = getReferenceMeta(regra, quarterLaunches, number, label);

    if (!number || !months.length || (homologatedCount === 0 && !documentaryPositionAvailable && !capacidadeTicEmFechamento && !aprimoramentoEmFechamento && !ggrEmFechamento && !canaisDigitaisEmFechamento && !redeLotericaEmFechamento && !ofertasPersonalizadasEmFechamento && !npsEmFechamento && !clientesAtivosEmFechamento)) {
      const hasQualitativeAnnualResearchPosition = officialQuarterLaunches.some((item) => (
        isQualitativeAnnualResearchPosition(regra, item)
      ));
      return {
        indicador,
        regra,
        trimestre: label,
        trimestreNumero: number,
        ano: year,
        resultadoTrimestral: null,
        resultadoCalculadoTrimestral: null,
        resultadoOficialApresentado: null,
        resultadoDocumentalTrimestral: null,
        desempenhoOficialDocumentalTrimestral: null,
        fonteDocumentalTrimestral: officialPresentation?.fonte || null,
        desempenhoTrimestral: null,
        metaTrimestral: meta,
        situacaoTrimestral: hasQualitativeAnnualResearchPosition ? "Em acompanhamento" : "Sem dados",
        metaTecnicaTrimestral: meta,
        resultadoTecnicoTrimestral: null,
        desempenhoTecnicoTrimestral: null,
        situacaoTecnicaTrimestral: "Sem dados",
        statusTrimestre: "Sem dados",
        mesesHomologados: 0,
        mesesEsperados: expectedCount,
        composicaoMensal: monthlyComposition,
        possuiMesDevolvido: hasReturned,
        mensagem: buildMessage("Sem dados", 0, [], hasReturned, expectedCount),
        ultimoLancamentoHomologado: null,
        medicaoOficialPesquisa2026: regra?.tipoCalculo === "nota_pesquisa_anual" ? false : null,
        resultadoOficialReportado: false,
        possuiPosicaoQualitativa: hasQualitativeAnnualResearchPosition,
        possuiPosicaoOficialSistema: false,
        possuiPosicaoDocumental: false,
        statusGovernancaTrimestral: "Sem homologação transacional da versão atual",
        mesesHomologadosLegados: legacyHomologatedInQuarter.length
      };
    }

    let calculationScope = capacidadeTicEmFechamento
      ? officialQuarterLaunches
      : getCalculationScope(regra, lancamentosDoIndicador || [], months, year, months.at(-1));
    if (ofertasPersonalizadasEmFechamento) {
      calculationScope = officialQuarterLaunches.filter((item) => (
        ![STATUS_LANCAMENTO.CANCELADO, STATUS_LANCAMENTO.SUBSTITUIDO, STATUS_LANCAMENTO.NAO_INICIADO].includes(item.status)
      ));
    }
    if (npsEmFechamento) {
      calculationScope = officialQuarterLaunches.filter((item) => (
        ![STATUS_LANCAMENTO.CANCELADO, STATUS_LANCAMENTO.SUBSTITUIDO, STATUS_LANCAMENTO.NAO_INICIADO].includes(item.status) &&
        isQuantitativeNpsLaunch(regra, item)
      ));
    }
    if (clientesAtivosEmFechamento) {
      calculationScope = officialQuarterLaunches.filter((item) => (
        ![STATUS_LANCAMENTO.CANCELADO, STATUS_LANCAMENTO.SUBSTITUIDO, STATUS_LANCAMENTO.NAO_INICIADO].includes(item.status) &&
        (
          toNumber(item?.camposEntrada?.qmaatu) !== null ||
          toNumber(item?.camposEntrada?.resultadoDocumentalClientesAtivos) !== null
        )
      ));
    }
    if (redeLotericaEmFechamento) {
      calculationScope = (lancamentosDoIndicador || []).filter((item) => {
        if (Number(item.ano) !== year || Number(item.mes) > months.at(-1)) return false;
        if ([STATUS_LANCAMENTO.CANCELADO, STATUS_LANCAMENTO.SUBSTITUIDO, STATUS_LANCAMENTO.NAO_INICIADO].includes(item.status)) return false;
        const fields = item.camposEntrada || {};
        return toNumber(fields.arrecadacaoRedeLoterica2025PeriodoEquivalente) !== null ||
          toNumber(fields.arrecadacaoRedeLotericaMes2026) !== null ||
          fields.tipoPosicaoRedeLoterica === "fechamento_trimestral";
      });
    }
    if (aprimoramentoEmFechamento) {
      calculationScope = (lancamentosDoIndicador || []).filter((item) => (
        Number(item.ano) === year &&
        Number(item.mes) <= months.at(-1) &&
        (
          item.status === STATUS_LANCAMENTO.HOMOLOGADO ||
          (
            item.status === STATUS_LANCAMENTO.EM_PREENCHIMENTO &&
            root.IndicatorFormulas?.resolverTipoPosicaoAprimoramento?.(item) === "fechamento_quantitativo"
          )
        )
      ));
    }
    if (ggrEmFechamento) {
      calculationScope = (lancamentosDoIndicador || []).filter((item) => (
        Number(item.ano) === year &&
        Number(item.mes) <= months.at(-1) &&
        (
          item.status === STATUS_LANCAMENTO.HOMOLOGADO ||
          (
            item.status === STATUS_LANCAMENTO.EM_PREENCHIMENTO &&
            expectedMonths.includes(Number(item.mes))
          )
        )
      ));
    }
    if (canaisDigitaisEmFechamento) {
      calculationScope = (lancamentosDoIndicador || []).filter((item) => {
        if (Number(item.ano) !== year || Number(item.mes) > months.at(-1)) return false;
        if ([STATUS_LANCAMENTO.CANCELADO, STATUS_LANCAMENTO.SUBSTITUIDO, STATUS_LANCAMENTO.NAO_INICIADO].includes(item.status)) return false;
        const fields = item.camposEntrada || {};
        const numerator = fields[regra?.parametrosCalculo?.campoNumerador || "arrecadacaoCanaisEletronicosMes"];
        const denominator = fields[regra?.parametrosCalculo?.campoDenominador || "arrecadacaoTotalProdutosLoteriasMes"];
        const documented = fields[regra?.parametrosCalculo?.campoResultadoAcumuladoDocumental || "resultadoAcumuladoDocumentalCanaisDigitais"];
        return (toNumber(numerator) !== null && toNumber(denominator) !== null) || toNumber(documented) !== null;
      });
    }
    const lucroRecorrente = regra?.tipoCalculo === "lucro_recorrente_mensal";
    const lucroRecorrenteYtdCompleto = !lucroRecorrente || Array.from(
      { length: months.at(-1) },
      (_, index) => index + 1
    ).every((month) => calculationScope.some((item) => Number(item.mes) === month));
    if (lucroRecorrente && !lucroRecorrenteYtdCompleto && quarterStatus === "Fechado") {
      quarterStatus = "Parcial";
    }
    if (regra?.tipoCalculo === "cobertura_capacitacao") {
      calculationScope = calculationScope.filter((item) => (
        root.IndicatorFormulas?.resolverTipoPosicaoCapacitacao?.(item) === "apuracao_quantitativa"
      ));
    }
    if (regra?.tipoCalculo === "melhorias_acumuladas") {
      calculationScope = calculationScope.filter((item) => (
        root.IndicatorFormulas?.resolverTipoPosicaoAprimoramento?.(item) === "fechamento_quantitativo"
      ));
    }
    if (regra?.tipoCalculo === "nota_pesquisa_nps") {
      const quantitativeNpsScope = calculationScope.filter((item) => isQuantitativeNpsLaunch(regra, item));
      if (quantitativeNpsScope.length) calculationScope = quantitativeNpsScope;
    }
    if (regra?.parametrosCalculo?.metaTipo === "meta_oficial_trimestral_projeto") {
      const quantitativeProjectScope = calculationScope.filter((item) => isQuantitativeProjectLaunch(regra, item));
      if (quantitativeProjectScope.length) calculationScope = quantitativeProjectScope;
    }
    const current = lastByMonth(calculationScope);
    const calculation = current
      ? root.IndicatorFormulas?.calcularIndicador(indicador, regra, current, calculationScope)
      : null;
    const validCalculation = calculation && !calculation.erro && lucroRecorrenteYtdCompleto ? calculation : null;
    let result = getOfficialResult(validCalculation, regra);
    let performance = getOfficialPerformance(validCalculation, regra);
    let calculatedQuarterResult = result;
    let officialPresentedResult = result;

    if (lucroRecorrente && validCalculation) {
      meta = toNumber(validCalculation.metaAcumulada);
      result = toNumber(validCalculation.resultadoAcumulado);
      calculatedQuarterResult = result;
      officialPresentedResult = result;
      performance = meta && result !== null ? result / meta : null;
    }

    if (regra?.tipoCalculo === "razao_pix" && validCalculation) {
      calculatedQuarterResult = toNumber(validCalculation.resultadoCalculado ?? validCalculation.resultadoAcumulado);
      officialPresentedResult = toNumber(validCalculation.resultadoOficialDocumental ?? validCalculation.resultadoOficialAnual);
      result = officialPresentedResult;
      performance = toNumber(validCalculation.percentualAtingidoOficialDocumental) ??
        (officialPresentedResult !== null && meta ? officialPresentedResult / meta : null);
    }

    if (regra?.tipoCalculo === "crescimento_comparado_base_2025" && validCalculation) {
      meta = toNumber(validCalculation.metaCalculada2026);
      calculatedQuarterResult = toNumber(validCalculation.realizado2026Periodo);
      officialPresentedResult = calculatedQuarterResult;
      result = calculatedQuarterResult;
      performance = toNumber(validCalculation.percentualAtingidoAnual ?? validCalculation.percentualAtingidoMensal);
    }
    if (regra?.tipoCalculo === "crescimento_rede_loterica_base_2025" && validCalculation) {
      meta = toNumber(validCalculation.metaIndiceCrescimento);
      calculatedQuarterResult = toNumber(validCalculation.indiceEmRelacaoA2025);
      officialPresentedResult = calculatedQuarterResult;
      result = calculatedQuarterResult;
      performance = toNumber(validCalculation.percentualAtingidoTecnico ?? validCalculation.percentualAtingidoMensal);
    }

    if (
      result !== null &&
      meta !== null &&
      (["soma_acumulada_no_ano", "valor_acumulado_com_meta_dinamica", "acumulado_por_soma_mensal"].includes(regra?.tipoConsolidacao) ||
        regra?.tipoCalculo === "quantidade_acumulada")
    ) {
      performance = result / meta;
    }

    const nps = regra?.tipoCalculo === "nota_pesquisa_nps";
    const clientesAtivos = Number(regra?.indicadorId) === 3;
    const technicalMeta = nps
      ? toNumber(validCalculation?.metaTecnicaNPS ?? meta)
      : clientesAtivos ? toNumber(validCalculation?.metaReferencia ?? meta) : meta;
    const technicalResult = nps
      ? toNumber(validCalculation?.resultadoTecnicoNPS ?? calculatedQuarterResult)
      : clientesAtivos
        ? toNumber(validCalculation?.resultadoTecnicoClientesAtivos)
      : regra?.tipoCalculo === "razao_pix" ? calculatedQuarterResult : result;
    const technicalPerformance = nps
      ? toNumber(validCalculation?.percentualAtingidoTecnicoNPS ?? (technicalMeta ? technicalResult / technicalMeta : null))
      : clientesAtivos
        ? toNumber(validCalculation?.percentualAtingidoTecnicoClientesAtivos ?? (technicalMeta ? technicalResult / technicalMeta : null))
      : regra?.tipoCalculo === "razao_pix" && calculatedQuarterResult !== null && meta
        ? calculatedQuarterResult / meta
        : performance;
    const incentivoSocioambiental = regra?.tipoCalculo === "investimento_socioambiental";
    const resultadoFinanceiroTrimestral = incentivoSocioambiental
      ? toNumber(validCalculation?.realizadoFinanceiro ?? technicalResult)
      : null;
    const metaFinanceiraTrimestral = incentivoSocioambiental
      ? toNumber(validCalculation?.metaFinanceira ?? technicalMeta)
      : null;
    const resultadoPercentualTrimestral = incentivoSocioambiental
      ? toNumber(validCalculation?.resultadoPercentualOficial)
      : null;
    const metaPercentualTrimestral = incentivoSocioambiental
      ? toNumber(validCalculation?.metaPercentual)
      : null;
    const technicalSituation = getSituation(validCalculation, technicalPerformance);
    if (officialPresentation && regra?.tipoCalculo !== "crescimento_rede_loterica_base_2025") {
      const reportedMeta = toNumber(officialPresentation.metaOficialReportada);
      const reportedResult = toNumber(officialPresentation.resultadoOficialReportado);
      const reportedPerformance = toNumber(officialPresentation.percentualAtingidoOficialReportado);
      if (reportedMeta !== null) meta = reportedMeta;
      if (reportedResult !== null) {
        result = reportedResult;
        officialPresentedResult = reportedResult;
      }
      if (reportedPerformance !== null) performance = reportedPerformance;
    }
    const officialSituation = officialPresentation?.situacaoOficial || officialPresentation?.situacao || technicalSituation;
    const redeLotericaDocumental = regra?.tipoCalculo === "crescimento_rede_loterica_base_2025";
    const ecossistemaLotexDocumental = regra?.tipoCalculo === "participacao_ecossistema_lotex";
    const clientesAtivosDocumental = Number(regra?.indicadorId) === 3;
    const resultadoDocumentalTrimestral = redeLotericaDocumental
      ? toNumber(validCalculation?.resultadoDocumentalRedeLoterica ?? officialPresentation?.resultadoOficialReportado)
      : ecossistemaLotexDocumental
        ? toNumber(validCalculation?.resultadoOficialDocumental ?? officialPresentation?.resultadoOficialReportado)
      : clientesAtivosDocumental
        ? toNumber(validCalculation?.resultadoDocumentalClientesAtivos ?? officialPresentation?.resultadoOficialReportado)
        : null;
    const desempenhoOficialDocumentalTrimestral = redeLotericaDocumental
      ? toNumber(validCalculation?.percentualAtingidoOficialRedeLoterica ?? officialPresentation?.percentualAtingidoOficialReportado ?? officialPresentation?.percentualAtingidoOficial)
      : ecossistemaLotexDocumental
        ? toNumber(validCalculation?.percentualAtingidoOficialDocumental ?? officialPresentation?.percentualAtingidoOficialReportado)
      : clientesAtivosDocumental
        ? toNumber(validCalculation?.percentualAtingidoOficialClientesAtivos ?? officialPresentation?.percentualAtingidoOficialReportado)
        : null;
    const fonteDocumentalTrimestral = redeLotericaDocumental
      ? validCalculation?.fonteResultadoRedeLoterica ?? officialPresentation?.fonte ?? null
        : ecossistemaLotexDocumental
          ? validCalculation?.fonteResultadoEcossistema ?? officialPresentation?.fonte ?? null
        : Number(regra?.indicadorId) === 1
        ? validCalculation?.fonteResultadoOfertasPersonalizadas ?? officialPresentation?.fonte ?? null
        : nps
          ? validCalculation?.fontePesquisaNPS ?? officialPresentation?.fonte ?? null
          : clientesAtivosDocumental
            ? validCalculation?.fonteResultadoClientesAtivos ?? officialPresentation?.fonte ?? null
            : null;

    return {
      indicador,
      regra,
      trimestre: label,
      trimestreNumero: number,
      ano: year,
      resultadoTrimestral: result,
      resultadoCalculadoTrimestral: calculatedQuarterResult,
      resultadoOficialApresentado: officialPresentedResult,
      resultadoFinanceiroTrimestral,
      metaFinanceiraTrimestral,
      resultadoPercentualTrimestral,
      metaPercentualTrimestral,
      pixAcumuladoTrimestre: regra?.tipoCalculo === "razao_pix" ? validCalculation?.pixAcumulado ?? null : null,
      canaisAcumuladoTrimestre: regra?.tipoCalculo === "razao_pix" ? validCalculation?.canaisEletronicosAcumulado ?? null : null,
      canaisDigitaisAcumuladoTrimestre: regra?.tipoCalculo === "razao_canais_digitais" ? validCalculation?.canaisEletronicosAcumulado ?? null : null,
      produtosLoteriasAcumuladoTrimestre: regra?.tipoCalculo === "razao_canais_digitais" ? validCalculation?.produtosLoteriasAcumulado ?? null : null,
      cenarioEcossistema: ["participacao_ecossistema_lotex", "participacao_ecossistema_com_cenarios"].includes(regra?.tipoCalculo) ? validCalculation?.cenarioApuracaoEcossistema ?? "lotex" : null,
      cenarioEcossistemaLabel: ["participacao_ecossistema_lotex", "participacao_ecossistema_com_cenarios"].includes(regra?.tipoCalculo) ? validCalculation?.cenarioApuracaoEcossistemaLabel ?? "Lotex" : null,
      referencia2025EcossistemaTrimestre: regra?.tipoCalculo === "participacao_ecossistema_lotex" ? validCalculation?.referenciaLotex2025 ?? null : regra?.tipoCalculo === "participacao_ecossistema_com_cenarios" ? validCalculation?.referencia2025Trimestre ?? null : null,
      arrecadacaoViaEcossistemaTrimestre: regra?.tipoCalculo === "participacao_ecossistema_lotex" ? validCalculation?.arrEcoLotex2026 ?? null : regra?.tipoCalculo === "participacao_ecossistema_com_cenarios" ? validCalculation?.arrecadacaoViaEcossistema ?? null : null,
      arrecadacaoMarketplaceEcossistemaTrimestre: regra?.tipoCalculo === "participacao_ecossistema_lotex" ? validCalculation?.arrEcoMarketplace2026 ?? null : null,
      arrecadacaoTotalEcossistemaTrimestre: regra?.tipoCalculo === "participacao_ecossistema_lotex" ? validCalculation?.arrTotal2026 ?? null : regra?.tipoCalculo === "participacao_ecossistema_com_cenarios" ? validCalculation?.arrecadacaoTotal ?? null : null,
      baseReferencia2025Trimestre: ["crescimento_comparado_base_2025", "crescimento_rede_loterica_base_2025"].includes(regra?.tipoCalculo) ? validCalculation?.baseReferencia2025Periodo ?? null : null,
      indiceTrimestral: ["crescimento_comparado_base_2025", "crescimento_rede_loterica_base_2025"].includes(regra?.tipoCalculo) ? validCalculation?.indiceEmRelacaoA2025 ?? null : null,
      crescimentoTrimestral: ["crescimento_comparado_base_2025", "crescimento_rede_loterica_base_2025"].includes(regra?.tipoCalculo) ? validCalculation?.crescimentoVs2025 ?? null : null,
      resultadoDocumentalTrimestral,
      desempenhoOficialDocumentalTrimestral,
      fonteDocumentalTrimestral,
      desempenhoTrimestral: performance,
      metaTrimestral: meta,
      situacaoTrimestral: officialSituation,
      metaTecnicaTrimestral: technicalMeta,
      resultadoTecnicoTrimestral: technicalResult,
      desempenhoTecnicoTrimestral: technicalPerformance,
      situacaoTecnicaTrimestral: technicalSituation,
      semNovaPesquisaNps: nps ? officialPresentation?.semNovaPesquisa === true : false,
      proximaApuracaoNps: nps ? officialPresentation?.proximaApuracao ?? null : null,
      apresentacaoOficialDocumental: Boolean(officialPresentation),
      notaApresentacaoOficial: officialPresentation?.observacao || null,
      statusTrimestre: quarterStatus,
      mesesHomologados: homologatedCount,
      mesesEsperados: expectedCount,
      composicaoMensal: monthlyComposition,
      possuiMesDevolvido: hasReturned,
      mensagem: buildMessage(quarterStatus, homologatedCount, homologatedNames, hasReturned, expectedCount),
      ultimoLancamentoHomologado: lastByMonth(homologatedInQuarter),
      medicaoOficialPesquisa2026: regra?.tipoCalculo === "nota_pesquisa_anual"
        ? Boolean(validCalculation?.medicaoOficialPesquisa2026)
        : null,
      resultadoOficialReportado: regra?.tipoCalculo === "nota_pesquisa_anual"
        ? Boolean(validCalculation?.resultadoOficialReportado)
        : false,
      possuiPosicaoQualitativa: regra?.tipoCalculo === "nota_pesquisa_anual"
        ? officialQuarterLaunches.some((item) => isQualitativeAnnualResearchPosition(regra, item))
        : false,
      possuiPosicaoOficialSistema: homologatedCount > 0,
      possuiPosicaoDocumental: documentaryPositionAvailable,
      statusGovernancaTrimestral: homologatedCount > 0
        ? "Homologado na versão atual"
        : documentaryPositionAvailable ? "Somente documental" : "Sem homologação transacional da versão atual",
      mesesHomologadosLegados: legacyHomologatedInQuarter.length,
      dadosCalculados: validCalculation
    };
  }

  function consolidarAno(indicador, regra, lancamentosDoIndicador, ano = 2026, governance = {}) {
    return QUARTERS.map((quarter) => (
      consolidarTrimestre(indicador, regra, lancamentosDoIndicador, `${quarter.label}/${ano}`, governance)
    ));
  }

  root.QuarterlyConsolidation = {
    STATUS_LANCAMENTO,
    MONTHS,
    QUARTERS,
    PIX_QUARTER_TARGETS,
    obterTrimestrePorMes,
    obterMesesDoTrimestre,
    consolidarTrimestre,
    consolidarAno
  };
})(typeof window !== "undefined" ? window : globalThis);
