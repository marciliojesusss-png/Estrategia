(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DocumentationFields = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const REFERENCE_FIELDS_BY_INDICATOR = Object.freeze({
    2: ["fontePesquisaNPS", "relatorioPesquisa"],
    4: ["evidenciaMelhoriasMes"],
    10: ["evidenciaPlataformaJogos", "evidenciaEntrega"],
    11: ["evidenciaTIC"],
    12: ["fonteEvidenciaClima", "relatorioGPTW"],
    15: ["fonteEvidenciaCapacitacao"],
    16: ["evidenciaIniciativaSocioambiental"],
    18: ["evidenciaAcao"],
    19: ["evidenciaIncentivoSocioambiental", "evidencia"],
    20: ["evidenciaVisibilidade", "evidencia"],
    21: ["fonteEvidenciaJR", "evidencia"],
    22: ["fonteEvidenciaEcossistema"],
    23: ["fonteEvidenciaRedeLoterica"]
  });

  const DOCUMENTATION_FIELD_NAMES = new Set([
    "observacaoArea",
    ...Object.values(REFERENCE_FIELDS_BY_INDICATOR).map((fields) => fields[0])
  ]);

  function indicatorId(regra, lancamento) {
    const value = Number(regra?.indicadorId ?? regra?.indicador_id ?? lancamento?.indicadorId ?? lancamento?.indicador_id);
    return Number.isFinite(value) ? value : null;
  }

  function meaningfulValue(source, keys) {
    if (!source) return "";
    for (const key of keys) {
      const value = source[key];
      if (value === null || value === undefined) continue;
      const normalized = String(value).trim();
      if (normalized) return normalized;
    }
    return "";
  }

  function referenceKeys(regra, lancamento) {
    const id = indicatorId(regra, lancamento);
    if (id && REFERENCE_FIELDS_BY_INDICATOR[id]) {
      return [...REFERENCE_FIELDS_BY_INDICATOR[id]];
    }

    const configured = new Set((regra?.camposEntrada || []).map((field) => field?.nome));
    return [...DOCUMENTATION_FIELD_NAMES].filter((name) => name !== "observacaoArea" && configured.has(name));
  }

  function isCentralDocumentationField(fieldOrName) {
    const name = typeof fieldOrName === "string" ? fieldOrName : fieldOrName?.nome;
    return DOCUMENTATION_FIELD_NAMES.has(name);
  }

  function visibleInputFields(regra) {
    return (regra?.camposEntrada || []).filter((field) => !isCentralDocumentationField(field));
  }

  function resolve(regra, lancamento) {
    const camposEntrada = lancamento?.camposEntrada || {};
    const legacyReference = meaningfulValue(camposEntrada, referenceKeys(regra, lancamento));
    return {
      reference: meaningfulValue(lancamento, ["referenciaEvidencia"]) || legacyReference || meaningfulValue(lancamento, ["linkEvidencia"]),
      observation: meaningfulValue(lancamento, ["observacaoArea"]) || meaningfulValue(camposEntrada, ["observacaoArea"]),
      legacyReference
    };
  }

  function preserveLegacyFields(regra, lancamento, nextFields) {
    const previous = lancamento?.camposEntrada || {};
    const preserved = { ...(nextFields || {}) };
    const keys = [...referenceKeys(regra, lancamento), "observacaoArea"];
    keys.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(preserved, key) && Object.prototype.hasOwnProperty.call(previous, key)) {
        preserved[key] = previous[key];
      }
    });
    return preserved;
  }

  return Object.freeze({
    REFERENCE_FIELDS_BY_INDICATOR,
    DOCUMENTATION_FIELD_NAMES,
    isCentralDocumentationField,
    visibleInputFields,
    referenceKeys,
    resolve,
    preserveLegacyFields
  });
});
