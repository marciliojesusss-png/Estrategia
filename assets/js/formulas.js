(function (root) {
  function toNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
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

  function formatarPercentual(value) {
    const number = toNumber(value);
    if (number === null) return "-";
    return `${(number * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  }

  function formatarValor(value, unidadeMedida) {
    const number = toNumber(value);
    if (number === null) return "-";
    if (unidadeMedida === "percentual") return formatarPercentual(number);
    if (unidadeMedida === "moeda") return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    if (unidadeMedida === "pontos" || unidadeMedida === "pontos_percentuais") {
      return number.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    }
    return number.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
  }

  function ok(resultadoMensal, resultadoAcumulado, percentualMensal, percentualAcumulado, unidadeMedida, mensagem, extra = {}) {
    const resultadoOficial = extra.resultadoOficialAnual ?? resultadoAcumulado;
    const percentualAnual = extra.percentualAtingidoAnual ?? percentualAcumulado;
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
    return toNumber(raw(lancamento, nome));
  }

  function campoPercentual(lancamento, nome) {
    return normalizarPercentual(raw(lancamento, nome));
  }

  function texto(lancamento, nome) {
    const value = raw(lancamento, nome);
    return value === null || value === undefined ? "" : String(value).trim();
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
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);

    const temCampo = (nome) => (regra.camposEntrada || []).some((item) => item.nome === nome);
    const numeradorCampo = regra.parametrosCalculo?.numeradorCampo ||
      (temCampo("clientesComOfertaPersonalizada") ? "clientesComOfertaPersonalizada" : "realizadoMensal");
    const denominadorCampo = regra.parametrosCalculo?.denominadorCampo ||
      (temCampo("baseClientesAtivos") ? "baseClientesAtivos" : null);
    const meta = requireMeta(regra.parametrosCalculo?.metaReferencia ?? regra.metaAnualValor ?? lancamentoAtual.metaMensal, regra.unidadeMedida);
    if (meta.erro) return meta;

    let resultadoMensal;
    if (denominadorCampo) {
      const numerador = campo(lancamentoAtual, numeradorCampo);
      const denominador = campo(lancamentoAtual, denominadorCampo);
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

    const percentual = resultadoMensal / meta;
    return ok(resultadoMensal, resultadoMensal, percentual, percentual, regra.unidadeMedida);
  }

  function calcularReducaoGap(indicador, regra, lancamentoAtual) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const valor = campo(lancamentoAtual, regra.parametrosCalculo?.campoResultado || "npsRealizado");
    const base = toNumber(regra.parametrosCalculo?.notaBase);
    const metaFinal = toNumber(regra.parametrosCalculo?.metaFinalCalculada) || toNumber(regra.metaAnualValor);
    if (base === null || metaFinal === null || metaFinal === base) {
      return erro("Parâmetros de base e meta final são obrigatórios para redução de gap.", regra.unidadeMedida);
    }
    const percentual = (valor - base) / (metaFinal - base);
    return ok(valor, valor, percentual, percentual, regra.unidadeMedida);
  }
  function calcularCrescimentoMediaMensal(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);

    const qmaatuCampo = regra.parametrosCalculo?.qmaatuCampo ||
      ((regra.camposEntrada || []).some((item) => item.nome === "qmaatu") ? "qmaatu" : null);
    const qmaantCampo = regra.parametrosCalculo?.qmaantCampo ||
      ((regra.camposEntrada || []).some((item) => item.nome === "qmaant") ? "qmaant" : null);
    const meta = requireMeta(regra.parametrosCalculo?.metaCrescimento ?? regra.metaAnualValor, regra.unidadeMedida, "Meta de crescimento nao configurada.");
    if (meta.erro) return meta;

    if (qmaatuCampo && qmaantCampo) {
      const qmaatu = campo(lancamentoAtual, qmaatuCampo);
      const qmaant = campo(lancamentoAtual, qmaantCampo);
      if (qmaant === null || qmaant <= 0) return erro("QMAANT deve ser maior que zero para calculo do indicador.", regra.unidadeMedida);
      if (qmaatu === null || qmaatu < 0) return erro("QMAATU deve ser informado e nao pode ser negativo.", regra.unidadeMedida);
      const crescimento = qmaatu / qmaant - 1;
      return ok(crescimento, crescimento, crescimento / meta, crescimento / meta, regra.unidadeMedida, "Crescimento entre QMAATU e QMAANT calculado com sucesso.");
    }

    const campoValor = regra.parametrosCalculo?.campoValor || "clientesAtivosDigitaisMes";
    const base = toNumber(regra.parametrosCalculo?.qmaant || regra.parametrosCalculo?.mediaBaseAnoAnterior);
    if (!base) return erro("Base de comparacao do ano anterior nao cadastrada.", regra.unidadeMedida);
    const valores = valoresCampo(lancamentosAteMes(lancamentoAtual, lancamentosDoAno), campoValor);
    if (!valores.length) return erro("Nao ha valores mensais para calcular a media acumulada.", regra.unidadeMedida);
    const mediaAtual = valores.reduce((sum, value) => sum + value, 0) / valores.length;
    const crescimento = mediaAtual / base - 1;
    return ok(crescimento, crescimento, crescimento / meta, crescimento / meta, regra.unidadeMedida, "Crescimento por media mensal acumulada calculado com sucesso.");
  }
  function calcularPercentualAcumulado(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const campoValor = regra.parametrosCalculo?.campoValor || "melhoriasImplementadasMes";
    const baseline = toNumber(regra.parametrosCalculo?.baseline || regra.parametrosCalculo?.totalMelhoriasIdentificadasBaseline);
    const meta = requireMeta(regra.parametrosCalculo?.metaExecucao ?? regra.metaAnualValor, regra.unidadeMedida, "Meta de execução não configurada.");
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
    const meta = requireMeta(regra.metaAnualValor, regra.unidadeMedida, "Meta financeira anual não configurada.");
    if (meta.erro) return meta;

    let resultadoMensal;
    let acumulado;
    if (regra.parametrosCalculo?.valorAcumuladoCampo) {
      resultadoMensal = campo(lancamentoAtual, regra.parametrosCalculo.valorAcumuladoCampo);
      acumulado = ultimoCampo(ateMes, regra.parametrosCalculo.valorAcumuladoCampo);
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
      if (resultadoMensal === null || resultadoMensal < 0) return erro("Valor financeiro realizado deve ser informado e nÃ£o pode ser negativo.", regra.unidadeMedida);
      acumulado = somaCampo(ateMes, campoValor);
    }

    const metaMensalFixa = toNumber(regra.parametrosCalculo?.metaMensalFixa ?? regra.parametrosCalculo?.metaMensalPix);
    if (metaMensalFixa !== null) {
      if (metaMensalFixa <= 0) return erro("Meta mensal financeira deve ser maior que zero.", regra.unidadeMedida);
      const numeroMes = Number(lancamentoAtual.mes) || ateMes.length || 1;
      const metaAcumulada = metaMensalFixa * numeroMes;
      const percentualMensal = resultadoMensal / metaMensalFixa;
      const percentualAcumulado = acumulado / metaAcumulada;
      const situacao = percentualAcumulado >= 1 ? "Atingido" : percentualAcumulado >= 0.8 ? "Abaixo da meta" : "Critico";
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
      const metaMensal = requireMeta(lancamentoAtual.metaMensal, regra.unidadeMedida, "Meta de referÃªncia mensal nÃ£o configurada.");
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

  function calcularIndiceInversoAjustado(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const meta = requireMeta(regra.parametrosCalculo?.metaReferencia ?? regra.metaAnualValor, regra.unidadeMedida);
    if (meta.erro) return meta;

    if (regra.parametrosCalculo?.campoValor) {
      const resultado = regra.parametrosCalculo?.campoPercentual
        ? campoPercentual(lancamentoAtual, regra.parametrosCalculo.campoValor)
        : campo(lancamentoAtual, regra.parametrosCalculo.campoValor);
      if (resultado === null || resultado < 0) return erro("IEO realizado no mes deve ser informado e nao pode ser negativo.", regra.unidadeMedida);
      const percentual = resultado <= meta ? 1 : meta / resultado;
      return ok(resultado, resultado, percentual, percentual, regra.unidadeMedida, "IEO informado diretamente e comparado com a meta anual.", {
        resultadoOficialAnual: resultado,
        percentualAtingidoAnual: percentual,
        metaReferencia: meta,
        quantoMenorMelhor: true,
        situacao: resultado <= meta ? "Atingido" : "Nao atingido"
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

  function calcularIncrementoPontosPercentuais(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const base = toNumber(regra.parametrosCalculo?.participacaoBase);
    const metaIncremento = requireMeta(regra.parametrosCalculo?.metaIncremento ?? regra.metaAnualValor, regra.unidadeMedida, "Meta de incremento em p.p. não configurada.");
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

  function calcularProjetoMarcoEntrega(indicador, regra, lancamentoAtual) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const status = texto(lancamentoAtual, regra.parametrosCalculo?.campoStatus || "statusProjeto").toLowerCase();
    let percentual = clamp01(campo(lancamentoAtual, regra.parametrosCalculo?.campoPercentual || "percentualExecucao"));
    if (["entregue", "mvp entregue", "formalizado", "celebrada", "concluido", "concluído"].includes(status)) {
      percentual = 1;
    }
    if (percentual === null) return erro("Percentual de execução deve ser informado.", regra.unidadeMedida);
    return ok(percentual, percentual, percentual, percentual, regra.unidadeMedida, "Avanço de projeto calculado com sucesso.");
  }
  function calcularPontuacaoMinima(indicador, regra, lancamentoAtual) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const valor = campo(lancamentoAtual, regra.parametrosCalculo?.campoValor || "mediaGeralGPTW");
    const meta = requireMeta(
      toNumber(regra.parametrosCalculo?.metaReferencia) ||
        toNumber(lancamentoAtual.metaMensal) ||
        regra.metaAnualValor,
      regra.unidadeMedida
    );
    if (meta.erro) return meta;
    return ok(valor, valor, valor / meta, valor / meta, regra.unidadeMedida);
  }
  function calcularQuantidadeAcumulada(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const campoValor = regra.parametrosCalculo?.campoValor || "quantidadeRealizadaMes";
    const totalMelhoriasPlano = toNumber(regra.parametrosCalculo?.totalMelhoriasPlano2026);
    const metaMinimaMelhorias = toNumber(regra.parametrosCalculo?.metaMinimaMelhoriasAno);
    if (totalMelhoriasPlano && metaMinimaMelhorias) {
      const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
      const mensal = campo(lancamentoAtual, campoValor);
      if (mensal === null || mensal < 0) return erro("Melhorias entregues no mes deve ser informado e nao pode ser negativo.", regra.unidadeMedida);
      if (!Number.isInteger(mensal)) return erro("Melhorias entregues no mes deve ser numero inteiro.", regra.unidadeMedida);
      const acumulado = somaCampo(ateMes, campoValor);
      if (acumulado > totalMelhoriasPlano) {
        return erro("O total de melhorias entregues nao pode ser maior que o total de melhorias previstas no plano.", regra.unidadeMedida);
      }
      const percentualPlanoExecutado = acumulado / totalMelhoriasPlano;
      const percentualMetaAnualAtingida = acumulado / metaMinimaMelhorias;
      const situacao = acumulado >= metaMinimaMelhorias ? "Atingido" : acumulado > 0 ? "Em andamento" : "Nao iniciado";
      return ok(
        percentualPlanoExecutado,
        percentualPlanoExecutado,
        percentualMetaAnualAtingida,
        percentualMetaAnualAtingida,
        "percentual",
        "Aprimoramento da experiencia do cliente calculado por melhorias acumuladas.",
        {
          melhoriasEntreguesMes: mensal,
          melhoriasEntreguesAcumuladas: acumulado,
          totalMelhoriasPlano2026: totalMelhoriasPlano,
          metaMinimaMelhoriasAno: metaMinimaMelhorias,
          metaPercentualReferencia: toNumber(regra.parametrosCalculo?.metaPercentualReferencia),
          percentualPlanoExecutado,
          percentualMetaAnualAtingida,
          resultadoOficialAnual: percentualPlanoExecutado,
          percentualAtingidoAnual: percentualMetaAnualAtingida,
          situacao
        }
      );
    }
    const meta = requireMeta(regra.metaAnualValor, regra.unidadeMedida);
    if (meta.erro) return meta;
    const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
    const mensal = campo(lancamentoAtual, campoValor);
    const acumulado = somaCampo(ateMes, campoValor);
    return ok(mensal, acumulado, mensal / meta, acumulado / meta, regra.unidadeMedida);
  }

  function calcularPlanoAcaoPorElementos(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const campoValor = regra.parametrosCalculo?.campoValor || "elementosExecutadosAcumulado";
    const meta = requireMeta(regra.metaAnualValor, regra.unidadeMedida);
    if (meta.erro) return meta;
    const acumulado = Math.min(ultimoCampo(lancamentosAteMes(lancamentoAtual, lancamentosDoAno), campoValor) || 0, meta);
    return ok(acumulado, acumulado, acumulado / meta, acumulado / meta, regra.unidadeMedida);
  }

  function calcularInvestimentoPercentualLucro(indicador, regra, lancamentoAtual) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const investido = campo(lancamentoAtual, regra.parametrosCalculo?.campoInvestimento || "valorInvestidoAcumulado");
    const lucro = campo(lancamentoAtual, regra.parametrosCalculo?.campoLucro || "lucroLiquidoBase");
    const percentualLucro = toNumber(regra.parametrosCalculo?.percentualLucro) || 0.0033;
    if (lucro === null || lucro <= 0) return erro("Lucro líquido base deve ser maior que zero para calcular a meta financeira.", regra.unidadeMedida);
    const metaFinanceira = lucro * percentualLucro;
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
    return ok(resultado, resultado, resultado, resultado, regra.unidadeMedida);
  }

  function calcularCrescimentoRelativoParticipacao(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);

    let base = campo(lancamentoAtual, regra.parametrosCalculo?.campoReferencia2025 || "participacaoEcossistema2025");
    if (base !== null && base > 1 && base <= 100) {
      base /= 100;
    }
    if (base === null) {
      const numerador2025 = campo(lancamentoAtual, regra.parametrosCalculo?.campoNumerador2025 || "arrecadacaoEcossistema2025");
      const denominador2025 = campo(lancamentoAtual, regra.parametrosCalculo?.campoDenominador2025 || "arrecadacaoTotal2025");
      if (numerador2025 !== null || denominador2025 !== null) {
        if (!denominador2025 || denominador2025 <= 0) return erro("Arrecadação total de 2025 deve ser maior que zero.", regra.unidadeMedida);
        if (numerador2025 < 0 || numerador2025 > denominador2025) return erro("Arrecadação via ecossistema em 2025 deve estar entre zero e a arrecadação total de 2025.", regra.unidadeMedida);
        base = numerador2025 / denominador2025;
      }
    }

    const crescimentoMeta = toNumber(regra.parametrosCalculo?.metaCrescimento ?? 0.1);
    if (base === null || base <= 0) return erro("Resultado referência de 2025 não informado. Não é possível calcular a meta 2026.", regra.unidadeMedida);

    const ateMes = lancamentosAteMes(lancamentoAtual, lancamentosDoAno);
    const numerador = somaCampo(ateMes, regra.parametrosCalculo?.campoNumerador);
    const denominador = somaCampo(ateMes, regra.parametrosCalculo?.campoDenominador);
    if (denominador <= 0) return erro("Não foi possível calcular o indicador, pois o denominador informado é zero.", regra.unidadeMedida);
    if (numerador < 0 || numerador > denominador) return erro("Arrecadação via ecossistema em 2026 deve estar entre zero e a arrecadação total de 2026.", regra.unidadeMedida);

    const participacao = numerador / denominador;
    const metaCalculada2026 = base * (1 + crescimentoMeta);
    const crescimentoVs2025 = (participacao - base) / base;
    const percentualAtingido = participacao / metaCalculada2026;
    return ok(participacao, participacao, percentualAtingido, percentualAtingido, regra.unidadeMedida, "Crescimento relativo da participação calculado.", {
      resultadoReferencia2025: base,
      metaCalculada2026,
      crescimentoVs2025
    });
  }

  function calcularCrescimentoRelativoValor(indicador, regra, lancamentoAtual, lancamentosDoAno) {
    const required = validarObrigatorios(regra, lancamentoAtual);
    if (required) return erro(required, regra.unidadeMedida);
    const meta = requireMeta(regra.parametrosCalculo?.metaCrescimento ?? regra.metaAnualValor, regra.unidadeMedida);
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
      case "indice_inverso_ajustado":
        return calcularIndiceInversoAjustado(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "incremento_pontos_percentuais":
        return calcularIncrementoPontosPercentuais(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "projeto_marco_entrega":
        return calcularProjetoMarcoEntrega(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "pontuacao_minima":
        return calcularPontuacaoMinima(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "quantidade_acumulada":
        return calcularQuantidadeAcumulada(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "plano_acao_por_elementos":
        return calcularPlanoAcaoPorElementos(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "investimento_percentual_lucro":
        return calcularInvestimentoPercentualLucro(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "percentual_execucao_plano_acao":
        return calcularPercentualExecucaoPlanoAcao(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "crescimento_relativo_participacao":
        return calcularCrescimentoRelativoParticipacao(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "crescimento_relativo_valor":
        return calcularCrescimentoRelativoValor(indicador, regra, lancamentoAtual, lancamentosDoAno);
      case "cobertura_capacitacao_minima":
        return calcularPercentualDireto(indicador, regra, lancamentoAtual, lancamentosDoAno);
      default:
        return erro("Tipo de cálculo não configurado para este indicador.", regra.unidadeMedida);
    }
  }

  const api = {
    obterRegra,
    regraFallback,
    toNumber,
    normalizarPercentual,
    calcularIndicador,
    calcularPercentualDireto,
    calcularReducaoGap,
    calcularCrescimentoMediaMensal,
    calcularPercentualAcumulado,
    calcularValorFinanceiroAcumulado,
    calcularIndiceInversoAjustado,
    calcularIncrementoPontosPercentuais,
    calcularProjetoMarcoEntrega,
    calcularPontuacaoMinima,
    calcularQuantidadeAcumulada,
    calcularPlanoAcaoPorElementos,
    calcularInvestimentoPercentualLucro,
    calcularPercentualExecucaoPlanoAcao,
    calcularCrescimentoRelativoParticipacao,
    calcularCrescimentoRelativoValor
  };

  root.IndicatorFormulas = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
