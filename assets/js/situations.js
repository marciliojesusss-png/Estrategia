(function (root) {
  function toNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function normalizarSituacao(situacao) {
    const normalized = normalizeText(situacao);
    if (normalized === "critico" || normalized === "nao atingido") return "Abaixo da meta";
    if (normalized === "atingido" || normalized === "atingida") return "Atingido";
    if (normalized === "abaixo da meta") return "Abaixo da meta";
    if (normalized === "sem dados") return "Sem dados";
    return situacao;
  }

  function classificarPercentual(percentual, semCalculo = "Sem cálculo") {
    const value = toNumber(percentual);
    if (value === null) return semCalculo;
    return value >= 1 ? "Atingido" : "Abaixo da meta";
  }

  function normalizarLancamento(lancamento) {
    if (!lancamento || typeof lancamento !== "object") return lancamento;
    const situacaoCalculada = normalizarSituacao(lancamento.situacaoCalculada);
    return situacaoCalculada === lancamento.situacaoCalculada
      ? lancamento
      : { ...lancamento, situacaoCalculada };
  }

  const api = {
    normalizeText,
    normalizarSituacao,
    classificarPercentual,
    normalizarLancamento
  };

  root.Situations = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
