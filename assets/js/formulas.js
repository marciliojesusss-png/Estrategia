(function (root) {
  const currency = root.CurrencyBR || (typeof require === "function" ? require("./currency.js") : null);

  function toNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function normalizarPercentual(value) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return null;
      return value > 1 ? value / 100 : value;
    }

    let text = String(value).trim().replace("%", "");
    if (!text) return null;
    if (text.includes(",")) {
      text = text.replace(/\./g, "").replace(",", ".");
    }

    const parsed = Number(text);
    if (!Number.isFinite(parsed)) return null;
    return parsed > 1 ? parsed / 100 : parsed;
  }

  function clamp01(value) {
    const number = toNumber(value);
    if (number === null) return null;
    return Math.max(0, Math.min(1, number > 1 ? number / 100 : number));
  }

  function formatarPercentual(value) {
    const number = toNumber(value);
    if (number === null) return "-";
    return `${(number * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  }

  function formatarValor(value, unidadeMedida) {
    if (unidadeMedida === "moeda") return currency.formatarMoedaBR(value);
    const number = toNumber(value);
    if (number === null) return "-";
    if (unidadeMedida === "percentual") return formatarPercentual(number);
    if (unidadeMedida === "pontos" || unidadeMedida === "pontos_percentuais") {
      return number.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    }
    return number.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
  }

  function ok(resultadoMensal, resultadoAcumulado, percentualMensal, percentualAcumulado, unidadeMedida, mensagem, extra = {}) {
    const resultadoOficial = extra.resultadoOficialAnual ?? resultadoAcumulado;
    const percentualAnual = extra.percentualAtingidoAnual ?? percentualAcumulado;
    return {
      resultadoMensal,
      resultadoMensalFormatado: formatarValor(resultadoMensal, unidadeMedida),
      resultadoAcumulado,
      resultadoAcumuladoFormatado: formatarValor(resultadoAcumulado, unidadeMedida),
      resultadoOficialAnual: resultadoOficial,
      resultadoOficialAnualFormatado: formatarValor(resultadoOficial, unidadeMedida),
      percentualAtingidoMensal: percentualMensal,
      percentualAtingidoMensalFormatado: formatarPercentual(percentualMensal),
      percentualAtingidoAcumulado: percentualAcumulado,
      percentualAtingidoAnual: percentualAnual,
      percentualAtingidoAcumuladoFormatado: formatarPercentual(percentualAcumulado),
      percentualAtingidoAnualFormatado: formatarPercentual(percentualAnual),
      unidadeMedida: unidadeMedida || "percentual",
      statusCalculo: "calculado",
      mensagem: mensagem || "Cálculo realizado com sucesso.",
      ...extra
    };
  }

  function erro(mensagem, unidadeMedida) {
    return {
      resultadoMensal: null,
      resultadoMensalFormatado: "-",
      resultadoAcumulado: null,
      resultadoAcumuladoFormatado: "-",
      resultadoOficialAnual: null,
      resultadoOficialAnualFormatado: "-",
      percentualAtingidoMensal: null,
      percentualAtingidoMensalFormatado: "-",
      percentualAtingidoAcumulado: null,
      percentualAtingidoAnual: null,
      percentualAtingidoAcumuladoFormatado: "-",
      percentualAtingidoAnualFormatado: "-",
      unidadeMedida: unidadeMedida || "percentual",
      statusCalculo: "erro",
      mensagem,
      erro: true
    };
  }

  function raw(lancamento, nome) {
    return (lancamento.camposEntrada || {})[nome];
  }

  function campo(lancamento, nome) {
    return currency.parseMoedaBR(raw(lancamento, nome));
  }

  function competenciaKey(lancamento) {
    if (lancamento?.competencia) return String(lancamento.competencia);
    const ano = Number(lancamento?.ano);
    const mes = Number(lancamento?.mes);
    if (!ano || !mes) return "";
    return `${ano}-${String(mes).padStart(2, "0")}`;
  }

  function getMetaAcumuladaCompetencia(regra, lancamento) {
    const params = regra?.parametrosCalculo || {};
    const curva = params.metasAcumuladasPorCompetencia || params.curvaMetaAcumulada || {};
    const key = competenciaKey(lancamento);
    if (Object.prototype.hasOwnProperty.call(curva, key)) {
      return toNumber(curva[key]);
    }
    if (Number(lancamento?.mes) === 12) return toNumber(regra?.metaAnualValor);
    return null;
  }

  function situacaoPorPercentual(percentual) {
    if (percentual === null || percentual === undefined) return "Sem cálculo";
    if (percentual >= 1) return "Atingido";
    return "Abaixo da meta";
  }

  function pendente(mensagem, unidadeMedida, extra = {}) {
    return {
      resultadoMensal: null,
      resultadoMensalFormatado: "-",
      resultadoAcumulado: null,
      resultadoAcumuladoFormatado: "-",
      resultadoOficialAnual: null,
      resultadoOficialAnualFormatado: "-",
      percentualAtingidoMensal: null,
      percentualAtingidoMensalFormatado: "-",
      percentualAtingidoAcumulado: null,
      percentualAtingidoAnual: null,
      percentualAtingidoAcumuladoFormatado: "-",
      percentualAtingidoAnualFormatado: "-",
      unidadeMedida: unidadeMedida || "percentual",
      statusCalculo: "aguardando_dados",
      mensagem,
      ...extra
    };
  }

  function campoPercentual(lancamento, nome) {
    return normalizarPercentual(raw(lancamento, nome));
  }

  function texto(lancamento, nome) {
    const value = raw(lancamento, nome);
    return value === null || value === undefined ? "" : String(value).trim();
  }

  function valorTextoOuId(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return String(value.id ?? value.nome ?? value.label ?? "").trim();
    return String(value).trim();
  }

  function validarObrigatorios(regra, lancamento) {
    const faltantes = (regra.camposEntrada || [])
      .filter((item) => {
        const value = raw(lancamento, item.nome);
        return item.obrigatorio && (value === "" || value === null || value === undefined);
      })
      .map((item) => item.rotulo || item.nome);
    return faltantes.length ? `Preencha os campos obrigatórios: ${faltantes.join(", ")}.` : null;
  }

  function lancamentosAteMes(lancamentoAtual, lancamentosDoAno) {
    return (lancamentosDoAno || [])
      .filter((item) => Number(item.mes) <= Number(lancamentoAtual.mes))
      .sort((a, b) => Number(a.mes) - Number(b.mes));
  }

  function somaCampo(lancamentos, nome) {
    return lancamentos
      .map((item) => campo(item, nome))
      .filter((value) => value !== null)
      .reduce((sum, value) => sum + value, 0);
  }

  function valoresCampo(lancamentos, nome) {
    return lancamentos.map((item) => campo(item, nome)).filter((value) => value !== null);
  }

  function ultimoCampo(lancamentos, nome) {
    const values = valoresCampo(lancamentos, nome);
    return values.length ? values[values.length - 1] : null;
  }

  function requireMeta(value, unidadeMedida, message = "Meta não configurada para cálculo.") {
    const number = toNumber(value);
    if (!number) return erro(message, unidadeMedida);
    return number;
  }

  function calcularPercentualDireto(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);

    const temCampo = (nome) => (regra.camposEntrada || []).some((item) => item.nome === nome);
    const numeradorCampo = regra.parametrosCalculo?.numeradorCampo ||
      (temCampo("clientesUnicosComOfertaPersonalizadaCompetencia") ? "clientesUnicosComOfertaPersonalizadaCompetencia" : null) ||
      (temCampo("clientesComOfertaPersonalizada") ? "clientesComOfertaPersonalizada" : "realizadoMensal");
    const denominadorCampo = regra.parametrosCalculo?.denominadorCampo ||
      (temCampo("baseClientesAtivosCompetencia") ? "baseClientesAtivosCompetencia" : null) ||
      (temCampo("baseClientesAtivos") ? "baseClientesAtivos" : null);
    const meta = requireMeta(regra.parametrosCalculo?.metaReferencia ?? regra.metaAnualValor ?? lancamentoAtual.metaMensal, regra.unidadeMedida);
    if (meta.erro) return meta;

    let resultadoMensal;
    if (denominadorCampo) {
      const numerador = campo(lancamentoAtual, numeradorCampo);
      const denominador = campo(lancamentoAtual, denominadorCampo);
      if (Number(regra.indicadorId) === 1 && (denominador === null || denominador <= 0)) return pendente("Dados insuficientes para cálculo.", regra.unidadeMedida);
      if (denominador === null || denominador <= 0) return erro("Não foi possível calcular o indicador, pois o denominador informado é zero.", regra.unidadeMedida);
      if (numerador === null || numerador < 0) return erro("Numerador deve ser informado e não pode ser negativo.", regra.unidadeMedida);
      if (regra.parametrosCalculo?.validarNumeradorAteDenominador !== false && numerador > denominador) {
        if (numeradorCampo === "clientesComOfertaPersonalizada" && denominadorCampo === "baseClientesAtivos") {
          return erro("Clientes com oferta personalizada não pode ser maior que a base de clientes ativos.", regra.unidadeMedida);
        }
        return erro("Numerador não pode ser maior que o denominador informado.", regra.unidadeMedida);
      }
      resultadoMensal = numerador / denominador;
    } else {
      resultadoMensal = campo(lancamentoAtual, numeradorCampo);
      if (resultadoMensal === null) return erro("Valor realizado deve ser informado.", regra.unidadeMedida);
    }

    const percentual = resultadoMensal / meta;
    return ok(resultadoMensal, resultadoMensal, percentual, percentual, regra.unidadeMedida);
  }

  function calcularCoberturaCapacitacao(indicador, regra, lancamentoAtual) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const params = regra.parametrosCalculo || {};
    const campoPublico = params.campoPublicoAlvo || "publicoAlvoElegivelCapacitacao";
    const campoCapacitados = params.campoCapacitados || "empregadosCapacitadosCapacitacao";
    const campoQuantidadeMinima = params.campoQuantidadeCursos || params.campoQuantidadeMinima || "quantidadeCursosMinimaCapacitacao";
    const publicoAlvo = campo(lancamentoAtual, campoPublico);
    const capacitados = campo(lancamentoAtual, campoCapacitados);
    if (publicoAlvo === null || publicoAlvo <= 0) {
      return pendente("Dados insuficientes para cálculo.", regra.unidadeMedida);
    }
    if (capacitados === null || capacitados < 0) {
      return erro("Empregados capacitados devem ser informados e não podem ser negativos.", regra.unidadeMedida);
    }
    if (capacitados > publicoAlvo) {
      return erro("Empregados capacitados não pode ser maior que o público-alvo elegível.", regra.unidadeMedida);
    }

    const trimestre = lancamentoAtual.trimestre || `${Math.ceil(Number(lancamentoAtual.mes) / 3)}TRI/${lancamentoAtual.ano || 2026}`;
    const curva = params.curvaTrimestralCursos || params.curvaJogoResponsavel2026 || {};
    const criterioTrimestre = curva[trimestre] || {};
    const metaCobertura = toNumber(criterioTrimestre.metaCobertura ?? params.metaCobertura ?? params.metaReferencia ?? regra.metaAnualValor);
    const quantidadeCursosMinima = campo(lancamentoAtual, campoQuantidadeMinima) ??
      toNumber(criterioTrimestre.quantidadeCursosMinima ?? criterioTrimestre.quantidadeMinimaIniciativas);
    if (metaCobertura === null || metaCobertura <= 0) {
      return erro("Meta de cobertura de capacitação não configurada.", regra.unidadeMedida);
    }

    const cobertura = capacitados / publicoAlvo;
    const percentualMatematico = cobertura / metaCobertura;
    const percentualAtingido = cobertura >= metaCobertura ? 1 : percentualMatematico;
    const situacao = cobertura >= metaCobertura
      ? "Atingido"
      : "Abaixo da meta";

    return ok(cobertura, cobertura, percentualAtingido, percentualAtingido, regra.unidadeMedida, "Cobertura de capacitação calculada por público-alvo elegível.", {
      publicoAlvoElegivelCapacitacao: publicoAlvo,
      empregadosCapacitadosCapacitacao: capacitados,
      metaCoberturaCapacitacao: metaCobertura,
      quantidadeCursosMinimaCapacitacao: quantidadeCursosMinima,
      quantidadeMinimaIniciativasJR: quantidadeCursosMinima,
      criterioCapacitacao: criterioTrimestre.descricao || null,
      percentualAtingidoMatematico: percentualMatematico,
      situacao
    });
  }

  function calcularReducaoGap(indicador, regra, lancamentoAtual) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const valor = campo(lancamentoAtual, regra.parametrosCalculo?.campoResultado || "npsRealizado");
    const base = toNumber(regra.parametrosCalculo?.notaBase);
    const metaFinal = toNumber(regra.parametrosCalculo?.metaFinalCalculada) || toNumber(regra.metaAnualValor);
    if (base === null || metaFinal === null || metaFinal === base) {
      return erro("Parâmetros de base e meta final são obrigatórios para redução de gap.", regra.unidadeMedida);
    }
    const percentual = (valor - base) / (metaFinal - base);
    return ok(valor, valor, percentual, percentual, regra.unidadeMedida);
  }
  function calcularCrescimentoMediaMensal(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);

    const qmaatuCampo = regra.parametrosCalculo?.qmaatuCampo ||
      ((regra.camposEntrada || []).some((item) => item.nome === "qmaatu") ? "qmaatu" : null);
    const qmaantCampo = regra.parametrosCalculo?.qmaantCampo ||
      ((regra.camposEntrada || []).some((item) => item.nome === "qmaant") ? "qmaant" : null);
    const meta = requireMeta(regra.parametrosCalculo?.metaCrescimento ?? regra.metaAnualValor, regra.unidadeMedida, "Meta de crescimento não configurada.");
    if (meta.erro) return meta;

    if (qmaatuCampo && qmaantCampo) {
      const qmaatu = campo(lancamentoAtual, qmaatuCampo);
      const qmaant = campo(lancamentoAtual, qmaantCampo);
      if (qmaant === null || qmaant <= 0) return erro("QMAANT deve ser maior que zero para cálculo do indicador.", regra.unidadeMedida);
      if (qmaatu === null || qmaatu < 0) return erro("QMAATU deve ser informado e não pode ser negativo.", regra.unidadeMedida);
      const crescimento = qmaatu / qmaant - 1;
      return ok(crescimento, crescimento, crescimento / meta, crescimento / meta, regra.unidadeMedida, "Crescimento entre QMAATU e QMAANT calculado com sucesso.");
    }

    const campoValor = regra.parametrosCalculo?.campoValor || "clientesAtivosDigitaisMes";
    const base = toNumber(regra.parametrosCalculo?.qmaant || regra.parametrosCalculo?.mediaBaseAnoAnterior);
    if (!base) return erro("Base de comparação do ano anterior não cadastrada.", regra.unidadeMedida);
    const valores = valoresCampo(lancamentosAteMes(lancamentoAtual, lancamentosDoAno), campoValor);
    if (!valores.length) return erro("Não há valores mensais para calcular a média acumulada.", regra.unidadeMedida);
    const mediaAtual = valores.reduce((sum, value) => sum + value, 0) / valores.length;
    const crescimento = mediaAtual / base - 1;
    return ok(crescimento, crescimento, crescimento / meta, crescimento / meta, regra.unidadeMedida, "Crescimento por media mensal acumulada calculado com sucesso.");
  }
  function calcularPercentualAcumulado(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const campoValor = regra.parametrosCalculo?.campoValor || "melhoriasImplementadasMes";
    const baseline = toNumber(regra.parametrosCalculo?.baseline || regra.parametrosCalculo?.totalMelhoriasIdentificadasBaseline);
    const meta = requireMeta(regra.parametrosCalculo?.metaExecucao ?? regra.metaAnualValor, regra.unidadeMedida, "Meta de execução não configurada.");
    if (meta.erro) return meta;
    if (!baseline) return erro("Baseline deve ser informado e maior que zero.", regra.unidadeMedida);
    const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
    const acumulado = somaCampo(ateMes, campoValor);
    const resultado = acumulado / baseline;
    const mensal = campo(lancamentoAtual, campoValor);
    return ok(mensal, resultado, resultado / meta, resultado / meta, regra.unidadeMedida, "Percentual acumulado no ano calculado com sucesso.");
  }

  function calcularValorFinanceiroAcumulado(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
    const meta = requireMeta(regra.metaAnualValor, regra.unidadeMedida, "Meta financeira anual não configurada.");
    if (meta.erro) return meta;

    let resultadoMensal;
    let acumulado;
    if (regra.parametrosCalculo?.valorAcumuladoCampo) {
      resultadoMensal = campo(lancamentoAtual, regra.parametrosCalculo.valorAcumuladoCampo);
      acumulado = ultimoCampo(ateMes, regra.parametrosCalculo.valorAcumuladoCampo);
      if (resultadoMensal === null || resultadoMensal < 0) return erro("Valor financeiro acumulado deve ser informado e não pode ser negativo.", regra.unidadeMedida);
    } else if (regra.parametrosCalculo?.formula === "diferenca") {
      const receita = campo(lancamentoAtual, regra.parametrosCalculo.campoReceita);
      const deducao = campo(lancamentoAtual, regra.parametrosCalculo.campoDeducao);
      if (receita === null || deducao === null) return erro("Receita e dedução devem ser informadas.", regra.unidadeMedida);
      resultadoMensal = receita - deducao;
      acumulado = ateMes.reduce((sum, item) => {
        const itemReceita = campo(item, regra.parametrosCalculo.campoReceita);
        const itemDeducao = campo(item, regra.parametrosCalculo.campoDeducao);
        return itemReceita === null || itemDeducao === null ? sum : sum + itemReceita - itemDeducao;
      }, 0);
    } else {
      const campoValor = regra.parametrosCalculo?.campoValor || "realizadoMensal";
      resultadoMensal = campo(lancamentoAtual, campoValor);
      if (resultadoMensal === null || resultadoMensal < 0) return erro("Valor financeiro realizado deve ser informado e não pode ser negativo.", regra.unidadeMedida);
      acumulado = somaCampo(ateMes, campoValor);
    }

    if (regra.parametrosCalculo?.metaTipo === "curva_acumulada_por_competencia") {
      const metaAcumulada = getMetaAcumuladaCompetencia(regra, lancamentoAtual);
      const key = competenciaKey(lancamentoAtual);
      if (metaAcumulada === null || metaAcumulada <= 0) {
        return pendente("Meta de referência não cadastrada para a competência. Pendente de curva orçamentária.", regra.unidadeMedida, {
          metaPendente: true,
          competenciaReferencia: key,
          metaReferenciaMensagem: "Pendente de curva orçamentária"
        });
      }
      const percentual = acumulado / metaAcumulada;
      const situacao = percentual >= 1 ? "Atingido" : "Abaixo da meta";
      return ok(
        resultadoMensal,
        acumulado,
        percentual,
        percentual,
        regra.unidadeMedida,
        "Valor financeiro acumulado comparado com curva de meta por competência.",
        {
          metaReferenciaMensal: metaAcumulada,
          metaAcumulada,
          realizadoAcumulado: acumulado,
          competenciaReferencia: key,
          percentualMetaAcumulada: percentual,
          percentualAtingidoAnual: percentual,
          resultadoOficialAnual: acumulado,
          situacao
        }
      );
    }

    const metaMensalFixa = toNumber(regra.parametrosCalculo?.metaMensalFixa ?? regra.parametrosCalculo?.metaMensalPix);
    if (metaMensalFixa !== null) {
      if (metaMensalFixa <= 0) return erro("Meta mensal financeira deve ser maior que zero.", regra.unidadeMedida);
      const numeroMes = Number(lancamentoAtual.mes) || ateMes.length || 1;
      const metaAcumulada = metaMensalFixa * numeroMes;
      const percentualMensal = resultadoMensal / metaMensalFixa;
      const percentualAcumulado = acumulado / metaAcumulada;
      const situacao = percentualAcumulado >= 1 ? "Atingido" : "Abaixo da meta";
      return ok(
        resultadoMensal,
        acumulado,
        percentualMensal,
        percentualAcumulado,
        regra.unidadeMedida,
        "Valor financeiro mensal e acumulado por meta mensal fixa calculado com sucesso.",
        {
          metaReferenciaMensal: metaMensalFixa,
          metaAcumulada,
          realizadoAcumulado: acumulado,
          percentualMetaMensal: percentualMensal,
          percentualMetaAcumulada: percentualAcumulado,
          percentualAtingidoAnual: percentualAcumulado,
          situacao
        }
      );
    }

    if (regra.parametrosCalculo?.usarMetaMensalNoResultado === true) {
      const metaMensal = requireMeta(lancamentoAtual.metaMensal, regra.unidadeMedida, "Meta de referência mensal não configurada.");
      if (metaMensal.erro) return metaMensal;
      return ok(
        resultadoMensal,
        acumulado,
        resultadoMensal / metaMensal,
        acumulado / meta,
        regra.unidadeMedida,
        "Valor financeiro mensal e acumulado calculado com sucesso.",
        {
          metaReferenciaMensal: metaMensal,
          metaAnualFinanceira: meta,
          percentualMetaMensal: resultadoMensal / metaMensal,
          percentualMetaAnual: acumulado / meta,
          percentualAtingidoAnual: acumulado / meta
        }
      );
    }

    const metaAcumulada = regra.tipoConsolidacao === "soma_acumulada_no_ano" ? meta * (Number(lancamentoAtual.mes) / 12) : meta;
    return ok(resultadoMensal, acumulado, resultadoMensal === null ? null : resultadoMensal / metaAcumulada, acumulado / metaAcumulada, regra.unidadeMedida);
  }

  function calcularGgrFormula(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return pendente("Dados insuficientes para cálculo.", regra.unidadeMedida);

    const arrecadacao = campo(lancamentoAtual, regra.parametrosCalculo?.campoArrecadacao || "arrecadacaoTotalMes");
    const premios = campo(lancamentoAtual, regra.parametrosCalculo?.campoPremios || "premiosAPagarMes");
    if (arrecadacao === null || premios === null) return pendente("Dados insuficientes para cálculo.", regra.unidadeMedida);
    if (arrecadacao < 0 || premios < 0) return erro("Arrecadação total e prêmios a pagar não podem ser negativos.", regra.unidadeMedida);

    const ggrMes = arrecadacao - premios;
    const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
    const ggrAcumulado = ateMes.reduce((sum, item) => {
      const itemArrecadacao = campo(item, regra.parametrosCalculo?.campoArrecadacao || "arrecadacaoTotalMes");
      const itemPremios = campo(item, regra.parametrosCalculo?.campoPremios || "premiosAPagarMes");
      return itemArrecadacao === null || itemPremios === null ? sum : sum + itemArrecadacao - itemPremios;
    }, 0);
    const metaAcumulada = getMetaAcumuladaCompetencia(regra, lancamentoAtual);

    if (metaAcumulada === null || metaAcumulada <= 0) {
      return pendente("Meta de referência não cadastrada para a competência. Pendente de curva orçamentária.", regra.unidadeMedida, {
        resultadoMensal: ggrMes,
        resultadoMensalFormatado: formatarValor(ggrMes, regra.unidadeMedida),
        resultadoAcumulado: ggrAcumulado,
        resultadoAcumuladoFormatado: formatarValor(ggrAcumulado, regra.unidadeMedida),
        resultadoOficialAnual: ggrAcumulado,
        resultadoOficialAnualFormatado: formatarValor(ggrAcumulado, regra.unidadeMedida),
        metaPendente: true,
        metaReferenciaMensagem: "Pendente de curva orçamentária",
        ggrCalculadoMes: ggrMes,
        ggrAcumuladoAteCompetencia: ggrAcumulado
      });
    }

    const percentual = ggrAcumulado / metaAcumulada;
    return ok(ggrMes, ggrAcumulado, percentual, percentual, regra.unidadeMedida, "GGR calculado pela fórmula oficial e comparado com a curva acumulada.", {
      resultadoOficialAnual: ggrAcumulado,
      percentualAtingidoAnual: percentual,
      metaReferenciaMensal: metaAcumulada,
      metaAcumulada,
      ggrCalculadoMes: ggrMes,
      ggrAcumuladoAteCompetencia: ggrAcumulado,
      percentualMetaAcumulada: percentual,
      situacao: situacaoPorPercentual(percentual)
    });
  }

  function calcularIndiceInversoAjustado(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const meta = requireMeta(regra.parametrosCalculo?.metaReferencia ?? regra.metaAnualValor, regra.unidadeMedida);
    if (meta.erro) return meta;

    if (regra.parametrosCalculo?.campoValor) {
      const resultado = regra.parametrosCalculo?.campoPercentual
        ? campoPercentual(lancamentoAtual, regra.parametrosCalculo.campoValor)
        : campo(lancamentoAtual, regra.parametrosCalculo.campoValor);
      if (resultado === null || resultado < 0) return erro("IEO realizado no mês deve ser informado e não pode ser negativo.", regra.unidadeMedida);
      const percentual = resultado <= meta ? 1 : meta / resultado;
      return ok(resultado, resultado, percentual, percentual, regra.unidadeMedida, "IEO informado diretamente e comparado com a meta anual.", {
        resultadoOficialAnual: resultado,
        percentualAtingidoAnual: percentual,
        metaReferencia: meta,
        quantoMenorMelhor: true,
        situacao: resultado <= meta ? "Atingido" : "Não atingido"
      });
    }

    const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
    const numerador = somaCampo(ateMes, regra.parametrosCalculo?.camposNumerador?.[0] || "despesaPessoalMes") +
      somaCampo(ateMes, regra.parametrosCalculo?.camposNumerador?.[1] || "despesasAdministrativasMes");
    const denominador = somaCampo(ateMes, regra.parametrosCalculo?.campoDenominador || "receitasLiquidasMes");
    if (denominador <= 0) return erro("Não foi possível calcular o indicador, pois o denominador informado é zero.", regra.unidadeMedida);
    const resultado = numerador / denominador;
    const percentual = resultado <= 0 ? 1 : meta / resultado;
    return ok(resultado, resultado, percentual, percentual, regra.unidadeMedida, "Índice inverso ajustado calculado com sucesso.");
  }

  function situacaoIndicadorInverso(resultado, meta) {
    if (resultado === null || meta === null || meta <= 0) return "Sem calculo";
    if (resultado <= meta) return "Atingido";
    return "Abaixo da meta";
  }

  function desempenhoIndicadorInverso(resultado, meta) {
    if (resultado === null || meta === null || meta <= 0) return null;
    return 1 + ((meta - resultado) / meta);
  }

  function getMetaReferenciaInversa(regra, lancamentoAtual) {
    const params = regra?.parametrosCalculo || {};
    const curva = params.metasAcumuladasPorCompetencia || params.curvaMetaAcumulada || {};
    const key = competenciaKey(lancamentoAtual);
    if (params.metaTipo === "curva_acumulada_por_competencia" && Object.prototype.hasOwnProperty.call(curva, key) && curva[key] === null && Number(lancamentoAtual?.mes) !== 12) {
      return null;
    }
    return getMetaAcumuladaCompetencia(regra, lancamentoAtual) ??
      toNumber(lancamentoAtual?.metaMensal) ??
      toNumber(regra.parametrosCalculo?.metaReferencia) ??
      toNumber(regra.metaAnualValor);
  }

  function calcularIndiceInverso(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const campoInformado = regra.parametrosCalculo?.campoIeoInformado || regra.parametrosCalculo?.campoValor || "ieoApuradoInformado";
    const informado = campoPercentual(lancamentoAtual, campoInformado);
    const percentualOficial = campoPercentual(lancamentoAtual, regra.parametrosCalculo?.campoPercentualOficial || "percentualAtingidoOficialInformado");
    let resultado = informado;
    let origemResultado = informado !== null ? "informado" : "calculado";

    if (resultado === null) {
      const despesaPessoal = campo(lancamentoAtual, regra.parametrosCalculo?.campoDespesaPessoal || "despesaPessoalMes");
      const despesasAdministrativas = campo(lancamentoAtual, regra.parametrosCalculo?.campoDespesasAdministrativas || "despesasAdministrativasMes");
      const receitasLiquidas = campo(lancamentoAtual, regra.parametrosCalculo?.campoReceitasLiquidas || "receitasLiquidasMes");
      if (despesaPessoal === null || despesasAdministrativas === null || receitasLiquidas === null || receitasLiquidas === 0) {
        return pendente("Dados insuficientes para cálculo.", regra.unidadeMedida);
      }
      if (despesaPessoal < 0 || despesasAdministrativas < 0 || receitasLiquidas < 0) {
        return erro("Despesa de pessoal, despesas administrativas e receitas líquidas não podem ser negativas.", regra.unidadeMedida);
      }
      resultado = (despesaPessoal + despesasAdministrativas) / receitasLiquidas;
    }

    if (resultado < 0) return erro("IEO realizado não pode ser negativo.", regra.unidadeMedida);
    const meta = getMetaReferenciaInversa(regra, lancamentoAtual);
    if (meta === null || meta <= 0) {
      return ok(resultado, resultado, null, null, regra.unidadeMedida, "IEO calculado. Meta de referência não cadastrada para a competência.", {
        resultadoOficialAnual: resultado,
        percentualAtingidoAnual: null,
        metaReferencia: null,
        metaAcumulada: null,
        metaPendente: true,
        metaReferenciaMensagem: "Pendente de curva orçamentária",
        quantoMenorMelhor: true,
        sentidoMeta: "quanto_menor_melhor",
        situacao: "Sem meta de referência",
        ieoRealizadoMes: resultado,
        ieoApuradoInformado: informado,
        percentualAtingidoOficialInformado: percentualOficial,
        origemResultado
      });
    }
    const percentual = percentualOficial ?? desempenhoIndicadorInverso(resultado, meta);
    const situacao = situacaoIndicadorInverso(resultado, meta);

    return ok(resultado, resultado, percentual, percentual, regra.unidadeMedida, "IEO recorrente calculado pela regra inversa.", {
      resultadoOficialAnual: resultado,
      percentualAtingidoAnual: percentual,
      metaReferencia: meta,
      metaAcumulada: meta,
      quantoMenorMelhor: true,
      sentidoMeta: "quanto_menor_melhor",
      situacao,
      ieoRealizadoMes: resultado,
      ieoApuradoInformado: informado,
      percentualAtingidoOficialInformado: percentualOficial,
      origemResultado
    });
  }

  function calcularIncrementoPontosPercentuais(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const base = toNumber(regra.parametrosCalculo?.participacaoBase);
    const metaIncremento = requireMeta(regra.parametrosCalculo?.metaIncremento ?? regra.metaAnualValor, regra.unidadeMedida, "Meta de incremento em p.p. não configurada.");
    if (metaIncremento.erro) return metaIncremento;
    if (base === null) return erro("Participação-base não cadastrada. Não é possível calcular o incremento em pontos percentuais.", regra.unidadeMedida);
    const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
    const numerador = somaCampo(ateMes, regra.parametrosCalculo?.campoNumerador);
    const denominador = somaCampo(ateMes, regra.parametrosCalculo?.campoDenominador);
    if (denominador <= 0) return erro("Não foi possível calcular o indicador, pois o denominador informado é zero.", regra.unidadeMedida);
    const participacao = numerador / denominador;
    const incremento = participacao - base;
    return ok(participacao, participacao, incremento / metaIncremento, incremento / metaIncremento, regra.unidadeMedida);
  }

  function calcularRazaoCanaisDigitais(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const numeratorField = regra.parametrosCalculo?.campoNumerador || "arrecadacaoCanaisEletronicosMes";
    const denominatorField = regra.parametrosCalculo?.campoDenominador || "arrecadacaoTotalProdutosLoteriasMes";
    const monthlyNumerator = currency.parseMoedaBR(raw(lancamentoAtual, numeratorField));
    const monthlyDenominator = currency.parseMoedaBR(raw(lancamentoAtual, denominatorField));
    const target = toNumber(regra.parametrosCalculo?.metaReferencia ?? regra.metaAnualValor) || 0.2805;

    if (monthlyNumerator === null || monthlyNumerator < 0) {
      return erro("Arrecadação total nos canais eletrônicos deve ser informada e não pode ser negativa.", regra.unidadeMedida);
    }
    if (monthlyDenominator === null || monthlyDenominator === 0) {
      return pendente(
        "Informe a arrecadação total dos produtos de loterias para calcular o resultado do indicador.",
        regra.unidadeMedida,
        { arrecadacaoCanaisEletronicosMes: monthlyNumerator, metaReferencia: target }
      );
    }
    if (monthlyDenominator < 0) {
      return erro("Arrecadação total dos produtos de loterias não pode ser negativa.", regra.unidadeMedida);
    }
    if (monthlyNumerator > monthlyDenominator) {
      return erro("Arrecadação dos canais eletrônicos não pode ser maior que a arrecadação total dos produtos de loterias.", regra.unidadeMedida);
    }

    const launches = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
    const accumulatedNumerator = Math.round(
      launches.reduce((sum, launch) => sum + (currency.parseMoedaBR(raw(launch, numeratorField)) || 0), 0) * 100
    ) / 100;
    const accumulatedDenominator = Math.round(
      launches.reduce((sum, launch) => sum + (currency.parseMoedaBR(raw(launch, denominatorField)) || 0), 0) * 100
    ) / 100;
    if (accumulatedDenominator <= 0) {
      return pendente("Ainda não há denominador acumulado para o cálculo de vendas provenientes de canais digitais.", regra.unidadeMedida);
    }

    const monthlyResult = monthlyNumerator / monthlyDenominator;
    const accumulatedResult = accumulatedNumerator / accumulatedDenominator;
    return ok(
      monthlyResult,
      accumulatedResult,
      monthlyResult / target,
      accumulatedResult / target,
      regra.unidadeMedida,
      "Participação dos canais digitais calculada pela razão acumulada entre as arrecadações.",
      {
        canaisEletronicosAcumulado: accumulatedNumerator,
        produtosLoteriasAcumulado: accumulatedDenominator,
        resultadoCalculado: accumulatedResult,
        metaReferencia: target,
        situacao: accumulatedResult >= target
          ? "Atingido"
          : "Abaixo da meta"
      }
    );
  }

  function calcularRazaoPix(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const pixField = regra.parametrosCalculo?.campoNumerador || "arrecadacaoPixMes";
    const totalField = regra.parametrosCalculo?.campoDenominador || "arrecadacaoTotalCanaisEletronicosMes";
    const pixMonthly = currency.parseMoedaBR(raw(lancamentoAtual, pixField));
    const totalMonthly = currency.parseMoedaBR(raw(lancamentoAtual, totalField));
    if (pixMonthly === null || pixMonthly < 0) {
      return erro("Arrecadação com PIX no mês deve ser informada e não pode ser negativa.", regra.unidadeMedida);
    }
    if (totalMonthly === null || totalMonthly === 0) {
      return pendente(
        "Informe a arrecadação total nos canais eletrônicos para calcular o resultado percentual.",
        regra.unidadeMedida,
        { arrecadacaoPixMes: pixMonthly }
      );
    }
    if (totalMonthly < 0) {
      return erro("Arrecadação total nos canais eletrônicos não pode ser negativa.", regra.unidadeMedida);
    }
    if (pixMonthly > totalMonthly) {
      return erro("Arrecadação com PIX não pode ser maior que a arrecadação total nos canais eletrônicos.", regra.unidadeMedida);
    }

    const launches = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
    const pixAccumulated = Math.round(
      launches.reduce((sum, launch) => sum + (currency.parseMoedaBR(raw(launch, pixField)) || 0), 0) * 100
    ) / 100;
    const totalAccumulated = Math.round(
      launches.reduce((sum, launch) => sum + (currency.parseMoedaBR(raw(launch, totalField)) || 0), 0) * 100
    ) / 100;
    if (totalAccumulated <= 0) {
      return pendente("Ainda não há denominador acumulado para o cálculo do indicador PIX.", regra.unidadeMedida);
    }
    const monthlyResult = pixMonthly / totalMonthly;
    const accumulatedResult = pixAccumulated / totalAccumulated;
    const annualTarget = toNumber(regra.metaAnualValor) || 0.65;
    return ok(
      monthlyResult,
      accumulatedResult,
      monthlyResult / annualTarget,
      accumulatedResult / annualTarget,
      regra.unidadeMedida,
      "Participação das vendas com PIX calculada pela razão entre arrecadações.",
      {
        pixAcumulado: pixAccumulated,
        canaisEletronicosAcumulado: totalAccumulated,
        resultadoCalculado: accumulatedResult,
        metaReferencia: annualTarget
      }
    );
  }

  function calcularProjetoMarcoEntrega(indicador, regra, lancamentoAtual) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const statusOriginal = texto(lancamentoAtual, regra.parametrosCalculo?.campoStatus || "statusProjeto");
    const status = statusOriginal.toLowerCase();
    if (regra.parametrosCalculo?.metaTipo === "marco_anual") {
      const campoMarco = regra.parametrosCalculo?.campoMarco || regra.parametrosCalculo?.campoStatus || "marcoAtualProjeto";
      const marcoAtual = texto(lancamentoAtual, campoMarco);
      const statusConcluido = regra.parametrosCalculo?.statusConcluido || "Piloto/MVP concluído";
      const marcoConcluido = regra.parametrosCalculo?.marcoConcluido || "Piloto/MVP concluído";
      const concluido = statusOriginal === statusConcluido || marcoAtual === marcoConcluido;
      const situacao = concluido
        ? "Atingido"
        : statusOriginal || marcoAtual
          ? "Em andamento"
          : "Não iniciado";
      return ok(
        concluido ? 1 : null,
        concluido ? 1 : null,
        null,
        null,
        regra.unidadeMedida,
        "Acompanhamento de marco anual sem desempenho percentual em 2026.",
        {
          marcoAtual,
          statusProjeto: statusOriginal,
          situacao,
          desempenhoNaoAplicavel: true,
          metaAnualMarco: regra.parametrosCalculo?.metaAnualMarco || regra.metaAnualDescricao || "Piloto/MVP"
        }
      );
    }
    const marcos = regra.parametrosCalculo?.marcosCapacidadeTIC || regra.parametrosCalculo?.marcosProjeto || [];
    const marcoConfigurado = marcos.find((item) => item.label === statusOriginal);
    let percentual = marcoConfigurado ? toNumber(marcoConfigurado.percentual) : null;
    if (percentual === null) {
      percentual = clamp01(campo(lancamentoAtual, regra.parametrosCalculo?.campoPercentual || "percentualExecucao"));
    }
    if (["entregue", "mvp entregue", "formalizado", "celebrada", "concluido", "concluído"].includes(status)) {
      percentual = 1;
    }
    if (percentual === null) return erro("Percentual de execução deve ser informado.", regra.unidadeMedida);
    const trimestre = lancamentoAtual.trimestre || `${Math.ceil(Number(lancamentoAtual.mes) / 3)}TRI/${lancamentoAtual.ano || 2026}`;
    const curva = regra.parametrosCalculo?.curvaTrimestralPercentual || {};
    const metaTrimestral = regra.parametrosCalculo?.metaTipo === "curva_trimestral_percentual"
      ? toNumber(curva[trimestre]?.metaPercentual)
      : null;
    const percentualAtingido = metaTrimestral ? percentual / metaTrimestral : percentual;
    const situacao = metaTrimestral
      ? percentual >= metaTrimestral
        ? "Atingido"
        : "Abaixo da meta"
      : percentual >= 1
        ? "Atingido"
        : percentual > 0
          ? "Em andamento"
          : "Não iniciado";
    return ok(percentual, percentual, percentualAtingido, percentualAtingido, regra.unidadeMedida, "Avanço de projeto calculado com sucesso.", {
      marcoAlcancado: statusOriginal,
      marcoEsperadoTrimestre: curva[trimestre]?.marcoEsperado || null,
      metaTrimestral,
      situacao
    });
  }
  function calcularPontuacaoMinima(indicador, regra, lancamentoAtual) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const valor = campo(lancamentoAtual, regra.parametrosCalculo?.campoValor || "mediaGeralGPTW");
    const meta = requireMeta(
      toNumber(regra.parametrosCalculo?.metaReferencia) ||
        toNumber(lancamentoAtual.metaMensal) ||
        regra.metaAnualValor,
      regra.unidadeMedida
    );
    if (meta.erro) return meta;
    return ok(valor, valor, valor / meta, valor / meta, regra.unidadeMedida);
  }

  function calcularNotaPesquisaNps(indicador, regra, lancamentoAtual) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const params = regra.parametrosCalculo || {};
    const campoNps = params.campoNps || "npsApurado";
    const campoPromotores = params.campoPromotores || "percentualPromotores";
    const campoDetratores = params.campoDetratores || "percentualDetratores";
    let npsRealizado = campo(lancamentoAtual, campoNps);
    const promotores = normalizarPercentual(raw(lancamentoAtual, campoPromotores));
    const detratores = normalizarPercentual(raw(lancamentoAtual, campoDetratores));
    if (npsRealizado === null && promotores !== null && detratores !== null) {
      npsRealizado = (promotores - detratores) * 100;
    }
    if (npsRealizado === null) {
      return pendente("NPS apurado ou percentuais de promotores e detratores devem ser informados.", regra.unidadeMedida);
    }
    if (npsRealizado < -100 || npsRealizado > 100) {
      return erro("NPS deve estar entre -100 e 100 pontos.", regra.unidadeMedida);
    }
    const key = competenciaKey(lancamentoAtual);
    const referencias = params.referenciasPorCompetencia || {};
    const metaReferenciaInformada = campo(lancamentoAtual, params.campoMetaReferencia || "metaReferenciaCompetenciaNPS");
    const metaReferenciaPeriodo = metaReferenciaInformada !== null
      ? metaReferenciaInformada
      : Object.prototype.hasOwnProperty.call(referencias, key)
        ? toNumber(referencias[key])
        : toNumber(params.metaAnualMetodologica ?? regra.metaAnualValor);
    if (metaReferenciaPeriodo === null || metaReferenciaPeriodo === 0) {
      return erro("Meta de referência do NPS não configurada.", regra.unidadeMedida);
    }
    const tipoPosicao = texto(lancamentoAtual, params.campoTipoPosicao || "tipoPosicaoNPS");
    const metaAnual = toNumber(params.metaAnualMetodologica ?? regra.metaAnualValor);
    const isBaselineOuAcompanhamento = ["Baseline", "Acompanhamento", "Revisão metodológica"].includes(tipoPosicao);
    const isFechamentoAnual = tipoPosicao === "Fechamento anual";
    const referenciaSituacao = isFechamentoAnual && metaAnual ? metaAnual : metaReferenciaPeriodo;
    const percentualAtingido = npsRealizado / metaReferenciaPeriodo;
    const percentualAnual = isFechamentoAnual && metaAnual ? npsRealizado / metaAnual : percentualAtingido;
    const situacao = isBaselineOuAcompanhamento
      ? "Em acompanhamento"
      : npsRealizado >= referenciaSituacao
        ? "Atingido"
        : "Abaixo da meta";
    return ok(npsRealizado, npsRealizado, percentualAtingido, percentualAtingido, regra.unidadeMedida, "NPS calculado por posição de pesquisa.", {
      npsRealizado,
      metaReferenciaPeriodo,
      metaAnualCorretaNPS: metaAnual,
      desempenhoReferencia: percentualAtingido,
      tipoPosicaoNPS: tipoPosicao,
      baselineNPS: toNumber(params.baselineNPS),
      notaReferenciaNPS: toNumber(params.notaReferenciaNPS),
      percentualReducaoGap: toNumber(params.percentualReducaoGap),
      situacao,
      ...(isFechamentoAnual ? { percentualAtingidoAnual: percentualAnual } : {})
    });
  }

  function calcularNotaPesquisaAnual(indicador, regra, lancamentoAtual) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const params = regra.parametrosCalculo || {};
    const campoNota = params.campoNota || "notaClimaApurada";
    const campoMetaReferencia = params.campoMetaReferencia || "metaReferenciaClima";
    const tipoPosicao = texto(lancamentoAtual, params.campoTipoPosicao || "tipoPosicaoClima");
    const notaApurada = campo(lancamentoAtual, campoNota);
    if (notaApurada === null) {
      return pendente("Nota/média geral apurada ou posição de referência deve ser informada.", regra.unidadeMedida);
    }
    if (notaApurada < 0 || notaApurada > 100) {
      return erro("Nota/média geral apurada deve estar entre 0 e 100 pontos.", regra.unidadeMedida);
    }

    const metaReferenciaInformada = campo(lancamentoAtual, campoMetaReferencia);
    const metaReferenciaPeriodo = metaReferenciaInformada !== null
      ? metaReferenciaInformada
      : toNumber(params.metaReferencia ?? regra.metaAnualValor);
    if (metaReferenciaPeriodo === null || metaReferenciaPeriodo === 0) {
      return erro("Meta de referência da pesquisa anual não configurada.", regra.unidadeMedida);
    }

    const metaAnual = toNumber(regra.metaAnualValor ?? params.metaReferencia ?? metaReferenciaPeriodo);
    const percentualAtingido = notaApurada / metaReferenciaPeriodo;
    const isPlanoAcao = tipoPosicao === "Plano de ação";
    const isAcompanhamento = ["Acompanhamento", "Revisão metodológica"].includes(tipoPosicao);
    const isPesquisaFinal = ["Pesquisa oficial", "Fechamento anual"].includes(tipoPosicao);
    const situacao = isPlanoAcao
      ? "Plano de ação em andamento"
      : isAcompanhamento || !isPesquisaFinal
        ? "Em acompanhamento"
        : notaApurada >= metaAnual
          ? "Atingido"
          : "Abaixo da meta";

    return ok(notaApurada, notaApurada, percentualAtingido, percentualAtingido, regra.unidadeMedida, "Nota de pesquisa anual calculada por posição de referência.", {
      notaClimaApurada: notaApurada,
      metaReferenciaPeriodo,
      metaReferenciaClima: metaReferenciaPeriodo,
      desempenhoReferencia: percentualAtingido,
      tipoPosicaoClima: tipoPosicao,
      situacao
    });
  }

  function calcularQuantidadeAcumulada(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const campoValor = regra.parametrosCalculo?.campoValor || regra.parametrosCalculo?.campoMelhorias || "quantidadeRealizadaMes";
    const totalMelhoriasPlano = toNumber(regra.parametrosCalculo?.totalMelhoriasPlano2026);
    const metaMinimaMelhorias = toNumber(regra.parametrosCalculo?.metaMinimaMelhoriasAno);
    if (totalMelhoriasPlano && metaMinimaMelhorias) {
      const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
      const mensal = campo(lancamentoAtual, campoValor);
      if (mensal === null || mensal < 0) return erro("Melhorias entregues no mês devem ser informadas e não podem ser negativas.", regra.unidadeMedida);
      if (!Number.isInteger(mensal)) return erro("Melhorias entregues no mês devem ser números inteiros.", regra.unidadeMedida);
      const acumulado = somaCampo(ateMes, campoValor);
      if (acumulado > totalMelhoriasPlano) {
        return erro("O total de melhorias entregues não pode ser maior que o total de melhorias previstas no plano.", regra.unidadeMedida);
      }
      let percentualPlanoExecutado = acumulado / totalMelhoriasPlano;
      const percentualPlanoExecutadoCalculado = percentualPlanoExecutado;
      const percentualMetaAnualAtingida = acumulado / metaMinimaMelhorias;
      const trimestre = `${Math.ceil(Number(lancamentoAtual.mes) / 3)}TRI/${lancamentoAtual.ano || 2026}`;
      const curva = regra.parametrosCalculo?.curvaTrimestralAcumulada || {};
      const metaTrimestral = toNumber(curva[trimestre]?.metaPercentual);
      const metaQuantidadeTrimestral = toNumber(curva[trimestre]?.metaQuantidadeAcumulada);
      if (metaTrimestral && metaQuantidadeTrimestral !== null && acumulado === metaQuantidadeTrimestral) {
        percentualPlanoExecutado = metaTrimestral;
      }
      const percentualAtingidoCurva = metaTrimestral ? percentualPlanoExecutado / metaTrimestral : percentualMetaAnualAtingida;
      const situacao = metaTrimestral
        ? percentualPlanoExecutado >= metaTrimestral
          ? "Atingido"
          : "Abaixo da meta"
        : acumulado >= metaMinimaMelhorias
          ? "Atingido"
          : acumulado > 0
            ? "Em andamento"
            : "Não iniciado";
      return ok(
        percentualPlanoExecutado,
        percentualPlanoExecutado,
        percentualAtingidoCurva,
        percentualAtingidoCurva,
        "percentual",
        "Aprimoramento da experiencia do cliente calculado por melhorias acumuladas.",
        {
          melhoriasEntreguesMes: mensal,
          melhoriasImplementadasMes: mensal,
          melhoriasEntreguesAcumuladas: acumulado,
          melhoriasImplementadasAcumuladas: acumulado,
          totalMelhoriasPlano2026: totalMelhoriasPlano,
          metaMinimaMelhoriasAno: metaMinimaMelhorias,
          metaPercentualReferencia: toNumber(regra.parametrosCalculo?.metaPercentualReferencia),
          metaTrimestral,
          metaQuantidadeTrimestral,
          percentualPlanoExecutado,
          percentualPlanoExecutadoCalculado,
          percentualMetaAnualAtingida,
          resultadoOficialAnual: percentualPlanoExecutado,
          percentualAtingidoAnual: percentualAtingidoCurva,
          situacao
        }
      );
    }
    const meta = requireMeta(regra.metaAnualValor, regra.unidadeMedida);
    if (meta.erro) return meta;
    const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
    const mensal = campo(lancamentoAtual, campoValor);
    const acumulado = somaCampo(ateMes, campoValor);
    return ok(mensal, acumulado, mensal / meta, acumulado / meta, regra.unidadeMedida);
  }

  function calcularPlanoAcaoPorElementos(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const campoElemento = regra.parametrosCalculo?.campoElemento || "elementoRGF";
    const campoStatus = regra.parametrosCalculo?.campoStatus || "statusAcao";
    const statusQueContam = regra.parametrosCalculo?.statusQueContam || ["Concluída", "Concluida", "Homologada"];
    if (regra.parametrosCalculo?.metaTipo === "curva_trimestral_acumulada" || regra.parametrosCalculo?.curvaTrimestralAcumulada) {
      const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
      const statusValidos = new Set(statusQueContam.map((item) => String(item).toLocaleLowerCase("pt-BR")));
      const elementosAtendidos = [...new Set(ateMes
        .filter((item) => statusValidos.has(texto(item, campoStatus).toLocaleLowerCase("pt-BR")))
        .map((item) => texto(item, campoElemento).trim())
        .filter(Boolean))];
      const acumulado = elementosAtendidos.length;
      const trimestre = lancamentoAtual.trimestre || `${Math.ceil(Number(lancamentoAtual.mes) / 3)}TRI/${lancamentoAtual.ano || 2026}`;
      const curva = regra.parametrosCalculo?.curvaTrimestralAcumulada || {};
      const metaTrimestral = toNumber(curva[trimestre]?.metaElementosAcumulados);
      const metaReferencia = metaTrimestral || toNumber(regra.metaAnualValor);
      const percentual = metaReferencia ? acumulado / metaReferencia : null;
      const situacao = metaReferencia
        ? acumulado >= metaReferencia
          ? "Atingido"
          : "Abaixo da meta"
        : "Sem cálculo";
      return ok(acumulado, acumulado, percentual, percentual, regra.unidadeMedida, "Elementos únicos atendidos calculados com sucesso.", {
        elementosAtendidos,
        elementosAtendidosAcumulados: acumulado,
        metaTrimestral,
        situacao
      });
    }
    const campoValor = regra.parametrosCalculo?.campoValor || "elementosExecutadosAcumulado";
    const meta = requireMeta(regra.metaAnualValor, regra.unidadeMedida);
    if (meta.erro) return meta;
    const acumulado = Math.min(ultimoCampo(lancamentosAteMes(lancamentoAtual, lancamentosDoAno), campoValor) || 0, meta);
    return ok(acumulado, acumulado, acumulado / meta, acumulado / meta, regra.unidadeMedida);
  }

  function calcularIniciativasApoiadas(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const campoNome = regra.parametrosCalculo?.campoNome || "nomeIniciativaSocioambiental";
    const campoStatus = regra.parametrosCalculo?.campoStatus || "statusIniciativaSocioambiental";
    const statusQueConta = regra.parametrosCalculo?.statusQueConta || "Apoiada/realizada";
    const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
    const iniciativasApoiadas = [...new Set(ateMes
      .filter((item) => texto(item, campoStatus) === statusQueConta)
      .map((item) => texto(item, campoNome).trim())
      .filter(Boolean))];
    const acumulado = iniciativasApoiadas.length;
    const trimestre = lancamentoAtual.trimestre || `${Math.ceil(Number(lancamentoAtual.mes) / 3)}TRI/${lancamentoAtual.ano || 2026}`;
    const curva = regra.parametrosCalculo?.curvaTrimestralAcumulada || {};
    const metaTrimestral = toNumber(curva[trimestre]?.metaQuantidadeAcumulada);
    const possuiAndamento = ateMes.some((item) => {
      const status = texto(item, campoStatus);
      return ["Em prospecção", "Em estruturação", "Em rito de governança"].includes(status);
    });
    if (metaTrimestral === 0) {
      return ok(acumulado, acumulado, null, null, regra.unidadeMedida, "Sem meta de entrega no período.", {
        iniciativasApoiadas,
        iniciativasApoiadasAcumuladas: acumulado,
        metaTrimestral,
        situacao: possuiAndamento ? "Em prospecção/estruturação" : "Sem meta no período",
        statusCalculo: "sem_meta_periodo"
      });
    }
    const metaReferencia = metaTrimestral ?? toNumber(regra.metaAnualValor);
    const percentual = metaReferencia ? acumulado / metaReferencia : null;
    const situacao = metaReferencia
      ? acumulado >= metaReferencia
        ? "Atingido"
        : "Abaixo da meta"
      : "Sem cálculo";
    return ok(acumulado, acumulado, percentual, percentual, regra.unidadeMedida, "Iniciativas apoiadas calculadas com sucesso.", {
      iniciativasApoiadas,
      iniciativasApoiadasAcumuladas: acumulado,
      metaTrimestral,
      situacao
    });
  }

  function calcularExecucaoAcoesPropostas(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const params = regra.parametrosCalculo || {};
    const campoAcao = params.campoAcao || "acaoPropostaVisibilidade";
    const campoStatus = params.campoStatus || "statusAcaoVisibilidade";
    const statusQueConta = params.statusQueConta || "Publicada/realizada";
    const acoesPropostas = params.acoesPropostasVisibilidade || params.acoesPropostas || [];
    const totalAcoes = toNumber(params.totalAcoesPropostas) || acoesPropostas.length || toNumber(regra.metaAnualValor);
    if (!totalAcoes) return erro("Total de ações propostas não configurado para o indicador.", regra.unidadeMedida);

    const normalizarAcao = (value) => {
      const current = valorTextoOuId(value);
      if (!current) return "";
      const match = acoesPropostas.find((acao) => (
        valorTextoOuId(acao.id) === current ||
        valorTextoOuId(acao.nome) === current ||
        valorTextoOuId(acao.label) === current
      ));
      return match ? valorTextoOuId(match.id ?? match.nome) : current;
    };

    const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
    const realizadas = new Set();
    ateMes.forEach((item) => {
      if (texto(item, campoStatus) !== statusQueConta) return;
      const acao = normalizarAcao(raw(item, campoAcao));
      if (acao) realizadas.add(acao);
    });

    const acoesRealizadasAcumuladas = realizadas.size;
    const resultadoPercentual = acoesRealizadasAcumuladas / totalAcoes;
    const trimestre = lancamentoAtual.trimestre || `${Math.ceil(Number(lancamentoAtual.mes) / 3)}TRI/${lancamentoAtual.ano || 2026}`;
    const curva = params.curvaTrimestralAcumulada || {};
    const alvoTrimestre = curva[trimestre] || {};
    const metaAcoesRealizadasAcumuladas = toNumber(alvoTrimestre.metaAcoesRealizadasAcumuladas);
    const possuiAndamento = ateMes.some((item) => {
      const status = texto(item, campoStatus);
      return ["Em planejamento", "Em elaboração", "Em homologação"].includes(status);
    });

    if (metaAcoesRealizadasAcumuladas === 0) {
      return ok(resultadoPercentual, resultadoPercentual, null, null, regra.unidadeMedida, "Sem meta de entrega no período.", {
        resultadoPercentualVisibilidade: resultadoPercentual,
        acoesRealizadasAcumuladas,
        acoesRealizadas: [...realizadas],
        totalAcoesPropostasVisibilidade: totalAcoes,
        metaTrimestral: 0,
        metaAcoesRealizadasAcumuladas: 0,
        metaPercentualTrimestral: toNumber(alvoTrimestre.metaPercentual),
        marcoEsperado: alvoTrimestre.marcoEsperado || null,
        desempenhoNaoAplicavel: true,
        statusCalculo: "sem_meta_periodo",
        situacao: possuiAndamento ? "Em elaboração/homologação" : "Sem meta no período"
      });
    }

    const metaReferencia = metaAcoesRealizadasAcumuladas ?? toNumber(regra.metaAnualValor);
    if (!metaReferencia) return erro("Meta trimestral de ações propostas não configurada.", regra.unidadeMedida);
    const percentual = acoesRealizadasAcumuladas / metaReferencia;
    const situacao = acoesRealizadasAcumuladas >= metaReferencia
      ? "Atingido"
      : "Abaixo da meta";

    return ok(resultadoPercentual, resultadoPercentual, percentual, percentual, regra.unidadeMedida, "Execução de ações propostas calculada.", {
      resultadoPercentualVisibilidade: resultadoPercentual,
      acoesRealizadasAcumuladas,
      acoesRealizadas: [...realizadas],
      totalAcoesPropostasVisibilidade: totalAcoes,
      metaTrimestral: metaReferencia,
      metaAcoesRealizadasAcumuladas: metaReferencia,
      metaPercentualTrimestral: toNumber(alvoTrimestre.metaPercentual),
      marcoEsperado: alvoTrimestre.marcoEsperado || null,
      situacao
    });
  }

  function calcularInvestimentoSocioambiental(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const params = regra.parametrosCalculo || {};
    const campoStatus = params.campoStatus || "statusProjetoIncentivoSocioambiental";
    const campoValorMes = params.campoValorMes || "valorInvestidoMes";
    const campoValorAcumulado = params.campoValorAcumulado || "valorInvestidoAcumuladoCompetencia";
    const statusQueConta = params.statusQueConta || "Investimento realizado";
    const statusAtual = texto(lancamentoAtual, campoStatus);
    const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
    const lancamentosComInvestimento = ateMes.filter((item) => texto(item, campoStatus) === statusQueConta);

    const valorAcumuladoInformado = statusAtual === statusQueConta ? campo(lancamentoAtual, campoValorAcumulado) : null;
    if (statusAtual === statusQueConta) {
      const valorMesAtual = campo(lancamentoAtual, campoValorMes);
      if (valorAcumuladoInformado === null && valorMesAtual === null) {
        return erro("Informe o valor investido no mês ou o valor acumulado até a competência.", regra.unidadeMedida);
      }
      if ((valorMesAtual !== null && valorMesAtual < 0) || (valorAcumuladoInformado !== null && valorAcumuladoInformado < 0)) {
        return erro("Valores investidos não podem ser negativos.", regra.unidadeMedida);
      }
    }

    const valorInvestidoAcumulado = valorAcumuladoInformado !== null
      ? valorAcumuladoInformado
      : lancamentosComInvestimento.reduce((total, item) => total + (campo(item, campoValorMes) || 0), 0);

    const trimestre = lancamentoAtual.trimestre || `${Math.ceil(Number(lancamentoAtual.mes) / 3)}TRI/${lancamentoAtual.ano || 2026}`;
    const curva = params.curvaTrimestralAcumulada || {};
    const metaTrimestral = toNumber(curva[trimestre]?.metaValorAcumulado);
    const possuiAndamento = ateMes.some((item) => ["Em prospecção", "Em estruturação", "Em rito de governança", "Aprovado"].includes(texto(item, campoStatus)));

    if (metaTrimestral === 0) {
      return ok(valorInvestidoAcumulado, valorInvestidoAcumulado, null, null, regra.unidadeMedida, "Sem meta de investimento no período.", {
        valorInvestidoAcumulado,
        valorInvestidoAcumuladoAteCompetencia: valorInvestidoAcumulado,
        metaTrimestral,
        metaValorAcumulado: metaTrimestral,
        marcoEsperado: curva[trimestre]?.marcoEsperado || null,
        statusProjetoIncentivoSocioambiental: statusAtual,
        statusCalculo: "sem_meta_periodo",
        desempenhoNaoAplicavel: true,
        situacao: possuiAndamento ? "Em prospecção/estruturação" : "Sem meta no período"
      });
    }

    const metaReferencia = metaTrimestral ?? toNumber(regra.metaAnualValor);
    if (!metaReferencia) {
      return erro("Meta de investimento socioambiental não configurada.", regra.unidadeMedida);
    }
    const percentual = valorInvestidoAcumulado / metaReferencia;
    const situacao = valorInvestidoAcumulado >= metaReferencia
      ? "Atingido"
      : "Abaixo da meta";
    return ok(valorInvestidoAcumulado, valorInvestidoAcumulado, percentual, percentual, regra.unidadeMedida, "Investimento socioambiental acumulado calculado.", {
      valorInvestidoAcumulado,
      valorInvestidoAcumuladoAteCompetencia: valorInvestidoAcumulado,
      metaTrimestral,
      metaValorAcumulado: metaTrimestral,
      marcoEsperado: curva[trimestre]?.marcoEsperado || null,
      statusProjetoIncentivoSocioambiental: statusAtual,
      situacao
    });
  }

  function calcularInvestimentoPercentualLucro(indicador, regra, lancamentoAtual) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const investido = campo(lancamentoAtual, regra.parametrosCalculo?.campoInvestimento || "valorInvestidoAcumulado");
    const lucro = campo(lancamentoAtual, regra.parametrosCalculo?.campoLucro || "lucroLiquidoBase");
    const percentualLucro = toNumber(regra.parametrosCalculo?.percentualLucro) || 0.0033;
    if (lucro === null || lucro <= 0) return erro("Lucro líquido base deve ser maior que zero para calcular a meta financeira.", regra.unidadeMedida);
    const metaFinanceira = lucro * percentualLucro;
    return ok(investido, investido, investido / metaFinanceira, investido / metaFinanceira, regra.unidadeMedida, "Investimento percentual sobre lucro calculado.", { metaFinanceira });
  }

  function calcularPercentualExecucaoPlanoAcao(indicador, regra, lancamentoAtual) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const realizadas = campo(lancamentoAtual, regra.parametrosCalculo?.campoRealizadas || "totalAcoesRealizadas");
    const propostas = campo(lancamentoAtual, regra.parametrosCalculo?.campoPropostas || "totalAcoesPropostas");
    if (!propostas) return erro("Não foi possível calcular o indicador, pois o denominador informado é zero.", regra.unidadeMedida);
    if (realizadas < 0 || realizadas > propostas) return erro("Ações realizadas devem estar entre zero e o total de ações propostas.", regra.unidadeMedida);
    const resultado = realizadas / propostas;
    return ok(resultado, resultado, resultado, resultado, regra.unidadeMedida);
  }

  function calcularCrescimentoRelativoParticipacao(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);

    const params = regra.parametrosCalculo || {};
    const campo2026Mes = params.campoValor2026Mes || params.campoNumerador || "arrecadacaoEcossistemaMes2026";
    const campo2026Acumulado = params.campoValor2026Acumulado || "arrecadacaoEcossistemaAcumulada2026";
    const campoBase2025 = params.campoBase2025PeriodoEquivalente || params.campoNumerador2025 || "arrecadacaoEcossistema2025PeriodoEquivalente";
    const campoBase2025Acumulada = params.campoBase2025Acumulada || "arrecadacaoEcossistema2025Acumulada";
    const campoLegado2026 = params.campoNumeradorLegado || "arrecadacaoEcossistemaMes";
    const campoLegadoBase2025 = params.campoNumerador2025Legado || "arrecadacaoEcossistema2025";
    const crescimentoMeta = toNumber(params.metaCrescimento ?? 0.1) ?? 0.1;
    const metaIndice = 1 + crescimentoMeta;
    const mensagemBaseInsuficiente = params.mensagemBaseInsuficiente || "Dados insuficientes: informe a base de referência de 2025 para o período equivalente.";
    const mensagemRealizadoInsuficiente = params.mensagemRealizadoInsuficiente || "Arrecadação 2026 deve ser informada e não pode ser negativa.";
    const fallbackBase2025Periodo = params.campoBase2025PeriodoAtual || "arrecadacaoEcossistema2025PeriodoEquivalente";
    const fallback2026Periodo = params.campoValor2026PeriodoAtual || "arrecadacaoEcossistema2026PeriodoAtual";
    const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);

    const valorCampoComFallback = (item, principal, legado) => {
      const principalValor = campo(item, principal);
      return principalValor !== null ? principalValor : campo(item, legado);
    };

    let realizado2026 = ateMes
      .map((item) => valorCampoComFallback(item, campo2026Mes, campoLegado2026))
      .filter((value) => value !== null)
      .reduce((sum, value) => sum + value, 0);
    if (realizado2026 <= 0) {
      realizado2026 = campo(lancamentoAtual, campo2026Acumulado) ?? campo(lancamentoAtual, fallback2026Periodo);
    }

    let base2025 = ateMes
      .map((item) => valorCampoComFallback(item, campoBase2025, campoLegadoBase2025))
      .filter((value) => value !== null)
      .reduce((sum, value) => sum + value, 0);
    if (base2025 <= 0) {
      base2025 = campo(lancamentoAtual, campoBase2025Acumulada) ?? campo(lancamentoAtual, fallbackBase2025Periodo);
    }

    if (base2025 === null || base2025 <= 0) {
      return erro(mensagemBaseInsuficiente, regra.unidadeMedida);
    }
    if (realizado2026 === null || realizado2026 < 0) {
      return erro(mensagemRealizadoInsuficiente, regra.unidadeMedida);
    }

    const metaCalculada2026 = base2025 * metaIndice;
    const indiceEmRelacaoA2025 = realizado2026 / base2025;
    const crescimentoVs2025 = indiceEmRelacaoA2025 - 1;
    const percentualAtingido = realizado2026 / metaCalculada2026;
    const situacao = indiceEmRelacaoA2025 >= metaIndice
      ? "Atingido"
      : "Abaixo da meta";

    return ok(indiceEmRelacaoA2025, indiceEmRelacaoA2025, percentualAtingido, percentualAtingido, regra.unidadeMedida, "Crescimento comparado com base equivalente de 2025 calculado.", {
      resultadoReferencia2025: base2025,
      baseReferencia2025Periodo: base2025,
      arrecadacaoEcossistema2025PeriodoEquivalente: base2025,
      arrecadacaoEcossistema2026Periodo: realizado2026,
      arrecadacaoRedeLoterica2025PeriodoEquivalente: base2025,
      arrecadacaoRedeLoterica2026Periodo: realizado2026,
      realizado2026Periodo: realizado2026,
      realizado2026PeriodoFormatado: currency.formatarMoedaBR(realizado2026),
      metaCalculada2026,
      metaCalculadaUnidadeMedida: "moeda",
      metaIndiceCrescimento: metaIndice,
      indiceEmRelacaoA2025,
      crescimentoVs2025,
      crescimentoPercentual: crescimentoVs2025,
      situacao
    });
  }

  function trimestreKey(lancamento) {
    const trimestre = String(lancamento?.trimestre || "").match(/([1-4])\s*TRI/i);
    if (trimestre) return `${trimestre[1]}TRI`;
    const mes = toNumber(lancamento?.mes);
    return mes ? `${Math.ceil(mes / 3)}TRI` : null;
  }

  function normalizarCenarioEcossistema(value, params = {}) {
    const rawValue = valorTextoOuId(value || params.cenarioOficialResumoExecutivo || "lotex_marketplace")
      .toLocaleLowerCase("pt-BR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
      .replace(/\+/g, "_")
      .replace(/_+/g, "_");
    if (rawValue === "lotex") return "lotex";
    if (["lotex_marketplace", "lotex_e_marketplace", "lotex_marketplace_de_boloes"].includes(rawValue)) return "lotex_marketplace";
    return params.cenarioOficialResumoExecutivo || "lotex_marketplace";
  }

  function labelCenarioEcossistema(cenario, params = {}) {
    const configured = (params.cenarios || []).find((item) => (
      item.value === cenario || item.id === cenario || item.label === cenario
    ));
    if (configured?.label) return configured.label;
    return cenario === "lotex" ? "Lotex" : "Lotex + Marketplace";
  }

  function curvaEcossistema(params, cenario, trimestre) {
    return params.curvasCenarios?.[cenario]?.[trimestre] || null;
  }

  function pontosPercentuaisParaFracao(value) {
    const number = toNumber(value);
    return number === null ? null : number / 100;
  }

  function calcularParticipacaoEcossistemaComCenarios(indicador, regra, lancamentoAtual) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);

    const params = regra.parametrosCalculo || {};
    const campoCenario = params.campoCenario || "cenarioApuracaoEcossistema";
    const campoNumerador = params.campoNumerador || "arrecadacaoViaEcossistema";
    const campoNumeradorLegado = params.campoNumeradorLegado || "arrecadacaoEcossistemaMes2026";
    const campoDenominador = params.campoDenominador || "arrecadacaoTotal";
    const cenario = normalizarCenarioEcossistema(raw(lancamentoAtual, campoCenario), params);
    const trimestre = trimestreKey(lancamentoAtual);
    const curva = trimestre ? curvaEcossistema(params, cenario, trimestre) : null;
    if (!curva) return erro("Curva trimestral do cenário de ecossistema não configurada para esta competência.", regra.unidadeMedida);

    const arrecadacaoViaEcossistema = campo(lancamentoAtual, campoNumerador) ?? campo(lancamentoAtual, campoNumeradorLegado);
    const arrecadacaoTotal = campo(lancamentoAtual, campoDenominador);
    if (arrecadacaoViaEcossistema === null || arrecadacaoViaEcossistema < 0) {
      return erro("Informe a arrecadação via ecossistema no período.", regra.unidadeMedida);
    }
    if (arrecadacaoTotal === null || arrecadacaoTotal <= 0) {
      return erro("Arrecadação total no período deve ser maior que zero.", regra.unidadeMedida);
    }

    const referencia2025Trimestre = pontosPercentuaisParaFracao(curva.referencia2025);
    const metaTrimestral2026 = pontosPercentuaisParaFracao(curva.meta2026);
    if (!metaTrimestral2026) return erro("Meta trimestral do cenário de ecossistema não configurada.", regra.unidadeMedida);

    const resultadoCalculado = arrecadacaoViaEcossistema / arrecadacaoTotal;
    const percentualAtingido = resultadoCalculado / metaTrimestral2026;
    const situacao = situacaoPorPercentual(percentualAtingido);

    return ok(resultadoCalculado, resultadoCalculado, percentualAtingido, percentualAtingido, regra.unidadeMedida, "Participação da arrecadação via ecossistema calculada conforme curva trimestral oficial.", {
      cenarioApuracaoEcossistema: cenario,
      cenarioApuracaoEcossistemaLabel: labelCenarioEcossistema(cenario, params),
      trimestreEcossistema: trimestre,
      referencia2025Trimestre,
      referencia2025TrimestrePontos: toNumber(curva.referencia2025),
      metaTrimestral2026,
      metaTrimestral2026Pontos: toNumber(curva.meta2026),
      metaCalculada2026: metaTrimestral2026,
      metaCalculadaUnidadeMedida: "percentual",
      arrecadacaoViaEcossistema,
      arrecadacaoTotal,
      resultadoCalculado,
      resultadoCalculadoPontos: resultadoCalculado * 100,
      percentualAtingido,
      situacao
    });
  }

  function lancamentosMesmoTrimestre(lancamentoAtual, lancamentosDoAno) {
    const trimestreAtual = trimestreKey(lancamentoAtual);
    const anoAtual = Number(lancamentoAtual?.ano);
    return (lancamentosDoAno || [])
      .filter((item) => (
        (!anoAtual || Number(item.ano) === anoAtual) &&
        trimestreKey(item) === trimestreAtual &&
        Number(item.mes) <= Number(lancamentoAtual.mes)
      ))
      .sort((a, b) => Number(a.mes) - Number(b.mes));
  }

  function calcularIncrementoRedeLotericaBase2025(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);

    const params = regra.parametrosCalculo || {};
    const campo2026 = params.campoValor2026 || params.campoNumerador || "arrecadacaoRedeLoterica2026";
    const campo2026Legado = params.campoValor2026Mes || params.campoNumeradorLegado || "arrecadacaoRedeLotericaMes2026";
    const campo2026Acumulado = params.campoValor2026Acumulado || "arrecadacaoRedeLotericaAcumulada2026";
    const campo2026PeriodoAtual = params.campoValor2026PeriodoAtual || "arrecadacaoRedeLoterica2026PeriodoAtual";
    const campoBase2025 = params.campoBase2025 || params.campoNumerador2025 || "arrecadacaoRedeLoterica2025";
    const campoBase2025Legado = params.campoBase2025PeriodoEquivalente || params.campoNumerador2025Legado || "arrecadacaoRedeLoterica2025PeriodoEquivalente";
    const campoBase2025Acumulada = params.campoBase2025Acumulada || "arrecadacaoRedeLoterica2025Acumulada";
    const campoBase2025PeriodoAtual = params.campoBase2025PeriodoAtual || "arrecadacaoRedeLoterica2025PeriodoEquivalente";
    const mensagemBaseInsuficiente = params.mensagemBaseInsuficiente || "Dados insuficientes: informe a arrecadação da Rede Lotérica em 2025 para o período equivalente.";
    const mensagemRealizadoInsuficiente = params.mensagemRealizadoInsuficiente || "Arrecadação da Rede Lotérica 2026 deve ser informada e não pode ser negativa.";
    const trimestre = trimestreKey(lancamentoAtual);
    const curva = trimestre ? params.curvaIncrementoTrimestral?.[trimestre] : null;
    const metaTrimestral = pontosPercentuaisParaFracao(curva?.metaIncremento ?? lancamentoAtual?.metaMensal ?? regra?.metaAnualValor);
    if (!metaTrimestral) return erro("Meta trimestral de incremento da Rede Lotérica não configurada.", regra.unidadeMedida);

    const valorCampoComFallback = (item, principal, legado) => {
      const principalValor = campo(item, principal);
      return principalValor !== null ? principalValor : campo(item, legado);
    };
    const mesmoTrimestre = lancamentosMesmoTrimestre(lancamentoAtual, lancamentosDoAno);
    const escopo = mesmoTrimestre.length ? mesmoTrimestre : [lancamentoAtual];

    let arrecadacaoRedeLoterica2026 = escopo
      .map((item) => valorCampoComFallback(item, campo2026, campo2026Legado))
      .filter((value) => value !== null)
      .reduce((sum, value) => sum + value, 0);
    if (arrecadacaoRedeLoterica2026 <= 0) {
      arrecadacaoRedeLoterica2026 = campo(lancamentoAtual, campo2026Acumulado) ?? campo(lancamentoAtual, campo2026PeriodoAtual);
    }

    let arrecadacaoRedeLoterica2025 = escopo
      .map((item) => valorCampoComFallback(item, campoBase2025, campoBase2025Legado))
      .filter((value) => value !== null)
      .reduce((sum, value) => sum + value, 0);
    if (arrecadacaoRedeLoterica2025 <= 0) {
      arrecadacaoRedeLoterica2025 = campo(lancamentoAtual, campoBase2025Acumulada) ?? campo(lancamentoAtual, campoBase2025PeriodoAtual);
    }

    if (arrecadacaoRedeLoterica2025 === null || arrecadacaoRedeLoterica2025 <= 0) {
      return erro(mensagemBaseInsuficiente, regra.unidadeMedida);
    }
    if (arrecadacaoRedeLoterica2026 === null || arrecadacaoRedeLoterica2026 < 0) {
      return erro(mensagemRealizadoInsuficiente, regra.unidadeMedida);
    }

    const indiceRedeLoterica = arrecadacaoRedeLoterica2026 / arrecadacaoRedeLoterica2025;
    const incrementoRedeLoterica = indiceRedeLoterica - 1;
    const percentualAtingido = incrementoRedeLoterica / metaTrimestral;
    const situacao = situacaoPorPercentual(percentualAtingido);

    return ok(incrementoRedeLoterica, incrementoRedeLoterica, percentualAtingido, percentualAtingido, regra.unidadeMedida, "Incremento da Rede Lotérica calculado a partir da razão 2026/2025.", {
      arrecadacaoRedeLoterica2025,
      arrecadacaoRedeLoterica2026,
      baseReferencia2025Periodo: arrecadacaoRedeLoterica2025,
      realizado2026Periodo: arrecadacaoRedeLoterica2026,
      realizado2026PeriodoFormatado: currency.formatarMoedaBR(arrecadacaoRedeLoterica2026),
      indiceRedeLoterica,
      indiceRedeLotericaPontos: indiceRedeLoterica * 100,
      indiceEmRelacaoA2025: indiceRedeLoterica,
      incrementoRedeLoterica,
      incrementoRedeLotericaPontos: incrementoRedeLoterica * 100,
      crescimentoVs2025: incrementoRedeLoterica,
      crescimentoPercentual: incrementoRedeLoterica,
      metaTrimestral,
      metaTrimestralPontos: metaTrimestral * 100,
      metaCalculada2026: metaTrimestral,
      metaCalculadaUnidadeMedida: "percentual",
      situacao
    });
  }

  function calcularCrescimentoRelativoValor(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const meta = requireMeta(regra.parametrosCalculo?.metaCrescimento ?? regra.metaAnualValor, regra.unidadeMedida);
    if (meta.erro) return meta;
    const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
    const atual = somaCampo(ateMes, regra.parametrosCalculo?.campoAtual);
    const anterior = somaCampo(ateMes, regra.parametrosCalculo?.campoAnterior);
    if (anterior <= 0) return erro("Base de comparação de 2025 não cadastrada.", regra.unidadeMedida);
    const crescimento = atual / anterior - 1;
    return ok(crescimento, crescimento, crescimento / meta, crescimento / meta, regra.unidadeMedida);
  }

  function regraFallback(indicador) {
    return {
      indicadorId: indicador.id,
      nome: indicador.indicador,
      tipoCalculo: "percentual_direto",
      tipoConsolidacao: "ultima_posicao",
      metaRecorrente: true,
      unidadeMedida: indicador.unidadeMedida || "percentual",
      metaAnualValor: null,
      parametrosCalculo: {},
      camposEntrada: [{ nome: "realizadoMensal", rotulo: "Realizado mensal", tipo: "numero", obrigatorio: true }],
      exigeEvidencia: false,
      resultadoOficial: "ultima_posicao_homologada",
      aviso: "Regra de segurança aplicada apenas quando não houver configuração cadastrada."
    };
  }

  function obterRegra(indicador, regras) {
    return (regras || []).find((item) => Number(item.indicadorId) === Number(indicador.id)) || regraFallback(indicador);
  }

  function calcularIndicador(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    if (!regra) return erro("Indicador sem regra cadastrada.", indicador && indicador.unidadeMedida);
    switch (regra.tipoCalculo) {
      case "percentual_direto":
        return calcularPercentualDireto(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "reducao_de_gap":
        return calcularReducaoGap(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "crescimento_media_mensal":
        return calcularCrescimentoMediaMensal(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "percentual_acumulado":
        return calcularPercentualAcumulado(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "valor_financeiro_acumulado":
        return calcularValorFinanceiroAcumulado(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "ggr_formula":
        return calcularGgrFormula(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "indice_inverso_ajustado":
        return calcularIndiceInversoAjustado(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "indice_inverso":
        return calcularIndiceInverso(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "incremento_pontos_percentuais":
        return calcularIncrementoPontosPercentuais(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "razao_canais_digitais":
        return calcularRazaoCanaisDigitais(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "razao_pix":
        return calcularRazaoPix(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "projeto_marco_entrega":
      case "marco_projeto_percentual":
        return calcularProjetoMarcoEntrega(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "nota_pesquisa_nps":
        return calcularNotaPesquisaNps(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "nota_pesquisa_anual":
        return calcularNotaPesquisaAnual(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "pontuacao_minima":
        return calcularPontuacaoMinima(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "quantidade_acumulada":
      case "melhorias_acumuladas":
        return calcularQuantidadeAcumulada(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "plano_acao_por_elementos":
        return calcularPlanoAcaoPorElementos(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "iniciativas_apoiadas":
        return calcularIniciativasApoiadas(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "investimento_percentual_lucro":
        return calcularInvestimentoPercentualLucro(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "investimento_socioambiental":
        return calcularInvestimentoSocioambiental(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "execucao_acoes_propostas":
        return calcularExecucaoAcoesPropostas(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "percentual_execucao_plano_acao":
        return calcularPercentualExecucaoPlanoAcao(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "participacao_ecossistema_com_cenarios":
        return calcularParticipacaoEcossistemaComCenarios(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "incremento_rede_loterica_base_2025":
        return calcularIncrementoRedeLotericaBase2025(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "crescimento_relativo_participacao":
      case "crescimento_comparado_base_2025":
      case "crescimento_rede_loterica_base_2025":
        return calcularCrescimentoRelativoParticipacao(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "crescimento_relativo_valor":
        return calcularCrescimentoRelativoValor(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "cobertura_capacitacao_minima":
        return calcularPercentualDireto(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "cobertura_capacitacao_jogo_responsavel":
      case "cobertura_capacitacao":
        return calcularCoberturaCapacitacao(indicador, regra, lancamentoAtual, lancamentosDoAno);
      default:
        return erro("Tipo de cálculo não configurado para este indicador.", regra.unidadeMedida);
    }
  }

  const api = {
    obterRegra,
    regraFallback,
    toNumber,
    parseMoedaBR: currency.parseMoedaBR,
    formatarMoedaBR: currency.formatarMoedaBR,
    normalizarPercentual,
    calcularIndicador,
    calcularPercentualDireto,
    calcularReducaoGap,
    calcularCrescimentoMediaMensal,
    calcularPercentualAcumulado,
    calcularValorFinanceiroAcumulado,
    calcularIndiceInversoAjustado,
    calcularIncrementoPontosPercentuais,
    calcularRazaoCanaisDigitais,
    calcularRazaoPix,
    calcularProjetoMarcoEntrega,
    calcularPontuacaoMinima,
    calcularQuantidadeAcumulada,
    calcularPlanoAcaoPorElementos,
    calcularInvestimentoPercentualLucro,
    calcularExecucaoAcoesPropostas,
    calcularPercentualExecucaoPlanoAcao,
    calcularParticipacaoEcossistemaComCenarios,
    calcularIncrementoRedeLotericaBase2025,
    calcularCrescimentoRelativoParticipacao,
    calcularCrescimentoRelativoValor
  };

  root.IndicatorFormulas = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
