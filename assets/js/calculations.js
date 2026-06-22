(function () {
  function toNumber(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function calcularPercentual(indicador, meta, realizado, percentualManual) {
    const tipo = indicador.tipoCalculo;
    const metaNumero = toNumber(meta);
    const realizadoNumero = toNumber(realizado);

    if (["manual_homologado", "qualitativo"].includes(tipo)) {
      return {
        percentual: toNumber(percentualManual),
        percentualFormatado: formatarPercentual(percentualManual),
        statusCalculo: "manual",
        mensagem: "Indicador exige avaliação manual ou qualitativa"
      };
    }

    if (tipo === "projeto_percentual") {
      return {
        percentual: realizadoNumero,
        percentualFormatado: formatarPercentual(realizadoNumero),
        statusCalculo: realizadoNumero === null ? "nao_aplicavel" : "calculado",
        mensagem: "Percentual de execução informado como realizado"
      };
    }

    if (tipo === "projeto_binario") {
      const percentual = realizadoNumero === 1 ? 1 : 0;
      return {
        percentual,
        percentualFormatado: formatarPercentual(percentual),
        statusCalculo: "calculado",
        mensagem: "Entrega avaliada por regra binária"
      };
    }

    if (!metaNumero || realizadoNumero === null || (tipo === "percentual_inverso" && !realizadoNumero)) {
      return {
        percentual: null,
        percentualFormatado: "-",
        statusCalculo: "nao_aplicavel",
        mensagem: "Meta ou realizado ausente para cálculo"
      };
    }

    const percentual = tipo === "percentual_inverso"
      ? metaNumero / realizadoNumero
      : realizadoNumero / metaNumero;

    return {
      percentual,
      percentualFormatado: formatarPercentual(percentual),
      statusCalculo: "calculado",
      mensagem: "Cálculo realizado com sucesso"
    };
  }

  function calcularAcumulado(indicador, lancamentos) {
    const validos = lancamentos.filter((item) => item.realizadoMensal !== null && item.realizadoMensal !== "");
    if (!validos.length) {
      return {
        resultadoAcumulado: null,
        percentualAtingidoAcumulado: null,
        statusCalculo: "nao_aplicavel"
      };
    }

    if (indicador.tipoCalculo === "media_percentual") {
      const media = validos.reduce((soma, item) => soma + Number(item.percentualAtingido || 0), 0) / validos.length;
      return {
        resultadoAcumulado: media,
        percentualAtingidoAcumulado: media,
        statusCalculo: "calculado"
      };
    }

    const somaRealizado = validos.reduce((soma, item) => soma + Number(item.realizadoMensal || 0), 0);
    const somaMeta = validos.reduce((soma, item) => soma + Number(item.metaMensal || 0), 0);
    const percentual = somaMeta ? somaRealizado / somaMeta : null;

    return {
      resultadoAcumulado: somaRealizado,
      percentualAtingidoAcumulado: percentual,
      statusCalculo: percentual === null ? "nao_aplicavel" : "calculado"
    };
  }

  function calcularStatusDesempenho(percentual) {
    const valor = toNumber(percentual);
    if (valor === null) return "Sem cálculo";
    if (valor >= 1) return "Atingido";
    if (valor >= 0.8) return "Atenção";
    return "Crítico";
  }

  function formatarPercentual(valor) {
    const numero = toNumber(valor);
    if (numero === null) return "-";
    return `${(numero * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  }

  function formatarValor(valor, unidadeMedida) {
    const numero = toNumber(valor);
    if (numero === null) return "-";
    if (unidadeMedida === "moeda") {
      return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
    if (unidadeMedida === "percentual") {
      return formatarPercentual(numero);
    }
    return numero.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
  }

  window.Calculations = {
    calcularPercentual,
    calcularAcumulado,
    calcularStatusDesempenho,
    formatarPercentual,
    formatarValor
  };
})();
