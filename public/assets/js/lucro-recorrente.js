(function (root) {
  "use strict";

  const INDICADOR_LUCRO_RECORRENTE_ID = 7;
  const META_ANUAL_LUCRO_RECORRENTE_2026 = 1305318247.20;
  const CAMPO_MENSAL = "lucroLiquidoRecorrenteCompetencia";
  const CAMPO_ACUMULADO_LEGADO = "lucroLiquidoRecorrenteAcumulado";

  const METAS_MENSAIS_2026 = Object.freeze({
    "2026-01": 90811101.33,
    "2026-02": 77462728.16,
    "2026-03": 90084434.66,
    "2026-04": 96068372.33,
    "2026-05": 94438480.16,
    "2026-06": 106104677.05,
    "2026-07": 98144245.44,
    "2026-08": 94094264.37,
    "2026-09": 128614993.92,
    "2026-10": 101071987.08,
    "2026-11": 91522592.68,
    "2026-12": 236900370.02
  });

  const METAS_ACUMULADAS_2026 = Object.freeze(Object.entries(METAS_MENSAIS_2026)
    .reduce((curve, [competence, monthlyTarget]) => {
      const previous = Object.values(curve).at(-1) || 0;
      curve[competence] = (Math.round(previous * 100) + Math.round(monthlyTarget * 100)) / 100;
      return curve;
    }, {}));

  function isIndicador7(value) {
    return Number(value && (value.indicadorId ?? value.id)) === INDICADOR_LUCRO_RECORRENTE_ID;
  }

  function ajustarIndicador(indicador) {
    if (!isIndicador7(indicador)) return indicador;
    return Object.assign({}, indicador, {
      periodicidade: "Mensal",
      tipoCalculo: "lucro_recorrente_mensal",
      tipoConsolidacao: "ultima_posicao_mensal_homologada",
      unidadeMedida: "moeda",
      metaAnualDescricao: "R$ 1.305.318.247,20",
      metrica: "Lucro líquido recorrente da competência / meta da competência"
    });
  }

  function ajustarRegra(regra) {
    if (!regra || Number(regra.indicadorId) !== INDICADOR_LUCRO_RECORRENTE_ID) return regra;
    return Object.assign({}, regra, {
      tipoCalculo: "lucro_recorrente_mensal",
      tipoConsolidacao: "ultima_posicao_mensal_homologada",
      unidadeMedida: "moeda",
      metaAnualValor: META_ANUAL_LUCRO_RECORRENTE_2026,
      parametrosCalculo: Object.assign({}, regra.parametrosCalculo || {}, {
        campoValorMensal: CAMPO_MENSAL,
        campoValorAcumuladoLegado: CAMPO_ACUMULADO_LEGADO,
        metaTipo: "curva_mensal_por_competencia",
        metasMensaisPorCompetencia: Object.assign({}, METAS_MENSAIS_2026),
        metasAcumuladasPorCompetencia: Object.assign({}, METAS_ACUMULADAS_2026),
        sentidoMeta: "quanto_maior_melhor"
      }),
      camposEntrada: [{
        nome: CAMPO_MENSAL,
        rotulo: "Lucro líquido recorrente da competência",
        tipo: "moeda",
        obrigatorio: true
      }],
      camposEntradaLegados: [
        ...(regra.camposEntradaLegados || []).filter((field) => field?.nome !== CAMPO_ACUMULADO_LEGADO),
        {
          nome: CAMPO_ACUMULADO_LEGADO,
          rotulo: "Lucro líquido recorrente acumulado até a competência",
          tipo: "moeda"
        }
      ],
      campoResultadoPrincipal: "resultadoMensal",
      campoPercentualAtingido: "percentualAtingidoMensal",
      resultadoOficial: "ultima_posicao_mensal_homologada"
    });
  }

  function normalizarDados(data) {
    if (!data || typeof data !== "object") return data;
    return Object.assign({}, data, {
      indicadores: Array.isArray(data.indicadores)
        ? data.indicadores.map(ajustarIndicador)
        : data.indicadores,
      regrasIndicadores: Array.isArray(data.regrasIndicadores)
        ? data.regrasIndicadores.map(ajustarRegra)
        : data.regrasIndicadores
    });
  }

  function instalarCorrecao() {
    if (!root.IndicatorFormulas || root.IndicatorFormulas.__lucroRecorrenteMensal2026) return false;
    const originalObterRegra = root.IndicatorFormulas.obterRegra;
    root.IndicatorFormulas.obterRegra = function (indicador, regras) {
      return ajustarRegra(originalObterRegra.call(this, ajustarIndicador(indicador), regras));
    };
    root.IndicatorFormulas.__lucroRecorrenteMensal2026 = true;
    return true;
  }

  const api = {
    INDICADOR_LUCRO_RECORRENTE_ID,
    META_ANUAL_LUCRO_RECORRENTE_2026,
    CAMPO_MENSAL,
    CAMPO_ACUMULADO_LEGADO,
    METAS_MENSAIS_2026,
    METAS_ACUMULADAS_2026,
    ajustarIndicador,
    ajustarRegra,
    normalizarDados,
    instalarCorrecao
  };

  root.LucroRecorrente = api;
  instalarCorrecao();

  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
