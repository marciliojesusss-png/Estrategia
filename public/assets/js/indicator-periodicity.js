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
    monthOf,
    isExpectedMonth,
    isExpectedCompetence,
    officialLaunches,
    compositionLabel,
    competenceLabel
  });
});
