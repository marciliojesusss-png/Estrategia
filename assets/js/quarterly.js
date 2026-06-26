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
    "plano_acao_por_elementos"
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
    if (rule?.tipoCalculo === "quantidade_acumulada") {
      const accumulatedQuantity = toNumber(calculation?.melhoriasEntreguesAcumuladas);
      if (accumulatedQuantity !== null) return accumulatedQuantity;
    }
    return [
      calculation?.resultadoOficialAnual,
      calculation?.resultadoAcumulado,
      calculation?.resultadoMensal
    ].map(toNumber).find((value) => value !== null) ?? null;
  }

  function getOfficialPerformance(calculation) {
    return [
      calculation?.percentualAtingidoAnual,
      calculation?.percentualAtingidoAcumulado,
      calculation?.percentualAtingidoMensal
    ].map(toNumber).find((value) => value !== null) ?? null;
  }

  function getReferenceMeta(rule, quarterLaunches, quarterNumberValue, quarterLabel) {
    const params = rule?.parametrosCalculo || {};
    const configuredQuarterTarget = toNumber(params.metasTrimestrais?.[quarterLabel] ?? PIX_QUARTER_TARGETS[quarterLabel]);
    if (rule?.tipoCalculo === "razao_pix" && configuredQuarterTarget !== null) return configuredQuarterTarget;
    if (rule?.tipoCalculo === "razao_canais_digitais") {
      return toNumber(params.metaReferencia ?? rule.metaAnualValor) ?? 0.2805;
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

    if (rule?.tipoCalculo === "quantidade_acumulada") return annualMeta * (quarterNumberValue / 4);
    if (["soma_acumulada_no_ano", "valor_acumulado_com_meta_dinamica"].includes(rule?.tipoConsolidacao)) {
      return annualMeta / 4;
    }
    return annualMeta;
  }

  function getSituation(calculation, performance) {
    if (calculation?.situacao) {
      return calculation.situacao === "Critico" ? "Crítico" : calculation.situacao;
    }
    if (performance === null) return "Sem cálculo";
    if (performance >= 1) return "Atingido";
    if (performance >= 0.8) return "Abaixo da meta";
    return "Crítico";
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

  function buildMessage(status, count, names, hasReturned) {
    if (status === "Sem dados") return "Nenhum mês homologado no trimestre.";
    if (status === "Fechado") return "Consolidado trimestral calculado com todos os meses homologados.";
    const months = names.length ? `: ${names.join(", ")}` : "";
    const returned = hasReturned ? " Há mês devolvido para ajuste." : "";
    return `Consolidado parcial calculado com ${count} de 3 meses homologados${months}.${returned}`;
  }

  function consolidarTrimestre(indicador, regra, lancamentosDoIndicador, trimestre) {
    const number = quarterNumber(trimestre);
    const months = obterMesesDoTrimestre(trimestre);
    const year = getYear(trimestre);
    const label = number ? `${number}TRI/${year}` : null;
    const quarterLaunches = (lancamentosDoIndicador || [])
      .filter((item) => Number(item.ano) === year && months.includes(Number(item.mes)))
      .sort((a, b) => Number(a.mes) - Number(b.mes));
    const byMonth = Object.fromEntries(quarterLaunches.map((item) => [Number(item.mes), item]));
    const monthlyComposition = months.map((month) => ({
      mes: month,
      nomeMes: MONTHS.find(([value]) => value === month)?.[1] || month,
      lancamento: byMonth[month] || null,
      status: byMonth[month]?.status || STATUS_LANCAMENTO.NAO_INICIADO
    }));
    const homologatedInQuarter = quarterLaunches.filter((item) => item.status === STATUS_LANCAMENTO.HOMOLOGADO);
    const homologatedCount = homologatedInQuarter.length;
    const hasReturned = quarterLaunches.some((item) => item.status === STATUS_LANCAMENTO.DEVOLVIDO_AJUSTE);
    const quarterStatus = homologatedCount === 0 ? "Sem dados" : homologatedCount === 3 ? "Fechado" : "Parcial";
    const homologatedNames = monthlyComposition
      .filter((item) => item.status === STATUS_LANCAMENTO.HOMOLOGADO)
      .map((item) => item.nomeMes);
    const meta = getReferenceMeta(regra, quarterLaunches, number, label);

    if (!number || !months.length || homologatedCount === 0) {
      return {
        indicador,
        regra,
        trimestre: label,
        trimestreNumero: number,
        ano: year,
        resultadoTrimestral: null,
        desempenhoTrimestral: null,
        metaTrimestral: meta,
        situacaoTrimestral: "Sem dados",
        statusTrimestre: "Sem dados",
        mesesHomologados: 0,
        mesesEsperados: 3,
        composicaoMensal: monthlyComposition,
        possuiMesDevolvido: hasReturned,
        mensagem: buildMessage("Sem dados", 0, [], hasReturned),
        ultimoLancamentoHomologado: null
      };
    }

    const calculationScope = getCalculationScope(regra, lancamentosDoIndicador || [], months, year, months.at(-1));
    const current = lastByMonth(calculationScope);
    const calculation = root.IndicatorFormulas?.calcularIndicador(indicador, regra, current, calculationScope);
    const validCalculation = calculation && !calculation.erro ? calculation : null;
    let result = getOfficialResult(validCalculation, regra);
    let performance = getOfficialPerformance(validCalculation);
    let calculatedQuarterResult = result;
    let officialPresentedResult = result;

    if (regra?.tipoCalculo === "razao_pix" && validCalculation) {
      calculatedQuarterResult = toNumber(validCalculation.resultadoOficialAnual);
      officialPresentedResult = calculatedQuarterResult === null
        ? null
        : Math.round(calculatedQuarterResult * 100) / 100;
      result = officialPresentedResult;
      performance = officialPresentedResult !== null && meta ? officialPresentedResult / meta : null;
    }

    if (
      result !== null &&
      meta !== null &&
      (["soma_acumulada_no_ano", "valor_acumulado_com_meta_dinamica"].includes(regra?.tipoConsolidacao) ||
        regra?.tipoCalculo === "quantidade_acumulada")
    ) {
      performance = result / meta;
    }

    return {
      indicador,
      regra,
      trimestre: label,
      trimestreNumero: number,
      ano: year,
      resultadoTrimestral: result,
      resultadoCalculadoTrimestral: calculatedQuarterResult,
      resultadoOficialApresentado: officialPresentedResult,
      pixAcumuladoTrimestre: regra?.tipoCalculo === "razao_pix" ? validCalculation?.pixAcumulado ?? null : null,
      canaisAcumuladoTrimestre: regra?.tipoCalculo === "razao_pix" ? validCalculation?.canaisEletronicosAcumulado ?? null : null,
      canaisDigitaisAcumuladoTrimestre: regra?.tipoCalculo === "razao_canais_digitais" ? validCalculation?.canaisEletronicosAcumulado ?? null : null,
      produtosLoteriasAcumuladoTrimestre: regra?.tipoCalculo === "razao_canais_digitais" ? validCalculation?.produtosLoteriasAcumulado ?? null : null,
      desempenhoTrimestral: performance,
      metaTrimestral: meta,
      situacaoTrimestral: getSituation(validCalculation, performance),
      statusTrimestre: quarterStatus,
      mesesHomologados: homologatedCount,
      mesesEsperados: 3,
      composicaoMensal: monthlyComposition,
      possuiMesDevolvido: hasReturned,
      mensagem: buildMessage(quarterStatus, homologatedCount, homologatedNames, hasReturned),
      ultimoLancamentoHomologado: lastByMonth(homologatedInQuarter),
      dadosCalculados: validCalculation
    };
  }

  function consolidarAno(indicador, regra, lancamentosDoIndicador, ano = 2026) {
    return QUARTERS.map((quarter) => (
      consolidarTrimestre(indicador, regra, lancamentosDoIndicador, `${quarter.label}/${ano}`)
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
