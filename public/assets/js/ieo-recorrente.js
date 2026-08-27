(function (root) {
  "use strict";

  const INDICADOR_IEO_ID = 6;
  const META_ANUAL_IEO_2026 = 0.1403;
  const CAMPO_PERCENTUAL_OFICIAL_LEGADO = "percentualAtingidoOficialInformado";
  const CAMPO_OBSERVACAO_AJUSTE_LEGADO = "observacaoAjusteOficial";

  const IEO_META_MENSAL_2026 = Object.freeze({
    "2026-01": 0.1449,
    "2026-02": 0.1445,
    "2026-03": 0.1441,
    "2026-04": 0.1436,
    "2026-05": 0.1432,
    "2026-06": 0.1428,
    "2026-07": 0.1423833333333333,
    "2026-08": 0.1419666666666667,
    "2026-09": 0.14155,
    "2026-10": 0.1411333333333333,
    "2026-11": 0.1407166666666667,
    "2026-12": 0.1403
  });

  function isIeoRule(regra) {
    return Boolean(regra) && Number(regra.indicadorId) === INDICADOR_IEO_ID;
  }

  function competenciaKey(lancamento) {
    if (lancamento && lancamento.competencia) return String(lancamento.competencia);
    const ano = Number(lancamento && lancamento.ano);
    const mes = Number(lancamento && lancamento.mes);
    if (!ano || !mes) return "";
    return `${ano}-${String(mes).padStart(2, "0")}`;
  }

  function ajustarRegraIeo(regra) {
    if (!isIeoRule(regra)) return regra;

    regra.tipoCalculo = "indice_inverso";
    regra.tipoConsolidacao = "ultima_posicao_acumulada";
    regra.unidadeMedida = "percentual";
    regra.metaAnualValor = META_ANUAL_IEO_2026;
    regra.parametrosCalculo = Object.assign({}, regra.parametrosCalculo || {}, {
      metaTipo: "curva_acumulada_por_competencia",
      metasAcumuladasPorCompetencia: Object.assign({}, IEO_META_MENSAL_2026),
      sentidoMeta: "quanto_menor_melhor"
    });

    delete regra.parametrosCalculo.campoPercentualOficial;

    const camposAtuais = Object.fromEntries((regra.camposEntrada || [])
      .filter(function (campo) {
        return campo && ![CAMPO_PERCENTUAL_OFICIAL_LEGADO, CAMPO_OBSERVACAO_AJUSTE_LEGADO].includes(campo.nome);
      })
      .map(function (campo) { return [campo.nome, campo]; }));

    regra.camposEntrada = [
      Object.assign({}, camposAtuais.despesaPessoalMes, { nome: "despesaPessoalMes", rotulo: "Despesa de pessoal", tipo: "moeda", obrigatorio: true }),
      Object.assign({}, camposAtuais.despesasAdministrativasMes, { nome: "despesasAdministrativasMes", rotulo: "Despesas administrativas", tipo: "moeda", obrigatorio: true }),
      Object.assign({}, camposAtuais.receitasLiquidasMes, { nome: "receitasLiquidasMes", rotulo: "Receitas líquidas", tipo: "moeda", obrigatorio: true }),
      Object.assign({}, camposAtuais.ieoApuradoInformado, { nome: "ieoApuradoInformado", rotulo: "IEO apurado pela unidade", tipo: "percentual", obrigatorio: false })
    ];

    return regra;
  }

  function normalizarPercentual(value) {
    if (root.IndicatorFormulas && typeof root.IndicatorFormulas.normalizarPercentual === "function") {
      return root.IndicatorFormulas.normalizarPercentual(value);
    }
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(String(value).replace("%", "").replace(",", "."));
    if (!Number.isFinite(parsed)) return null;
    return parsed > 1 ? parsed / 100 : parsed;
  }

  function parseNumero(value) {
    if (root.CurrencyBR && typeof root.CurrencyBR.parseMoedaBR === "function") {
      return root.CurrencyBR.parseMoedaBR(value);
    }
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function raw(lancamento, campo) {
    return lancamento && lancamento.camposEntrada
      ? lancamento.camposEntrada[campo]
      : null;
  }

  function formatarPercentual(value) {
    if (value === null || value === undefined || !Number.isFinite(value)) return "-";
    return `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  }

  function resultadoBase(unidadeMedida, mensagem, statusCalculo) {
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
      unidadeMedida: unidadeMedida || "percentual",
      statusCalculo: statusCalculo,
      mensagem: mensagem
    };
  }

  function formatarResultadoIeo(value) {
    return formatarPercentual(value);
  }

  function getMetaCompetencia(lancamento) {
    const key = competenciaKey(lancamento);
    return Object.prototype.hasOwnProperty.call(IEO_META_MENSAL_2026, key)
      ? IEO_META_MENSAL_2026[key]
      : null;
  }

  function calcularIeo(regra, lancamento) {
    ajustarRegraIeo(regra);

    const params = regra.parametrosCalculo || {};
    const campoIeoInformado = params.campoIeoInformado || params.campoValor || "ieoApuradoInformado";
    const ieoInformado = normalizarPercentual(raw(lancamento, campoIeoInformado));
    const despesaPessoal = parseNumero(raw(lancamento, params.campoDespesaPessoal || "despesaPessoalMes"));
    const despesasAdministrativas = parseNumero(raw(lancamento, params.campoDespesasAdministrativas || "despesasAdministrativasMes"));
    const receitasLiquidas = parseNumero(raw(lancamento, params.campoReceitasLiquidas || "receitasLiquidasMes"));
    const componentesCompletos = despesaPessoal !== null && despesasAdministrativas !== null && receitasLiquidas !== null;
    let resultado = null;
    let origemResultado = null;

    if (componentesCompletos) {
      if (despesaPessoal < 0 || despesasAdministrativas < 0 || receitasLiquidas < 0) {
        const retorno = resultadoBase(
          regra.unidadeMedida,
          "Despesa de pessoal, despesas administrativas e receitas líquidas não podem ser negativas.",
          "erro"
        );
        retorno.erro = true;
        return retorno;
      }
      if (receitasLiquidas === 0) {
        const retorno = resultadoBase(regra.unidadeMedida, "Receitas líquidas devem ser maiores que zero.", "erro");
        retorno.erro = true;
        return retorno;
      }
      resultado = (despesaPessoal + despesasAdministrativas) / receitasLiquidas;
      origemResultado = "calculado";
    } else if (ieoInformado !== null) {
      resultado = ieoInformado;
      origemResultado = "informado";
    } else {
      return resultadoBase(regra.unidadeMedida, "Dados insuficientes para cálculo.", "aguardando_dados");
    }

    if (resultado < 0) {
      const retorno = resultadoBase(regra.unidadeMedida, "IEO realizado não pode ser negativo.", "erro");
      retorno.erro = true;
      return retorno;
    }

    const key = competenciaKey(lancamento);
    const metaCompetencia = getMetaCompetencia(lancamento) ??
      normalizarPercentual(lancamento && lancamento.metaMensal) ??
      normalizarPercentual(regra.metaAnualValor);

    if (metaCompetencia === null || metaCompetencia <= 0) {
      const retorno = resultadoBase(
        regra.unidadeMedida,
        "IEO calculado. Meta de referência não cadastrada para a competência.",
        "aguardando_dados"
      );
      retorno.resultadoMensal = resultado;
      retorno.resultadoMensalFormatado = formatarResultadoIeo(resultado);
      retorno.resultadoAcumulado = resultado;
      retorno.resultadoAcumuladoFormatado = formatarResultadoIeo(resultado);
      retorno.resultadoOficialAnual = resultado;
      retorno.resultadoOficialAnualFormatado = formatarResultadoIeo(resultado);
      retorno.metaPendente = true;
      retorno.metaReferencia = null;
      retorno.metaAcumulada = null;
      retorno.situacao = "Sem meta de referência";
      retorno.quantoMenorMelhor = true;
      retorno.sentidoMeta = "quanto_menor_melhor";
      retorno.ieoRealizadoMes = resultado;
      retorno.ieoApuradoInformado = ieoInformado;
      retorno.origemResultado = origemResultado;
      return retorno;
    }

    const percentualAtingido = resultado === 0 ? null : metaCompetencia / resultado;
    const situacao = resultado <= metaCompetencia ? "Atingido" : "Abaixo da meta";

    return {
      resultadoMensal: resultado,
      resultadoMensalFormatado: formatarResultadoIeo(resultado),
      resultadoAcumulado: resultado,
      resultadoAcumuladoFormatado: formatarResultadoIeo(resultado),
      resultadoOficialAnual: resultado,
      resultadoOficialAnualFormatado: formatarResultadoIeo(resultado),
      percentualAtingidoMensal: percentualAtingido,
      percentualAtingidoMensalFormatado: formatarPercentual(percentualAtingido),
      percentualAtingidoAcumulado: percentualAtingido,
      percentualAtingidoAcumuladoFormatado: formatarPercentual(percentualAtingido),
      percentualAtingidoAnual: percentualAtingido,
      percentualAtingidoAnualFormatado: formatarPercentual(percentualAtingido),
      unidadeMedida: regra.unidadeMedida || "percentual",
      statusCalculo: "calculado",
      mensagem: "IEO recorrente calculado pela meta da competência e regra inversa.",
      metaReferencia: metaCompetencia,
      metaReferenciaMensal: metaCompetencia,
      metaAcumulada: metaCompetencia,
      metaAnualIeo: META_ANUAL_IEO_2026,
      competenciaReferencia: key,
      percentualMetaMensal: percentualAtingido,
      percentualMetaAcumulada: percentualAtingido,
      quantoMenorMelhor: true,
      sentidoMeta: "quanto_menor_melhor",
      situacao: situacao,
      ieoRealizadoMes: resultado,
      ieoApuradoInformado: ieoInformado,
      origemResultado: origemResultado
    };
  }

  function normalizarLancamentoParaExibicao(lancamento, regra) {
    if (!lancamento || Number(lancamento.indicadorId ?? lancamento.indicador_id) !== INDICADOR_IEO_ID) {
      return lancamento;
    }

    const regraIeo = ajustarRegraIeo(regra || {
      indicadorId: INDICADOR_IEO_ID,
      tipoCalculo: "indice_inverso",
      parametrosCalculo: {},
      camposEntrada: []
    });
    const metaCompetencia = getMetaCompetencia(lancamento);
    const calculo = calcularIeo(regraIeo, lancamento);
    const normalizado = Object.assign({}, lancamento, {
      metaMensal: metaCompetencia ?? lancamento.metaMensal,
      metaReferencia: metaCompetencia ?? lancamento.metaReferencia
    });

    if (calculo.resultadoMensal === null || calculo.resultadoMensal === undefined) return normalizado;

    return Object.assign(normalizado, {
      resultadoMensal: calculo.resultadoMensal,
      realizadoMensal: calculo.resultadoMensal,
      resultadoAcumulado: calculo.resultadoAcumulado,
      resultadoOficialAnual: calculo.resultadoOficialAnual,
      percentualAtingido: calculo.percentualAtingidoMensal,
      percentualAtingidoMensal: calculo.percentualAtingidoMensal,
      percentualAtingidoAcumulado: calculo.percentualAtingidoAcumulado,
      percentualAtingidoAnual: calculo.percentualAtingidoAnual,
      situacaoCalculada: calculo.situacao,
      situacao: calculo.situacao
    });
  }

  function removerAjusteOficialLegado() {
    if (!root.document) return;
    const campos = root.document.querySelectorAll(
      `[data-entry-field="${CAMPO_PERCENTUAL_OFICIAL_LEGADO}"], [data-entry-field="${CAMPO_OBSERVACAO_AJUSTE_LEGADO}"]`
    );

    campos.forEach(function (campo) {
      const bloco = campo.closest(".full-span");
      if (bloco && bloco.querySelector(`[data-entry-field="${CAMPO_PERCENTUAL_OFICIAL_LEGADO}"]`)) {
        bloco.remove();
        return;
      }
      const label = campo.closest("label");
      if (label) label.remove();
      else campo.remove();
    });
  }

  function instalarCorrecao() {
    if (!root.IndicatorFormulas || root.IndicatorFormulas.__ieoRecorrente2026Corrigido) return false;

    const originalObterRegra = root.IndicatorFormulas.obterRegra;
    const originalCalcularIndicador = root.IndicatorFormulas.calcularIndicador;

    root.IndicatorFormulas.obterRegra = function (indicador, regras) {
      const regra = originalObterRegra.call(this, indicador, regras);
      return ajustarRegraIeo(regra);
    };

    root.IndicatorFormulas.calcularIndicador = function (indicador, regra, lancamentoAtual, lancamentosDoAno) {
      const regraAjustada = ajustarRegraIeo(regra);
      if (isIeoRule(regraAjustada)) {
        return calcularIeo(regraAjustada, lancamentoAtual, lancamentosDoAno);
      }
      return originalCalcularIndicador.call(this, indicador, regraAjustada, lancamentoAtual, lancamentosDoAno);
    };

    root.IndicatorFormulas.__ieoRecorrente2026Corrigido = true;
    root.IndicatorFormulas.IEO_META_MENSAL_2026 = IEO_META_MENSAL_2026;
    root.IndicatorFormulas.ajustarRegraIeo = ajustarRegraIeo;
    root.IndicatorFormulas.calcularIeoRecorrente2026 = calcularIeo;
    return true;
  }

  const api = {
    INDICADOR_IEO_ID,
    META_ANUAL_IEO_2026,
    IEO_META_MENSAL_2026,
    isIeoRule,
    getMetaCompetencia,
    ajustarRegraIeo,
    calcularIeo,
    normalizarLancamentoParaExibicao,
    instalarCorrecao
  };

  root.IeoRecorrente = api;
  instalarCorrecao();

  if (root.document) {
    const iniciarLimpezaVisual = function () {
      removerAjusteOficialLegado();
      if (typeof root.MutationObserver === "function") {
        const observer = new root.MutationObserver(removerAjusteOficialLegado);
        observer.observe(root.document.body, { childList: true, subtree: true });
      }
    };

    if (root.document.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", iniciarLimpezaVisual, { once: true });
    } else {
      iniciarLimpezaVisual();
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
