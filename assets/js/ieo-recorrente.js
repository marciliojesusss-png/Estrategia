(function (root) {
  "use strict";

  const INDICADOR_IEO_ID = 6;
  const META_REFERENCIA_ORIGINAL_2026 = 0.1403;
  const META_REFERENCIA_CA_2026 = 0.2664;
  const META_ANUAL_IEO_2026 = META_REFERENCIA_ORIGINAL_2026;
  const CAMPO_PERCENTUAL_OFICIAL_LEGADO = "percentualAtingidoOficialInformado";
  const CAMPO_OBSERVACAO_AJUSTE_LEGADO = "observacaoAjusteOficial";

  const CAMPOS_ORIGINAIS = Object.freeze([
    { nome: "despesaPessoalMes", rotulo: "Despesa de pessoal", tipo: "moeda", obrigatorio: true },
    { nome: "despesasAdministrativasMes", rotulo: "Despesas administrativas", tipo: "moeda", obrigatorio: true },
    { nome: "receitasLiquidasMes", rotulo: "Receitas líquidas", tipo: "moeda", obrigatorio: true }
  ]);
  const CAMPOS_CA = Object.freeze([
    { nome: "despesasGeraisAdministrativasMes", rotulo: "Despesas Gerais e Administrativas", tipo: "moeda", obrigatorio: true },
    { nome: "despesasServicosPagamentosMes", rotulo: "Despesas com Serviços de Pagamentos", tipo: "moeda", obrigatorio: true },
    { nome: "outrasDespesasOperacionaisMes", rotulo: "Outras Despesas Operacionais", tipo: "moeda", obrigatorio: true },
    { nome: "receitasOperacionaisMes", rotulo: "Receitas Operacionais", tipo: "moeda", obrigatorio: true },
    { nome: "despesasTributosMes", rotulo: "Despesas de Tributos", tipo: "moeda", obrigatorio: true }
  ]);
  const CAMPO_IEO_INFORMADO = Object.freeze({
    nome: "ieoApuradoInformado",
    rotulo: "IEO apurado pela unidade",
    tipo: "percentual",
    obrigatorio: false
  });

  const IEO_METODOLOGIA_ORIGINAL = Object.freeze({
    codigo: "original",
    inicio: "2026-01",
    fim: "2026-07",
    metaAnualReferencia: META_REFERENCIA_ORIGINAL_2026,
    metasPorCompetencia: Object.freeze({
      "2026-01": 0.1449,
      "2026-02": 0.1445,
      "2026-03": 0.1441,
      "2026-04": 0.1436,
      "2026-05": 0.1432,
      "2026-06": 0.1428,
      "2026-07": 0.1423833333333333
    }),
    camposEntrada: CAMPOS_ORIGINAIS,
    descricao: "Metodologia original vigente de janeiro a julho/2026.",
    formula: "((Despesa de pessoal + Despesas Administrativas) / Receitas Líquidas) × 100"
  });

  const IEO_METODOLOGIA_CA_2026 = Object.freeze({
    codigo: "ca_agosto_2026",
    inicio: "2026-08",
    fim: "2026-12",
    metaReferencia: META_REFERENCIA_CA_2026,
    metasPorCompetencia: Object.freeze({
      "2026-08": META_REFERENCIA_CA_2026,
      "2026-09": META_REFERENCIA_CA_2026,
      "2026-10": META_REFERENCIA_CA_2026,
      "2026-11": META_REFERENCIA_CA_2026,
      "2026-12": META_REFERENCIA_CA_2026
    }),
    camposEntrada: CAMPOS_CA,
    descricao: "Metodologia vigente a partir de agosto/2026 — aprovada pelo Conselho de Administração.",
    formula: "((Despesas Gerais e Administrativas + Despesas com Serviços de Pagamentos + Outras Despesas Operacionais) / (Receitas Operacionais - Despesas de Tributos)) × 100"
  });

  const IEO_META_MENSAL_2026 = Object.freeze(Object.assign(
    {},
    IEO_METODOLOGIA_ORIGINAL.metasPorCompetencia,
    IEO_METODOLOGIA_CA_2026.metasPorCompetencia
  ));

  function isIeoRule(regra) {
    return Boolean(regra) && Number(regra.indicadorId) === INDICADOR_IEO_ID;
  }

  function competenciaKey(value) {
    if (typeof value === "string") return value;
    if (value && value.competencia) return String(value.competencia);
    const ano = Number(value && value.ano);
    const mes = Number(value && value.mes);
    if (!ano || !mes) return "";
    return `${ano}-${String(mes).padStart(2, "0")}`;
  }

  function getMetodologiaIeoPorCompetencia(value) {
    const key = competenciaKey(value);
    return key >= IEO_METODOLOGIA_CA_2026.inicio
      ? IEO_METODOLOGIA_CA_2026
      : IEO_METODOLOGIA_ORIGINAL;
  }

  function getCamposEntrada(value) {
    const metodologia = getMetodologiaIeoPorCompetencia(value);
    const campos = metodologia.camposEntrada.map((campo) => Object.assign({}, campo));
    if (metodologia.codigo === "original") campos.push(Object.assign({}, CAMPO_IEO_INFORMADO));
    return campos;
  }

  function getMetaCompetencia(value) {
    const key = competenciaKey(value);
    return Object.prototype.hasOwnProperty.call(IEO_META_MENSAL_2026, key)
      ? IEO_META_MENSAL_2026[key]
      : null;
  }

  function cloneRule(regra) {
    return Object.assign({}, regra, {
      parametrosCalculo: Object.assign({}, regra && regra.parametrosCalculo || {}),
      camposEntrada: [...(regra && regra.camposEntrada || [])]
    });
  }

  function ajustarRegraIeo(regra, competencia) {
    if (!isIeoRule(regra)) return regra;
    const metodologia = getMetodologiaIeoPorCompetencia(competencia);

    regra.tipoCalculo = "indice_inverso";
    regra.tipoConsolidacao = "ultima_posicao_acumulada";
    regra.unidadeMedida = "percentual";
    regra.metaAnualValor = metodologia.codigo === "ca_agosto_2026"
      ? META_REFERENCIA_CA_2026
      : META_REFERENCIA_ORIGINAL_2026;
    regra.parametrosCalculo = Object.assign({}, regra.parametrosCalculo || {}, {
      campoIeoInformado: "ieoApuradoInformado",
      metaTipo: "curva_acumulada_por_competencia",
      metasAcumuladasPorCompetencia: Object.assign({}, IEO_META_MENSAL_2026),
      sentidoMeta: "quanto_menor_melhor",
      metodologiaVigente: metodologia.codigo
    });
    delete regra.parametrosCalculo.campoPercentualOficial;
    regra.camposEntrada = getCamposEntrada(competencia);
    regra.metodologiaIeo = metodologia.codigo;
    regra.descricaoMetodologiaIeo = metodologia.descricao;
    regra.formulaVigenteIeo = metodologia.formula;
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
    return lancamento && lancamento.camposEntrada ? lancamento.camposEntrada[campo] : null;
  }

  function formatarPercentual(value, minimumFractionDigits = 0) {
    if (value === null || value === undefined || !Number.isFinite(value)) return "-";
    return `${(value * 100).toLocaleString("pt-BR", { minimumFractionDigits, maximumFractionDigits: 2 })}%`;
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
      statusCalculo,
      mensagem
    };
  }

  function falha(regra, mensagem, erro) {
    const retorno = resultadoBase(regra.unidadeMedida, mensagem, erro ? "erro" : "aguardando_dados");
    if (erro) retorno.erro = true;
    return retorno;
  }

  function calcularIeoMetodologiaOriginal(regra, lancamento) {
    const params = regra.parametrosCalculo || {};
    const informado = normalizarPercentual(raw(lancamento, params.campoIeoInformado || "ieoApuradoInformado"));
    const despesaPessoal = parseNumero(raw(lancamento, params.campoDespesaPessoal || "despesaPessoalMes"));
    const despesasAdministrativas = parseNumero(raw(lancamento, params.campoDespesasAdministrativas || "despesasAdministrativasMes"));
    const receitasLiquidas = parseNumero(raw(lancamento, params.campoReceitasLiquidas || "receitasLiquidasMes"));
    const completos = [despesaPessoal, despesasAdministrativas, receitasLiquidas].every((value) => value !== null);

    if (completos) {
      if ([despesaPessoal, despesasAdministrativas, receitasLiquidas].some((value) => value < 0)) {
        return falha(regra, "Despesa de pessoal, despesas administrativas e receitas líquidas não podem ser negativas.", true);
      }
      if (receitasLiquidas === 0) return falha(regra, "Receitas líquidas devem ser maiores que zero.", true);
      return {
        resultado: (despesaPessoal + despesasAdministrativas) / receitasLiquidas,
        origemResultado: "calculado",
        ieoApuradoInformado: informado,
        componentesCalculoIeo: { despesaPessoal, despesasAdministrativas, receitasLiquidas }
      };
    }
    if (informado !== null) {
      return { resultado: informado, origemResultado: "informado", ieoApuradoInformado: informado };
    }
    return falha(regra, "Dados insuficientes para cálculo.", false);
  }

  function calcularIeoMetodologiaCa(regra, lancamento) {
    const nomes = [
      "despesasGeraisAdministrativasMes",
      "despesasServicosPagamentosMes",
      "outrasDespesasOperacionaisMes",
      "receitasOperacionaisMes",
      "despesasTributosMes"
    ];
    const valores = Object.fromEntries(nomes.map((nome) => [nome, parseNumero(raw(lancamento, nome))]));
    const informado = normalizarPercentual(raw(lancamento, "ieoApuradoInformado"));
    if (Object.values(valores).some((value) => value === null)) {
      return falha(regra, "Informe os cinco componentes da metodologia vigente para calcular o IEO.", false);
    }
    if (Object.values(valores).some((value) => value < 0)) {
      return falha(regra, "Os componentes da metodologia do IEO não podem ser negativos.", true);
    }
    const numerador = valores.despesasGeraisAdministrativasMes +
      valores.despesasServicosPagamentosMes +
      valores.outrasDespesasOperacionaisMes;
    const denominador = valores.receitasOperacionaisMes - valores.despesasTributosMes;
    if (denominador <= 0) {
      return falha(regra, "Receitas Operacionais menos Despesas de Tributos deve resultar em valor maior que zero.", true);
    }
    return {
      resultado: numerador / denominador,
      origemResultado: "calculado_metodologia_ca",
      ieoApuradoInformado: informado,
      numeradorIeo: numerador,
      denominadorIeo: denominador,
      componentesCalculoIeo: valores
    };
  }

  function calcularIeo(regra, lancamento) {
    const regraAjustada = ajustarRegraIeo(cloneRule(regra), lancamento);
    const metodologia = getMetodologiaIeoPorCompetencia(lancamento);
    const parcial = metodologia.codigo === "ca_agosto_2026"
      ? calcularIeoMetodologiaCa(regraAjustada, lancamento)
      : calcularIeoMetodologiaOriginal(regraAjustada, lancamento);
    if (parcial.resultado === undefined) return Object.assign(parcial, {
      metodologiaIeo: metodologia.codigo,
      descricaoMetodologiaIeo: metodologia.descricao,
      formulaVigenteIeo: metodologia.formula,
      metaReferenciaMensal: getMetaCompetencia(lancamento)
    });

    const resultado = parcial.resultado;
    if (resultado < 0) return falha(regraAjustada, "IEO realizado não pode ser negativo.", true);
    const metaCompetencia = getMetaCompetencia(lancamento) ?? normalizarPercentual(lancamento && (lancamento.metaMensal ?? lancamento.metaReferencia));
    if (metaCompetencia === null || metaCompetencia <= 0) {
      const retorno = falha(regraAjustada, "IEO calculado. Meta de referência não cadastrada para a competência.", false);
      retorno.resultadoMensal = resultado;
      retorno.resultadoMensalFormatado = formatarPercentual(resultado);
      retorno.situacao = "Sem meta de referência";
      return retorno;
    }

    const percentual = resultado === 0 ? null : metaCompetencia / resultado;
    const situacao = resultado <= metaCompetencia ? "Atingido" : "Abaixo da meta";
    const casasMinimas = metodologia.codigo === "ca_agosto_2026" ? 2 : 0;
    return Object.assign({}, parcial, {
      resultadoMensal: resultado,
      resultadoMensalFormatado: formatarPercentual(resultado, casasMinimas),
      resultadoAcumulado: resultado,
      resultadoAcumuladoFormatado: formatarPercentual(resultado, casasMinimas),
      resultadoOficialAnual: resultado,
      resultadoOficialAnualFormatado: formatarPercentual(resultado, casasMinimas),
      percentualAtingidoMensal: percentual,
      percentualAtingidoMensalFormatado: formatarPercentual(percentual, casasMinimas),
      percentualAtingidoAcumulado: percentual,
      percentualAtingidoAcumuladoFormatado: formatarPercentual(percentual, casasMinimas),
      percentualAtingidoAnual: percentual,
      percentualAtingidoAnualFormatado: formatarPercentual(percentual, casasMinimas),
      unidadeMedida: "percentual",
      statusCalculo: "calculado",
      mensagem: `IEO calculado pela metodologia ${metodologia.codigo === "ca_agosto_2026" ? "vigente desde agosto/2026" : "original"} e regra inversa.`,
      metaReferencia: metaCompetencia,
      metaReferenciaMensal: metaCompetencia,
      metaAcumulada: metaCompetencia,
      metaAnualIeo: metodologia.codigo === "ca_agosto_2026" ? META_REFERENCIA_CA_2026 : META_REFERENCIA_ORIGINAL_2026,
      competenciaReferencia: competenciaKey(lancamento),
      percentualMetaMensal: percentual,
      percentualMetaAcumulada: percentual,
      quantoMenorMelhor: true,
      sentidoMeta: "quanto_menor_melhor",
      situacao,
      ieoRealizadoMes: resultado,
      metodologiaIeo: metodologia.codigo,
      descricaoMetodologiaIeo: metodologia.descricao,
      formulaVigenteIeo: metodologia.formula
    });
  }

  function normalizarLancamentoParaExibicao(lancamento, regra) {
    if (!lancamento || Number(lancamento.indicadorId ?? lancamento.indicador_id) !== INDICADOR_IEO_ID) return lancamento;
    const regraIeo = ajustarRegraIeo(cloneRule(regra || { indicadorId: INDICADOR_IEO_ID }), lancamento);
    const metaCompetencia = getMetaCompetencia(lancamento);
    const calculo = calcularIeo(regraIeo, lancamento);
    const normalizado = Object.assign({}, lancamento, {
      metaMensal: metaCompetencia ?? lancamento.metaMensal,
      metaReferencia: metaCompetencia ?? lancamento.metaReferencia,
      metodologiaIeo: calculo.metodologiaIeo,
      descricaoMetodologiaIeo: calculo.descricaoMetodologiaIeo,
      formulaVigenteIeo: calculo.formulaVigenteIeo
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
    root.document.querySelectorAll(
      `[data-entry-field="${CAMPO_PERCENTUAL_OFICIAL_LEGADO}"], [data-entry-field="${CAMPO_OBSERVACAO_AJUSTE_LEGADO}"]`
    ).forEach(function (campo) {
      const bloco = campo.closest(".full-span");
      if (bloco && bloco.querySelector(`[data-entry-field="${CAMPO_PERCENTUAL_OFICIAL_LEGADO}"]`)) return bloco.remove();
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
      return isIeoRule(regra) ? ajustarRegraIeo(cloneRule(regra)) : regra;
    };
    root.IndicatorFormulas.calcularIndicador = function (indicador, regra, lancamentoAtual, lancamentosDoAno) {
      if (isIeoRule(regra)) return calcularIeo(regra, lancamentoAtual, lancamentosDoAno);
      return originalCalcularIndicador.call(this, indicador, regra, lancamentoAtual, lancamentosDoAno);
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
    META_REFERENCIA_ORIGINAL_2026,
    META_REFERENCIA_CA_2026,
    IEO_META_MENSAL_2026,
    IEO_METODOLOGIA_ORIGINAL,
    IEO_METODOLOGIA_CA_2026,
    isIeoRule,
    competenciaKey,
    getMetodologiaIeoPorCompetencia,
    getCamposEntrada,
    getMetaCompetencia,
    ajustarRegraIeo,
    calcularIeoMetodologiaOriginal,
    calcularIeoMetodologiaCa,
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
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", iniciarLimpezaVisual, { once: true });
    else iniciarLimpezaVisual();
  }
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
