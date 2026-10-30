(function (root) {
  const currency = root.CurrencyBR || (typeof require === "function" ? require("./currency.js") : null);

  function toNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function obterApresentacaoOficialTrimestre(regra, trimestre) {
    const apresentacoes = regra?.parametrosCalculo?.apresentacoesOficiaisTrimestrais || {};
    const chaveCurta = String(trimestre || "").match(/([1-4])\s*TRI/i)?.[0]?.replace(/\s/g, "");
    const apresentacao = apresentacoes[trimestre] || (chaveCurta ? apresentacoes[chaveCurta] : null);
    return apresentacao && typeof apresentacao === "object" ? apresentacao : null;
  }

  function metaLancamento(lancamento) {
    return toNumber(lancamento?.metaReferencia ?? lancamento?.metaMensal);
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

  function formatarPercentual(value, minimumFractionDigits = 0, maximumFractionDigits = Math.max(2, minimumFractionDigits)) {
    const number = toNumber(value);
    if (number === null) return "-";
    return `${(number * 100).toLocaleString("pt-BR", { minimumFractionDigits, maximumFractionDigits })}%`;
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
    const resultadoOficial = Object.prototype.hasOwnProperty.call(extra, "resultadoOficialAnual")
      ? extra.resultadoOficialAnual
      : resultadoAcumulado;
    const percentualAnual = Object.prototype.hasOwnProperty.call(extra, "percentualAtingidoAnual")
      ? extra.percentualAtingidoAnual
      : percentualAcumulado;
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
    if (params.priorizarMetaCurvaConfigurada === true && Object.prototype.hasOwnProperty.call(curva, key)) {
      return toNumber(curva[key]);
    }
    const configured = toNumber(lancamento?.metaReferencia ?? lancamento?.metaMensal);
    if (configured !== null) return configured;
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

  const TIPO_POSICAO_CAPACITACAO = Object.freeze({
    ACOMPANHAMENTO: "acompanhamento",
    APURACAO_QUANTITATIVA: "apuracao_quantitativa"
  });

  const MODO_RESULTADO_CAPACITACAO = Object.freeze({
    CALCULADO: "calculado",
    OFICIAL_INFORMADO: "oficial_informado"
  });

  const TIPO_POSICAO_APRIMORAMENTO = Object.freeze({
    ACOMPANHAMENTO: "acompanhamento",
    FECHAMENTO_QUANTITATIVO: "fechamento_quantitativo"
  });

  const TIPO_POSICAO_GGR = Object.freeze({
    ACOMPANHAMENTO: "acompanhamento",
    FECHAMENTO_TRIMESTRAL: "fechamento_trimestral"
  });

  function resolverTipoPosicaoGgr(lancamento, regra = null) {
    const campoTipo = regra?.parametrosCalculo?.campoTipoPosicao || "tipoPosicaoGGR";
    const tipoExplicito = String(raw(lancamento || {}, campoTipo) || "").trim();
    if (Object.values(TIPO_POSICAO_GGR).includes(tipoExplicito)) return tipoExplicito;
    const mesesFechamento = regra?.parametrosCalculo?.mesesFechamentoTrimestral || [3, 6, 9, 12];
    return mesesFechamento.includes(Number(lancamento?.mes))
      ? TIPO_POSICAO_GGR.FECHAMENTO_TRIMESTRAL
      : TIPO_POSICAO_GGR.ACOMPANHAMENTO;
  }

  function resolverTipoPosicaoAprimoramento(lancamento) {
    const camposEntrada = lancamento?.camposEntrada || {};
    const tipoExplicito = String(camposEntrada.tipoPosicaoAprimoramento || "").trim();
    if (Object.values(TIPO_POSICAO_APRIMORAMENTO).includes(tipoExplicito)) return tipoExplicito;

    const mes = Number(lancamento?.mes);
    if (Number.isInteger(mes) && ![3, 6, 9, 12].includes(mes)) {
      return TIPO_POSICAO_APRIMORAMENTO.ACOMPANHAMENTO;
    }

    const possuiAcumulado = camposEntrada.melhoriasImplementadasAcumuladas !== undefined &&
      camposEntrada.melhoriasImplementadasAcumuladas !== null &&
      camposEntrada.melhoriasImplementadasAcumuladas !== "";
    if (possuiAcumulado) return TIPO_POSICAO_APRIMORAMENTO.FECHAMENTO_QUANTITATIVO;

    const possuiValorHistorico = ["melhoriasImplementadasMes", "melhoriasEntreguesMes"]
      .some((nome) => camposEntrada[nome] !== undefined && camposEntrada[nome] !== null && camposEntrada[nome] !== "");
    return possuiValorHistorico ? TIPO_POSICAO_APRIMORAMENTO.FECHAMENTO_QUANTITATIVO : null;
  }

  function resultadoAcompanhamentoAprimoramento(regra, lancamentoAtual) {
    const campoAcumulado = regra?.parametrosCalculo?.campoPosicaoAcumulada || "melhoriasImplementadasAcumuladas";
    const totalMelhoriasPlano = toNumber(regra?.parametrosCalculo?.totalMelhoriasPlano2026);
    const posicaoAcumulada = campo(lancamentoAtual, campoAcumulado);
    if (posicaoAcumulada !== null && (posicaoAcumulada < 0 || !Number.isInteger(posicaoAcumulada))) {
      return erro("A posição acumulada de acompanhamento deve ser uma quantidade inteira não negativa.", regra.unidadeMedida);
    }
    if (posicaoAcumulada !== null && totalMelhoriasPlano !== null && posicaoAcumulada > totalMelhoriasPlano) {
      return erro(`A posição acumulada de acompanhamento não pode ser maior que ${totalMelhoriasPlano}, a base de melhorias mapeadas.`, regra.unidadeMedida);
    }
    const percentualAcompanhamento = posicaoAcumulada !== null && totalMelhoriasPlano
      ? posicaoAcumulada / totalMelhoriasPlano
      : null;
    const semAvaliacao = lancamentoAtual?.status === "Não iniciado" && posicaoAcumulada === null;
    return {
      ...pendente(semAvaliacao
        ? "Competência de acompanhamento ainda sem avaliação."
        : posicaoAcumulada === null
          ? "Acompanhamento registrado sem posição acumulada informativa."
          : "Posição acumulada mensal registrada somente para acompanhamento.", regra.unidadeMedida, {
        statusCalculo: "acompanhamento",
        tipoPosicaoAprimoramento: TIPO_POSICAO_APRIMORAMENTO.ACOMPANHAMENTO,
        melhoriasImplementadasAcumuladas: posicaoAcumulada,
        posicaoAcompanhamentoAprimoramento: posicaoAcumulada,
        percentualAcompanhamentoAprimoramento: percentualAcompanhamento,
        percentualAcompanhamentoAprimoramentoFormatado: formatarPercentual(percentualAcompanhamento),
        totalMelhoriasPlano2026: totalMelhoriasPlano,
        fonteCalculoAprimoramento: posicaoAcumulada === null ? null : "posicao_absoluta_acompanhamento",
        situacao: semAvaliacao ? "Sem avaliação" : "Em acompanhamento"
      }),
      descricaoMelhoriasMes: raw(lancamentoAtual, "descricaoMelhoriasMes") || null
    };
  }

  function resolverTipoPosicaoCapacitacao(lancamento) {
    const camposEntrada = lancamento?.camposEntrada || {};
    const tipoExplicito = String(camposEntrada.tipoPosicaoCapacitacao || "").trim();
    if (Object.values(TIPO_POSICAO_CAPACITACAO).includes(tipoExplicito)) return tipoExplicito;

    const modoResultado = String(camposEntrada.modoResultadoCapacitacao || "").trim();
    const possuiResultadoOficial = modoResultado === MODO_RESULTADO_CAPACITACAO.OFICIAL_INFORMADO &&
      camposEntrada.resultadoOficialInformadoCapacitacao !== undefined &&
      camposEntrada.resultadoOficialInformadoCapacitacao !== null &&
      camposEntrada.resultadoOficialInformadoCapacitacao !== "" &&
      camposEntrada.percentualAtingidoOficialCapacitacao !== undefined &&
      camposEntrada.percentualAtingidoOficialCapacitacao !== null &&
      camposEntrada.percentualAtingidoOficialCapacitacao !== "";
    if (possuiResultadoOficial) return TIPO_POSICAO_CAPACITACAO.APURACAO_QUANTITATIVA;

    const possuiPublico = camposEntrada.publicoAlvoElegivelCapacitacao !== undefined &&
      camposEntrada.publicoAlvoElegivelCapacitacao !== null &&
      camposEntrada.publicoAlvoElegivelCapacitacao !== "";
    const possuiCapacitados = camposEntrada.empregadosCapacitadosCapacitacao !== undefined &&
      camposEntrada.empregadosCapacitadosCapacitacao !== null &&
      camposEntrada.empregadosCapacitadosCapacitacao !== "";
    if (possuiPublico && possuiCapacitados) return TIPO_POSICAO_CAPACITACAO.APURACAO_QUANTITATIVA;

    const statusHomologado = String(lancamento?.status || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR") === "homologado";
    const possuiRegistroQualitativo = [
      camposEntrada.acoesAcompanhamentoCapacitacao,
      camposEntrada.fonteEvidenciaCapacitacao,
      camposEntrada.cursosConsideradosCapacitacao,
      camposEntrada.observacaoArea,
      lancamento?.observacaoArea,
      lancamento?.referenciaEvidencia
    ].some((value) => String(value || "").trim());
    if (statusHomologado && possuiRegistroQualitativo) return TIPO_POSICAO_CAPACITACAO.ACOMPANHAMENTO;
    return null;
  }

  function resolverModoResultadoCapacitacao(lancamento) {
    const modo = String(raw(lancamento, "modoResultadoCapacitacao") || "").trim();
    return Object.values(MODO_RESULTADO_CAPACITACAO).includes(modo)
      ? modo
      : MODO_RESULTADO_CAPACITACAO.CALCULADO;
  }

  function percentualPersistido(lancamento, nome) {
    const value = raw(lancamento, nome);
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    return normalizarPercentual(value);
  }

  function resultadoAcompanhamentoCapacitacao(regra, lancamentoAtual) {
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
      percentualAtingidoAcumuladoFormatado: "-",
      percentualAtingidoAnual: null,
      percentualAtingidoAnualFormatado: "-",
      unidadeMedida: regra.unidadeMedida || "percentual",
      statusCalculo: "acompanhamento",
      mensagem: "Acompanhamento registrado sem nova medição quantitativa.",
      tipoPosicaoCapacitacao: TIPO_POSICAO_CAPACITACAO.ACOMPANHAMENTO,
      acoesAcompanhamentoCapacitacao: raw(lancamentoAtual, "acoesAcompanhamentoCapacitacao") || null,
      situacao: "Em acompanhamento"
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
    if (Number(indicador?.id ?? regra?.indicadorId) === 1) {
      return calcularOfertasPersonalizadas(regra, lancamentoAtual);
    }
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);

    const temCampo = (nome) => (regra.camposEntrada || []).some((item) => item.nome === nome);
    const numeradorCampo = regra.parametrosCalculo?.numeradorCampo ||
      (temCampo("clientesUnicosComOfertaPersonalizadaCompetencia") ? "clientesUnicosComOfertaPersonalizadaCompetencia" : null) ||
      (temCampo("clientesComOfertaPersonalizada") ? "clientesComOfertaPersonalizada" : "realizadoMensal");
    const denominadorCampo = regra.parametrosCalculo?.denominadorCampo ||
      (temCampo("baseClientesAtivosCompetencia") ? "baseClientesAtivosCompetencia" : null) ||
      (temCampo("baseClientesAtivos") ? "baseClientesAtivos" : null);
    const meta = requireMeta(lancamentoAtual.metaReferencia ?? lancamentoAtual.metaMensal ?? regra.parametrosCalculo?.metaReferencia ?? regra.metaAnualValor, regra.unidadeMedida);
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

    if (regra.parametrosCalculo?.arredondarResultadoAntesAtingimento === true) {
      const casasConfiguradas = toNumber(regra.parametrosCalculo?.casasDecimaisResultadoPercentual);
      const casas = casasConfiguradas === null
        ? 2
        : Math.min(10, Math.max(0, Math.trunc(casasConfiguradas)));
      const fator = 10 ** casas;
      const resultadoPercentual = Math.round((resultadoMensal * 100 + Number.EPSILON) * fator) / fator;
      resultadoMensal = resultadoPercentual / 100;
    }

    const percentual = resultadoMensal / meta;
    return ok(resultadoMensal, resultadoMensal, percentual, percentual, regra.unidadeMedida);
  }

  function calcularOfertasPersonalizadas(regra, lancamentoAtual) {
    const params = regra.parametrosCalculo || {};
    const numeratorField = params.numeradorCampo || "clientesUnicosComOfertaPersonalizadaCompetencia";
    const denominatorField = params.denominadorCampo || "baseClientesAtivosCompetencia";
    const documentedResultField = params.campoResultadoDocumental || "resultadoDocumentalOfertasPersonalizadas";
    const documentedPerformanceField = params.campoPercentualAtingidoOficial || "percentualAtingidoOficialOfertasPersonalizadas";
    const positionTypeField = params.campoTipoPosicao || "tipoPosicaoOfertasPersonalizadas";
    const sourceField = params.campoFonteResultado || "fonteResultadoOfertasPersonalizadas";
    const numerator = toNumber(raw(lancamentoAtual, numeratorField));
    const denominator = toNumber(raw(lancamentoAtual, denominatorField));
    const documentedResult = toNumber(raw(lancamentoAtual, documentedResultField));
    const documentedPerformance = toNumber(raw(lancamentoAtual, documentedPerformanceField));
    const meta = toNumber(lancamentoAtual.metaReferencia ?? lancamentoAtual.metaMensal ?? params.metaReferencia ?? regra.metaAnualValor);
    const closingMonths = Array.isArray(params.mesesFechamentoTrimestral) ? params.mesesFechamentoTrimestral : [3, 6, 9, 12];
    const isClosing = closingMonths.includes(Number(lancamentoAtual.mes));
    const positionType = String(raw(lancamentoAtual, positionTypeField) || (isClosing ? "fechamento_trimestral" : "acompanhamento"));
    const source = String(raw(lancamentoAtual, sourceField) || "").trim() || null;

    if (meta === null || meta <= 0) return erro("Meta da competência deve ser maior que zero.", regra.unidadeMedida);
    if ((numerator === null) !== (denominator === null)) {
      return erro("Informe os dois componentes ou deixe ambos ausentes.", regra.unidadeMedida);
    }
    if (denominator !== null && denominator <= 0) return erro("A base de clientes ativos deve ser maior que zero.", regra.unidadeMedida);
    if (numerator !== null && numerator < 0) return erro("Clientes alcançados não pode ser negativo.", regra.unidadeMedida);
    if (documentedResult !== null && documentedResult < 0) return erro("Resultado documental não pode ser negativo.", regra.unidadeMedida);
    if (documentedPerformance !== null && documentedPerformance < 0) return erro("Atingimento oficial documental não pode ser negativo.", regra.unidadeMedida);

    const technicalResult = numerator === null ? null : numerator / denominator;
    const technicalPerformance = technicalResult === null ? null : technicalResult / meta;
    const officialResult = documentedResult ?? technicalResult;
    const officialPerformance = documentedPerformance ?? (officialResult === null ? null : officialResult / meta);
    if (officialResult === null) {
      return pendente("Competência sem resultado informado.", regra.unidadeMedida, {
        metaReferencia: meta,
        resultadoTecnicoOfertasPersonalizadas: null,
        percentualAtingidoTecnicoOfertasPersonalizadas: null,
        resultadoDocumentalOfertasPersonalizadas: null,
        percentualAtingidoOficialOfertasPersonalizadas: null,
        tipoPosicaoOfertasPersonalizadas: positionType,
        fonteResultadoOfertasPersonalizadas: source,
        situacao: null
      });
    }

    return ok(technicalResult, officialResult, technicalPerformance, officialPerformance, regra.unidadeMedida,
      technicalResult === null
        ? "Fechamento documental utilizado sem criação de componentes inexistentes."
        : "Posição da competência calculada sem soma ou média de outros meses.", {
        metaReferencia: meta,
        resultadoCalculado: technicalResult,
        resultadoTecnicoOfertasPersonalizadas: technicalResult,
        percentualAtingidoTecnicoOfertasPersonalizadas: technicalPerformance,
        resultadoDocumentalOfertasPersonalizadas: documentedResult,
        percentualAtingidoOficialOfertasPersonalizadas: documentedPerformance,
        tipoPosicaoOfertasPersonalizadas: positionType,
        fonteResultadoOfertasPersonalizadas: source,
        situacao: isClosing ? situacaoPorPercentual(officialPerformance) : "Em acompanhamento"
      });
  }

  function calcularCoberturaCapacitacao(indicador, regra, lancamentoAtual) {
    const params = regra.parametrosCalculo || {};
    const permiteAcompanhamento = regra.tipoCalculo === "cobertura_capacitacao" && Number(indicador?.id) === 15;
    const tipoPosicao = permiteAcompanhamento ? resolverTipoPosicaoCapacitacao(lancamentoAtual) : null;
    if (permiteAcompanhamento && !tipoPosicao) {
      return pendente("Selecione o tipo da posição.", regra.unidadeMedida, { tipoPosicaoCapacitacao: null });
    }
    if (tipoPosicao === TIPO_POSICAO_CAPACITACAO.ACOMPANHAMENTO) {
      const acoes = String(raw(lancamentoAtual, "acoesAcompanhamentoCapacitacao") || "").trim();
      if (!acoes && raw(lancamentoAtual, "tipoPosicaoCapacitacao")) {
        return pendente("Informe as ações realizadas ou o andamento do acompanhamento.", regra.unidadeMedida, {
          tipoPosicaoCapacitacao: TIPO_POSICAO_CAPACITACAO.ACOMPANHAMENTO
        });
      }
      return resultadoAcompanhamentoCapacitacao(regra, lancamentoAtual);
    }
    if (!permiteAcompanhamento) {
      const required = validarObrigatorios(regra, lancamentoAtual);
      if (required) return erro(required, regra.unidadeMedida);
    }
    const trimestre = lancamentoAtual.trimestre || `${Math.ceil(Number(lancamentoAtual.mes) / 3)}TRI/${lancamentoAtual.ano || 2026}`;
    const curva = params.curvaTrimestralCursos || params.curvaJogoResponsavel2026 || {};
    const criterioTrimestre = curva[trimestre] || {};
    const metaCobertura = metaLancamento(lancamentoAtual) ?? toNumber(criterioTrimestre.metaCobertura ?? params.metaCobertura ?? params.metaReferencia ?? regra.metaAnualValor);
    const quantidadeCursosCurva = toNumber(criterioTrimestre.quantidadeCursosMinima ?? criterioTrimestre.quantidadeMinimaIniciativas);
    const campoQuantidadeMinima = params.campoQuantidadeCursos || params.campoQuantidadeMinima || "quantidadeCursosMinimaCapacitacao";
    const quantidadeCursosMinima = permiteAcompanhamento
      ? quantidadeCursosCurva
      : campo(lancamentoAtual, campoQuantidadeMinima) ?? quantidadeCursosCurva;
    if (metaCobertura === null || metaCobertura <= 0) {
      return erro("Meta de cobertura de capacitação não configurada.", regra.unidadeMedida);
    }

    const modoResultado = permiteAcompanhamento
      ? resolverModoResultadoCapacitacao(lancamentoAtual)
      : MODO_RESULTADO_CAPACITACAO.CALCULADO;
    if (modoResultado === MODO_RESULTADO_CAPACITACAO.OFICIAL_INFORMADO) {
      const resultadoOficial = percentualPersistido(lancamentoAtual, "resultadoOficialInformadoCapacitacao");
      const atingimentoOficial = percentualPersistido(lancamentoAtual, "percentualAtingidoOficialCapacitacao");
      if (resultadoOficial === null || resultadoOficial < 0 || resultadoOficial > 1) {
        return erro("Resultado oficial informado deve ser um percentual entre 0% e 100%.", regra.unidadeMedida);
      }
      if (atingimentoOficial === null || atingimentoOficial < 0) {
        return erro("Percentual atingido oficial deve ser informado e não pode ser negativo.", regra.unidadeMedida);
      }
      const situacao = atingimentoOficial > 1
        ? "Superado"
        : atingimentoOficial === 1
          ? "Atingido"
          : "Abaixo da meta";
      const componentes = raw(lancamentoAtual, "componentesResultadoCapacitacao");
      return ok(resultadoOficial, resultadoOficial, atingimentoOficial, atingimentoOficial, regra.unidadeMedida, "Resultado e atingimento oficiais informados para o fechamento de capacitação.", {
        tipoPosicaoCapacitacao: tipoPosicao || TIPO_POSICAO_CAPACITACAO.APURACAO_QUANTITATIVA,
        modoResultadoCapacitacao: MODO_RESULTADO_CAPACITACAO.OFICIAL_INFORMADO,
        resultadoOficialInformadoCapacitacao: resultadoOficial,
        percentualAtingidoOficialCapacitacao: atingimentoOficial,
        metaCoberturaCapacitacao: metaCobertura,
        quantidadeCursosMinimaCapacitacao: quantidadeCursosMinima,
        quantidadeMinimaIniciativasJR: quantidadeCursosMinima,
        criterioCapacitacao: criterioTrimestre.descricao || null,
        componentesResultadoCapacitacao: Array.isArray(componentes) ? componentes : [],
        percentualAtingidoMatematico: null,
        origemResultadoCapacitacao: "informe_oficial",
        situacao
      });
    }

    const campoPublico = params.campoPublicoAlvo || "publicoAlvoElegivelCapacitacao";
    const campoCapacitados = params.campoCapacitados || "empregadosCapacitadosCapacitacao";
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

    const cobertura = capacitados / publicoAlvo;
    const percentualMatematico = cobertura / metaCobertura;
    const percentualAtingido = cobertura >= metaCobertura ? 1 : percentualMatematico;
    const situacao = cobertura >= metaCobertura
      ? "Atingido"
      : "Abaixo da meta";

    return ok(cobertura, cobertura, percentualAtingido, percentualAtingido, regra.unidadeMedida, "Cobertura de capacitação calculada por público-alvo elegível.", {
      tipoPosicaoCapacitacao: tipoPosicao || TIPO_POSICAO_CAPACITACAO.APURACAO_QUANTITATIVA,
      modoResultadoCapacitacao: MODO_RESULTADO_CAPACITACAO.CALCULADO,
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
    const metaFinal = metaLancamento(lancamentoAtual) ?? toNumber(regra.parametrosCalculo?.metaFinalCalculada) ?? toNumber(regra.metaAnualValor);
    if (base === null || metaFinal === null || metaFinal === base) {
      return erro("Parâmetros de base e meta final são obrigatórios para redução de gap.", regra.unidadeMedida);
    }
    const percentual = (valor - base) / (metaFinal - base);
    return ok(valor, valor, percentual, percentual, regra.unidadeMedida);
  }
  function calcularCrescimentoMediaMensal(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const params = regra.parametrosCalculo || {};
    const qmaatuCampo = regra.parametrosCalculo?.qmaatuCampo ||
      ((regra.camposEntrada || []).some((item) => item.nome === "qmaatu") ? "qmaatu" : null);
    const qmaantCampo = regra.parametrosCalculo?.qmaantCampo ||
      ((regra.camposEntrada || []).some((item) => item.nome === "qmaant") ? "qmaant" : null);
    const clientesAtivosDigitais = Number(regra?.indicadorId ?? indicador?.id) === 3 ||
      Boolean(params.campoResultadoDocumental || params.campoFonteResultado || params.campoJanelaApuracao);
    const key = competenciaKey(lancamentoAtual);
    const metaCanonica = clientesAtivosDigitais
      ? toNumber(params.metasCanonicasPorCompetencia?.[key])
      : null;
    const meta = requireMeta(metaCanonica ?? metaLancamento(lancamentoAtual) ?? params.metaCrescimento ?? regra.metaAnualValor, regra.unidadeMedida, "Meta de crescimento não configurada.");
    if (meta.erro) return meta;

    if (clientesAtivosDigitais && qmaatuCampo && qmaantCampo) {
      const qmaatuRaw = raw(lancamentoAtual, qmaatuCampo);
      const qmaantRaw = raw(lancamentoAtual, qmaantCampo);
      const possuiQmaatu = qmaatuRaw !== null && qmaatuRaw !== undefined && qmaatuRaw !== "";
      const possuiQmaant = qmaantRaw !== null && qmaantRaw !== undefined && qmaantRaw !== "";
      if (possuiQmaatu !== possuiQmaant) {
        return erro("Informe QMAATU e QMAANT em conjunto ou deixe ambos ausentes.", regra.unidadeMedida);
      }

      const qmaatu = possuiQmaatu ? campo(lancamentoAtual, qmaatuCampo) : null;
      const qmaant = possuiQmaant ? campo(lancamentoAtual, qmaantCampo) : null;
      if (possuiQmaatu && (qmaatu === null || qmaatu <= 0 || !Number.isInteger(qmaatu))) {
        return erro("QMAATU deve ser um número inteiro maior que zero.", regra.unidadeMedida);
      }
      if (possuiQmaant && (qmaant === null || qmaant <= 0)) {
        return erro("QMAANT deve ser maior que zero para cálculo do indicador.", regra.unidadeMedida);
      }
      if (possuiQmaant && !Number.isInteger(qmaant)) {
        return erro("QMAANT deve ser um número inteiro maior que zero.", regra.unidadeMedida);
      }

      const resultadoDocumentalCampo = params.campoResultadoDocumental || "resultadoDocumentalClientesAtivos";
      const atingimentoDocumentalCampo = params.campoPercentualAtingidoOficial || "percentualAtingidoOficialClientesAtivos";
      const fonteCampo = params.campoFonteResultado || "fonteResultadoClientesAtivos";
      const tipoPosicaoCampo = params.campoTipoPosicao || "tipoPosicaoClientesAtivos";
      const janelaCampo = params.campoJanelaApuracao || "janelaApuracaoClientesAtivos";
      const resultadoDocumentalRaw = raw(lancamentoAtual, resultadoDocumentalCampo);
      const atingimentoDocumentalRaw = raw(lancamentoAtual, atingimentoDocumentalCampo);
      const possuiResultadoDocumental = resultadoDocumentalRaw !== null && resultadoDocumentalRaw !== undefined && resultadoDocumentalRaw !== "";
      const possuiAtingimentoDocumental = atingimentoDocumentalRaw !== null && atingimentoDocumentalRaw !== undefined && atingimentoDocumentalRaw !== "";
      // Estes campos já usam a escala decimal canônica do domínio (0.7441 = 74,41%
      // e 2.6573 = 265,73%). Não aplicar a heurística de entrada humana que divide
      // números maiores que 1 por 100, pois ela corromperia atingimentos acima de 100%.
      const resultadoDocumental = possuiResultadoDocumental ? toNumber(resultadoDocumentalRaw) : null;
      const atingimentoDocumental = possuiAtingimentoDocumental ? toNumber(atingimentoDocumentalRaw) : null;
      const fonte = texto(lancamentoAtual, fonteCampo).trim();
      const tipoPosicao = texto(lancamentoAtual, tipoPosicaoCampo).trim();
      const janelaApuracao = texto(lancamentoAtual, janelaCampo).trim();

      if (possuiResultadoDocumental && resultadoDocumental === null) {
        return erro("Resultado documental deve ser numérico e finito.", regra.unidadeMedida);
      }
      if (possuiAtingimentoDocumental && atingimentoDocumental === null) {
        return erro("Atingimento oficial documental deve ser numérico e finito.", regra.unidadeMedida);
      }
      if ((possuiResultadoDocumental || possuiAtingimentoDocumental) && (!fonte || !tipoPosicao)) {
        return erro("Posição documental exige natureza da posição e fonte documental.", regra.unidadeMedida);
      }

      if (!possuiQmaatu && !possuiResultadoDocumental) {
        return pendente("Informe QMAATU/QMAANT ou uma posição documental identificada e com fonte.", regra.unidadeMedida, {
          metaReferencia: meta,
          sentidoMeta: params.sentidoMeta || "quanto_maior_melhor",
          resultadoTecnicoClientesAtivos: null,
          percentualAtingidoTecnicoClientesAtivos: null,
          resultadoDocumentalClientesAtivos: null,
          percentualAtingidoOficialClientesAtivos: null,
          origemResultadoClientesAtivos: "sem_dados"
        });
      }

      const crescimento = possuiQmaatu ? qmaatu / qmaant - 1 : null;
      const atingimentoTecnico = crescimento === null ? null : crescimento / meta;
      const resultadoOficial = resultadoDocumental !== null ? resultadoDocumental : crescimento;
      const atingimentoOficial = atingimentoDocumental !== null
        ? atingimentoDocumental
        : (resultadoOficial === null ? null : resultadoOficial / meta);
      const origem = crescimento !== null
        ? (resultadoDocumental !== null ? "componentes_e_documento" : "componentes")
        : "documental_direta";
      const situacao = atingimentoOficial === null ? null : (atingimentoOficial >= 1 ? "Atingido" : "Abaixo da meta");

      return ok(crescimento, resultadoOficial, atingimentoTecnico, atingimentoOficial, regra.unidadeMedida,
        crescimento === null
          ? "Posição documental utilizada sem criação de componentes inexistentes."
          : "Crescimento entre QMAATU e QMAANT calculado com precisão integral.", {
          metaReferencia: meta,
          sentidoMeta: params.sentidoMeta || "quanto_maior_melhor",
          resultadoTecnicoClientesAtivos: crescimento,
          percentualAtingidoTecnicoClientesAtivos: atingimentoTecnico,
          resultadoDocumentalClientesAtivos: resultadoDocumental,
          percentualAtingidoOficialClientesAtivos: atingimentoDocumental,
          fonteResultadoClientesAtivos: fonte || null,
          tipoPosicaoClientesAtivos: tipoPosicao || null,
          janelaApuracaoClientesAtivos: janelaApuracao || null,
          origemResultadoClientesAtivos: origem,
          situacao
        });
    }

    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);

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
    const meta = requireMeta(metaLancamento(lancamentoAtual) ?? regra.parametrosCalculo?.metaExecucao ?? regra.metaAnualValor, regra.unidadeMedida, "Meta de execução não configurada.");
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
    const meta = requireMeta(metaLancamento(lancamentoAtual) ?? regra.metaAnualValor, regra.unidadeMedida, "Meta financeira anual não configurada.");
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
    const params = regra.parametrosCalculo || {};
    const campoAcumuladoDocumental = params.campoGgrAcumuladoDocumental || "ggrAcumuladoOficial";
    const ggrAcumuladoDocumental = campo(lancamentoAtual, campoAcumuladoDocumental);
    const metaAcumulada = getMetaAcumuladaCompetencia(regra, lancamentoAtual);
    const tipoPosicaoGGR = resolverTipoPosicaoGgr(lancamentoAtual, regra);

    if (ggrAcumuladoDocumental !== null) {
      if (ggrAcumuladoDocumental < 0) {
        return erro("A posição acumulada documental do GGR não pode ser negativa.", regra.unidadeMedida);
      }
      if (metaAcumulada === null || metaAcumulada <= 0) {
        return pendente("Meta de referência não cadastrada para a competência. Pendente de curva orçamentária.", regra.unidadeMedida, {
          resultadoAcumulado: ggrAcumuladoDocumental,
          resultadoAcumuladoFormatado: formatarValor(ggrAcumuladoDocumental, regra.unidadeMedida),
          resultadoOficialAnual: ggrAcumuladoDocumental,
          resultadoOficialAnualFormatado: formatarValor(ggrAcumuladoDocumental, regra.unidadeMedida),
          metaPendente: true,
          metaReferenciaMensagem: "Pendente de curva orçamentária",
          ggrCalculadoMes: null,
          ggrAcumuladoAteCompetencia: ggrAcumuladoDocumental,
          ggrAcumuladoDocumental: true,
          tipoPosicaoGGR
        });
      }

      const percentual = ggrAcumuladoDocumental / metaAcumulada;
      const acompanhamento = tipoPosicaoGGR === TIPO_POSICAO_GGR.ACOMPANHAMENTO;
      return ok(
        ggrAcumuladoDocumental,
        ggrAcumuladoDocumental,
        percentual,
        percentual,
        regra.unidadeMedida,
        acompanhamento
          ? "Posição acumulada documental de acompanhamento comparada com a curva da competência."
          : "Posição acumulada documental do fechamento trimestral comparada com a meta oficial.",
        {
          resultadoOficialAnual: ggrAcumuladoDocumental,
          percentualAtingidoAnual: percentual,
          metaReferenciaMensal: metaAcumulada,
          metaAcumulada,
          realizadoAcumulado: ggrAcumuladoDocumental,
          ggrCalculadoMes: null,
          ggrAcumuladoAteCompetencia: ggrAcumuladoDocumental,
          ggrAcumuladoDocumental: true,
          tipoPosicaoGGR,
          percentualMetaAcumulada: percentual,
          situacao: acompanhamento ? "Em acompanhamento" : situacaoPorPercentual(percentual)
        }
      );
    }

    const arrecadacao = campo(lancamentoAtual, params.campoArrecadacao || "arrecadacaoTotalMes");
    const premios = campo(lancamentoAtual, params.campoPremios || "premiosAPagarMes");
    if (arrecadacao === null || premios === null) return pendente("Dados insuficientes para cálculo.", regra.unidadeMedida);
    if (arrecadacao < 0 || premios < 0) return erro("Arrecadação total e prêmios a pagar não podem ser negativos.", regra.unidadeMedida);

    const ggrMes = arrecadacao - premios;
    const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
    const ggrAcumulado = ateMes.reduce((sum, item) => {
      const itemArrecadacao = campo(item, params.campoArrecadacao || "arrecadacaoTotalMes");
      const itemPremios = campo(item, params.campoPremios || "premiosAPagarMes");
      return itemArrecadacao === null || itemPremios === null ? sum : sum + itemArrecadacao - itemPremios;
    }, 0);

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
      ggrAcumuladoDocumental: false,
      tipoPosicaoGGR,
      percentualMetaAcumulada: percentual,
      situacao: situacaoPorPercentual(percentual)
    });
  }

  function calcularIndiceInversoAjustado(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const meta = requireMeta(lancamentoAtual.metaReferencia ?? lancamentoAtual.metaMensal ?? regra.parametrosCalculo?.metaReferencia ?? regra.metaAnualValor, regra.unidadeMedida);
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
    return resultado === 0 ? null : meta / resultado;
  }

  function getLucroRecorrenteMetaMensal(regra, lancamento) {
    const configured = toNumber(lancamento?.metaReferencia ?? lancamento?.metaMensal);
    if (configured !== null) return configured;
    const curve = regra?.parametrosCalculo?.metasMensaisPorCompetencia || {};
    const key = competenciaKey(lancamento);
    if (Object.prototype.hasOwnProperty.call(curve, key)) return toNumber(curve[key]);
    return toNumber(lancamento?.metaMensal ?? lancamento?.metaReferencia);
  }

  function getLucroRecorrenteMensal(regra, lancamento, lancamentosDoAno) {
    const monthlyField = regra?.parametrosCalculo?.campoValorMensal || "lucroLiquidoRecorrenteCompetencia";
    const legacyField = regra?.parametrosCalculo?.campoValorAcumuladoLegado || "lucroLiquidoRecorrenteAcumulado";
    const monthlyValue = campo(lancamento, monthlyField);
    if (monthlyValue !== null) return monthlyValue;

    const legacyAccumulated = campo(lancamento, legacyField);
    if (legacyAccumulated === null) return null;
    const month = Number(lancamento?.mes);
    const year = Number(lancamento?.ano);
    if (month === 1) return Math.round(legacyAccumulated * 100) / 100;

    const previous = (lancamentosDoAno || []).find((item) => (
      Number(item?.ano) === year && Number(item?.mes) === month - 1
    ));
    const previousAccumulated = previous ? campo(previous, legacyField) : null;
    return previousAccumulated === null
      ? null
      : (Math.round(legacyAccumulated * 100) - Math.round(previousAccumulated * 100)) / 100;
  }

  function calcularLucroRecorrenteMensal(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const resultadoMensal = getLucroRecorrenteMensal(regra, lancamentoAtual, lancamentosDoAno);
    if (resultadoMensal === null) {
      return erro(
        "Informe o lucro líquido recorrente da competência. O valor legado acumulado só pode ser convertido quando a competência anterior estiver disponível.",
        regra.unidadeMedida
      );
    }
    if (resultadoMensal < 0) return erro("Lucro líquido recorrente da competência não pode ser negativo.", regra.unidadeMedida);

    const metaMensal = getLucroRecorrenteMetaMensal(regra, lancamentoAtual);
    if (metaMensal === null || metaMensal <= 0) {
      return erro("Meta mensal do lucro recorrente não configurada para a competência.", regra.unidadeMedida);
    }

    const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
    const resultadosMensais = ateMes
      .map((item) => getLucroRecorrenteMensal(regra, item, lancamentosDoAno))
      .filter((value) => value !== null && value >= 0);
    const resultadoAcumulado = resultadosMensais.reduce((sum, value) => sum + Math.round(value * 100), 0) / 100;
    const metaAcumulada = ateMes.reduce((sum, item) => {
      const parsed = getLucroRecorrenteMetaMensal(regra, item);
      return parsed === null ? sum : sum + Math.round(parsed * 100);
    }, 0) / 100;
    const percentualMensal = resultadoMensal / metaMensal;
    const percentualAcumulado = metaAcumulada > 0 ? resultadoAcumulado / metaAcumulada : null;
    const situacaoMensal = percentualMensal >= 1 ? "Atingido" : "Abaixo da meta";

    return ok(
      resultadoMensal,
      resultadoAcumulado,
      percentualMensal,
      percentualAcumulado,
      regra.unidadeMedida,
      "Lucro líquido recorrente da competência comparado com a meta mensal oficial.",
      {
        metaReferenciaMensal: metaMensal,
        metaAcumulada,
        realizadoAcumulado: resultadoAcumulado,
        percentualMetaMensal: percentualMensal,
        percentualMetaAcumulada: percentualAcumulado,
        resultadoOficialAnual: resultadoMensal,
        percentualAtingidoAnual: percentualMensal,
        situacaoMensal,
        situacao: situacaoMensal
      }
    );
  }

  function getMetaReferenciaInversa(regra, lancamentoAtual) {
    const metaOficialIeo = Number(regra?.indicadorId) === 6
      ? root.IeoRecorrente?.getMetaCompetencia(lancamentoAtual, regra)
      : null;
    if (metaOficialIeo !== null && metaOficialIeo !== undefined) return metaOficialIeo;
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
        origemResultado
      });
    }
    const percentual = desempenhoIndicadorInverso(resultado, meta);
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
      origemResultado
    });
  }

  function calcularIncrementoPontosPercentuais(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const base = toNumber(regra.parametrosCalculo?.participacaoBase);
    const metaIncremento = requireMeta(metaLancamento(lancamentoAtual) ?? regra.parametrosCalculo?.metaIncremento ?? regra.metaAnualValor, regra.unidadeMedida, "Meta de incremento em p.p. não configurada.");
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
    const params = regra.parametrosCalculo || {};
    const numeratorField = params.campoNumerador || "arrecadacaoCanaisEletronicosMes";
    const denominatorField = params.campoDenominador || "arrecadacaoTotalProdutosLoteriasMes";
    const documentedResultField = params.campoResultadoAcumuladoDocumental || "resultadoAcumuladoDocumentalCanaisDigitais";
    const documentedPerformanceField = params.campoPercentualAtingidoOficial || "percentualAtingidoOficialCanaisDigitais";
    const monthlyNumerator = currency.parseMoedaBR(raw(lancamentoAtual, numeratorField));
    const monthlyDenominator = currency.parseMoedaBR(raw(lancamentoAtual, denominatorField));
    const documentedResult = toNumber(raw(lancamentoAtual, documentedResultField));
    const documentedPerformance = toNumber(raw(lancamentoAtual, documentedPerformanceField));
    const key = competenciaKey(lancamentoAtual);
    const targets = params.metasPorCompetencia || params.metasMensaisPorCompetencia || params.metasOficiaisPorCompetencia || {};
    const target = toNumber(targets[key]) ??
      toNumber(lancamentoAtual.metaReferencia ?? lancamentoAtual.metaMensal) ??
      toNumber(params.metaReferencia ?? regra.metaAnualValor) ??
      0.2805;

    if (target <= 0) return erro("Meta da competencia deve ser maior que zero.", regra.unidadeMedida);

    const missingMonthlyComponents = monthlyNumerator === null || monthlyDenominator === null;
    if (missingMonthlyComponents && documentedResult !== null) {
      if (documentedResult < 0 || documentedResult > 1) {
        return erro("Resultado acumulado documental deve estar na escala decimal entre zero e um.", regra.unidadeMedida);
      }
      if (documentedPerformance !== null && documentedPerformance < 0) {
        return erro("Atingimento oficial documental nao pode ser negativo.", regra.unidadeMedida);
      }
      const officialPerformance = documentedPerformance ?? documentedResult / target;
      return ok(
        null,
        documentedResult,
        null,
        officialPerformance,
        regra.unidadeMedida,
        "Posicao acumulada documental utilizada sem criacao de componentes inexistentes.",
        {
          resultadoCalculadoAcumulado: null,
          resultadoAcumuladoDocumental: documentedResult,
          percentualAtingidoOficialDocumental: officialPerformance,
          metaReferencia: target,
          origemResultadoCanaisDigitais: "documental_direta",
          situacao: officialPerformance >= 1 ? "Atingido" : "Abaixo da meta"
        }
      );
    }

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
    const calculatedAccumulatedResult = accumulatedNumerator / accumulatedDenominator;
    const accumulatedResult = documentedResult ?? calculatedAccumulatedResult;
    const accumulatedPerformance = documentedPerformance ?? accumulatedResult / target;
    return ok(
      monthlyResult,
      accumulatedResult,
      monthlyResult / target,
      accumulatedPerformance,
      regra.unidadeMedida,
      "Participação dos canais digitais calculada pela razão acumulada entre as arrecadações.",
      {
        canaisEletronicosAcumulado: accumulatedNumerator,
        produtosLoteriasAcumulado: accumulatedDenominator,
        resultadoCalculado: calculatedAccumulatedResult,
        resultadoCalculadoAcumulado: calculatedAccumulatedResult,
        resultadoAcumuladoDocumental: documentedResult,
        percentualAtingidoOficialDocumental: documentedPerformance,
        metaReferencia: target,
        origemResultadoCanaisDigitais: documentedResult === null ? "componentes_mensais" : "documental_com_componentes",
        situacao: accumulatedPerformance >= 1
          ? "Atingido"
          : "Abaixo da meta"
      }
    );
  }

  function calcularRazaoPix(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const params = regra.parametrosCalculo || {};
    const accumulatedPixField = params.campoNumeradorAcumulado || "arrecadacaoPixAcumuladaCompetencia";
    const accumulatedTotalField = params.campoDenominadorAcumulado || "arrecadacaoTotalCanaisEletronicosAcumuladaCompetencia";
    const legacyPixField = params.campoNumeradorMensalLegado || params.campoNumerador || "arrecadacaoPixMes";
    const legacyTotalField = params.campoDenominadorMensalLegado || params.campoDenominador || "arrecadacaoTotalCanaisEletronicosMes";
    const hasAccumulatedPosition = raw(lancamentoAtual, accumulatedPixField) !== undefined ||
      raw(lancamentoAtual, accumulatedTotalField) !== undefined;
    const pixField = hasAccumulatedPosition ? accumulatedPixField : legacyPixField;
    const totalField = hasAccumulatedPosition ? accumulatedTotalField : legacyTotalField;
    const pixCurrent = currency.parseMoedaBR(raw(lancamentoAtual, pixField));
    const totalCurrent = currency.parseMoedaBR(raw(lancamentoAtual, totalField));
    const pixApproximate = currency.parseMoedaBR(raw(lancamentoAtual, "arrecadacaoPixAcumuladaCompetenciaAproximada"));
    const annualTarget = toNumber(lancamentoAtual.metaReferencia ?? lancamentoAtual.metaMensal ?? regra.metaAnualValor) || 0.65;
    const officialResult = normalizarPercentual(raw(lancamentoAtual, params.campoResultadoOficial || "resultadoOficialPix"));
    const officialPerformanceRaw = raw(lancamentoAtual, params.campoPercentualAtingidoOficial || "percentualAtingidoOficialPix");
    const officialPerformanceNumber = toNumber(officialPerformanceRaw);
    const officialPerformance = officialPerformanceNumber !== null
      ? (officialPerformanceNumber > 10 ? officialPerformanceNumber / 100 : officialPerformanceNumber)
      : normalizarPercentual(officialPerformanceRaw);
    const closingMonths = Array.isArray(params.mesesFechamentoTrimestral) ? params.mesesFechamentoTrimestral : [3, 6, 9, 12];
    const isOfficialClosing = closingMonths.includes(Number(lancamentoAtual.mes));
    const officialSituation = isOfficialClosing
      ? situacaoPorPercentual(officialPerformance ?? (officialResult !== null && annualTarget ? officialResult / annualTarget : null))
      : "Em acompanhamento";
    const officialOnlyResult = (message) => pendente(message, regra.unidadeMedida, {
      pixAcumulado: pixCurrent ?? pixApproximate,
      canaisEletronicosAcumulado: totalCurrent,
      resultadoCalculado: null,
      resultadoOficialAnual: officialResult,
      resultadoOficialAnualFormatado: formatarValor(officialResult, regra.unidadeMedida),
      percentualAtingidoAnual: officialPerformance,
      percentualAtingidoAnualFormatado: formatarPercentual(officialPerformance),
      resultadoOficialDocumental: officialResult,
      percentualAtingidoOficialDocumental: officialPerformance,
      metaReferencia: annualTarget,
      situacao: officialSituation,
      origemPosicaoPix: "documental_sem_componentes_tecnicos_exatos",
      excluiInternetBankingCaixa: params.excluirInternetBankingCaixa === true
    });
    if (pixCurrent === null || pixCurrent < 0) {
      if (pixCurrent === null && (officialResult !== null || officialPerformance !== null)) {
        return officialOnlyResult("Resultado oficial preservado; componentes exatos insuficientes para o cálculo técnico.");
      }
      return erro(
        hasAccumulatedPosition
          ? "A arrecadação acumulada com PIX deve ser informada e não pode ser negativa."
          : "Arrecadação com PIX no mês deve ser informada e não pode ser negativa.",
        regra.unidadeMedida
      );
    }
    if (totalCurrent === null || totalCurrent === 0) {
      if (officialResult !== null || officialPerformance !== null) {
        return officialOnlyResult("Resultado oficial preservado; informe o denominador exato para habilitar o cálculo técnico.");
      }
      return pendente(
        hasAccumulatedPosition
          ? "Informe a posição acumulada exata dos canais eletrônicos para calcular o resultado técnico."
          : "Informe a arrecadação total nos canais eletrônicos para calcular o resultado percentual.",
        regra.unidadeMedida,
        {
          pixAcumulado: hasAccumulatedPosition ? pixCurrent : null,
          origemPosicaoPix: hasAccumulatedPosition ? "acumulada" : "mensal_legada"
        }
      );
    }
    if (totalCurrent < 0) {
      return erro("Arrecadação total nos canais eletrônicos não pode ser negativa.", regra.unidadeMedida);
    }
    if (pixCurrent > totalCurrent) {
      return erro("Arrecadação com PIX não pode ser maior que a arrecadação total nos canais eletrônicos.", regra.unidadeMedida);
    }

    const launches = hasAccumulatedPosition ? [] : lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
    const pixAccumulated = hasAccumulatedPosition
      ? pixCurrent
      : Math.round(launches.reduce((sum, launch) => sum + (currency.parseMoedaBR(raw(launch, pixField)) || 0), 0) * 100) / 100;
    const totalAccumulated = hasAccumulatedPosition
      ? totalCurrent
      : Math.round(launches.reduce((sum, launch) => sum + (currency.parseMoedaBR(raw(launch, totalField)) || 0), 0) * 100) / 100;
    if (totalAccumulated <= 0) {
      return pendente("Ainda não há denominador acumulado para o cálculo do indicador PIX.", regra.unidadeMedida);
    }
    const monthlyResult = pixCurrent / totalCurrent;
    const accumulatedResult = pixAccumulated / totalAccumulated;
    const performanceForSituation = officialPerformance ?? (accumulatedResult / annualTarget);
    return ok(
      monthlyResult,
      accumulatedResult,
      monthlyResult / annualTarget,
      accumulatedResult / annualTarget,
      regra.unidadeMedida,
      hasAccumulatedPosition
        ? "Resultado técnico calculado diretamente sobre a posição acumulada da competência, sem nova soma."
        : "Participação das vendas com PIX calculada pela soma dos fluxos mensais legados.",
      {
        pixAcumulado: pixAccumulated,
        canaisEletronicosAcumulado: totalAccumulated,
        resultadoCalculado: accumulatedResult,
        resultadoOficialAnual: officialResult ?? accumulatedResult,
        percentualAtingidoAnual: officialPerformance ?? (accumulatedResult / annualTarget),
        resultadoOficialDocumental: officialResult,
        percentualAtingidoOficialDocumental: officialPerformance,
        metaReferencia: annualTarget,
        situacao: isOfficialClosing ? situacaoPorPercentual(performanceForSituation) : "Em acompanhamento",
        origemPosicaoPix: hasAccumulatedPosition ? "acumulada" : "mensal_legada",
        excluiInternetBankingCaixa: params.excluirInternetBankingCaixa === true
      }
    );
  }

  function calcularProjetoMarcoEntrega(indicador, regra, lancamentoAtual) {
    const params = regra.parametrosCalculo || {};
    const mesAtual = Number(lancamentoAtual.mes);
    const mesesFechamento = params.mesesFechamentoTrimestral;
    if (
      params.metaTipo === "curva_trimestral_percentual" &&
      Array.isArray(mesesFechamento) &&
      !mesesFechamento.includes(mesAtual)
    ) {
      const statusAcompanhamento = texto(lancamentoAtual, params.campoStatus || "statusProjeto");
      const marcos = params.marcosCapacidadeTIC || params.marcosProjeto || [];
      const marcoConfigurado = marcos.find((item) => item.label === statusAcompanhamento);
      const percentualAcompanhamento = marcoConfigurado
        ? toNumber(marcoConfigurado.percentual)
        : clamp01(campo(lancamentoAtual, params.campoPercentual || "percentualExecucao"));
      const trimestre = lancamentoAtual.trimestre || `${Math.ceil(mesAtual / 3)}TRI/${lancamentoAtual.ano || 2026}`;
      const metaTrimestral = toNumber(params.curvaTrimestralPercentual?.[trimestre]?.metaPercentual);
      return ok(null, null, null, null, regra.unidadeMedida, "Acompanhamento do projeto registrado sem avaliação oficial mensal.", {
        marcoAlcancado: statusAcompanhamento,
        marcoEsperadoTrimestre: params.curvaTrimestralPercentual?.[trimestre]?.marcoEsperado || null,
        metaTrimestral,
        metaReferenciaTrimestre: metaTrimestral,
        metaOficialCompetencia: null,
        percentualAcompanhamentoTIC: percentualAcompanhamento,
        tipoPosicaoTIC: "acompanhamento",
        situacao: "Em acompanhamento",
        desempenhoNaoAplicavel: true
      });
    }
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const statusOriginal = texto(lancamentoAtual, params.campoStatus || "statusProjeto");
    const status = statusOriginal.toLowerCase();
    if (params.metaTipo === "meta_oficial_trimestral_projeto") {
      const campoMarco = params.campoMarco || "marcoAtualProjeto";
      const campoPercentualOficial = params.campoPercentual || "percentualEvolucaoProjeto";
      const marcoAtual = texto(lancamentoAtual, campoMarco);
      const trimestre = lancamentoAtual.trimestre || `${Math.ceil(Number(lancamentoAtual.mes) / 3)}TRI/${lancamentoAtual.ano || 2026}`;
      const metas = params.metasTrimestraisOficiais || {};
      const metaConfigurada = toNumber(lancamentoAtual.metaReferencia ?? lancamentoAtual.metaMensal);
      const metaTrimestral = metaConfigurada !== null
        ? metaConfigurada
        : Object.prototype.hasOwnProperty.call(metas, trimestre)
          ? toNumber(metas[trimestre])
          : null;
      const valorInformado = raw(lancamentoAtual, campoPercentualOficial);
      const possuiPercentualOficial = valorInformado !== null && valorInformado !== undefined && valorInformado !== "";
      const detalhes = {
        marcoAtual,
        statusProjeto: statusOriginal,
        metaTrimestral,
        metaTrimestralUnidadeMedida: "percentual",
        metaAnualMarco: params.metaAnualMarco || regra.metaAnualDescricao || "Piloto/MVP",
        percentualEvolucaoProjeto: null,
        situacao: "Em acompanhamento"
      };

      if (!possuiPercentualOficial) {
        return pendente(
          "Acompanhamento qualitativo registrado sem percentual oficial de evolução do projeto.",
          "percentual",
          { ...detalhes, desempenhoNaoAplicavel: true }
        );
      }

      const percentualOficial = normalizarPercentual(valorInformado);
      if (percentualOficial === null || percentualOficial < 0 || percentualOficial > 1) {
        return erro("Percentual oficial de evolução do projeto deve estar entre 0% e 100%.", "percentual");
      }

      const percentualAtingido = metaTrimestral !== null && metaTrimestral > 0
        ? percentualOficial / metaTrimestral
        : null;
      const situacao = metaTrimestral === null
        ? "Em acompanhamento"
        : percentualOficial >= metaTrimestral
          ? "Atingido"
          : "Abaixo da meta";
      return ok(
        percentualOficial,
        percentualOficial,
        percentualAtingido,
        percentualAtingido,
        "percentual",
        "Evolução oficial do projeto registrada com sucesso.",
        {
          ...detalhes,
          percentualEvolucaoProjeto: percentualOficial,
          situacao,
          desempenhoNaoAplicavel: metaTrimestral === null,
          resultadoMensalFormatado: formatarPercentual(percentualOficial, 2),
          resultadoAcumuladoFormatado: formatarPercentual(percentualOficial, 2),
          resultadoOficialAnualFormatado: formatarPercentual(percentualOficial, 2),
          percentualAtingidoMensalFormatado: formatarPercentual(percentualAtingido, 2),
          percentualAtingidoAcumuladoFormatado: formatarPercentual(percentualAtingido, 2),
          percentualAtingidoAnualFormatado: formatarPercentual(percentualAtingido, 2)
        }
      );
    }
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
    const trimestre = lancamentoAtual.trimestre || `${Math.ceil(Number(lancamentoAtual.mes) / 3)}TRI/${lancamentoAtual.ano || 2026}`;
    const curva = regra.parametrosCalculo?.curvaTrimestralPercentual || {};
    const metaConfigurada = toNumber(lancamentoAtual.metaReferencia ?? lancamentoAtual.metaMensal);
    const metaTrimestral = metaConfigurada !== null
      ? metaConfigurada
      : regra.parametrosCalculo?.metaTipo === "curva_trimestral_percentual"
        ? toNumber(curva[trimestre]?.metaPercentual)
        : null;
    const fechamentoTrimestral = !Array.isArray(mesesFechamento) || mesesFechamento.includes(mesAtual);
    if (!fechamentoTrimestral) {
      return ok(null, null, null, null, regra.unidadeMedida, "Acompanhamento do projeto registrado sem avaliação oficial mensal.", {
        marcoAlcancado: statusOriginal,
        marcoEsperadoTrimestre: curva[trimestre]?.marcoEsperado || null,
        metaTrimestral,
        metaReferenciaTrimestre: metaTrimestral,
        metaOficialCompetencia: null,
        percentualAcompanhamentoTIC: percentual,
        tipoPosicaoTIC: "acompanhamento",
        situacao: "Em acompanhamento",
        desempenhoNaoAplicavel: true
      });
    }
    if (percentual === null) return erro("Percentual de execução deve ser informado.", regra.unidadeMedida);
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
      metaReferenciaTrimestre: metaTrimestral,
      metaOficialCompetencia: metaTrimestral,
      tipoPosicaoTIC: "fechamento_trimestral",
      situacao
    });
  }
  function calcularPontuacaoMinima(indicador, regra, lancamentoAtual) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const valor = campo(lancamentoAtual, regra.parametrosCalculo?.campoValor || "mediaGeralGPTW");
    const meta = requireMeta(
      toNumber(lancamentoAtual.metaReferencia ?? lancamentoAtual.metaMensal) ||
        toNumber(regra.parametrosCalculo?.metaReferencia) ||
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
    const key = competenciaKey(lancamentoAtual);
    const referencias = params.referenciasPorCompetencia || {};
    const ano = Number(lancamentoAtual?.ano || String(key).slice(0, 4));
    const mes = Number(lancamentoAtual?.mes || String(key).slice(5, 7));
    const referenciaVigente2026 = ano === 2026 && mes >= 1 && mes <= 12
      ? mes <= 3 ? 55 : mes <= 5 ? 58 : 60
      : null;
    const metaReferenciaInformada = campo(lancamentoAtual, params.campoMetaReferencia || "metaReferenciaCompetenciaNPS");
    const metaNormalizadaSemOverwrite = toNumber(lancamentoAtual.metaTecnicaNps);
    const metaConfigurada = toNumber(lancamentoAtual.metaReferencia ?? lancamentoAtual.metaMensal);
    const metaReferenciaPeriodo = Object.prototype.hasOwnProperty.call(referencias, key)
      ? toNumber(referencias[key])
      : referenciaVigente2026 !== null
      ? referenciaVigente2026
      : metaReferenciaInformada !== null
      ? metaReferenciaInformada
      : metaNormalizadaSemOverwrite !== null
      ? metaNormalizadaSemOverwrite
      : metaConfigurada !== null
      ? metaConfigurada
      : toNumber(params.metaVigenteNPS2026 ?? params.metaAnualMetodologica ?? regra.metaAnualValor);
    const tipoPosicao = texto(lancamentoAtual, params.campoTipoPosicao || "tipoPosicaoNPS");
    const metaVigente = ano === 2026
      ? 60
      : toNumber(params.metaVigenteNPS2026 ?? params.metaAnualMetodologica ?? regra.metaAnualValor);
    if (tipoPosicao.startsWith("Acompanhamento") || tipoPosicao === "Revisão metodológica") {
      return pendente("Acompanhamento registrado sem nova pesquisa NPS.", regra.unidadeMedida, {
        statusCalculo: "acompanhamento",
        metaReferenciaPeriodo,
        metaAnualCorretaNPS: metaVigente,
        metaVigenteNPS2026: metaVigente,
        tipoPosicaoNPS: tipoPosicao,
        baselineNPS: toNumber(params.baselineNPS),
        notaReferenciaNPS: toNumber(params.notaReferenciaNPS),
        situacao: "Em acompanhamento"
      });
    }
    if (metaReferenciaPeriodo === null || metaReferenciaPeriodo <= 0) {
      return erro("Meta de referência do NPS não configurada para posição avaliativa.", regra.unidadeMedida);
    }
    const campoNps = params.campoNps || "npsApurado";
    const campoPromotores = params.campoPromotores || "percentualPromotores";
    const campoDetratores = params.campoDetratores || "percentualDetratores";
    const campoResultadoDocumental = params.campoResultadoDocumental || "resultadoDocumentalNPS";
    const campoMetaDocumental = params.campoMetaDocumental || "metaDocumentalNPS";
    const campoAtingimentoDocumental = params.campoPercentualAtingidoOficial || "percentualAtingidoOficialNPS";
    const promotoresInformados = raw(lancamentoAtual, campoPromotores);
    const detratoresInformados = raw(lancamentoAtual, campoDetratores);
    const possuiPromotores = promotoresInformados !== null && promotoresInformados !== undefined && promotoresInformados !== "";
    const possuiDetratores = detratoresInformados !== null && detratoresInformados !== undefined && detratoresInformados !== "";
    let promotores = null;
    let detratores = null;
    let npsRealizado = null;
    let origemNps = "legado";

    if (possuiPromotores || possuiDetratores) {
      if (!possuiPromotores) {
        return pendente("NPS aguardando percentual de promotores.", regra.unidadeMedida, { metaReferenciaPeriodo });
      }
      if (!possuiDetratores) {
        return pendente("NPS aguardando percentual de detratores.", regra.unidadeMedida, { metaReferenciaPeriodo });
      }
      promotores = normalizarPercentual(promotoresInformados);
      detratores = normalizarPercentual(detratoresInformados);
      if (promotores === null || promotores < 0 || promotores > 1) {
        return erro("Percentual de promotores deve estar entre 0% e 100%.", regra.unidadeMedida);
      }
      if (detratores === null || detratores < 0 || detratores > 1) {
        return erro("Percentual de detratores deve estar entre 0% e 100%.", regra.unidadeMedida);
      }
      if (promotores + detratores > 1 + Number.EPSILON) {
        return erro("A soma dos percentuais de promotores e detratores não pode superar 100%.", regra.unidadeMedida);
      }
      npsRealizado = (promotores - detratores) * 100;
      origemNps = "componentes_formula";
    } else {
      npsRealizado = campo(lancamentoAtual, campoNps);
    }
    const resultadoDocumental = campo(lancamentoAtual, campoResultadoDocumental);
    const metaDocumental = campo(lancamentoAtual, campoMetaDocumental);
    const atingimentoDocumental = normalizarPercentual(raw(lancamentoAtual, campoAtingimentoDocumental));
    if (npsRealizado === null && resultadoDocumental !== null) {
      npsRealizado = resultadoDocumental;
      origemNps = tipoPosicao === "ultima_pesquisa_disponivel"
        ? "ultima_pesquisa_documental"
        : "documental_direta";
    }
    if (npsRealizado === null) {
      return pendente("Informe os percentuais de promotores e detratores para calcular o NPS.", regra.unidadeMedida);
    }
    if (npsRealizado < -100 || npsRealizado > 100) {
      return erro("NPS deve estar entre -100 e 100 pontos.", regra.unidadeMedida);
    }
    if (resultadoDocumental !== null && (resultadoDocumental < -100 || resultadoDocumental > 100)) {
      return erro("Resultado documental do NPS deve estar entre -100 e 100 pontos.", regra.unidadeMedida);
    }
    if (metaDocumental !== null && metaDocumental <= 0) {
      return erro("Meta documental do NPS deve ser maior que zero.", regra.unidadeMedida);
    }
    if (atingimentoDocumental !== null && atingimentoDocumental < 0) {
      return erro("Atingimento documental do NPS não pode ser negativo.", regra.unidadeMedida);
    }

    const sampleFields = [
      "totalRespondentesNPS",
      "quantidadePromotoresNPS",
      "quantidadeNeutrosNPS",
      "quantidadeDetratoresNPS"
    ];
    const sampleRaw = sampleFields.map((name) => raw(lancamentoAtual, name));
    const sampleProvided = sampleRaw.filter((value) => value !== null && value !== undefined && value !== "").length;
    const sampleValues = sampleRaw.map(toNumber);
    if (sampleProvided > 0) {
      if (sampleProvided !== sampleFields.length || sampleValues.some((value) => value === null || value < 0 || !Number.isInteger(value))) {
        return erro("Informe a amostra NPS completa com quantidades inteiras não negativas.", regra.unidadeMedida);
      }
      if (sampleValues[0] !== sampleValues[1] + sampleValues[2] + sampleValues[3]) {
        return erro("Total de respondentes diverge da soma de promotores, neutros e detratores.", regra.unidadeMedida);
      }
    }

    const metaAnual = metaVigente;
    const isFechamentoAnual = tipoPosicao === "Fechamento anual";
    const referenciaSituacao = isFechamentoAnual && metaAnual ? metaAnual : metaReferenciaPeriodo;
    const percentualAtingido = npsRealizado / metaReferenciaPeriodo;
    const resultadoOficial = resultadoDocumental ?? npsRealizado;
    const metaOficial = metaDocumental ?? referenciaSituacao;
    const percentualOficial = atingimentoDocumental ?? (resultadoOficial / metaOficial);
    const percentualAnual = isFechamentoAnual && metaAnual ? resultadoOficial / metaAnual : percentualOficial;
    const situacaoTecnica = npsRealizado >= referenciaSituacao ? "Atingido" : "Abaixo da meta";
    const situacaoDocumental = percentualOficial >= 1 ? "Atingido" : "Abaixo da meta";
    return ok(npsRealizado, resultadoOficial, percentualAtingido, percentualOficial, regra.unidadeMedida, origemNps === "ultima_pesquisa_documental"
      ? "Última pesquisa documental disponível utilizada sem inventar novos componentes."
      : "NPS calculado por posição de pesquisa.", {
      npsRealizado,
      npsCalculado: npsRealizado,
      origemNps,
      percentualPromotores: promotores,
      percentualDetratores: detratores,
      metaReferenciaPeriodo,
      metaTecnicaNPS: metaReferenciaPeriodo,
      resultadoTecnicoNPS: npsRealizado,
      percentualAtingidoTecnicoNPS: percentualAtingido,
      resultadoDocumentalNPS: resultadoDocumental,
      metaDocumentalNPS: metaDocumental,
      percentualAtingidoOficialNPS: atingimentoDocumental,
      resultadoOficialNPS: resultadoOficial,
      metaOficialNPS: metaOficial,
      percentualOficialNPS: percentualOficial,
      situacaoTecnicaNPS: situacaoTecnica,
      situacaoDocumentalNPS: situacaoDocumental,
      fontePesquisaNPS: texto(lancamentoAtual, params.campoFonte || "fontePesquisaNPS") || null,
      totalRespondentesNPS: sampleValues[0],
      quantidadePromotoresNPS: sampleValues[1],
      quantidadeNeutrosNPS: sampleValues[2],
      quantidadeDetratoresNPS: sampleValues[3],
      metaAnualCorretaNPS: metaAnual,
      metaVigenteNPS2026: metaVigente,
      desempenhoReferencia: percentualAtingido,
      tipoPosicaoNPS: tipoPosicao,
      baselineNPS: toNumber(params.baselineNPS),
      notaReferenciaNPS: toNumber(params.notaReferenciaNPS),
      percentualReducaoGap: toNumber(params.percentualReducaoGap),
      situacao: situacaoDocumental,
      ...(isFechamentoAnual ? { percentualAtingidoAnual: percentualAnual } : {})
    });
  }

  function isMedicaoOficialPesquisaAnual(regra, lancamento) {
    if (regra?.tipoCalculo !== "nota_pesquisa_anual") return false;
    const campoTipoPosicao = regra.parametrosCalculo?.campoTipoPosicao || "tipoPosicaoClima";
    const tipoPosicao = texto(lancamento || {}, campoTipoPosicao);
    return ["Pesquisa oficial", "Fechamento anual"].includes(tipoPosicao);
  }

  function calcularNotaPesquisaAnual(indicador, regra, lancamentoAtual) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const params = regra.parametrosCalculo || {};
    const campoNota = params.campoNota || "notaClimaApurada";
    const campoMetaReferencia = params.campoMetaReferencia || "metaReferenciaClima";
    const tipoPosicao = texto(lancamentoAtual, params.campoTipoPosicao || "tipoPosicaoClima");
    const medicaoOficialPesquisa2026 = isMedicaoOficialPesquisaAnual(regra, lancamentoAtual);
    const resultadoOficialReportado = !medicaoOficialPesquisa2026;
    const isPlanoAcao = tipoPosicao === "Plano de ação";
    const isAcompanhamento = ["Acompanhamento", "Revisão metodológica"].includes(tipoPosicao);
    const notaApurada = campo(lancamentoAtual, campoNota);
    if (notaApurada === null) {
      return pendente("Nota/média geral apurada ou posição de referência deve ser informada.", regra.unidadeMedida, {
        tipoPosicaoClima: tipoPosicao,
        medicaoOficialPesquisa2026,
        resultadoOficialReportado: false,
        situacao: isPlanoAcao
          ? "Plano de ação em andamento"
          : isAcompanhamento || !medicaoOficialPesquisa2026
            ? "Em acompanhamento"
            : undefined
      });
    }
    if (notaApurada < 0 || notaApurada > 100) {
      return erro("Nota/média geral apurada deve estar entre 0 e 100 pontos.", regra.unidadeMedida);
    }

    const metaReferenciaInformada = campo(lancamentoAtual, campoMetaReferencia);
    const metaConfigurada = toNumber(lancamentoAtual.metaReferencia ?? lancamentoAtual.metaMensal);
    const metaReferenciaPeriodo = metaConfigurada !== null
      ? metaConfigurada
      : metaReferenciaInformada !== null
        ? metaReferenciaInformada
        : toNumber(params.metaReferencia ?? regra.metaAnualValor);
    if (metaReferenciaPeriodo === null || metaReferenciaPeriodo === 0) {
      return erro("Meta de referência da pesquisa anual não configurada.", regra.unidadeMedida);
    }

    const metaAnual = toNumber(regra.metaAnualValor ?? params.metaReferencia ?? metaReferenciaPeriodo);
    const percentualAtingido = notaApurada / metaReferenciaPeriodo;
    const situacao = isPlanoAcao
      ? "Plano de ação em andamento"
      : isAcompanhamento || !medicaoOficialPesquisa2026
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
      medicaoOficialPesquisa2026,
      resultadoOficialReportado,
      situacao
    });
  }

  function calcularQuantidadeAcumulada(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const aprimoramentoExperiencia = Number(indicador?.id) === 4 && regra?.tipoCalculo === "melhorias_acumuladas";
    const tipoPosicaoAprimoramento = aprimoramentoExperiencia
      ? resolverTipoPosicaoAprimoramento(lancamentoAtual)
      : null;
    if (aprimoramentoExperiencia && !tipoPosicaoAprimoramento) {
      return pendente("Selecione o tipo da posição.", regra.unidadeMedida, { tipoPosicaoAprimoramento: null });
    }
    if (tipoPosicaoAprimoramento === TIPO_POSICAO_APRIMORAMENTO.ACOMPANHAMENTO) {
      return resultadoAcompanhamentoAprimoramento(regra, lancamentoAtual);
    }
    if (!aprimoramentoExperiencia) {
      const required = validarObrigatorios(regra, lancamentoAtual);
      if (required) return erro(required, regra.unidadeMedida);
    }
    const campoValor = regra.parametrosCalculo?.campoValor || regra.parametrosCalculo?.campoMelhorias || "quantidadeRealizadaMes";
    const totalMelhoriasPlano = toNumber(regra.parametrosCalculo?.totalMelhoriasPlano2026);
    const metaMinimaMelhorias = toNumber(regra.parametrosCalculo?.metaMinimaMelhoriasAno);
    if (totalMelhoriasPlano && metaMinimaMelhorias) {
      const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
      const campoLegado = regra.parametrosCalculo?.campoValorLegado || "melhoriasEntreguesMes";
      const campoAcumulado = regra.parametrosCalculo?.campoPosicaoAcumulada || "melhoriasImplementadasAcumuladas";
      const incrementoAtual = campo(lancamentoAtual, campoValor);
      const incrementoLegadoAtual = incrementoAtual === null ? campo(lancamentoAtual, campoLegado) : null;
      const acumuladoCompatibilidadeAtual = aprimoramentoExperiencia ? campo(lancamentoAtual, campoAcumulado) : null;
      const mensal = incrementoAtual ?? incrementoLegadoAtual;
      if (aprimoramentoExperiencia && mensal === null && acumuladoCompatibilidadeAtual === null) {
        if (lancamentoAtual?.status === "Não iniciado") {
          const trimestrePendente = `${Math.ceil(Number(lancamentoAtual.mes) / 3)}TRI/${lancamentoAtual.ano || 2026}`;
          const criterioPendente = regra.parametrosCalculo?.curvaTrimestralAcumulada?.[trimestrePendente] || {};
          return pendente("Fechamento trimestral aguardando resultado oficial.", regra.unidadeMedida, {
            statusCalculo: "aguardando_resultado_oficial",
            tipoPosicaoAprimoramento: TIPO_POSICAO_APRIMORAMENTO.FECHAMENTO_QUANTITATIVO,
            metaTrimestral: toNumber(criterioPendente.metaPercentual),
            metaQuantidadeTrimestral: toNumber(criterioPendente.metaQuantidadeAcumulada),
            situacao: "Sem avaliação"
          });
        }
        return erro("Melhorias implementadas no período de apuração devem ser informadas.", regra.unidadeMedida);
      }
      if (!aprimoramentoExperiencia && (mensal === null || mensal < 0)) {
        return erro("Melhorias entregues no mês devem ser informadas e não podem ser negativas.", regra.unidadeMedida);
      }
      const valorInformado = mensal ?? acumuladoCompatibilidadeAtual;
      if (valorInformado < 0 || !Number.isInteger(valorInformado)) {
        return erro("As melhorias implementadas no período devem ser uma quantidade inteira não negativa.", regra.unidadeMedida);
      }

      let acumulado;
      let acumuladoAnterior = 0;
      if (aprimoramentoExperiencia) {
        const mesmaCompetencia = (item) => (
          Number(item?.indicadorId ?? indicador?.id) === Number(lancamentoAtual?.indicadorId ?? indicador?.id) &&
          Number(item?.ano) === Number(lancamentoAtual?.ano) &&
          Number(item?.mes) === Number(lancamentoAtual?.mes)
        );
        const escopo = [
          ...ateMes.filter((item) => !mesmaCompetencia(item)),
          lancamentoAtual
        ].sort((a, b) => Number(a.mes) - Number(b.mes));
        acumulado = 0;
        for (const item of escopo) {
          if (resolverTipoPosicaoAprimoramento(item) === TIPO_POSICAO_APRIMORAMENTO.ACOMPANHAMENTO) continue;
          const atual = item === lancamentoAtual;
          if (atual) acumuladoAnterior = acumulado;
          const incremento = campo(item, campoValor);
          const incrementoLegado = incremento === null ? campo(item, campoLegado) : null;
          const valorIncremental = incremento ?? incrementoLegado;
          const posicaoAbsoluta = campo(item, campoAcumulado);
          if (valorIncremental !== null) {
            if (valorIncremental < 0 || !Number.isInteger(valorIncremental)) {
              return erro("As melhorias implementadas no período devem ser uma quantidade inteira não negativa.", regra.unidadeMedida);
            }
            acumulado += valorIncremental;
          } else if (posicaoAbsoluta !== null) {
            if (posicaoAbsoluta < 0 || !Number.isInteger(posicaoAbsoluta)) {
              return erro("A posição acumulada de compatibilidade deve ser uma quantidade inteira não negativa.", regra.unidadeMedida);
            }
            if (atual && posicaoAbsoluta < acumuladoAnterior) {
              return erro("A posição acumulada não pode ser inferior à última posição quantitativa registrada.", regra.unidadeMedida);
            }
            acumulado = posicaoAbsoluta;
          }
        }
      } else {
        acumulado = somaCampo(ateMes, campoValor);
      }
      if (acumulado > totalMelhoriasPlano) {
        return erro(`A posição acumulada não pode ser maior que ${totalMelhoriasPlano}, a base de melhorias mapeadas.`, regra.unidadeMedida);
      }
      let percentualPlanoExecutado = acumulado / totalMelhoriasPlano;
      const percentualPlanoExecutadoCalculado = percentualPlanoExecutado;
      const percentualMetaAnualAtingida = acumulado / metaMinimaMelhorias;
      const trimestre = `${Math.ceil(Number(lancamentoAtual.mes) / 3)}TRI/${lancamentoAtual.ano || 2026}`;
      const curva = regra.parametrosCalculo?.curvaTrimestralAcumulada || {};
      const metaTrimestral = metaLancamento(lancamentoAtual) ?? toNumber(curva[trimestre]?.metaPercentual);
      const metaQuantidadeTrimestral = toNumber(curva[trimestre]?.metaQuantidadeAcumulada);
      if (metaTrimestral && metaQuantidadeTrimestral !== null && acumulado === metaQuantidadeTrimestral) {
        percentualPlanoExecutado = metaTrimestral;
      }
      const metaPercentualPelaQuantidade = metaQuantidadeTrimestral !== null
        ? metaQuantidadeTrimestral / totalMelhoriasPlano
        : null;
      const curvaEquivalenteAQuantidade = metaTrimestral && metaQuantidadeTrimestral > 0 &&
        Math.abs(metaTrimestral - metaPercentualPelaQuantidade) <= 0.0001;
      const percentualAtingidoCurva = curvaEquivalenteAQuantidade
        ? acumulado / metaQuantidadeTrimestral
        : metaTrimestral
          ? percentualPlanoExecutado / metaTrimestral
          : percentualMetaAnualAtingida;
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
          novasMelhoriasPeriodo: mensal,
          melhoriasImplementadasAcumuladasAnterior: acumuladoAnterior,
          melhoriasEntreguesAcumuladas: acumulado,
          melhoriasImplementadasAcumuladas: acumulado,
          melhoriasImplementadasAcumuladasCompatibilidade: acumuladoCompatibilidadeAtual,
          fonteCalculoAprimoramento: mensal !== null ? "incremento_periodo" : "posicao_absoluta_compatibilidade",
          tipoPosicaoAprimoramento: tipoPosicaoAprimoramento || TIPO_POSICAO_APRIMORAMENTO.FECHAMENTO_QUANTITATIVO,
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
    const meta = requireMeta(metaLancamento(lancamentoAtual) ?? regra.metaAnualValor, regra.unidadeMedida);
    if (meta.erro) return meta;
    const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
    const mensal = campo(lancamentoAtual, campoValor);
    const acumulado = somaCampo(ateMes, campoValor);
    return ok(mensal, acumulado, mensal / meta, acumulado / meta, regra.unidadeMedida);
  }

  function calcularPlanoAcaoPorElementos(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const colecaoAtual = Array.isArray(lancamentoAtual?.camposEntrada?.elementosRGFAtendidos)
      ? lancamentoAtual.camposEntrada.elementosRGFAtendidos
      : [];
    const possuiColecaoValida = colecaoAtual.some((item) => (
      String(item?.elemento || "").trim() && String(item?.status || "").trim()
    ));
    const regraValidacao = possuiColecaoValida
      ? {
        ...regra,
        camposEntrada: (regra.camposEntrada || []).filter((item) => (
          !["elementoRGF", "acaoExecutada", "statusAcao"].includes(item.nome)
        ))
      }
      : regra;
    const required = validarObrigatorios(regraValidacao, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const campoElemento = regra.parametrosCalculo?.campoElemento || "elementoRGF";
    const campoStatus = regra.parametrosCalculo?.campoStatus || "statusAcao";
    const statusQueContam = regra.parametrosCalculo?.statusQueContam || ["Concluída", "Concluida", "Homologada"];
    if (regra.parametrosCalculo?.metaTipo === "curva_trimestral_acumulada" || regra.parametrosCalculo?.curvaTrimestralAcumulada) {
      const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
      const normalizarChave = (value) => String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLocaleLowerCase("pt-BR");
      const statusValidos = new Set(statusQueContam.map(normalizarChave));
      const elementosPorChave = new Map();
      const registrarElemento = (elemento, status) => {
        const nome = String(elemento || "").trim();
        const chave = normalizarChave(nome);
        if (!chave || !statusValidos.has(normalizarChave(status)) || elementosPorChave.has(chave)) return;
        elementosPorChave.set(chave, nome);
      };
      ateMes.forEach((item) => {
        registrarElemento(texto(item, campoElemento), texto(item, campoStatus));
        const colecao = Array.isArray(item?.camposEntrada?.elementosRGFAtendidos)
          ? item.camposEntrada.elementosRGFAtendidos
          : [];
        colecao.forEach((entrada) => registrarElemento(entrada?.elemento, entrada?.status));
      });
      const elementosAtendidos = [...elementosPorChave.values()];
      const acumulado = elementosAtendidos.length;
      const trimestre = lancamentoAtual.trimestre || `${Math.ceil(Number(lancamentoAtual.mes) / 3)}TRI/${lancamentoAtual.ano || 2026}`;
      const curva = regra.parametrosCalculo?.curvaTrimestralAcumulada || {};
      const metaTrimestral = metaLancamento(lancamentoAtual) ?? toNumber(curva[trimestre]?.metaElementosAcumulados);
      const metaReferencia = metaTrimestral || toNumber(regra.metaAnualValor);
      const percentual = metaReferencia ? acumulado / metaReferencia : null;
      const metaAnual = toNumber(regra.metaAnualValor);
      const percentualAnual = metaAnual ? acumulado / metaAnual : null;
      const situacao = metaReferencia
        ? acumulado > metaReferencia
          ? "Superado"
          : acumulado === metaReferencia
            ? "Atingido"
          : "Abaixo da meta"
        : "Sem cálculo";
      return ok(acumulado, acumulado, percentual, percentual, regra.unidadeMedida, "Elementos únicos atendidos calculados com sucesso.", {
        elementosAtendidos,
        elementosAtendidosAcumulados: acumulado,
        metaTrimestral,
        metaAnual,
        resultadoOficialAnual: acumulado,
        percentualAtingidoAnual: percentualAnual,
        percentualAtingidoMetaTrimestral: percentual,
        percentualAtingidoMetaAnual: percentualAnual,
        situacao
      });
    }
    const campoValor = regra.parametrosCalculo?.campoValor || "elementosExecutadosAcumulado";
    const meta = requireMeta(metaLancamento(lancamentoAtual) ?? regra.metaAnualValor, regra.unidadeMedida);
    if (meta.erro) return meta;
    const acumulado = Math.min(ultimoCampo(lancamentosAteMes(lancamentoAtual, lancamentosDoAno), campoValor) || 0, meta);
    return ok(acumulado, acumulado, acumulado / meta, acumulado / meta, regra.unidadeMedida);
  }

  function calcularIniciativasApoiadas(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const campoNome = regra.parametrosCalculo?.campoNome || "nomeIniciativaSocioambiental";
    const campoId = regra.parametrosCalculo?.campoId || "idIniciativaSocioambiental";
    const campoStatus = regra.parametrosCalculo?.campoStatus || "statusIniciativaSocioambiental";
    const campoDataApoio = regra.parametrosCalculo?.campoDataApoio || "dataApoioIniciativa";
    const campoDescricao = regra.parametrosCalculo?.campoDescricao || "descricaoAndamentoSocioambiental";
    const statusQueConta = regra.parametrosCalculo?.statusQueConta || "Apoiada/realizada";
    const regraComNomeCondicional = {
      ...regra,
      camposEntrada: (regra.camposEntrada || []).filter((campoEntrada) => campoEntrada.nome !== campoNome)
    };
    const required = validarObrigatorios(regraComNomeCondicional, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const statusAtual = texto(lancamentoAtual, campoStatus);
    if (statusAtual === statusQueConta && !texto(lancamentoAtual, campoNome).trim()) {
      return erro("Informe o nome da iniciativa apoiada/realizada.", regra.unidadeMedida);
    }
    const periodoDocumentadoSemDataPontual = regra.parametrosCalculo?.permitirPeriodoNaDescricaoSemDataPontual === true
      && texto(lancamentoAtual, campoDescricao).trim();
    if (statusAtual === statusQueConta && !texto(lancamentoAtual, campoDataApoio).trim() && !periodoDocumentadoSemDataPontual) {
      return erro("Informe a data de apoio/realização da iniciativa.", regra.unidadeMedida);
    }
    const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
    const normalizarChaveIniciativa = (value) => String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    const iniciativasPorChave = new Map();
    ateMes
      .filter((item) => texto(item, campoStatus) === statusQueConta)
      .forEach((item) => {
        const nome = texto(item, campoNome).trim();
        const id = normalizarChaveIniciativa(texto(item, campoId));
        const nomeNormalizado = normalizarChaveIniciativa(nome);
        const chave = id ? `id:${id}` : nomeNormalizado ? `nome:${nomeNormalizado}` : "";
        if (chave && !iniciativasPorChave.has(chave)) iniciativasPorChave.set(chave, nome);
      });
    const iniciativasApoiadas = [...iniciativasPorChave.values()];
    const acumulado = iniciativasApoiadas.length;
    const metaAnual = toNumber(regra.metaAnualValor);
    const percentualMetaAnualRealizado = metaAnual ? acumulado / metaAnual : null;
    const trimestre = lancamentoAtual.trimestre || `${Math.ceil(Number(lancamentoAtual.mes) / 3)}TRI/${lancamentoAtual.ano || 2026}`;
    const curva = regra.parametrosCalculo?.curvaTrimestralAcumulada || {};
    const metaTrimestral = metaLancamento(lancamentoAtual) ?? toNumber(curva[trimestre]?.metaQuantidadeAcumulada);
    const possuiAndamento = ateMes.some((item) => {
      const status = texto(item, campoStatus);
      return ["Em prospecção", "Em estruturação", "Em rito de governança"].includes(status);
    });
    if (metaTrimestral === 0) {
      return ok(acumulado, acumulado, null, null, regra.unidadeMedida, "Sem meta de entrega no período.", {
        iniciativasApoiadas,
        iniciativasApoiadasAcumuladas: acumulado,
        percentualMetaAnualRealizado,
        metaTrimestral,
        situacao: possuiAndamento ? "Em prospecção/estruturação" : "Sem meta no período",
        statusCalculo: "sem_meta_periodo"
      });
    }
    const metaReferencia = metaTrimestral ?? toNumber(regra.metaAnualValor);
    const percentual = metaReferencia ? acumulado / metaReferencia : null;
    const mesesFechamento = regra.parametrosCalculo?.mesesFechamentoTrimestral;
    const competenciaIntermediaria = Array.isArray(mesesFechamento) && mesesFechamento.length
      ? !mesesFechamento.includes(Number(lancamentoAtual.mes))
      : Number(lancamentoAtual.ano) === 2026 && [4, 5].includes(Number(lancamentoAtual.mes));
    const situacao = competenciaIntermediaria
      ? "Em acompanhamento"
      : metaReferencia
        ? acumulado >= metaReferencia
          ? "Atingido"
          : "Abaixo da meta"
      : "Sem cálculo";
    return ok(acumulado, acumulado, percentual, percentual, regra.unidadeMedida, "Iniciativas apoiadas calculadas com sucesso.", {
      iniciativasApoiadas,
      iniciativasApoiadasAcumuladas: acumulado,
      percentualMetaAnualRealizado,
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
    const metaAcoesRealizadasAcumuladas = metaLancamento(lancamentoAtual) ?? toNumber(alvoTrimestre.metaAcoesRealizadasAcumuladas);
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
    const mesCompetencia = Number(lancamentoAtual.mes);
    const mesFechamentoTrimestre = Number.isInteger(mesCompetencia) && mesCompetencia % 3 === 0;
    const situacao = !mesFechamentoTrimestre
      ? "Em acompanhamento"
      : acoesRealizadasAcumuladas >= metaReferencia
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
    const metaTrimestral = metaLancamento(lancamentoAtual) ?? toNumber(curva[trimestre]?.metaValorAcumulado);
    const metaPercentual = toNumber(curva[trimestre]?.metaPercentualLucro);
    const lucroLiquidoReferencia = toNumber(params.lucroLiquidoReferencia);
    if (lucroLiquidoReferencia === null || lucroLiquidoReferencia <= 0) {
      return erro("Lucro líquido de referência deve ser maior que zero para calcular o resultado percentual oficial.", regra.unidadeMedida);
    }
    const resultadoPercentualOficial = valorInvestidoAcumulado / lucroLiquidoReferencia;
    const possuiAndamento = ateMes.some((item) => ["Em prospecção", "Em estruturação", "Em rito de governança", "Aprovado"].includes(texto(item, campoStatus)));

    if (metaTrimestral === 0) {
      return ok(valorInvestidoAcumulado, valorInvestidoAcumulado, null, null, regra.unidadeMedida, "Sem meta de investimento no período.", {
        realizadoFinanceiro: valorInvestidoAcumulado,
        resultadoPercentualOficial,
        resultadoPercentualOficialFormatado: formatarPercentual(resultadoPercentualOficial, 5, 5),
        percentualAtingimento: null,
        metaFinanceira: metaTrimestral,
        metaPercentual,
        lucroLiquidoReferencia,
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
      realizadoFinanceiro: valorInvestidoAcumulado,
      resultadoPercentualOficial,
      resultadoPercentualOficialFormatado: formatarPercentual(resultadoPercentualOficial, 5, 5),
      percentualAtingimento: percentual,
      metaFinanceira: metaReferencia,
      metaPercentual,
      lucroLiquidoReferencia,
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
    const metaFinanceira = metaLancamento(lancamentoAtual) ?? lucro * percentualLucro;
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
    const meta = metaLancamento(lancamentoAtual) ?? 1;
    return ok(resultado, resultado, resultado / meta, resultado / meta, regra.unidadeMedida);
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
    const crescimentoMeta = metaLancamento(lancamentoAtual) ?? toNumber(params.metaCrescimento ?? 0.1) ?? 0.1;
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
    const rawValue = valorTextoOuId(value || params.cenarioOficialResumoExecutivo || "lotex")
      .toLocaleLowerCase("pt-BR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
      .replace(/\+/g, "_")
      .replace(/_+/g, "_");
    if (rawValue === "lotex") return "lotex";
    if (["lotex_marketplace", "lotex_e_marketplace", "lotex_marketplace_de_boloes"].includes(rawValue)) return "lotex_marketplace";
    return params.cenarioOficialResumoExecutivo || "lotex";
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

  function valorFoiInformado(value) {
    return value !== null && value !== undefined && value !== "";
  }

  function fatorMetaEcossistema(mes) {
    return Number(mes) <= 7 ? 1.10 : 1.01;
  }

  function calcularParticipacaoEcossistemaLotex(indicador, regra, lancamentoAtual) {
    const params = regra.parametrosCalculo || {};
    const fields = {
      total2025: params.campoArrTotal2025 || "arrTotal2025",
      lotex2025: params.campoArrLotex2025 || "arrEcoLotex2025",
      marketplace2025: params.campoArrMarketplace2025 || "arrEcoMarketplace2025",
      total2026: params.campoArrTotal2026 || "arrTotal2026",
      lotex2026: params.campoArrLotex2026 || "arrEcoLotex2026",
      marketplace2026: params.campoArrMarketplace2026 || "arrEcoMarketplace2026",
      resultadoDocumental: params.campoResultadoDocumental || "resultadoDocumentalEcossistema",
      atingimentoDocumental: params.campoPercentualAtingidoOficial || "percentualAtingidoOficialEcossistema",
      metaDocumental: params.campoMetaDocumental || "metaDocumentalEcossistema",
      tipoPosicao: params.campoTipoPosicao || "tipoPosicaoEcossistema",
      fonte: params.campoFonteResultado || "fonteResultadoEcossistema"
    };
    const rawValues = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, raw(lancamentoAtual, field)]));
    const values = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, campo(lancamentoAtual, field)]));

    const has2025Total = valorFoiInformado(rawValues.total2025);
    const has2025Lotex = valorFoiInformado(rawValues.lotex2025);
    const has2026Total = valorFoiInformado(rawValues.total2026);
    const has2026Lotex = valorFoiInformado(rawValues.lotex2026);
    if (has2025Total !== has2025Lotex) return erro("Informe ARR Total 2025 e ARR Eco Lotex 2025 em conjunto.", regra.unidadeMedida);
    if (has2026Total !== has2026Lotex) return erro("Informe ARR Total 2026 e ARR Eco Lotex 2026 em conjunto.", regra.unidadeMedida);
    if (has2025Total && (values.total2025 === null || values.total2025 <= 0)) return erro("ARR Total 2025 deve ser maior que zero.", regra.unidadeMedida);
    if (has2026Total && (values.total2026 === null || values.total2026 <= 0)) return erro("ARR Total 2026 deve ser maior que zero.", regra.unidadeMedida);
    if (has2025Lotex && (values.lotex2025 === null || values.lotex2025 < 0)) return erro("ARR Eco Lotex 2025 não pode ser negativo.", regra.unidadeMedida);
    if (has2026Lotex && (values.lotex2026 === null || values.lotex2026 < 0)) return erro("ARR Eco Lotex 2026 não pode ser negativo.", regra.unidadeMedida);
    if (valorFoiInformado(rawValues.marketplace2025) && (values.marketplace2025 === null || values.marketplace2025 < 0)) return erro("ARR Eco Marketplace 2025 não pode ser negativo.", regra.unidadeMedida);
    if (valorFoiInformado(rawValues.marketplace2026) && (values.marketplace2026 === null || values.marketplace2026 < 0)) return erro("ARR Eco Marketplace 2026 não pode ser negativo.", regra.unidadeMedida);

    const mes = Number(lancamentoAtual?.mes);
    const referenciaLotex2025 = has2025Total ? values.lotex2025 / values.total2025 : null;
    const fatorMetaVigente = fatorMetaEcossistema(mes);
    const metaTecnica2026 = referenciaLotex2025 === null ? null : referenciaLotex2025 * fatorMetaVigente;
    const resultadoTecnico = has2026Total ? values.lotex2026 / values.total2026 : null;
    const atingimentoTecnico = resultadoTecnico !== null && metaTecnica2026 > 0
      ? resultadoTecnico / metaTecnica2026
      : null;

    const tipoPosicao = String(rawValues.tipoPosicao || "").trim();
    const fonte = String(rawValues.fonte || "").trim();
    const hasDocument = valorFoiInformado(rawValues.resultadoDocumental)
      || valorFoiInformado(rawValues.atingimentoDocumental)
      || valorFoiInformado(rawValues.metaDocumental)
      || fonte !== "";
    if (hasDocument) {
      if (tipoPosicao !== "fechamento_trimestral" || ![3, 6, 9, 12].includes(mes)) {
        return erro("Posição documental do Indicador 22 permitida apenas no fechamento trimestral.", regra.unidadeMedida);
      }
      if (values.resultadoDocumental === null || values.atingimentoDocumental === null || values.metaDocumental === null || !fonte) {
        return erro("Fechamento documental requer meta, resultado, atingimento e fonte.", regra.unidadeMedida);
      }
    }

    const resultadoOficialDocumental = hasDocument ? values.resultadoDocumental : null;
    const percentualAtingidoOficialDocumental = hasDocument ? values.atingimentoDocumental : null;
    const desempenho = percentualAtingidoOficialDocumental ?? atingimentoTecnico;
    const situacao = desempenho === null ? null : situacaoPorPercentual(desempenho);

    return ok(resultadoTecnico, resultadoTecnico, atingimentoTecnico, atingimentoTecnico, regra.unidadeMedida, "Participação oficial calculada exclusivamente com ARR Eco Lotex.", {
      resultadoOficialAnual: null,
      percentualAtingidoAnual: null,
      cenarioApuracaoEcossistema: "lotex",
      cenarioApuracaoEcossistemaLabel: "Lotex",
      marketplaceAplicaAoCalculo: false,
      referenciaLotex2025,
      fatorMetaVigente,
      fatorMetaVigentePercentual: fatorMetaVigente,
      metaTecnica2026,
      metaReferencia: metaTecnica2026,
      resultadoTecnicoLotex: resultadoTecnico,
      atingimentoTecnicoLotex: atingimentoTecnico,
      resultadoOficialDocumental,
      percentualAtingidoOficialDocumental,
      metaOficialDocumental: hasDocument ? values.metaDocumental : null,
      tipoPosicaoEcossistema: tipoPosicao || "acompanhamento",
      fonteResultadoEcossistema: fonte || null,
      arrTotal2025: values.total2025,
      arrEcoLotex2025: values.lotex2025,
      arrEcoMarketplace2025: values.marketplace2025,
      arrTotal2026: values.total2026,
      arrEcoLotex2026: values.lotex2026,
      arrEcoMarketplace2026: values.marketplace2026,
      situacao
    });
  }

  function calcularParticipacaoEcossistemaComCenarios(indicador, regra, lancamentoAtual) {
    const params = regra.parametrosCalculo || {};
    const scenario = normalizarCenarioEcossistema(raw(lancamentoAtual, params.campoCenario || "cenarioApuracaoEcossistema"), params);
    if (scenario !== "lotex") {
      return erro("O cenário combinado é apenas histórico e não pode alimentar o cálculo oficial do Indicador 22.", regra.unidadeMedida);
    }
    if (valorFoiInformado(raw(lancamentoAtual, "arrTotal2025")) || valorFoiInformado(raw(lancamentoAtual, "arrEcoLotex2025"))) {
      return calcularParticipacaoEcossistemaLotex(indicador, regra, lancamentoAtual);
    }
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);

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
    const metaTrimestral2026 = metaLancamento(lancamentoAtual) ?? pontosPercentuaisParaFracao(curva.meta2026);
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

  function calcularCrescimentoRedeLotericaBase2025(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const params = regra.parametrosCalculo || {};
    const competencia = competenciaKey(lancamentoAtual);
    const metaCurva = params.metasPorCompetencia && Object.prototype.hasOwnProperty.call(params.metasPorCompetencia, competencia)
      ? toNumber(params.metasPorCompetencia[competencia])
      : null;
    const metaIndice = metaLancamento(lancamentoAtual) ?? metaCurva ?? toNumber(params.metaIndice ?? regra.metaAnualValor);
    if (metaIndice === null || metaIndice <= 0) {
      return erro("Meta em índice da Rede Lotérica não configurada.", regra.unidadeMedida);
    }

    const campo2026Mes = params.campoValor2026Mes || "arrecadacaoRedeLotericaMes2026";
    const campo2025Mes = params.campoBase2025PeriodoEquivalente || "arrecadacaoRedeLoterica2025PeriodoEquivalente";
    const campo2026Acumulado = params.campoValor2026Acumulado || "arrecadacaoRedeLotericaAcumulada2026";
    const campo2025Acumulado = params.campoBase2025Acumulada || "arrecadacaoRedeLoterica2025Acumulada";
    const campoResultadoDocumental = params.campoResultadoDocumental || "resultadoDocumentalRedeLoterica";
    const campoAtingimentoOficial = params.campoPercentualAtingidoOficial || "percentualAtingidoOficialRedeLoterica";
    const campoTipoPosicao = params.campoTipoPosicao || "tipoPosicaoRedeLoterica";
    const campoFonte = params.campoFonteResultado || "fonteResultadoRedeLoterica";
    const campoEscalaDocumental = params.campoEscalaResultadoDocumental || "escalaResultadoDocumentalRedeLoterica";
    const mesesFechamento = Array.isArray(params.mesesFechamentoTrimestral)
      ? params.mesesFechamentoTrimestral.map(Number)
      : [3, 6, 9, 12];
    const resultadoDocumental = toNumber(raw(lancamentoAtual, campoResultadoDocumental));
    const atingimentoOficial = toNumber(raw(lancamentoAtual, campoAtingimentoOficial));
    const tipoPosicao = String(raw(lancamentoAtual, campoTipoPosicao) || "").trim();
    const fonte = String(raw(lancamentoAtual, campoFonte) || "").trim();
    const escalaDocumental = String(raw(lancamentoAtual, campoEscalaDocumental) || "indice").trim().toLowerCase();
    const possuiDocumento = resultadoDocumental !== null || atingimentoOficial !== null || tipoPosicao !== "" || fonte !== "";

    const baseAcumulada = campo(lancamentoAtual, campo2025Acumulado);
    const realizadoAcumulado = campo(lancamentoAtual, campo2026Acumulado);
    const possuiAcumulado = baseAcumulada !== null || realizadoAcumulado !== null;
    const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
    const possuiComponenteNoAtual = campo(lancamentoAtual, campo2025Mes) !== null
      || campo(lancamentoAtual, campo2026Mes) !== null;
    const possuiComponenteMensal = ateMes.some((item) => (
      campo(item, campo2025Mes) !== null || campo(item, campo2026Mes) !== null
    ));

    let base2025 = null;
    let realizado2026 = null;
    let modoCalculo = null;

    if (possuiAcumulado) {
      if (baseAcumulada === null || realizadoAcumulado === null) {
        return erro("Informe conjuntamente as arrecadações acumuladas de 2025 e 2026.", regra.unidadeMedida);
      }
      base2025 = baseAcumulada;
      realizado2026 = realizadoAcumulado;
      modoCalculo = "componentes_acumulados";
    } else if (possuiComponenteMensal) {
      const mesAtual = Number(lancamentoAtual.mes);
      const porMes = new Map(ateMes.map((item) => [Number(item.mes), item]));
      let serieMensalCompleta = true;
      for (let mes = 1; mes <= mesAtual; mes += 1) {
        const item = porMes.get(mes);
        if (!item || campo(item, campo2025Mes) === null || campo(item, campo2026Mes) === null) {
          serieMensalCompleta = false;
          break;
        }
      }
      if (serieMensalCompleta) {
        base2025 = Array.from(porMes.entries())
          .filter(([mes]) => mes <= mesAtual)
          .reduce((total, [, item]) => total + campo(item, campo2025Mes), 0);
        realizado2026 = Array.from(porMes.entries())
          .filter(([mes]) => mes <= mesAtual)
          .reduce((total, [, item]) => total + campo(item, campo2026Mes), 0);
        modoCalculo = "componentes_mensais_acumulados";
      } else if (!possuiDocumento && possuiComponenteNoAtual) {
        return erro("A série mensal 2025/2026 deve estar completa até a competência para formar o acumulado equivalente.", regra.unidadeMedida);
      }
    }

    if (modoCalculo !== null) {
      if (base2025 <= 0) return erro("A arrecadação acumulada de 2025 deve ser maior que zero.", regra.unidadeMedida);
      if (realizado2026 < 0) return erro("A arrecadação acumulada de 2026 não pode ser negativa.", regra.unidadeMedida);
      const resultadoIndice = realizado2026 / base2025;
      const atingimentoTecnico = resultadoIndice / metaIndice;
      const situacao = resultadoIndice >= metaIndice ? "Atingido" : "Abaixo da meta";
      return ok(resultadoIndice, resultadoIndice, atingimentoTecnico, atingimentoTecnico, regra.unidadeMedida, "Índice da Rede Lotérica calculado sobre os acumulados de períodos equivalentes.", {
        modoCalculoRedeLoterica: modoCalculo,
        metaIndiceCrescimento: metaIndice,
        indiceEmRelacaoA2025: resultadoIndice,
        crescimentoVs2025: resultadoIndice - 1,
        percentualAtingidoTecnico: atingimentoTecnico,
        baseReferencia2025Periodo: base2025,
        realizado2026Periodo: realizado2026,
        arrecadacaoRedeLoterica2025Acumulada: base2025,
        arrecadacaoRedeLotericaAcumulada2026: realizado2026,
        resultadoDocumentalRedeLoterica: resultadoDocumental,
        percentualAtingidoOficialRedeLoterica: atingimentoOficial,
        tipoPosicaoRedeLoterica: tipoPosicao || null,
        fonteResultadoRedeLoterica: fonte || null,
        escalaResultadoDocumentalRedeLoterica: possuiDocumento ? escalaDocumental : null,
        situacao
      });
    }

    if (possuiDocumento) {
      if (tipoPosicao !== "fechamento_trimestral" || !mesesFechamento.includes(Number(lancamentoAtual.mes))) {
        return erro("A posição documental da Rede Lotérica somente é aceita nos fechamentos trimestrais.", regra.unidadeMedida);
      }
      if (resultadoDocumental === null || atingimentoOficial === null || fonte === "") {
        return erro("Fechamento documental requer resultado, atingimento oficial e fonte.", regra.unidadeMedida);
      }
      if (!["indice", "incremento"].includes(escalaDocumental)) {
        return erro("Escala documental deve ser 'indice' ou 'incremento'.", regra.unidadeMedida);
      }
      const resultadoIndice = escalaDocumental === "incremento" ? 1 + resultadoDocumental : resultadoDocumental;
      const atingimentoTecnico = resultadoIndice / metaIndice;
      const situacao = resultadoIndice >= metaIndice ? "Atingido" : "Abaixo da meta";
      return ok(resultadoIndice, resultadoIndice, atingimentoTecnico, atingimentoTecnico, regra.unidadeMedida, "Fechamento documental da Rede Lotérica sem componentes financeiros artificiais.", {
        modoCalculoRedeLoterica: "documental_direto",
        metaIndiceCrescimento: metaIndice,
        indiceEmRelacaoA2025: resultadoIndice,
        crescimentoVs2025: resultadoIndice - 1,
        percentualAtingidoTecnico: atingimentoTecnico,
        resultadoDocumentalRedeLoterica: resultadoDocumental,
        percentualAtingidoOficialRedeLoterica: atingimentoOficial,
        tipoPosicaoRedeLoterica: tipoPosicao,
        fonteResultadoRedeLoterica: fonte,
        escalaResultadoDocumentalRedeLoterica: escalaDocumental,
        situacao
      });
    }

    return pendente("Aguardando componentes financeiros ou fechamento documental.", regra.unidadeMedida, {
      modoCalculoRedeLoterica: "sem_dados",
      metaIndiceCrescimento: metaIndice,
      indiceEmRelacaoA2025: null,
      crescimentoVs2025: null,
      percentualAtingidoTecnico: null,
      resultadoDocumentalRedeLoterica: null,
      percentualAtingidoOficialRedeLoterica: null,
      fonteResultadoRedeLoterica: null,
      situacao: null
    });
  }

  function calcularCrescimentoRelativoValor(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const meta = requireMeta(metaLancamento(lancamentoAtual) ?? regra.parametrosCalculo?.metaCrescimento ?? regra.metaAnualValor, regra.unidadeMedida);
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
      case "lucro_recorrente_mensal":
        return calcularLucroRecorrenteMensal(indicador, regra, lancamentoAtual, lancamentosDoAno);
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
      case "participacao_ecossistema_lotex":
        return calcularParticipacaoEcossistemaLotex(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "crescimento_relativo_participacao":
      case "crescimento_comparado_base_2025":
        return calcularCrescimentoRelativoParticipacao(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "crescimento_rede_loterica_base_2025":
        return calcularCrescimentoRedeLotericaBase2025(indicador, regra, lancamentoAtual, lancamentosDoAno);
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
    TIPO_POSICAO_CAPACITACAO,
    MODO_RESULTADO_CAPACITACAO,
    TIPO_POSICAO_APRIMORAMENTO,
    TIPO_POSICAO_GGR,
    resolverTipoPosicaoCapacitacao,
    resolverModoResultadoCapacitacao,
    resolverTipoPosicaoAprimoramento,
    resolverTipoPosicaoGgr,
    isMedicaoOficialPesquisaAnual,
    obterRegra,
    regraFallback,
    toNumber,
    obterApresentacaoOficialTrimestre,
    parseMoedaBR: currency.parseMoedaBR,
    formatarMoedaBR: currency.formatarMoedaBR,
    normalizarPercentual,
    calcularIndicador,
    calcularPercentualDireto,
    calcularOfertasPersonalizadas,
    calcularReducaoGap,
    calcularCrescimentoMediaMensal,
    calcularPercentualAcumulado,
    calcularValorFinanceiroAcumulado,
    calcularLucroRecorrenteMensal,
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
    calcularParticipacaoEcossistemaLotex,
    calcularParticipacaoEcossistemaComCenarios,
    calcularCrescimentoRedeLotericaBase2025,
    calcularCrescimentoRelativoParticipacao,
    calcularCrescimentoRelativoValor
  };

  root.IndicatorFormulas = api;
  if (root.IeoRecorrente && typeof root.IeoRecorrente.instalarCorrecao === "function") {
    root.IeoRecorrente.instalarCorrecao();
  }
  if (root.LucroRecorrente && typeof root.LucroRecorrente.instalarCorrecao === "function") {
    root.LucroRecorrente.instalarCorrecao();
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
