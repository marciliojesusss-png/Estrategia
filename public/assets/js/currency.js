(function (root) {
  function parseMoedaBR(valor) {
    if (valor === null || valor === undefined || valor === "") return null;
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;

    let texto = String(valor)
      .trim()
      .replace(/\s|\u00a0/g, "")
      .replace(/R\$/gi, "");

    if (!texto) return null;

    const temVirgula = texto.includes(",");
    const pontos = (texto.match(/\./g) || []).length;

    if (temVirgula) {
      texto = texto.replace(/\./g, "").replace(",", ".");
    } else if (pontos > 1 || (pontos === 1 && /^\-?\d{1,3}\.\d{3}$/.test(texto))) {
      texto = texto.replace(/\./g, "");
    }

    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : null;
  }

  function formatarMoedaBR(valor) {
    const numero = typeof valor === "number" ? valor : parseMoedaBR(valor);
    if (numero === null || numero === undefined || !Number.isFinite(numero)) return "-";

    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  const api = { parseMoedaBR, formatarMoedaBR };
  root.CurrencyBR = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
