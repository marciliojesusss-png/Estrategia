(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.IndicatorPeriodicity = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MONTHS_BY_FREQUENCY = Object.freeze({
    mensal: Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
    trimestral: Object.freeze([3, 6, 9, 12]),
    semestral: Object.freeze([6, 12]),
    anual: Object.freeze([12])
  });

  function normalize(value) {
    const normalized = String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
    if (normalized === "trimestral") return "trimestral";
    if (normalized === "semestral") return "semestral";
    if (normalized === "anual") return "anual";
    return "mensal";
  }

  function frequencyOf(indicatorOrFrequency) {
    if (indicatorOrFrequency && typeof indicatorOrFrequency === "object") {
      return normalize(
        indicatorOrFrequency.frequenciaCobrancaOperacional ??
        indicatorOrFrequency.periodicidade
      );
    }
    return normalize(indicatorOrFrequency);
  }

  function expectedMonths(indicatorOrFrequency) {
    return [...MONTHS_BY_FREQUENCY[frequencyOf(indicatorOrFrequency)]];
  }

  function trackingMonths(indicatorOrFrequency) {
    if (indicatorOrFrequency && typeof indicatorOrFrequency === "object" &&
      (Number(indicatorOrFrequency.id ?? indicatorOrFrequency.indicadorId) === 1 || indicatorOrFrequency.permiteAcompanhamentoMensal === true)) {
      return [...MONTHS_BY_FREQUENCY.mensal];
    }
    return expectedMonths(indicatorOrFrequency);
  }

  function monthOf(competenceOrLaunch) {
    if (competenceOrLaunch && typeof competenceOrLaunch === "object") {
      const directMonth = Number(competenceOrLaunch.mes);
      if (Number.isInteger(directMonth)) return directMonth;
      return monthOf(competenceOrLaunch.competencia);
    }
    const match = String(competenceOrLaunch || "").match(/^\d{4}-(\d{2})$/);
    return match ? Number(match[1]) : Number(competenceOrLaunch);
  }

  function isExpectedMonth(indicatorOrFrequency, month) {
    const numericMonth = monthOf(month);
    return Number.isInteger(numericMonth) &&
      MONTHS_BY_FREQUENCY[frequencyOf(indicatorOrFrequency)].includes(numericMonth);
  }

  function isExpectedCompetence(indicatorOrFrequency, competenceOrLaunch) {
    return isExpectedMonth(indicatorOrFrequency, monthOf(competenceOrLaunch));
  }

  function isTrackingMonth(indicatorOrFrequency, month) {
    const numericMonth = monthOf(month);
    return Number.isInteger(numericMonth) && trackingMonths(indicatorOrFrequency).includes(numericMonth);
  }

  function closingMonths(indicatorOrFrequency, rule = {}) {
    const configured = rule?.parametrosCalculo?.mesesFechamentoTrimestral ?? rule?.mesesFechamentoTrimestral;
    if (Array.isArray(configured)) {
      const months = [...new Set(configured.map(Number).filter((month) => Number.isInteger(month) && month >= 1 && month <= 12))];
      if (months.length) return months;
    }
    return expectedMonths(indicatorOrFrequency);
  }

  function isClosingCompetence(indicatorOrFrequency, rule, competenceOrLaunch) {
    const month = monthOf(competenceOrLaunch);
    return Number.isInteger(month) && closingMonths(indicatorOrFrequency, rule).includes(month);
  }

  function requiresEvidence(indicatorOrFrequency, rule, competenceOrLaunch) {
    if (rule?.exigeEvidencia !== true) return false;
    const legacyIndicator03Rule = Number(indicatorOrFrequency?.id ?? indicatorOrFrequency?.indicadorId) === 3 &&
      Array.isArray(rule?.parametrosCalculo?.mesesFechamentoTrimestral);
    if (rule?.exigeEvidenciaNosFechamentos !== true && !legacyIndicator03Rule) return true;
    return isClosingCompetence(indicatorOrFrequency, rule, competenceOrLaunch);
  }

  function officialLaunches(indicator, launches) {
    return (launches || []).filter((launch) => isExpectedCompetence(indicator, launch));
  }

  function compositionLabel(indicatorOrFrequency) {
    const frequency = frequencyOf(indicatorOrFrequency);
    if (frequency === "trimestral") return "Composição trimestral";
    if (frequency === "semestral") return "Composição semestral";
    if (frequency === "anual") return "Composição anual";
    return "Composição mensal";
  }

  function competenceLabel(indicatorOrFrequency, launch, monthNames) {
    const month = monthOf(launch);
    const year = Number(launch?.ano) || Number(String(launch?.competencia || "").slice(0, 4)) || 2026;
    if (frequencyOf(indicatorOrFrequency) === "trimestral") {
      return `${Math.ceil(month / 3)}TRI/${year}`;
    }
    const monthName = (monthNames || []).find(([value]) => Number(value) === month)?.[1] || month;
    return `${monthName}/${year}`;
  }

  return Object.freeze({
    MONTHS_BY_FREQUENCY,
    normalize,
    frequencyOf,
    expectedMonths,
    trackingMonths,
    monthOf,
    isExpectedMonth,
    isExpectedCompetence,
    isTrackingMonth,
    closingMonths,
    isClosingCompetence,
    requiresEvidence,
    officialLaunches,
    compositionLabel,
    competenceLabel
  });
});
