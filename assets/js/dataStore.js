(function () {
  const DATA_FILES = {
    usuarios: "usuarios",
    planos: "planos",
    pilares: "pilares",
    unidades: "unidades",
    diretorias: "diretorias",
    indicadores: "indicadores",
    metas: "metas",
    regrasIndicadores: "regrasIndicadores",
    fechamentosConselhoAdministracao: "fechamentosConselhoAdministracao",
    lancamentos: "lancamentos",
    homologacoes: "homologacoes",
    solicitacoesReabertura: "solicitacoesReabertura",
    historico: "historico"
  };

  const INDICATOR_NAMES = [
    "Índice de Ofertas Personalizadas aos Clientes Ativos",
    "Índice de Satisfação de Clientes — NPS",
    "Índice de Clientes Ativos em Canais Digitais",
    "Aprimoramento da Experiência do Cliente",
    "Gross Gaming Revenue (GGR)",
    "IEO Recorrente (Índice de Eficiência Operacional Recorrente)",
    "Lucro Líquido Recorrente",
    "Vendas Provenientes de Canais Digitais",
    "Vendas com Meio de Pagamento PIX",
    "Share da Plataforma de Jogos",
    "Ampliar a Capacidade de Desenvolvimento de Soluções de TIC",
    "Clima Organizacional (Pesquisa GPTW)",
    "Mulheres Chefes de Unidade e Gestoras",
    "Gestores Negros, Amarelos, Pardos ou Indígenas e/ou PcD",
    "Capacitação dos Empregados da CAIXA Loterias",
    "Apoio ao Desenvolvimento Socioambiental",
    "Repasse Social",
    "Princípios de Jogo Responsável (WLA)",
    "Incentivo Socioambiental",
    "Visibilidade dos Repasses Sociais das Loterias CAIXA",
    "Jogo Responsável 2026 (Capacitação e Disseminação)",
    "Arrecadação Gerada com o Ecossistema",
    "Participação da Rede Lotérica nos Negócios da CAIXA Loterias"
  ];
  const PILLAR_NAMES = [
    "Cliente no Centro",
    "Eficiência e Rentabilidade",
    "Tecnologia e Inovação",
    "Pessoas, Cultura e Agilidade",
    "Sustentabilidade e Cidadania",
    "Atuação em Ecossistema"
  ];
  const PIX_OPERATIONAL_TARGETS_2026 = [0.63, 0.61, 0.61, 0.61, 0.61, 0.62, 0.63, 0.63, 0.63, 0.6342, 0.6383, 0.6543];
  const CLIENTES_ATIVOS_DIGITAIS_METAS_2026 = Object.freeze(Object.fromEntries(
    Array.from({ length: 12 }, (_, index) => [`2026-${String(index + 1).padStart(2, "0")}`, 0.28])
  ));
  const CLIENTES_ATIVOS_DIGITAIS_APRESENTACOES_2026 = Object.freeze({
    "1TRI/2026": { metaOficialReportada: 0.28, resultadoOficialReportado: 0.7441, percentualAtingidoOficialReportado: 2.6573, situacaoOficial: "Atingido", fonte: "Informe DILOT/GERIN nº 0029/2026" },
    "2TRI/2026": { metaOficialReportada: 0.28, resultadoOficialReportado: 0.6216, percentualAtingidoOficialReportado: 2.22, situacaoOficial: "Atingido", fonte: "Informe DILOT/GERIN nº 0056/2026" },
    "3TRI/2026": { metaOficialReportada: 0.28, resultadoOficialReportado: 0.527, percentualAtingidoOficialReportado: 1.8821, situacaoOficial: "Atingido", fonte: "Informe DILOT/GERIN nº 0078/2026" },
    "4TRI/2026": { metaOficialReportada: 0.28, resultadoOficialReportado: null, percentualAtingidoOficialReportado: null, situacaoOficial: null, fonte: null }
  });
  const ECOSSISTEMA_COMPONENTES_2025 = Object.freeze({
    "2026-01": { arrTotal2025: 1683348694.70, arrEcoMarketplace2025: 44669058.91, arrEcoLotex2025: 18372000.00 },
    "2026-02": { arrTotal2025: 3825271538.60, arrEcoMarketplace2025: 102809429.06, arrEcoLotex2025: 41002000.00 },
    "2026-03": { arrTotal2025: 5504494123.70, arrEcoMarketplace2025: 138489885.56, arrEcoLotex2025: 49752400.00 },
    "2026-04": { arrTotal2025: 7311446900.40, arrEcoMarketplace2025: 181863299.30, arrEcoLotex2025: 64680800.00 },
    "2026-05": { arrTotal2025: 9239173439.20, arrEcoMarketplace2025: 221211168.37, arrEcoLotex2025: 77936800.00 },
    "2026-06": { arrTotal2025: 11569679632.60, arrEcoMarketplace2025: 288625494.59, arrEcoLotex2025: 89935200.00 },
    "2026-07": { arrTotal2025: 13555540052.00, arrEcoMarketplace2025: 334933864.05, arrEcoLotex2025: 105266400.00 },
    "2026-08": { arrTotal2025: 15436581916.40, arrEcoMarketplace2025: 376653655.87, arrEcoLotex2025: 119416800.00 },
    "2026-09": { arrTotal2025: 17998386148.80, arrEcoMarketplace2025: 463811538.74, arrEcoLotex2025: 133276716.00 },
    "2026-10": { arrTotal2025: 20122961323.00, arrEcoMarketplace2025: 523039091.53, arrEcoLotex2025: 148573820.75 },
    "2026-11": { arrTotal2025: 21913607953.15, arrEcoMarketplace2025: 571706233.81, arrEcoLotex2025: 162745531.00 },
    "2026-12": { arrTotal2025: 26612476457.00, arrEcoMarketplace2025: 746339639.03, arrEcoLotex2025: 173831435.50 }
  });
  const ECOSSISTEMA_COMPONENTES_2026 = Object.freeze({
    "2026-01": { arrTotal2026: 2030288935.15, arrEcoMarketplace2026: 77531427.39, arrEcoLotex2026: 13719322.25 },
    "2026-02": { arrTotal2026: 3984905576.50, arrEcoMarketplace2026: 143041561.04, arrEcoLotex2026: 26620128.00 },
    "2026-03": { arrTotal2026: 5966912490.55, arrEcoMarketplace2026: 202465482.39, arrEcoLotex2026: 39819048.75 },
    "2026-04": { arrTotal2026: 8003703396.75, arrEcoMarketplace2026: 270736084.49, arrEcoLotex2026: 51968448.25 },
    "2026-05": { arrTotal2026: 10133231872.35, arrEcoMarketplace2026: 348500290.44, arrEcoLotex2026: 63966773.50 },
    "2026-06": { arrTotal2026: 12191958306.55, arrEcoMarketplace2026: 439830252.32, arrEcoLotex2026: 74144913.25 },
    "2026-07": { arrTotal2026: 14157139768.80, arrEcoMarketplace2026: 512915099.64, arrEcoLotex2026: 87677530.50 },
    "2026-08": { arrTotal2026: 16122321231.05, arrEcoMarketplace2026: 595072496.25, arrEcoLotex2026: 101554152.00 }
  });
  const ECOSSISTEMA_APRESENTACOES_2026 = Object.freeze({
    "1TRI": { metaOficialReportada: 0.0099, resultadoOficialReportado: 0.0067, percentualAtingidoOficialReportado: 0.6712, situacaoOficial: "Abaixo da meta", fonte: "Informe DILOT/GERIN nº 0029/2026" },
    "2TRI": { metaOficialReportada: 0.0086, resultadoOficialReportado: 0.0061, percentualAtingidoOficialReportado: 0.7112, situacaoOficial: "Abaixo da meta", fonte: "Informe DILOT/GERIN nº 0056/2026" },
    "3TRI": { metaOficialReportada: 0.0075, resultadoOficialReportado: 0.0060, percentualAtingidoOficialReportado: 0.80, situacaoOficial: "Abaixo da meta", fonte: "Informe DILOT/GERIN nº 0078/2026" },
    "4TRI": { metaOficialReportada: 0.0066, resultadoOficialReportado: null, percentualAtingidoOficialReportado: null, situacaoOficial: null, fonte: null }
  });
  const ECOSSISTEMA_HISTORICO_REVISAO_2026 = Object.freeze({
    aplicaAoCalculo: false,
    fonte: "Informe DILOT/GERIN nº 0078/2026",
    metasRetrospectivas: { "1TRI": 0.0091, "2TRI": 0.0079 }
  });
  const REDE_LOTERICA_CURVA_INDICE_2026 = {
    "1TRI": { metaIndice: 1.005 },
    "2TRI": { metaIndice: 1.010 },
    "3TRI": { metaIndice: 1.015 },
    "4TRI": { metaIndice: 1.020 }
  };
  const REDE_LOTERICA_METAS_INDICE_2026 = Object.freeze({
    "2026-01": 1.005, "2026-02": 1.005, "2026-03": 1.005,
    "2026-04": 1.010, "2026-05": 1.010, "2026-06": 1.010,
    "2026-07": 1.015, "2026-08": 1.015, "2026-09": 1.015,
    "2026-10": 1.020, "2026-11": 1.020, "2026-12": 1.020
  });
  const REDE_LOTERICA_APRESENTACOES_2026 = Object.freeze({
    "1TRI": { metaTecnicaIndice: 1.005, resultadoTecnicoIndice: 1.0057, metaOficialReportada: 0.005, resultadoOficialReportado: 0.0057, percentualAtingidoOficialReportado: 1.1386, escalaResultadoDocumental: "incremento", situacao: "Atingido", fonte: "Informe DILOT/GERIN nº 0029/2026" },
    "2TRI": { metaTecnicaIndice: 1.010, resultadoTecnicoIndice: 0.9880, resultadoOficialReportado: 0.9880, percentualAtingidoOficialReportado: 0.9784, escalaResultadoDocumental: "indice", situacao: "Abaixo da meta", fonte: "Informe DILOT/GERIN nº 0056/2026" },
    "3TRI": { metaTecnicaIndice: 1.015, resultadoTecnicoIndice: 0.9816, resultadoOficialReportado: 0.9816, percentualAtingidoOficialReportado: 0.9671, escalaResultadoDocumental: "indice", situacao: "Abaixo da meta", fonte: "Informe DILOT/GERIN nº 0078/2026" },
    "4TRI": { metaTecnicaIndice: 1.020, resultadoTecnicoIndice: null, resultadoOficialReportado: null, percentualAtingidoOficialReportado: null, escalaResultadoDocumental: "indice", situacao: null, fonte: null }
  });
  const APRIMORAMENTO_CURVA_TRIMESTRAL_2026 = {
    "1TRI/2026": { metaPercentual: 0.0454, metaQuantidadeAcumulada: 1 },
    "2TRI/2026": { metaPercentual: 0.1364, metaQuantidadeAcumulada: 3 },
    "3TRI/2026": { metaPercentual: 0.1818, metaQuantidadeAcumulada: 4 },
    "4TRI/2026": { metaPercentual: 0.25, metaQuantidadeAcumulada: 6 }
  };
  const TIPOS_POSICAO_APRIMORAMENTO = [
    { value: "", label: "Selecione..." },
    { value: "acompanhamento", label: "Acompanhamento" },
    { value: "fechamento_quantitativo", label: "Fechamento quantitativo" }
  ];
  const CAPACIDADE_TIC_CURVA_TRIMESTRAL_2026 = {
    "1TRI/2026": { metaPercentual: 0.35, marcoEsperado: "Realização de Consulta Pública de Informações - RFI" },
    "2TRI/2026": { metaPercentual: 0.70, marcoEsperado: "Realização de Consulta Pública de Propostas - RFP" },
    "3TRI/2026": { metaPercentual: 0.85, marcoEsperado: "Iniciação da Fase Seleção" },
    "4TRI/2026": { metaPercentual: 1.00, marcoEsperado: "Contrato assinado com fornecedor" }
  };
  const CAPACIDADE_TIC_MARCOS = [
    { label: "Não iniciado", percentual: 0 },
    { label: "Consulta Pública de Informações - RFI realizada", percentual: 0.35 },
    { label: "Consulta Pública de Propostas - RFP realizada", percentual: 0.70 },
    { label: "Fase de Seleção iniciada", percentual: 0.85 },
    { label: "Contrato assinado com fornecedor", percentual: 1.00 }
  ];
  const PRINCIPIOS_JOGO_RESPONSAVEL_CURVA_2026 = {
    "1TRI/2026": { metaElementosAcumulados: 1 },
    "2TRI/2026": { metaElementosAcumulados: 2 },
    "3TRI/2026": { metaElementosAcumulados: 5 },
    "4TRI/2026": { metaElementosAcumulados: 10 }
  };
  const ELEMENTOS_JOGO_RESPONSAVEL = [
    "Pesquisa",
    "Programa para empregados",
    "Programa para revendedores",
    "Desenho para jogos",
    "Canais de jogos remotos",
    "Publicidade, comunicação e marketing",
    "Educação do jogador",
    "Orientação ao jogador para tratamento",
    "Envolvimento das partes interessadas",
    "Relatório de medições e riscos"
  ];
  const STATUS_ACAO_JOGO_RESPONSAVEL = [
    "Não iniciada",
    "Em andamento",
    "Concluída",
    "Homologada",
    "Cancelada"
  ];
  const STATUS_PROJETO_PLATAFORMA_JOGOS = [
    "Não iniciado",
    "Em planejamento",
    "Em andamento",
    "Piloto/MVP em desenvolvimento",
    "Piloto/MVP concluído",
    "Cancelado"
  ];
  const MARCOS_PLATAFORMA_JOGOS_2026 = [
    { label: "Não iniciado", percentualReferencia: 0 },
    { label: "Equipe do projeto alocada", percentualReferencia: null },
    { label: "Kickoff realizado", percentualReferencia: null },
    { label: "Sprints iniciais executadas", percentualReferencia: null },
    { label: "Arquitetura do sistema em definição", percentualReferencia: null },
    { label: "Ambiente tecnológico criado", percentualReferencia: null },
    { label: "Acessos concedidos", percentualReferencia: null },
    { label: "Funcionalidade negocial definida", percentualReferencia: null },
    { label: "Registro de Aposta finalizado em ambiente de desenvolvimento", percentualReferencia: null },
    { label: "Desenvolvimento do MVP em acompanhamento", percentualReferencia: null },
    { label: "Evolução acumulada do MVP no 3TRI", percentualReferencia: 0.38 },
    { label: "Piloto/MVP concluído", percentualReferencia: 1 }
  ];
  const PLATAFORMA_JOGOS_METAS_2026 = Object.freeze({
    "1TRI/2026": null,
    "2TRI/2026": 1 / 3,
    "3TRI/2026": 0.67,
    "4TRI/2026": 1
  });
  const APOIO_SOCIOAMBIENTAL_CURVA_2026 = {
    "1TRI/2026": {
      metaPercentual: 0,
      metaQuantidadeAcumulada: 0,
      marcoEsperado: "Sem meta de entrega no período; projetos em prospecção e estruturação"
    },
    "2TRI/2026": {
      metaPercentual: 0.50,
      metaQuantidadeAcumulada: 1,
      marcoEsperado: "1ª iniciativa realizada"
    },
    "3TRI/2026": {
      metaPercentual: 0.50,
      metaQuantidadeAcumulada: 1,
      marcoEsperado: "Manutenção do acumulado de 50%, considerando a meta do 2TRI"
    },
    "4TRI/2026": {
      metaPercentual: 1.00,
      metaQuantidadeAcumulada: 2,
      marcoEsperado: "2ª iniciativa realizada"
    }
  };
  const STATUS_INICIATIVA_SOCIOAMBIENTAL = [
    "Não iniciada",
    "Em prospecção",
    "Em estruturação",
    "Em rito de governança",
    "Apoiada/realizada",
    "Cancelada"
  ];
  const VISIBILIDADE_REPASSES_CURVA_2026 = {
    "1TRI/2026": {
      metaPercentual: 0,
      metaAcoesRealizadasAcumuladas: 0,
      marcoEsperado: "Sem meta de entrega no período; relatório em elaboração/homologação"
    },
    "2TRI/2026": {
      metaPercentual: 0.50,
      metaAcoesRealizadasAcumuladas: 1,
      marcoEsperado: "Publicar relatório institucional \"A Sorte em Números — 2025\""
    },
    "3TRI/2026": {
      metaPercentual: 0.50,
      metaAcoesRealizadasAcumuladas: 1,
      marcoEsperado: "Sem nova meta no período; acumulado de 50% considerando a meta do 2TRI"
    },
    "4TRI/2026": {
      metaPercentual: 1.00,
      metaAcoesRealizadasAcumuladas: 2,
      marcoEsperado: "Realizar campanha publicitária exclusiva sobre repasse social das Loterias CAIXA"
    }
  };
  const ACOES_VISIBILIDADE_REPASSES_2026 = [
    {
      id: "relatorio_sorte_em_numeros_2025",
      nome: "Publicar relatório institucional \"A Sorte em Números — 2025\"",
      semestrePrevisto: "1º semestre/2026",
      pesoPercentual: 0.50
    },
    {
      id: "campanha_repasses_sociais",
      nome: "Realizar campanha publicitária exclusiva com foco no repasse social das Loterias CAIXA",
      semestrePrevisto: "2º semestre/2026",
      pesoPercentual: 0.50
    }
  ];
  const STATUS_ACAO_VISIBILIDADE = [
    "Não iniciada",
    "Em planejamento",
    "Em elaboração",
    "Em homologação",
    "Publicada/realizada",
    "Cancelada"
  ];
  const GGR_META_ACUMULADA_2026 = {
    "2026-01": 1056593039,
    "2026-02": 1997659493,
    "2026-03": 3070246140.78,
    "2026-04": 4193018946.75,
    "2026-05": 5285128207.78,
    "2026-06": 6782063824.52,
    "2026-07": 7644597006.08,
    "2026-08": 8771034926.84,
    "2026-09": 10271204883.87,
    "2026-10": 11442642920,
    "2026-11": 12525118608,
    "2026-12": 14996238568.92
  };
  const CANAIS_DIGITAIS_METAS_2026 = Object.freeze({
    "2026-01": 0.2770,
    "2026-02": 0.2829,
    "2026-03": 0.2805,
    "2026-04": 0.2803,
    "2026-05": 0.2798,
    "2026-06": 0.2798,
    "2026-07": 0.2815,
    "2026-08": 0.2827,
    "2026-09": 0.2837,
    "2026-10": 0.2859,
    "2026-11": 0.2878,
    "2026-12": 0.2911
  });
  const IEO_META_ACUMULADA_2026 = window.IeoRecorrente?.IEO_META_MENSAL_2026 || Object.freeze({});
  const REPASSE_SOCIAL_META_ACUMULADA_2026 = {
    "2026-01": 737118539.30,
    "2026-02": 1394613495.00,
    "2026-03": 2142991572.00,
    "2026-04": 2926098294.00,
    "2026-05": 3688125380.00,
    "2026-06": 4545104157.26,
    "2026-07": 5335136942.72,
    "2026-08": 6121095220.48,
    "2026-09": 7165115749.39,
    "2026-10": 7982318714.00,
    "2026-11": 8738217864.00,
    "2026-12": 10452751135.00
  };
  const LUCRO_RECORRENTE_META_MENSAL_2026 = window.LucroRecorrente?.METAS_MENSAIS_2026 || Object.freeze({
    "2026-01": 89555555.56,
    "2026-02": 89555555.55,
    "2026-03": 89555555.56,
    "2026-04": 89555555.55,
    "2026-05": 89555555.56,
    "2026-06": 89555555.55,
    "2026-07": 89555555.56,
    "2026-08": 89555555.55,
    "2026-09": 89555555.56,
    "2026-10": 89555555.56,
    "2026-11": 89555555.55,
    "2026-12": 223888888.89
  });
  const LUCRO_RECORRENTE_META_ACUMULADA_2026 = window.LucroRecorrente?.METAS_ACUMULADAS_2026 || Object.freeze(Object.entries(LUCRO_RECORRENTE_META_MENSAL_2026)
    .reduce((curve, [competence, monthlyTarget]) => {
      const previousCents = Object.values(curve).at(-1);
      const accumulatedCents = Math.round(monthlyTarget * 100) + Math.round((previousCents || 0) * 100);
      curve[competence] = accumulatedCents / 100;
      return curve;
    }, {}));
  const CURRENCY_FIELD_NAMES = new Set([
    "ggrRealizadoMes",
    "arrecadacaoTotalMes",
    "premiosAPagarMes",
    "despesaPessoalMes",
    "despesasAdministrativasMes",
    "receitasLiquidasMes",
    "lucroLiquidoRecorrenteCompetencia",
    "lucroLiquidoRecorrenteAcumulado",
    "arrecadacaoCanaisEletronicosMes",
    "arrecadacaoTotalProdutosLoteriasMes",
    "arrecadacaoPixMes",
    "arrecadacaoTotalCanaisEletronicosMes",
    "arrecadacaoPixAcumuladaCompetencia",
    "arrecadacaoTotalCanaisEletronicosAcumuladaCompetencia",
    "pixAcumuladoTrimestre",
    "canaisAcumuladoTrimestre",
    "repasseSocialAcumulado",
    "repasseSocialAcumuladoCompetencia",
    "valorInvestidoAcumulado",
    "valorInvestidoMes",
    "valorInvestidoAcumuladoCompetencia",
    "lucroLiquidoBase",
    "arrecadacaoEcossistemaMes",
    "arrecadacaoEcossistemaMes2026",
    "arrecadacaoEcossistemaAcumulada2026",
    "arrecadacaoEcossistema2025PeriodoEquivalente",
    "arrecadacaoEcossistema2025Acumulada",
    "arrecadacaoEcossistema2026PeriodoAtual",
    "arrecadacaoEcossistema2025",
    "arrecadacaoTotal2025",
    "arrecadacaoRedeLotericaMes2026",
    "arrecadacaoRedeLotericaMes2025",
    "arrecadacaoRedeLotericaAcumulada2026",
    "arrecadacaoRedeLoterica2026PeriodoAtual",
    "arrecadacaoRedeLoterica2025PeriodoEquivalente",
    "arrecadacaoRedeLoterica2025Acumulada",
    "arrecadacaoTotalLoteriasPeriodo"
  ]);
  const INTEGER_FIELD_NAMES = new Set([
    "baseClientesAtivosCompetencia",
    "clientesUnicosComOfertaPersonalizadaCompetencia",
    "qmaatu",
    "qmaant",
    "melhoriasImplementadasMes",
    "melhoriasImplementadasAcumuladas",
    "mulheresGestorasMes",
    "gestoresEnquadradosMes",
    "totalGestoresMes",
    "publicoAlvoElegivelCapacitacao",
    "empregadosCapacitadosCapacitacao",
    "quantidadeCursosMinimaCapacitacao",
    "publicoAlvoElegivelJR",
    "empregadosCapacitadosJR",
    "quantidadeMinimaIniciativasJR"
  ]);
  const CP1252_BYTES = {
    "€": 0x80, "‚": 0x82, "Æ’": 0x83, "„": 0x84, "…": 0x85,
    "†": 0x86, "‡": 0x87, "Ë†": 0x88, "‰": 0x89, "Å ": 0x8a,
    "‹": 0x8b, "Å’": 0x8c, "Å½": 0x8e, "‘": 0x91, "’": 0x92,
    "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
    "Ëœ": 0x98, "™": 0x99, "Å¡": 0x9a, "›": 0x9b, "Å“": 0x9c,
    "Å¾": 0x9e, "Å¸": 0x9f
  };
  const TEXT_REPLACEMENTS = [
    ["Efici\u003fncia", "Eficiência"], ["Inova\u003fo", "Inovação"], ["Atua\u003fo", "Atuação"],
    ["Mar\u003fo", "Março"], ["Estrat\u003fgico", "Estratégico"], ["Neg\u003fcios", "Negócios"],
    ["Relat\u003frio", "Relatório"], ["relat\u003frio", "relatório"], ["A\u003fo", "Ação"],
    ["a\u003fo", "ação"], ["Conclu\u003fda", "Concluída"], ["conclu\u003fdas", "concluídas"],
    ["l\u003fquido", "líquido"], ["Arrecada\u003fo", "Arrecadação"],
    ["eletr\u003fnicos", "eletrônicos"], ["lot\u003fricos", "lotéricos"],
    ["execu\u003fo", "execução"], ["Evid\u003fncia", "Evidência"], ["N\u003fmero", "Número"],
    ["M\u003fdia", "Média"], ["Refer\u003fncia", "Referência"], ["Gest\u003fo", "Gestão"],
    ["N\u003fo", "Não"], ["n\u003fo", "não"], ["m\u003fs", "mês"], ["M\u003fs", "Mês"],
    ["≥", "≥"], ["≤", "≤"]
  ];
  const OPERATIONAL_NULL_FIELDS = [
    "realizado",
    "realizadoMensal",
    "valorRealizado",
    "resultadoMensal",
    "percentualManual",
    "percentualAtingido",
    "percentualAtingidoMensal",
    "resultadoAcumulado",
    "percentualAcumulado",
    "resultadoOficialAnual",
    "percentualAtingidoAnual",
    "percentualAtingidoAcumulado"
  ];
  const OPERATIONAL_TEXT_FIELDS = [
    "justificativa",
    "observacaoArea",
    "observacaoDiretoria",
    "evidencia",
    "linkEvidencia",
    "arquivoEvidencia",
    "motivoDevolucao"
  ];
  const OPERATIONAL_USER_DATE_FIELDS = [
    "preenchidoPor",
    "dataPreenchimento",
    "enviadoPor",
    "dataEnvioHomologacao",
    "homologadoPor",
    "dataHomologacao",
    "devolvidoPor",
    "dataDevolucao"
  ];
  const cache = {};
  const writeQueues = {};
  let jsonDbAvailable = null;
  const MESES = [
    [1, "Janeiro"],
    [2, "Fevereiro"],
    [3, "Março"],
    [4, "Abril"],
    [5, "Maio"],
    [6, "Junho"],
    [7, "Julho"],
    [8, "Agosto"],
    [9, "Setembro"],
    [10, "Outubro"],
    [11, "Novembro"],
    [12, "Dezembro"]
  ];
  function mesesEsperados(indicador) {
    const expected = window.IndicatorPeriodicity?.trackingMonths(indicador) || MESES.map(([mes]) => mes);
    const expectedSet = new Set(expected.map(Number));
    return MESES.filter(([mes]) => expectedSet.has(mes));
  }
  const NPS_REFERENCIAS_2026 = {
    "2026-01": 55,
    "2026-02": 55,
    "2026-03": 55,
    "2026-04": 58,
    "2026-05": 58,
    "2026-06": 60,
    "2026-07": 60,
    "2026-08": 60,
    "2026-09": 60,
    "2026-10": 60,
    "2026-11": 60,
    "2026-12": 60
  };
  const TIPOS_POSICAO_NPS = [
    "Baseline",
    "Acompanhamento",
    "Pesquisa oficial",
    { value: "ultima_pesquisa_disponivel", label: "Última pesquisa disponível" },
    "Revisão metodológica",
    "Fechamento anual"
  ];
  const TIPOS_POSICAO_CLIMA = [
    "Acompanhamento",
    "Plano de ação",
    "Pesquisa oficial",
    "Revisão metodológica",
    "Fechamento anual"
  ];
  const CAPACITACAO_EMPREGADOS_CURVA_TRIMESTRAL_2026 = {
    "1TRI/2026": {
      metaCobertura: 0.90,
      quantidadeCursosMinima: 1,
      descricao: "90% do público-alvo com 01 curso concluído: Curso de Jogo Responsável"
    },
    "2TRI/2026": {
      metaCobertura: 0.90,
      quantidadeCursosMinima: 2,
      descricao: "90% do público-alvo com 02 cursos concluídos acumulados"
    },
    "3TRI/2026": {
      metaCobertura: 0.90,
      quantidadeCursosMinima: 4,
      descricao: "90% do público-alvo com 04 cursos concluídos acumulados"
    },
    "4TRI/2026": {
      metaCobertura: 0.90,
      quantidadeCursosMinima: 5,
      descricao: "90% do público-alvo com 05 cursos concluídos acumulados"
    }
  };
  const JOGO_RESPONSAVEL_CAPACITACAO_CURVA_2026 = {
    "1TRI/2026": {
      metaCobertura: 0.90,
      quantidadeMinimaIniciativas: 1,
      descricao: "90% do público-alvo com pelo menos 1 ação de disseminação de Jogo Responsável concluída"
    },
    "2TRI/2026": {
      metaCobertura: 0.90,
      quantidadeMinimaIniciativas: 2,
      descricao: "90% do público-alvo com pelo menos 2 iniciativas de Jogo Responsável concluídas"
    },
    "3TRI/2026": {
      metaCobertura: 0.90,
      quantidadeMinimaIniciativas: 2,
      descricao: "90% do público-alvo com pelo menos 2 iniciativas de Jogo Responsável concluídas"
    },
    "4TRI/2026": {
      metaCobertura: 0.90,
      quantidadeMinimaIniciativas: 2,
      descricao: "90% do público-alvo com pelo menos 2 iniciativas de Jogo Responsável concluídas"
    }
  };
  const INCENTIVO_SOCIOAMBIENTAL_CURVA_2026 = {
    "1TRI/2026": {
      metaPercentualLucro: 0,
      metaValorAcumulado: 0,
      marcoEsperado: "Sem meta de investimento no período; projetos em prospecção e estruturação"
    },
    "2TRI/2026": {
      metaPercentualLucro: 0.0005,
      metaValorAcumulado: 652700,
      marcoEsperado: "Investimento acumulado de 0,05% do lucro líquido de referência"
    },
    "3TRI/2026": {
      metaPercentualLucro: 0.0010,
      metaValorAcumulado: 1305400,
      marcoEsperado: "Investimento acumulado de 0,10% do lucro líquido de referência"
    },
    "4TRI/2026": {
      metaPercentualLucro: 0.0033,
      metaValorAcumulado: 4307900,
      marcoEsperado: "Investimento acumulado de 0,33% do lucro líquido de referência"
    }
  };
  const STATUS_INCENTIVO_SOCIOAMBIENTAL = [
    "Não iniciado",
    "Em prospecção",
    "Em estruturação",
    "Em rito de governança",
    "Aprovado",
    "Investimento realizado",
    "Cancelado"
  ];

  function isPhpBackend() {
    return typeof window !== "undefined" &&
      window.location?.protocol?.startsWith("http") &&
      Boolean(window.CAIXA_LOTERIAS_AUTH_USER);
  }

  function currentProfileCode() {
    const raw = String(
      window.CAIXA_LOTERIAS_AUTH_USER?.perfilCodigo ||
      window.CAIXA_LOTERIAS_AUTH_USER?.perfil ||
      ""
    );
    return raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, "_");
  }

  function isReadRestrictedCollectionForProfile(key) {
    const profile = currentProfileCode();
    if (profile === "administrador") return false;
    return key === "usuarios" || key === "historico";
  }

  async function phpApiFetch(path, options = {}) {
    const csrfToken = window.Auth?.getCurrentUser?.()?.csrfToken || window.CAIXA_LOTERIAS_AUTH_USER?.csrfToken || "";
    const target = window.appUrl ? window.appUrl(path) : path;
    const response = await fetch(target, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        ...(options.headers || {})
      },
      ...options
    });
    if (!response.ok) {
      throw new Error(`API PHP indisponível (${response.status}).`);
    }
    return response.json();
  }

  function mojibakeScore(value) {
    return (String(value).match(/[\u00c3\u00c2\u00e2\ufffd]/g) || []).length;
  }

  function decodeCp1252Token(value) {
    const bytes = [];
    for (const character of value) {
      const code = character.codePointAt(0);
      if (CP1252_BYTES[character] !== undefined) {
        bytes.push(CP1252_BYTES[character]);
      } else if (code <= 0xff) {
        bytes.push(code);
      } else {
        return null;
      }
    }
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes));
    } catch {
      return null;
    }
  }

  function corrigirTextoEncoding(value) {
    let corrected = String(value).replace(/[^ \t\r\n]+/gu, (token) => {
      let current = token;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const decoded = decodeCp1252Token(current);
        if (!decoded || mojibakeScore(decoded) >= mojibakeScore(current)) break;
        current = decoded;
      }
      return current;
    });
    TEXT_REPLACEMENTS.forEach(([broken, replacement]) => {
      corrected = corrected.replaceAll(broken, replacement);
    });
    return corrected;
  }

  function corrigirValorSalvo(value) {
    if (typeof value === "string") return corrigirTextoEncoding(value);
    if (Array.isArray(value)) return value.map(corrigirValorSalvo);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, corrigirValorSalvo(item)]));
    }
    return value;
  }

  function normalizarCamposMoeda(launch) {
    if (!launch) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    let revisaoMoedaPendente = launch.revisaoMoedaPendente === true;

    CURRENCY_FIELD_NAMES.forEach((field) => {
      const current = camposEntrada[field] ?? launch[field];
      if (current === null || current === undefined || current === "") return;

      const parsed = CurrencyBR.parseMoedaBR(current);
      if (parsed === null) {
        revisaoMoedaPendente = true;
        return;
      }

      camposEntrada[field] = parsed;
      if (Number(launch.indicadorId) === 9 && typeof current === "number" && current > 0 && current < 1000000) {
        revisaoMoedaPendente = true;
      }
    });

    return {
      ...launch,
      camposEntrada,
      ...(revisaoMoedaPendente ? { revisaoMoedaPendente: true } : {})
    };
  }

  function getCanonicalPillar(indicatorId) {
    if (indicatorId <= 4) return PILLAR_NAMES[0];
    if (indicatorId <= 9) return PILLAR_NAMES[1];
    if (indicatorId <= 11) return PILLAR_NAMES[2];
    if (indicatorId <= 15) return PILLAR_NAMES[3];
    if (indicatorId <= 21) return PILLAR_NAMES[4];
    return PILLAR_NAMES[5];
  }

  function getLucroRecorrenteMetaMensal(ano, mes) {
    return LUCRO_RECORRENTE_META_MENSAL_2026[`${ano}-${String(mes).padStart(2, "0")}`] ?? null;
  }

  function getLucroRecorrenteMetaAcumulada(ano, mes) {
    return LUCRO_RECORRENTE_META_ACUMULADA_2026[`${ano}-${String(mes).padStart(2, "0")}`] ?? null;
  }

  function getNpsMetaReferencia(ano, mes) {
    const key = `${ano}-${String(mes).padStart(2, "0")}`;
    if (Object.prototype.hasOwnProperty.call(NPS_REFERENCIAS_2026, key)) return NPS_REFERENCIAS_2026[key];
    return Number(ano) > 2026 ? 60 : null;
  }

  // Compatibilidade até a migration: preserva, sem regravar, os valores recebidos
  // do SQL/JSON e expõe separadamente as referências canônicas de 2026.
  // ABR/MAI ficam sem meta avaliativa; o 58 é apenas contexto metodológico histórico.
  // Fora de 2026, JSON e coluna persistida continuam sendo os fallbacks vigentes.
  function resolveNpsLaunchState(launch, persistedMeta) {
    const inputMeta = Number(launch?.camposEntrada?.metaReferenciaCompetenciaNPS);
    const persisted = Number(persistedMeta);
    const hasInput = Number.isFinite(inputMeta) && inputMeta > 0;
    const hasPersisted = Number.isFinite(persisted) && persisted > 0;
    const fallback = getNpsMetaReferencia(launch?.ano, launch?.mes);
    const canonical2026 = Number(launch?.ano) === 2026;
    const technical = canonical2026 ? fallback : hasInput ? inputMeta : hasPersisted ? persisted : fallback;
    return {
      metaTecnicaNps: technical,
      metaJsonNps: hasInput ? inputMeta : null,
      metaPersistidaNps: hasPersisted ? persisted : null,
      origemMetaTecnicaNps: canonical2026 ? "referencias_fechamento_2026_55_60" : hasInput ? "dados_entrada_json" : hasPersisted ? "sql_meta_referencia" : "fallback_codigo",
      divergenciaMetaNps: [hasInput ? inputMeta : null, hasPersisted ? persisted : null]
        .filter((value) => value !== null)
        .some((value) => Math.abs(value - technical) > Number.EPSILON)
    };
  }

  function getGgrMetaAcumulada(ano, mes) {
    return GGR_META_ACUMULADA_2026[`${ano}-${String(mes).padStart(2, "0")}`] ?? null;
  }

  function getCanaisDigitaisMeta(ano, mes) {
    return CANAIS_DIGITAIS_METAS_2026[`${ano}-${String(mes).padStart(2, "0")}`] ?? null;
  }

  function getIeoMetaAcumulada(ano, mes) {
    const key = `${ano}-${String(mes).padStart(2, "0")}`;
    return Object.prototype.hasOwnProperty.call(IEO_META_ACUMULADA_2026, key) ? IEO_META_ACUMULADA_2026[key] : null;
  }

  function getRepasseSocialMetaAcumulada(ano, mes) {
    return REPASSE_SOCIAL_META_ACUMULADA_2026[`${ano}-${String(mes).padStart(2, "0")}`] ?? null;
  }

  function getAprimoramentoMetaTrimestral(ano, mes) {
    const trimestre = `${Math.ceil(Number(mes) / 3)}TRI/${ano}`;
    return APRIMORAMENTO_CURVA_TRIMESTRAL_2026[trimestre]?.metaPercentual ?? null;
  }

  function getCapacidadeTicMetaTrimestral(ano, mes) {
    const trimestre = `${Math.ceil(Number(mes) / 3)}TRI/${ano}`;
    return CAPACIDADE_TIC_CURVA_TRIMESTRAL_2026[trimestre]?.metaPercentual ?? null;
  }

  const CAPACIDADE_TIC_MESES_FECHAMENTO = [3, 6, 9, 12];

  function isCapacidadeTicFechamento(mes) {
    return CAPACIDADE_TIC_MESES_FECHAMENTO.includes(Number(mes));
  }

  function getCapacidadeTicMetaOficialCompetencia(ano, mes) {
    return isCapacidadeTicFechamento(mes) ? getCapacidadeTicMetaTrimestral(ano, mes) : null;
  }

  function normalizarPosicaoCapacidadeTic(normalized, source, officialMeta) {
    if (Number(source?.indicadorId ?? source?.indicador_id) !== 11) {
      return { ...normalized, metaMensal: officialMeta, metaReferencia: officialMeta };
    }

    const mes = Number(source?.mes);
    const fechamentoTrimestral = isCapacidadeTicFechamento(mes);
    const tipoPosicaoTIC = fechamentoTrimestral ? "fechamento_trimestral" : "acompanhamento";
    const metaReferenciaTrimestre = getCapacidadeTicMetaTrimestral(source?.ano, mes);
    const camposEntrada = {
      ...(normalized.camposEntrada || {}),
      tipoPosicaoTIC,
      metaReferenciaTrimestre
    };

    if (fechamentoTrimestral) {
      return {
        ...normalized,
        camposEntrada,
        tipoPosicaoTIC,
        metaReferenciaTrimestre,
        metaOficialCompetencia: officialMeta,
        resultadoOficialCompetencia: normalized.resultadoOficialAnual ?? normalized.resultadoMensal ?? null,
        percentualAtingidoOficialCompetencia: normalized.percentualAtingido ?? normalized.percentualAtingidoMensal ?? null,
        metaMensal: officialMeta,
        metaReferencia: officialMeta
      };
    }

    const acompanhamentoComSituacao = mes <= 9 || normalized.status !== "Não iniciado";
    return {
      ...normalized,
      camposEntrada,
      tipoPosicaoTIC,
      metaReferenciaTrimestre,
      metaOficialCompetencia: null,
      resultadoOficialCompetencia: null,
      percentualAtingidoOficialCompetencia: null,
      metaMensal: null,
      metaReferencia: null,
      realizadoMensal: null,
      resultadoMensal: null,
      resultadoAcumulado: null,
      resultadoOficialAnual: null,
      percentualAtingido: null,
      percentualAtingidoMensal: null,
      percentualAtingidoAcumulado: null,
      percentualAtingidoAnual: null,
      situacaoCalculada: acompanhamentoComSituacao ? "Em acompanhamento" : undefined
    };
  }

  function getPlataformaJogosMetaTrimestral(ano, mes) {
    const trimestre = `${Math.ceil(Number(mes) / 3)}TRI/${ano}`;
    return Object.prototype.hasOwnProperty.call(PLATAFORMA_JOGOS_METAS_2026, trimestre)
      ? PLATAFORMA_JOGOS_METAS_2026[trimestre]
      : null;
  }

  function getPrincipiosJogoResponsavelMetaTrimestral(ano, mes) {
    const trimestre = `${Math.ceil(Number(mes) / 3)}TRI/${ano}`;
    return PRINCIPIOS_JOGO_RESPONSAVEL_CURVA_2026[trimestre]?.metaElementosAcumulados ?? null;
  }

  function getApoioSocioambientalMetaTrimestral(ano, mes) {
    const trimestre = `${Math.ceil(Number(mes) / 3)}TRI/${ano}`;
    return APOIO_SOCIOAMBIENTAL_CURVA_2026[trimestre]?.metaQuantidadeAcumulada ?? null;
  }

  function getCapacitacaoEmpregadosMetaTrimestral(ano, mes) {
    const trimestre = `${Math.ceil(Number(mes) / 3)}TRI/${ano}`;
    return CAPACITACAO_EMPREGADOS_CURVA_TRIMESTRAL_2026[trimestre]?.metaCobertura ?? null;
  }

  function getJogoResponsavelCapacitacaoMetaTrimestral(ano, mes) {
    const trimestre = `${Math.ceil(Number(mes) / 3)}TRI/${ano}`;
    return JOGO_RESPONSAVEL_CAPACITACAO_CURVA_2026[trimestre]?.metaCobertura ?? null;
  }

  function getIncentivoSocioambientalMetaTrimestral(ano, mes) {
    const trimestre = `${Math.ceil(Number(mes) / 3)}TRI/${ano}`;
    return INCENTIVO_SOCIOAMBIENTAL_CURVA_2026[trimestre]?.metaValorAcumulado ?? null;
  }

  function getVisibilidadeRepassesMetaTrimestral(ano, mes) {
    const trimestre = `${Math.ceil(Number(mes) / 3)}TRI/${ano}`;
    return VISIBILIDADE_REPASSES_CURVA_2026[trimestre]?.metaAcoesRealizadasAcumuladas ?? null;
  }

  function getEcossistemaCompetencia(ano, mes) {
    return `${Number(ano)}-${String(Number(mes)).padStart(2, "0")}`;
  }

  function getEcossistemaFatorMeta(ano, mes) {
    if (Number(ano) !== 2026) return null;
    return Number(mes) <= 7 ? 1.10 : 1.01;
  }

  function getEcossistemaReferenciaLotex2025(ano, mes) {
    const component = ECOSSISTEMA_COMPONENTES_2025[getEcossistemaCompetencia(ano, mes)];
    return component?.arrTotal2025 > 0 ? component.arrEcoLotex2025 / component.arrTotal2025 : null;
  }

  function getEcossistemaMetaTecnica(ano, mes) {
    const reference = getEcossistemaReferenciaLotex2025(ano, mes);
    const factor = getEcossistemaFatorMeta(ano, mes);
    return reference === null || factor === null ? null : reference * factor;
  }

  function getEcossistemaApresentacaoOficial(ano, mes) {
    if (Number(ano) !== 2026 || ![3, 6, 9, 12].includes(Number(mes))) return null;
    return ECOSSISTEMA_APRESENTACOES_2026[`${Math.ceil(Number(mes) / 3)}TRI`] || null;
  }

  function getEcossistemaMetaCompetencia(ano, mes) {
    return getEcossistemaMetaTecnica(ano, mes);
  }

  function getEcossistemaMetaAnualDescricao(ano, mes) {
    if (Number(ano) === 2026 && Number(mes) >= 8) return "Ano 2026: ≥ 1% em relação ao exercício de 2025";
    return "Ano 2026: ≥ 10% em relação ao exercício de 2025";
  }

  function getEcossistemaCamposCanonicos(launch, currentFields = {}) {
    const key = getEcossistemaCompetencia(launch?.ano, launch?.mes);
    const base2025 = ECOSSISTEMA_COMPONENTES_2025[key] || {};
    const base2026 = ECOSSISTEMA_COMPONENTES_2026[key] || {};
    const presentation = getEcossistemaApresentacaoOficial(launch?.ano, launch?.mes);
    const reference = getEcossistemaReferenciaLotex2025(launch?.ano, launch?.mes);
    const factor = getEcossistemaFatorMeta(launch?.ano, launch?.mes);
    const technicalTarget = getEcossistemaMetaTecnica(launch?.ano, launch?.mes);
    const documentary = presentation && presentation.resultadoOficialReportado !== null ? {
      tipoPosicaoEcossistema: "fechamento_trimestral",
      metaDocumentalEcossistema: presentation.metaOficialReportada,
      resultadoDocumentalEcossistema: presentation.resultadoOficialReportado,
      percentualAtingidoOficialEcossistema: presentation.percentualAtingidoOficialReportado,
      fonteResultadoEcossistema: presentation.fonte
    } : {};
    return {
      cenarioApuracaoEcossistema: "lotex",
      marketplaceAplicaAoCalculo: false,
      ...base2025,
      ...base2026,
      referenciaLotex2025: reference,
      fatorMetaVigente: factor,
      metaParticipacao2026: technicalTarget,
      tipoPosicaoEcossistema: [3, 6, 9, 12].includes(Number(launch?.mes)) ? "fechamento_trimestral" : "acompanhamento",
      ...documentary,
      ...currentFields,
      cenarioApuracaoEcossistema: "lotex",
      marketplaceAplicaAoCalculo: false
    };
  }

  function getRedeLotericaMetaIndiceTrimestral(ano, mes) {
    if (Number(ano) !== 2026) return null;
    const trimestre = `${Math.ceil(Number(mes) / 3)}TRI`;
    return REDE_LOTERICA_CURVA_INDICE_2026[trimestre]?.metaIndice ?? null;
  }

  function migrarCampoGgrLegado(launch) {
    if (Number(launch?.indicadorId) !== 5) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.ggrRealizadoMes !== undefined && camposEntrada.ggrRealizadoMesMigrado === undefined) {
      camposEntrada.ggrRealizadoMesMigrado = camposEntrada.ggrRealizadoMes;
      delete camposEntrada.ggrRealizadoMes;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoRepasseSocialLegado(launch) {
    if (Number(launch?.indicadorId) !== 17) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.repasseSocialAcumulado !== undefined && camposEntrada.repasseSocialAcumuladoCompetencia === undefined) {
      camposEntrada.repasseSocialAcumuladoCompetencia = camposEntrada.repasseSocialAcumulado;
      camposEntrada.repasseSocialAcumuladoMigrado = camposEntrada.repasseSocialAcumulado;
      delete camposEntrada.repasseSocialAcumulado;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoEcossistemaLegado(launch) {
    if (Number(launch?.indicadorId) !== 22) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.arrecadacaoEcossistemaMes !== undefined && camposEntrada.arrecadacaoEcossistemaMes2026 === undefined) {
      camposEntrada.arrecadacaoEcossistemaMes2026 = camposEntrada.arrecadacaoEcossistemaMes;
      camposEntrada.arrecadacaoEcossistemaMesMigrado = camposEntrada.arrecadacaoEcossistemaMes;
      delete camposEntrada.arrecadacaoEcossistemaMes;
    }
    const legacyScenario = camposEntrada.cenarioApuracaoEcossistema;
    if (legacyScenario && legacyScenario !== "lotex") {
      camposEntrada.cenarioApuracaoEcossistemaHistorico = legacyScenario;
      camposEntrada.cenarioHistoricoAplicaAoCalculo = false;
      if (camposEntrada.arrecadacaoViaEcossistema !== undefined) {
        camposEntrada.arrecadacaoCombinadaHistorica = camposEntrada.arrecadacaoViaEcossistema;
      }
    } else if (camposEntrada.arrEcoLotex2026 === undefined && camposEntrada.arrecadacaoViaEcossistema !== undefined) {
      camposEntrada.arrEcoLotex2026 = camposEntrada.arrecadacaoViaEcossistema;
    }
    if (camposEntrada.arrecadacaoEcossistema2025 !== undefined && camposEntrada.arrecadacaoEcossistema2025PeriodoEquivalente === undefined) {
      camposEntrada.arrecadacaoEcossistema2025PeriodoEquivalente = camposEntrada.arrecadacaoEcossistema2025;
      camposEntrada.arrecadacaoEcossistema2025Migrado = camposEntrada.arrecadacaoEcossistema2025;
      delete camposEntrada.arrecadacaoEcossistema2025;
    }
    if (camposEntrada.arrecadacaoEcossistema2026PeriodoAtual !== undefined && camposEntrada.arrecadacaoEcossistemaAcumulada2026 === undefined) {
      camposEntrada.arrecadacaoEcossistemaAcumulada2026 = camposEntrada.arrecadacaoEcossistema2026PeriodoAtual;
      camposEntrada.arrecadacaoEcossistema2026PeriodoAtualMigrado = camposEntrada.arrecadacaoEcossistema2026PeriodoAtual;
      delete camposEntrada.arrecadacaoEcossistema2026PeriodoAtual;
    }
    return { ...launch, camposEntrada: getEcossistemaCamposCanonicos(launch, camposEntrada) };
  }

  function migrarCampoRedeLotericaLegado(launch) {
    if (Number(launch?.indicadorId) !== 23) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.arrecadacaoRedeLotericaMes2025 !== undefined && camposEntrada.arrecadacaoRedeLoterica2025PeriodoEquivalente === undefined) {
      camposEntrada.arrecadacaoRedeLoterica2025PeriodoEquivalente = camposEntrada.arrecadacaoRedeLotericaMes2025;
      camposEntrada.arrecadacaoRedeLotericaMes2025Migrado = camposEntrada.arrecadacaoRedeLotericaMes2025;
      delete camposEntrada.arrecadacaoRedeLotericaMes2025;
    }
    if (camposEntrada.arrecadacaoRedeLoterica2025 === undefined && camposEntrada.arrecadacaoRedeLoterica2025PeriodoEquivalente !== undefined) {
      camposEntrada.arrecadacaoRedeLoterica2025 = camposEntrada.arrecadacaoRedeLoterica2025PeriodoEquivalente;
    }
    if (camposEntrada.arrecadacaoRedeLoterica2026 === undefined && camposEntrada.arrecadacaoRedeLotericaMes2026 !== undefined) {
      camposEntrada.arrecadacaoRedeLoterica2026 = camposEntrada.arrecadacaoRedeLotericaMes2026;
    }
    if (camposEntrada.arrecadacaoRedeLoterica2026PeriodoAtual !== undefined && camposEntrada.arrecadacaoRedeLotericaAcumulada2026 === undefined) {
      camposEntrada.arrecadacaoRedeLotericaAcumulada2026 = camposEntrada.arrecadacaoRedeLoterica2026PeriodoAtual;
      camposEntrada.arrecadacaoRedeLoterica2026PeriodoAtualMigrado = camposEntrada.arrecadacaoRedeLoterica2026PeriodoAtual;
    }
    if (camposEntrada.arrecadacaoRedeLoterica2026 === undefined && camposEntrada.arrecadacaoRedeLoterica2026PeriodoAtual !== undefined) {
      camposEntrada.arrecadacaoRedeLoterica2026 = camposEntrada.arrecadacaoRedeLoterica2026PeriodoAtual;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoOfertasLegado(launch) {
    if (Number(launch?.indicadorId) !== 1) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.baseClientesAtivos !== undefined && camposEntrada.baseClientesAtivosCompetencia === undefined) {
      camposEntrada.baseClientesAtivosCompetencia = camposEntrada.baseClientesAtivos;
      camposEntrada.baseClientesAtivosMigrado = camposEntrada.baseClientesAtivos;
      delete camposEntrada.baseClientesAtivos;
    }
    if (camposEntrada.clientesComOfertaPersonalizada !== undefined && camposEntrada.clientesUnicosComOfertaPersonalizadaCompetencia === undefined) {
      camposEntrada.clientesUnicosComOfertaPersonalizadaCompetencia = camposEntrada.clientesComOfertaPersonalizada;
      camposEntrada.clientesComOfertaPersonalizadaMigrado = camposEntrada.clientesComOfertaPersonalizada;
      delete camposEntrada.clientesComOfertaPersonalizada;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoNpsLegado(launch) {
    if (Number(launch?.indicadorId) !== 2) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.npsRealizado !== undefined && camposEntrada.npsApurado === undefined) {
      camposEntrada.npsApurado = camposEntrada.npsRealizado;
      camposEntrada.npsRealizadoMigrado = camposEntrada.npsRealizado;
      delete camposEntrada.npsRealizado;
    }
    if (camposEntrada.dataPesquisa !== undefined && camposEntrada.dataBasePesquisaNPS === undefined) {
      camposEntrada.dataBasePesquisaNPS = camposEntrada.dataPesquisa;
      camposEntrada.dataPesquisaMigrado = camposEntrada.dataPesquisa;
      delete camposEntrada.dataPesquisa;
    }
    if (camposEntrada.dataBaseApuracao !== undefined && camposEntrada.dataBasePesquisaNPS === undefined) {
      camposEntrada.dataBasePesquisaNPS = camposEntrada.dataBaseApuracao;
      camposEntrada.dataBaseApuracaoMigrado = camposEntrada.dataBaseApuracao;
      delete camposEntrada.dataBaseApuracao;
    }
    if (camposEntrada.relatorioPesquisa !== undefined && camposEntrada.fontePesquisaNPS === undefined) {
      camposEntrada.fontePesquisaNPS = camposEntrada.relatorioPesquisa;
      camposEntrada.relatorioPesquisaMigrado = camposEntrada.relatorioPesquisa;
      delete camposEntrada.relatorioPesquisa;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoClimaLegado(launch) {
    if (Number(launch?.indicadorId) !== 12) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.mediaGeralGPTW !== undefined && camposEntrada.notaClimaApurada === undefined) {
      camposEntrada.notaClimaApurada = camposEntrada.mediaGeralGPTW;
      camposEntrada.mediaGeralGPTWMigrado = camposEntrada.mediaGeralGPTW;
      delete camposEntrada.mediaGeralGPTW;
    }
    if (camposEntrada.dataPesquisa !== undefined && camposEntrada.dataBasePesquisaClima === undefined) {
      camposEntrada.dataBasePesquisaClima = camposEntrada.dataPesquisa;
      camposEntrada.dataPesquisaMigrado = camposEntrada.dataPesquisa;
      delete camposEntrada.dataPesquisa;
    }
    if (camposEntrada.dataBaseApuracao !== undefined && camposEntrada.dataBasePesquisaClima === undefined) {
      camposEntrada.dataBasePesquisaClima = camposEntrada.dataBaseApuracao;
      camposEntrada.dataBaseApuracaoMigrado = camposEntrada.dataBaseApuracao;
      delete camposEntrada.dataBaseApuracao;
    }
    if (camposEntrada.relatorioGPTW !== undefined && camposEntrada.fonteEvidenciaClima === undefined) {
      camposEntrada.fonteEvidenciaClima = camposEntrada.relatorioGPTW;
      camposEntrada.relatorioGPTWMigrado = camposEntrada.relatorioGPTW;
      delete camposEntrada.relatorioGPTW;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoCapacitacaoLegado(launch) {
    if (Number(launch?.indicadorId) !== 15) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.empregadosElegiveisMes !== undefined && camposEntrada.publicoAlvoElegivelCapacitacao === undefined) {
      camposEntrada.publicoAlvoElegivelCapacitacao = camposEntrada.empregadosElegiveisMes;
      camposEntrada.empregadosElegiveisMesMigrado = camposEntrada.empregadosElegiveisMes;
      delete camposEntrada.empregadosElegiveisMes;
    }
    if (camposEntrada.empregadosCapacitadosMes !== undefined && camposEntrada.empregadosCapacitadosCapacitacao === undefined) {
      camposEntrada.empregadosCapacitadosCapacitacao = camposEntrada.empregadosCapacitadosMes;
      camposEntrada.empregadosCapacitadosMesMigrado = camposEntrada.empregadosCapacitadosMes;
      delete camposEntrada.empregadosCapacitadosMes;
    }
    if (camposEntrada.dataBaseApuracao !== undefined && camposEntrada.dataBaseApuracaoCapacitacao === undefined) {
      camposEntrada.dataBaseApuracaoCapacitacao = camposEntrada.dataBaseApuracao;
      camposEntrada.dataBaseApuracaoMigrado = camposEntrada.dataBaseApuracao;
      delete camposEntrada.dataBaseApuracao;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoJogoResponsavelCapacitacaoLegado(launch) {
    if (Number(launch?.indicadorId) !== 21) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.empregadosElegiveisMes !== undefined && camposEntrada.publicoAlvoElegivelJR === undefined) {
      camposEntrada.publicoAlvoElegivelJR = camposEntrada.empregadosElegiveisMes;
      camposEntrada.empregadosElegiveisMesMigrado = camposEntrada.empregadosElegiveisMes;
      delete camposEntrada.empregadosElegiveisMes;
    }
    if (camposEntrada.empregadosComDuasIniciativasConcluidas !== undefined && camposEntrada.empregadosCapacitadosJR === undefined) {
      camposEntrada.empregadosCapacitadosJR = camposEntrada.empregadosComDuasIniciativasConcluidas;
      camposEntrada.empregadosComDuasIniciativasConcluidasMigrado = camposEntrada.empregadosComDuasIniciativasConcluidas;
      delete camposEntrada.empregadosComDuasIniciativasConcluidas;
    }
    if (camposEntrada.dataBaseApuracao !== undefined && camposEntrada.dataBaseApuracaoJR === undefined) {
      camposEntrada.dataBaseApuracaoJR = camposEntrada.dataBaseApuracao;
      camposEntrada.dataBaseApuracaoMigrado = camposEntrada.dataBaseApuracao;
      delete camposEntrada.dataBaseApuracao;
    }
    if (camposEntrada.evidencia !== undefined && camposEntrada.fonteEvidenciaJR === undefined) {
      camposEntrada.fonteEvidenciaJR = camposEntrada.evidencia;
      camposEntrada.evidenciaMigrada = camposEntrada.evidencia;
      delete camposEntrada.evidencia;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoIncentivoSocioambientalLegado(launch) {
    if (Number(launch?.indicadorId) !== 19) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.valorInvestidoAcumulado !== undefined && camposEntrada.valorInvestidoAcumuladoCompetencia === undefined) {
      camposEntrada.valorInvestidoAcumuladoCompetencia = camposEntrada.valorInvestidoAcumulado;
      camposEntrada.valorInvestidoAcumuladoMigrado = camposEntrada.valorInvestidoAcumulado;
      delete camposEntrada.valorInvestidoAcumulado;
    }
    if (camposEntrada.statusAcao !== undefined && camposEntrada.statusProjetoIncentivoSocioambiental === undefined) {
      camposEntrada.statusProjetoIncentivoSocioambiental = camposEntrada.statusAcao;
      camposEntrada.statusAcaoMigrado = camposEntrada.statusAcao;
      delete camposEntrada.statusAcao;
    }
    if (camposEntrada.evidencia !== undefined && camposEntrada.evidenciaIncentivoSocioambiental === undefined) {
      camposEntrada.evidenciaIncentivoSocioambiental = camposEntrada.evidencia;
      camposEntrada.evidenciaMigrada = camposEntrada.evidencia;
      delete camposEntrada.evidencia;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoAprimoramentoLegado(launch) {
    if (Number(launch?.indicadorId) !== 4) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.melhoriasEntreguesMes !== undefined && camposEntrada.melhoriasImplementadasMes === undefined) {
      camposEntrada.melhoriasImplementadasMes = camposEntrada.melhoriasEntreguesMes;
      camposEntrada.melhoriasEntreguesMesMigrado = camposEntrada.melhoriasEntreguesMes;
    }
    if (!camposEntrada.tipoPosicaoAprimoramento) {
      const mes = Number(launch?.mes);
      if (Number.isInteger(mes) && ![3, 6, 9, 12].includes(mes)) {
        camposEntrada.tipoPosicaoAprimoramento = "acompanhamento";
      } else if (
        camposEntrada.melhoriasImplementadasMes !== undefined ||
        camposEntrada.melhoriasImplementadasAcumuladas !== undefined
      ) {
        camposEntrada.tipoPosicaoAprimoramento = "fechamento_quantitativo";
      }
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoPlataformaJogosLegado(launch) {
    if (Number(launch?.indicadorId) !== 10) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.etapaAtualProjeto !== undefined && camposEntrada.marcoAtualPlataformaJogos === undefined) {
      camposEntrada.marcoAtualPlataformaJogos = camposEntrada.etapaAtualProjeto;
      camposEntrada.etapaAtualProjetoMigrado = camposEntrada.etapaAtualProjeto;
      delete camposEntrada.etapaAtualProjeto;
    }
    if (camposEntrada.evidenciaEntrega !== undefined && camposEntrada.evidenciaPlataformaJogos === undefined) {
      camposEntrada.evidenciaPlataformaJogos = camposEntrada.evidenciaEntrega;
      camposEntrada.evidenciaEntregaMigrado = camposEntrada.evidenciaEntrega;
      delete camposEntrada.evidenciaEntrega;
    }
    if (camposEntrada.percentualExecucao !== undefined && camposEntrada.percentualExecucaoMigrado === undefined) {
      camposEntrada.percentualExecucaoMigrado = camposEntrada.percentualExecucao;
      delete camposEntrada.percentualExecucao;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoCapacidadeTicLegado(launch) {
    if (Number(launch?.indicadorId) !== 11) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.etapaAtual !== undefined && camposEntrada.marcoAlcancadoTIC === undefined) {
      camposEntrada.marcoAlcancadoTIC = camposEntrada.etapaAtual;
      camposEntrada.etapaAtualMigrado = camposEntrada.etapaAtual;
      delete camposEntrada.etapaAtual;
    }
    if (camposEntrada.percentualExecucao !== undefined && camposEntrada.percentualRealizadoTIC === undefined) {
      camposEntrada.percentualRealizadoTIC = camposEntrada.percentualExecucao;
      camposEntrada.percentualExecucaoMigrado = camposEntrada.percentualExecucao;
      delete camposEntrada.percentualExecucao;
    }
    if (camposEntrada.numeroProcesso !== undefined && camposEntrada.descricaoAndamentoTIC === undefined) {
      camposEntrada.descricaoAndamentoTIC = camposEntrada.numeroProcesso;
      camposEntrada.numeroProcessoMigrado = camposEntrada.numeroProcesso;
      delete camposEntrada.numeroProcesso;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoPrincipiosJogoResponsavelLegado(launch) {
    if (Number(launch?.indicadorId) !== 18) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.acaoMelhoria !== undefined && camposEntrada.acaoExecutada === undefined) {
      camposEntrada.acaoExecutada = camposEntrada.acaoMelhoria;
      camposEntrada.acaoMelhoriaMigrado = camposEntrada.acaoMelhoria;
      delete camposEntrada.acaoMelhoria;
    }
    if (camposEntrada.dataExecucao !== undefined && camposEntrada.dataConclusao === undefined) {
      camposEntrada.dataConclusao = camposEntrada.dataExecucao;
      camposEntrada.dataExecucaoMigrado = camposEntrada.dataExecucao;
      delete camposEntrada.dataExecucao;
    }
    if (camposEntrada.elementosExecutadosAcumulado !== undefined && camposEntrada.elementosExecutadosAcumuladoMigrado === undefined) {
      camposEntrada.elementosExecutadosAcumuladoMigrado = camposEntrada.elementosExecutadosAcumulado;
      delete camposEntrada.elementosExecutadosAcumulado;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoApoioSocioambientalLegado(launch) {
    if (Number(launch?.indicadorId) !== 16) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.nomeIniciativa !== undefined && camposEntrada.nomeIniciativaSocioambiental === undefined) {
      camposEntrada.nomeIniciativaSocioambiental = camposEntrada.nomeIniciativa;
      camposEntrada.nomeIniciativaMigrado = camposEntrada.nomeIniciativa;
      delete camposEntrada.nomeIniciativa;
    }
    if (camposEntrada.dataApoio !== undefined && camposEntrada.dataApoioIniciativa === undefined) {
      camposEntrada.dataApoioIniciativa = camposEntrada.dataApoio;
      camposEntrada.dataApoioMigrado = camposEntrada.dataApoio;
      delete camposEntrada.dataApoio;
    }
    if (camposEntrada.quantidadeIniciativasApoiadasMes !== undefined && camposEntrada.quantidadeIniciativasApoiadasMesMigrado === undefined) {
      camposEntrada.quantidadeIniciativasApoiadasMesMigrado = camposEntrada.quantidadeIniciativasApoiadasMes;
      delete camposEntrada.quantidadeIniciativasApoiadasMes;
    }
    return { ...launch, camposEntrada };
  }

  function migrarCampoVisibilidadeRepassesLegado(launch) {
    if (Number(launch?.indicadorId) !== 20) return launch;
    const camposEntrada = { ...(launch.camposEntrada || {}) };
    if (camposEntrada.statusAcao !== undefined && camposEntrada.statusAcaoVisibilidade === undefined) {
      camposEntrada.statusAcaoVisibilidade = camposEntrada.statusAcao;
      camposEntrada.statusAcaoMigrado = camposEntrada.statusAcao;
      delete camposEntrada.statusAcao;
    }
    if (camposEntrada.evidencia !== undefined && camposEntrada.evidenciaVisibilidade === undefined) {
      camposEntrada.evidenciaVisibilidade = camposEntrada.evidencia;
      camposEntrada.evidenciaMigrada = camposEntrada.evidencia;
      delete camposEntrada.evidencia;
    }
    if (camposEntrada.totalAcoesPropostas !== undefined && camposEntrada.totalAcoesPropostasMigrado === undefined) {
      camposEntrada.totalAcoesPropostasMigrado = camposEntrada.totalAcoesPropostas;
      delete camposEntrada.totalAcoesPropostas;
    }
    if (camposEntrada.totalAcoesRealizadas !== undefined && camposEntrada.totalAcoesRealizadasMigrado === undefined) {
      camposEntrada.totalAcoesRealizadasMigrado = camposEntrada.totalAcoesRealizadas;
      delete camposEntrada.totalAcoesRealizadas;
    }
    return { ...launch, camposEntrada };
  }

  async function checkJsonDb() {
    if (!isPhpBackend()) {
      jsonDbAvailable = false;
      throw new Error("A aplicacao exige o backend PHP conectado ao SQL Server.");
    }

    try {
      const payload = await phpApiFetch("api/database?ping=1");
      jsonDbAvailable = payload?.ok === true && String(payload?.database || "").toLowerCase() === "sqlsrv";
      if (!jsonDbAvailable) {
        throw new Error("A API nao confirmou uma conexao SQL Server.");
      }
      return jsonDbAvailable;
    } catch (error) {
      jsonDbAvailable = false;
      throw error;
    }
  }

  function getFallbackMeta(indicadorId, ano, mes) {
    const id = Number(indicadorId);
    if (id === 1) return 0.10;
    if (id === 2) return getNpsMetaReferencia(ano, mes);
    if (id === 4) return getAprimoramentoMetaTrimestral(ano, mes);
    if (id === 5) return getGgrMetaAcumulada(ano, mes);
    if (id === 6) return getIeoMetaAcumulada(ano, mes);
    if (id === 7) return getLucroRecorrenteMetaMensal(ano, mes);
    if (id === 8) return getCanaisDigitaisMeta(ano, mes);
    if (id === 9) return Number(ano) === 2026 ? PIX_OPERATIONAL_TARGETS_2026[Number(mes) - 1] ?? null : null;
    if (id === 10) return getPlataformaJogosMetaTrimestral(ano, mes);
    if (id === 11) return getCapacidadeTicMetaTrimestral(ano, mes);
    if (id === 12) return 60;
    if (id === 15) return getCapacitacaoEmpregadosMetaTrimestral(ano, mes);
    if (id === 16) return getApoioSocioambientalMetaTrimestral(ano, mes);
    if (id === 17) return getRepasseSocialMetaAcumulada(ano, mes);
    if (id === 18) return getPrincipiosJogoResponsavelMetaTrimestral(ano, mes);
    if (id === 19) return getIncentivoSocioambientalMetaTrimestral(ano, mes);
    if (id === 20) return getVisibilidadeRepassesMetaTrimestral(ano, mes);
    if (id === 21) return getJogoResponsavelCapacitacaoMetaTrimestral(ano, mes);
    if (id === 22) return getEcossistemaMetaCompetencia(ano, mes);
    if (id === 23) return getRedeLotericaMetaIndiceTrimestral(ano, mes);
    return null;
  }

  function configuredMeta(indicadorId, ano, mes, metas) {
    const record = (metas || []).find((meta) => (
      String(meta?.indicadorId) === String(indicadorId) &&
      Number(meta?.ano) === Number(ano) &&
      Number(meta?.mes) === Number(mes)
    ));
    return record && record.metaMensal !== null && record.metaMensal !== undefined && record.metaMensal !== ""
      ? Number(record.metaMensal)
      : null;
  }

  function resolveMeta(indicadorId, ano, mes, metas = cache.metas || [], persistedValue = null) {
    if (Number(indicadorId) === 11 && !isCapacidadeTicFechamento(mes)) return null;
    if (Number(indicadorId) === 8 && Number(ano) === 2026) return getCanaisDigitaisMeta(ano, mes);
    if (Number(indicadorId) === 23 && Number(ano) === 2026) return getRedeLotericaMetaIndiceTrimestral(ano, mes);
    const official = configuredMeta(indicadorId, ano, mes, metas);
    if (official !== null && Number.isFinite(official)) return official;
    if (persistedValue !== null && persistedValue !== undefined && persistedValue !== "") {
      const persisted = Number(persistedValue);
      if (Number.isFinite(persisted)) return persisted;
    }
    return getFallbackMeta(indicadorId, ano, mes);
  }

  function metasForRule(rule, metas = cache.metas || []) {
    if (!rule) return rule;
    const indicatorId = Number(rule.indicadorId);
    const official = (metas || []).filter((meta) => (
      Number(meta?.indicadorId) === indicatorId && meta.metaMensal !== null &&
      meta.metaMensal !== undefined && meta.metaMensal !== ""
    ));
    if (!official.length) return rule;
    const perCompetence = Object.fromEntries(official.map((meta) => {
      const value = Number(meta.metaMensal);
      const canonicalValue = indicatorId === 23 && value > 0 && value < 1 ? 1 + value : value;
      return [`${Number(meta.ano)}-${String(Number(meta.mes)).padStart(2, "0")}`, canonicalValue];
    }));
    if (indicatorId === 2) {
      const canonical = rule.parametrosCalculo?.referenciasPorCompetencia || NPS_REFERENCIAS_2026;
      return {
        ...rule,
        parametrosCalculo: {
          ...(rule.parametrosCalculo || {}),
          referenciasPorCompetencia: { ...canonical },
          metasPersistidasPorCompetencia: perCompetence,
          divergenciasMetasPersistidas: Object.fromEntries(Object.entries(perCompetence)
            .filter(([key, value]) => Number(canonical[key]) !== Number(value)))
        }
      };
    }
    if (indicatorId === 3) {
      const canonical = rule.parametrosCalculo?.metasCanonicasPorCompetencia || CLIENTES_ATIVOS_DIGITAIS_METAS_2026;
      const canonicalKeys = Object.keys(canonical);
      return {
        ...rule,
        parametrosCalculo: {
          ...(rule.parametrosCalculo || {}),
          metasCanonicasPorCompetencia: { ...canonical },
          metasPersistidasPorCompetencia: perCompetence,
          lacunasMetasPersistidas: canonicalKeys.filter((key) => !Object.prototype.hasOwnProperty.call(perCompetence, key)),
          divergenciasMetasPersistidas: Object.fromEntries(Object.entries(perCompetence)
            .filter(([key, value]) => Number(canonical[key]) !== Number(value)))
        }
      };
    }
    const monthly = { ...(rule.parametrosCalculo?.metasMensaisPorCompetencia || {}), ...perCompetence };
    const accumulated = indicatorId === 7
      ? Object.keys(monthly).sort().reduce((curve, key) => {
          const year = String(key).slice(0, 4);
          const previousKey = Object.keys(curve).filter((item) => String(item).startsWith(`${year}-`)).at(-1);
          const previous = previousKey ? curve[previousKey] : 0;
          curve[key] = previous + Number(monthly[key]);
          return curve;
        }, {})
      : perCompetence;
    return {
      ...rule,
      parametrosCalculo: {
        ...(rule.parametrosCalculo || {}),
        metasOficiaisPorCompetencia: perCompetence,
        metasMensaisPorCompetencia: monthly,
        metasAcumuladasPorCompetencia: { ...(rule.parametrosCalculo?.metasAcumuladasPorCompetencia || {}), ...accumulated },
        referenciasPorCompetencia: { ...(rule.parametrosCalculo?.referenciasPorCompetencia || {}), ...perCompetence }
      }
    };
  }

  function getLucroRecorrenteMetaAcumuladaOficial(ano, mes, metas = cache.metas || []) {
    let total = 0;
    let found = false;
    for (let current = 1; current <= Number(mes); current += 1) {
      const value = resolveMeta(7, ano, current, metas, null);
      if (value === null || value === undefined) continue;
      total += Number(value);
      found = true;
    }
    return found ? total : null;
  }

  async function loadFromJsonDb(key) {
    if (!(await checkJsonDb())) return null;
    if (isReadRestrictedCollectionForProfile(key)) return null;
    return phpApiFetch(`api/database?collection=${encodeURIComponent(key)}`);
  }

  async function saveToJsonDb(key, value) {
    if (!(await checkJsonDb())) return false;
    try {
      const payload = await phpApiFetch("api/database", {
        method: "POST",
        body: JSON.stringify({ key, value })
      });
      return payload?.ok === true;
    } catch (error) {
      console.warn(`Gravacao no SQL Server indisponivel para ${key}.`, error);
      return false;
    }
  }

  function enqueueJsonDbWrite(key, value) {
    const snapshot = JSON.parse(JSON.stringify(value));
    const previousWrite = writeQueues[key] || Promise.resolve();
    const nextWrite = previousWrite
      .catch(() => false)
      .then(() => saveToJsonDb(key, snapshot));
    writeQueues[key] = nextWrite;
    return nextWrite;
  }

  async function resetarLancamentosIniciais() {
    Object.keys(cache).forEach((key) => delete cache[key]);
  }

  function resetarDadosOperacionais(lancamentos) {
    if (!Array.isArray(lancamentos)) {
      return [];
    }

    return lancamentos.map((lancamento) => {
      const cleaned = {
        ...lancamento,
        status: "Não iniciado",
        camposEntrada: {}
      };

      OPERATIONAL_NULL_FIELDS.forEach((field) => {
        cleaned[field] = null;
      });
      OPERATIONAL_TEXT_FIELDS.forEach((field) => {
        cleaned[field] = "";
      });
      OPERATIONAL_USER_DATE_FIELDS.forEach((field) => {
        cleaned[field] = null;
      });

      return cleaned;
    });
  }

  function gerarLancamentosLimpos(indicadores, metas = [], ano = 2026) {
    const metasPorIndicadorMes = new Map(
      metas.map((meta) => [`${meta.indicadorId}:${meta.ano}:${meta.mes}`, meta])
    );
    let nextId = 1;

    return indicadores.flatMap((indicador) => mesesEsperados(indicador).map(([mes, nomeMes]) => {
      const meta = metasPorIndicadorMes.get(`${indicador.id}:${ano}:${mes}`) || {};
      return resetarDadosOperacionais([{
        id: nextId++,
        indicadorId: indicador.id,
        ano,
        mes,
        competencia: `${ano}-${String(mes).padStart(2, "0")}`,
        trimestre: `${Math.ceil(mes / 3)}TRI/${ano}`,
        nomeMes: meta.nomeMes || nomeMes,
        plano: indicador.plano || "",
        pilar: indicador.pilar || "",
        unidadeApuradora: indicador.unidadeApuradora || "",
        diretoriaResponsavel: indicador.diretoriaResponsavel || "",
        metaMensal: meta.metaMensal ?? null,
        metaAnualDescricao: indicador.metaAnualDescricao || ""
      }])[0];
    }));
  }

  function completarLancamentosAusentes(lancamentos, indicadores, metas = [], ano = 2026) {
    if (!Array.isArray(lancamentos) || !Array.isArray(indicadores)) return lancamentos;

    const existentes = new Set(lancamentos.map((item) => (
      `${Number(item.indicadorId)}:${Number(item.ano)}:${Number(item.mes)}`
    )));
    const metasPorIndicadorMes = new Map(
      (metas || []).map((meta) => [`${Number(meta.indicadorId)}:${Number(meta.ano)}:${Number(meta.mes)}`, meta])
    );
    let nextId = lancamentos.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
    const ausentes = [];

    indicadores
      .filter((indicador) => indicador && indicador.ativo !== false)
      .forEach((indicador) => {
        mesesEsperados(indicador).forEach(([mes, nomeMes]) => {
          const key = `${Number(indicador.id)}:${ano}:${mes}`;
          if (existentes.has(key)) return;
          const meta = metasPorIndicadorMes.get(key) || {};
          ausentes.push(resetarDadosOperacionais([{
            id: nextId++,
            indicadorId: indicador.id,
            ano,
            mes,
            competencia: `${ano}-${String(mes).padStart(2, "0")}`,
            trimestre: `${Math.ceil(mes / 3)}TRI/${ano}`,
            nomeMes: meta.nomeMes || nomeMes,
            plano: indicador.plano || "",
            pilar: indicador.pilar || "",
            unidadeApuradora: indicador.unidadeApuradora || "",
            diretoriaResponsavel: indicador.diretoriaResponsavel || "",
            metaMensal: meta.metaMensal ?? null,
            metaAnualDescricao: indicador.metaAnualDescricao || ""
          }])[0]);
          existentes.add(key);
        });
      });

    return ausentes.length ? [...lancamentos, ...ausentes] : lancamentos;
  }

  async function resetarBaseOperacionalGlobal() {
    await resetarLancamentosIniciais();
    const indicadores = await loadJson("indicadores");
    const metas = await loadJson("metas");
    const lancamentos = gerarLancamentosLimpos(indicadores, metas);
    await Promise.all([
      saveLocal("lancamentos", lancamentos),
      saveLocal("homologacoes", []),
      saveLocal("historico", [])
    ]);
    return lancamentos;
  }

  function normalizarSituacaoLancamento(launch) {
    return window.Situations ? Situations.normalizarLancamento(launch) : launch;
  }

  function normalizeData(key, value) {
    value = corrigirValorSalvo(value);

    if (key === "indicadores" && Array.isArray(value)) {
      return value.map((indicator) => {
        const normalized = {
          ...indicator,
          indicador: INDICATOR_NAMES[Number(indicator.id) - 1] || indicator.indicador,
          pilar: getCanonicalPillar(Number(indicator.id)),
          periodicidade: indicator.periodicidade === "Não especificado" ? "Não especificada" : indicator.periodicidade
        };
        if (Number(indicator.id) === 1) {
          return {
            ...normalized,
            tipoCalculo: "percentual_direto",
            tipoConsolidacao: "ultima_posicao_trimestral",
            unidadeMedida: "percentual",
            permiteAcompanhamentoMensal: true,
            metaAnualDescricao: "≥ 10%",
            metrica: "Clientes únicos com oferta personalizada / Base de clientes ativos identificáveis"
          };
        }
        if (Number(indicator.id) === 8) {
          return {
            ...normalized,
            unidadeApuradora: "SUCOL",
            diretoriaResponsavel: "DICOT",
            metaAnualDescricao: "Aumentar em 05 p.p. as vendas provenientes de canais digitais.",
            metrica: "(Arrecadação total nos canais eletrônicos) / (Arrecadação total dos produtos de loterias)",
            tipoCalculo: "razao_canais_digitais",
            tipoConsolidacao: "razao_acumulada_no_periodo",
            unidadeMedida: "percentual"
          };
        }
        if (Number(indicator.id) === 4) {
          return {
            ...normalized,
            tipoCalculo: "melhorias_acumuladas",
            unidadeMedida: "percentual",
            metaAnualDescricao: "Implementar melhorias que atendam a 25% das ocorrências apontadas na pesquisa NPS de baseline.",
            metrica: "Melhorias implementadas acumuladas / 22 melhorias mapeadas no plano de trabalho"
          };
        }
        if (Number(indicator.id) === 5) {
          return {
            ...normalized,
            tipoCalculo: "ggr_formula",
            unidadeMedida: "moeda",
            metaAnualDescricao: "≥ R$ 14.996.238.568,92",
            metrica: "GGR = Arrecadação total - Prêmios a pagar"
          };
        }
        if (Number(indicator.id) === 6) {
          return {
            ...normalized,
            tipoCalculo: "indice_inverso",
            unidadeMedida: "percentual",
            metaAnualDescricao: "A meta vigente de cada competência é a cadastrada em Configurações > Metas.",
            metrica: "Jan-Jul/2026: ((Despesa de pessoal + Despesas Administrativas) / Receitas Líquidas) × 100. Ago-Dez/2026: ((Despesas Gerais e Administrativas + Despesas com Serviços de Pagamentos + Outras Despesas Operacionais) / (Receitas Operacionais - Despesas de Tributos)) × 100."
          };
        }
        if (Number(indicator.id) === 2) {
          return {
            ...normalized,
            tipoCalculo: "nota_pesquisa_nps",
            tipoConsolidacao: "resultado_pesquisa_ou_ultima_posicao",
            unidadeMedida: "pontos",
            permiteAcompanhamentoMensal: true,
            metaAnualDescricao: "Meta vigente nos fechamentos do 2TRI ao 4TRI/2026: NPS 60 pontos.",
            metrica: "NPS = (% promotores - % detratores) × 100. Fechamentos 2026: 1TRI referência 55; 2TRI a 4TRI referência 60. O valor 58 é apenas contexto metodológico histórico não vigente."
          };
        }
        if (Number(indicator.id) === 3) {
          return {
            ...normalized,
            periodicidade: "Mensal",
            tipoCalculo: "crescimento_media_mensal",
            tipoConsolidacao: "ultima_posicao",
            unidadeMedida: "percentual",
            permiteAcompanhamentoMensal: true,
            metaAnualDescricao: "Crescer 28% na quantidade média mensal de clientes ativos no ano",
            metrica: "(QMAATU / QMAANT) - 1"
          };
        }
        if (Number(indicator.id) === 7) {
          return {
            ...normalized,
            periodicidade: "Mensal",
            tipoCalculo: "lucro_recorrente_mensal",
            unidadeMedida: "moeda",
            metaAnualDescricao: "R$ 1.209.000.000,00",
            metrica: "Lucro líquido recorrente da competência / Meta da competência"
          };
        }
        if (Number(indicator.id) === 17) {
          return {
            ...normalized,
            tipoCalculo: "valor_financeiro_acumulado",
            unidadeMedida: "moeda",
            metaAnualDescricao: "≥ R$ 10,4 bilhões",
            metrica: "Repasse social acumulado até a competência"
          };
        }
        if (Number(indicator.id) === 11) {
          return {
            ...normalized,
            tipoCalculo: "marco_projeto_percentual",
            unidadeMedida: "percentual",
            metaAnualDescricao: "Contratação e/ou celebração de parceria para o desenvolvimento de soluções de TIC até o final do exercício de 2026.",
            metrica: "Avanço por marcos trimestrais de contratação/parceria de TIC"
          };
        }
        if (Number(indicator.id) === 12) {
          return {
            ...normalized,
            unidadeApuradora: "GERIN",
            diretoriaResponsavel: "DILOT",
            tipoCalculo: "nota_pesquisa_anual",
            unidadeMedida: "pontos",
            metaAnualDescricao: "Média geral ≥ 60",
            metrica: "Resultado da média geral da pesquisa de clima para o ano de 2026"
          };
        }
        if (Number(indicator.id) === 15) {
          return {
            ...normalized,
            unidadeApuradora: "GERIN",
            diretoriaResponsavel: "DILOT",
            periodicidade: "Mensal",
            tipoCalculo: "cobertura_capacitacao",
            unidadeMedida: "percentual",
            metaAnualDescricao: "≥ 90%",
            metrica: "Empregados capacitados no critério trimestral / Público-alvo elegível"
          };
        }
        if (Number(indicator.id) === 21) {
          return {
            ...normalized,
            tipoCalculo: "cobertura_capacitacao_jogo_responsavel",
            unidadeMedida: "percentual",
            metaAnualDescricao: "≥ 90% do público-alvo capacitado em pelo menos 2 iniciativas de Jogo Responsável",
            metrica: "Empregados elegíveis com a quantidade mínima de iniciativas concluídas / Público-alvo elegível"
          };
        }
        if (Number(indicator.id) === 10) {
          return {
            ...normalized,
            tipoCalculo: "projeto_marco_entrega",
            unidadeMedida: "percentual",
            metaAnualDescricao: "Piloto ou MVP da Plataforma de Jogos",
            metrica: "Referência futura: (GGR da CAIXA Loterias) / (Total de GGR do Mercado) x 100. Aplicável após implementação da plataforma e disponibilidade de dados oficiais de mercado."
          };
        }
        if (Number(indicator.id) === 18) {
          return {
            ...normalized,
            tipoCalculo: "plano_acao_por_elementos",
            unidadeMedida: "quantidade",
            metaAnualDescricao: "Nível 3 RGF-WLA - Executar ações de melhoria para os 10 elementos.",
            metrica: "Quantidade de elementos RGF-WLA únicos atendidos por ações concluídas ou homologadas"
          };
        }
        if (Number(indicator.id) === 16) {
          return {
            ...normalized,
            tipoCalculo: "iniciativas_apoiadas",
            unidadeMedida: "quantidade",
            metaAnualDescricao: "02 iniciativas apoiadas",
            metrica: "Quantidade de iniciativas socioambientais únicas com status Apoiada/realizada"
          };
        }
        if (Number(indicator.id) === 19) {
          return {
            ...normalized,
            tipoCalculo: "investimento_socioambiental",
            unidadeMedida: "moeda",
            metaAnualDescricao: "0,33% do Lucro Líquido do ano (R$ 4.307.900,00 estimados)",
            metrica: "Valor investido em iniciativas com impacto socioambiental"
          };
        }
        if (Number(indicator.id) === 20) {
          return {
            ...normalized,
            tipoCalculo: "execucao_acoes_propostas",
            unidadeMedida: "percentual",
            metaAnualDescricao: "Implantar 100% das ações propostas",
            metrica: "Ações propostas publicadas/realizadas / 2 ações propostas em 2026"
          };
        }
        if (Number(indicator.id) === 22) {
          const legacyTypes = ["crescimento_comparado_base_2025", "participacao_ecossistema_com_cenarios", null, undefined, ""];
          return {
            ...normalized,
            periodicidade: "Mensal",
            tipoCalculo: legacyTypes.includes(normalized.tipoCalculo) ? "participacao_ecossistema_lotex" : normalized.tipoCalculo,
            tipoConsolidacao: normalized.tipoConsolidacao || "ultima_posicao_acumulada",
            unidadeMedida: "percentual",
            metaAnualDescricao: "Meta por vigência: JAN–JUL ≥ 10%; AGO–DEZ ≥ 1% em relação ao exercício de 2025",
            metrica: "(ARR ECO LOTEX / ARR TOTAL) × 100",
            conceito: "Este indicador mede a proporção da arrecadação total obtida por meio de soluções ou produtos desenvolvidos e/ou distribuídos através de plataformas contratadas, parcerias estratégicas, parcerias do mercado, parcerias com empresas do Conglomerado, startups, CPSI, novos canais de distribuição e demais iniciativas aderentes ao pilar Atuação em Ecossistema.",
            observacaoMetodologica: "O resultado oficial utiliza exclusivamente Lotex. Marketplace e cenários combinados são memória auxiliar, com aplicaAoCalculo=false. A meta é prospectiva por competência: fator 1,10 até JUL/2026 e 1,01 a partir de AGO/2026.",
            cenarioOficialResumoExecutivo: "lotex"
          };
        }
        if (Number(indicator.id) === 23) {
          return {
            ...normalized,
            indicador: INDICATOR_NAMES[22],
            tipoCalculo: "crescimento_rede_loterica_base_2025",
            tipoConsolidacao: "acumulado_periodo_equivalente",
            unidadeMedida: "percentual",
            metaAnualDescricao: "Índice anual ≥ 102,00% da base 2025 equivalente",
            metrica: "Arrecadação acumulada da Rede Lotérica em 2026 / arrecadação acumulada de 2025 no período equivalente.",
            conceito: "Este indicador tem o objetivo de mensurar o crescimento da arrecadação de loterias na Rede Lotérica.",
            observacaoMetodologica: "A camada técnica utiliza índice. O crescimento equivalente é apresentado separadamente como índice menos 1."
          };
        }
        return Number(indicator.id) === 9 ? {
          ...normalized,
          metaAnualDescricao: "Aumentar em 05 p.p. as vendas com o meio de pagamento PIX no canal eletrônico.",
          metrica: "(Arrecadação com o meio de pagamento PIX no ano corrente) / (Arrecadação total nos canais eletrônicos no ano corrente)",
          tipoCalculo: "razao_pix",
          tipoConsolidacao: "ultima_posicao_acumulada",
          unidadeMedida: "percentual",
          observacaoMetodologica: "A base de arrecadação dos canais eletrônicos usada na apuração do PIX não considera o Internet Banking CAIXA (IBC), pois o PIX não é aceito nesse canal."
        } : normalized;
      });
    }

    if (key === "regrasIndicadores" && Array.isArray(value)) {
      return value.map((rule) => {
        const normalizedFields = (rule.camposEntrada || []).map((field) => {
          if (CURRENCY_FIELD_NAMES.has(field.nome)) return { ...field, tipo: "moeda" };
          if (INTEGER_FIELD_NAMES.has(field.nome)) return { ...field, tipo: "inteiro" };
          return field;
        });
        if (Number(rule.indicadorId) === 1) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[0],
            tipoCalculo: "percentual_direto",
            tipoConsolidacao: "ultima_posicao_trimestral",
            unidadeMedida: "percentual",
            metaAnualValor: 0.10,
            parametrosCalculo: {
              numeradorCampo: "clientesUnicosComOfertaPersonalizadaCompetencia",
              denominadorCampo: "baseClientesAtivosCompetencia",
              metaReferencia: 0.10,
              metaTipo: "fixa",
              sentidoMeta: "quanto_maior_melhor",
              validarNumeradorAteDenominador: false,
              mesesFechamentoTrimestral: [3, 6, 9, 12],
              permiteAcompanhamentoMensal: true,
              campoResultadoDocumental: "resultadoDocumentalOfertasPersonalizadas",
              campoPercentualAtingidoOficial: "percentualAtingidoOficialOfertasPersonalizadas",
              campoTipoPosicao: "tipoPosicaoOfertasPersonalizadas",
              campoFonteResultado: "fonteResultadoOfertasPersonalizadas",
              apresentacoesOficiaisTrimestrais: {
                "1TRI/2026": { metaOficialReportada: 0.10, resultadoOficialReportado: 0.4476, percentualAtingidoOficialReportado: 4.4764, situacaoOficial: "Atingido", fonte: "Informe DILOT/GERIN nº 0029/2026" },
                "2TRI/2026": { metaOficialReportada: 0.10, resultadoOficialReportado: 0.7858, percentualAtingidoOficialReportado: 7.858, situacaoOficial: "Atingido", fonte: "Informe DILOT/GERIN nº 0056/2026" },
                "3TRI/2026": { metaOficialReportada: 0.10, resultadoOficialReportado: 0.8379, percentualAtingidoOficialReportado: 8.379, situacaoOficial: "Atingido", fonte: "Informe DILOT/GERIN nº 0078/2026" },
                "4TRI/2026": { metaOficialReportada: 0.10, resultadoOficialReportado: null, percentualAtingidoOficialReportado: null, situacaoOficial: null, fonte: null }
              }
            },
            camposEntrada: [
              { nome: "baseClientesAtivosCompetencia", rotulo: "Base de clientes ativos identificáveis da competência", tipo: "inteiro", obrigatorio: false },
              { nome: "clientesUnicosComOfertaPersonalizadaCompetencia", rotulo: "Clientes únicos com oferta personalizada até a competência", tipo: "inteiro", obrigatorio: false },
              { nome: "resultadoDocumentalOfertasPersonalizadas", rotulo: "Resultado oficial/documental", tipo: "percentual", obrigatorio: false, escalaPercentual: "decimal" },
              { nome: "percentualAtingidoOficialOfertasPersonalizadas", rotulo: "Atingimento oficial documental", tipo: "percentual", obrigatorio: false, escalaPercentual: "decimal" },
              { nome: "tipoPosicaoOfertasPersonalizadas", rotulo: "Natureza da posição", tipo: "selecao", obrigatorio: false, opcoes: [{ value: "", label: "Selecione..." }, { value: "acompanhamento", label: "Acompanhamento" }, { value: "fechamento_trimestral", label: "Fechamento trimestral" }] },
              { nome: "fonteResultadoOfertasPersonalizadas", rotulo: "Fonte documental", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "resultadoMensal",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "ultima_posicao_fechamento_homologada",
            exigirHomologacaoTransacionalVersaoAtual: true
          };
        }
        if (Number(rule.indicadorId) === 2) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[1],
            tipoCalculo: "nota_pesquisa_nps",
            tipoConsolidacao: "resultado_pesquisa_ou_ultima_posicao",
            unidadeMedida: "pontos",
            metaAnualValor: 60,
            parametrosCalculo: {
              ...(rule.parametrosCalculo || {}),
              campoTipoPosicao: "tipoPosicaoNPS",
              campoMetaReferencia: "metaReferenciaCompetenciaNPS",
              campoNps: "npsApurado",
              campoPromotores: "percentualPromotores",
              campoDetratores: "percentualDetratores",
              campoDataBase: "dataBasePesquisaNPS",
              campoFonte: "fontePesquisaNPS",
              campoResultadoDocumental: "resultadoDocumentalNPS",
              campoMetaDocumental: "metaDocumentalNPS",
              campoPercentualAtingidoOficial: "percentualAtingidoOficialNPS",
              metaTipo: "meta_absoluta_por_competencia",
              baselineNPS: 55,
              notaReferenciaNPS: 70,
              percentualReducaoGap: 0.20,
              metaAnualMetodologica: 60,
              metaVigenteNPS2026: 60,
              referenciasPorCompetencia: NPS_REFERENCIAS_2026,
              contextoMetodologicoMeta58: {
                valor: 58,
                uso: "meta_de_acompanhamento_abr_mai_2026",
                aplicaCompetencias: ["2026-04", "2026-05"]
              },
              sentidoMeta: "quanto_maior_melhor",
              mesesFechamentoTrimestral: [3, 6, 9, 12],
              permiteAcompanhamentoMensal: true,
              aprovacaoMeta60: {
                documento: "Proposição DILOT/GERIN nº 0050/2026",
                data: "2026-08-06"
              },
              apresentacoesOficiaisTrimestrais: {
                "1TRI/2026": { metaOficialReportada: 55, resultadoOficialReportado: 55, percentualAtingidoOficialReportado: 1, situacaoOficial: "Atingido", fonte: "Informe DILOT/GERIN nº 0029/2026" },
                "2TRI/2026": { metaOficialReportada: 60, resultadoOficialReportado: 59.2, percentualAtingidoOficialReportado: 0.9866, situacaoOficial: "Abaixo da meta", fonte: "Informe DILOT/GERIN nº 0056/2026" },
                "3TRI/2026": { metaOficialReportada: 60, resultadoOficialReportado: 59.2, percentualAtingidoOficialReportado: 0.9866, situacaoOficial: "Abaixo da meta", semNovaPesquisa: true, proximaApuracao: "2026-10", fonte: "Informe DILOT/GERIN nº 0078/2026" },
                "4TRI/2026": { metaOficialReportada: 60, resultadoOficialReportado: null, percentualAtingidoOficialReportado: null, situacaoOficial: null, fonte: null }
              }
            },
            camposEntrada: [
              { nome: "tipoPosicaoNPS", rotulo: "Tipo da posição", tipo: "selecao", obrigatorio: true, opcoes: TIPOS_POSICAO_NPS },
              { nome: "metaReferenciaCompetenciaNPS", rotulo: "Meta de referência da competência", tipo: "numero", obrigatorio: false, somenteLeitura: true },
              { nome: "percentualPromotores", rotulo: "Percentual de promotores", tipo: "percentual", obrigatorio: false, entradaPtBr: true },
              { nome: "percentualDetratores", rotulo: "Percentual de detratores", tipo: "percentual", obrigatorio: false, entradaPtBr: true },
              { nome: "totalRespondentesNPS", rotulo: "Total de respondentes", tipo: "inteiro", obrigatorio: false },
              { nome: "quantidadePromotoresNPS", rotulo: "Quantidade de promotores", tipo: "inteiro", obrigatorio: false },
              { nome: "quantidadeNeutrosNPS", rotulo: "Quantidade de neutros", tipo: "inteiro", obrigatorio: false },
              { nome: "quantidadeDetratoresNPS", rotulo: "Quantidade de detratores", tipo: "inteiro", obrigatorio: false },
              { nome: "npsApurado", rotulo: "NPS calculado", tipo: "numero", obrigatorio: false, somenteLeitura: true },
              { nome: "resultadoDocumentalNPS", rotulo: "Resultado documental NPS", tipo: "numero", obrigatorio: false },
              { nome: "metaDocumentalNPS", rotulo: "Meta documental NPS", tipo: "numero", obrigatorio: false },
              { nome: "percentualAtingidoOficialNPS", rotulo: "Atingimento oficial documental", tipo: "percentual", obrigatorio: false, escalaPercentual: "decimal" },
              { nome: "dataBasePesquisaNPS", rotulo: "Data-base da pesquisa", tipo: "data", obrigatorio: false },
              { nome: "fontePesquisaNPS", rotulo: "Fonte/evidência da pesquisa", tipo: "texto", obrigatorio: false },
              { nome: "observacaoArea", rotulo: "Observação da área", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "npsApurado",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "resultado_pesquisa_ou_ultima_posicao_homologada",
            exigirHomologacaoTransacionalVersaoAtual: true
          };
        }
        if (Number(rule.indicadorId) === 3) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[2],
            tipoCalculo: "crescimento_media_mensal",
            tipoConsolidacao: "ultima_posicao",
            unidadeMedida: "percentual",
            metaAnualValor: 0.28,
            parametrosCalculo: {
              ...(rule.parametrosCalculo || {}),
              qmaatuCampo: "qmaatu",
              qmaantCampo: "qmaant",
              metaCrescimento: 0.28,
              sentidoMeta: "quanto_maior_melhor",
              mesesFechamentoTrimestral: [3, 6, 9, 12],
              permiteAcompanhamentoMensal: true,
              campoResultadoDocumental: "resultadoDocumentalClientesAtivos",
              campoPercentualAtingidoOficial: "percentualAtingidoOficialClientesAtivos",
              campoFonteResultado: "fonteResultadoClientesAtivos",
              campoTipoPosicao: "tipoPosicaoClientesAtivos",
              campoJanelaApuracao: "janelaApuracaoClientesAtivos",
              metasCanonicasPorCompetencia: { ...CLIENTES_ATIVOS_DIGITAIS_METAS_2026 },
              apresentacoesOficiaisTrimestrais: { ...CLIENTES_ATIVOS_DIGITAIS_APRESENTACOES_2026 }
            },
            camposEntrada: [
              { nome: "qmaatu", rotulo: "QMAATU - Quantidade Média Mensal de Clientes Ativos no Ano nos canais digitais", tipo: "inteiro", obrigatorio: false },
              { nome: "qmaant", rotulo: "QMAANT - Quantidade Média Mensal de Clientes Ativos do Ano anterior nos canais digitais", tipo: "inteiro", obrigatorio: false },
              { nome: "dataBaseApuracao", rotulo: "Data-base da apuração", tipo: "data", obrigatorio: false },
              { nome: "resultadoDocumentalClientesAtivos", rotulo: "Resultado documental", tipo: "percentual", obrigatorio: false, escalaPercentual: "decimal" },
              { nome: "percentualAtingidoOficialClientesAtivos", rotulo: "Atingimento oficial documental", tipo: "percentual", obrigatorio: false, escalaPercentual: "decimal" },
              { nome: "tipoPosicaoClientesAtivos", rotulo: "Natureza da posição", tipo: "selecao", obrigatorio: false, opcoes: [{ value: "", label: "Selecione..." }, { value: "acompanhamento", label: "Acompanhamento mensal" }, { value: "fechamento_trimestral", label: "Fechamento trimestral" }] },
              { nome: "fonteResultadoClientesAtivos", rotulo: "Fonte documental", tipo: "texto", obrigatorio: false },
              { nome: "janelaApuracaoClientesAtivos", rotulo: "Natureza/janela da apuração", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "resultadoMensal",
            campoPercentualAtingido: "percentualAtingidoMensal",
            exigeEvidenciaNosFechamentos: true,
            resultadoOficial: "ultima_posicao_homologada",
            exigirHomologacaoTransacionalVersaoAtual: true
          };
        }
        if (Number(rule.indicadorId) === 4) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[3],
            tipoCalculo: "melhorias_acumuladas",
            tipoConsolidacao: "quantidade_acumulada",
            unidadeMedida: "percentual",
            metaAnualValor: 0.25,
            parametrosCalculo: {
              campoTipoPosicao: "tipoPosicaoAprimoramento",
              campoPosicaoAcumulada: "melhoriasImplementadasAcumuladas",
              campoValor: "melhoriasImplementadasMes",
              campoValorLegado: "melhoriasEntreguesMes",
              totalMelhoriasPlano2026: 22,
              metaPercentualAnualAprimoramento: 0.25,
              metaMinimaMelhoriasAno: 6,
              metaTipo: "curva_trimestral_acumulada",
              mesesFechamentoTrimestral: [3, 6, 9, 12],
              curvaTrimestralAcumulada: APRIMORAMENTO_CURVA_TRIMESTRAL_2026,
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [
              { nome: "tipoPosicaoAprimoramento", rotulo: "Tipo da posição", tipo: "selecao", obrigatorio: true, opcoes: TIPOS_POSICAO_APRIMORAMENTO },
              { nome: "melhoriasImplementadasMes", rotulo: "Melhorias implementadas no período de apuração", tipo: "inteiro", obrigatorio: false },
              { nome: "melhoriasImplementadasAcumuladas", rotulo: "Melhorias implementadas acumuladas", tipo: "inteiro", obrigatorio: false, somenteLeitura: true },
              { nome: "descricaoMelhoriasMes", rotulo: "Descrição das melhorias implementadas no período", tipo: "textarea", obrigatorio: false }
            ],
            campoResultadoPrincipal: "resultadoMensal",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "curva_trimestral_acumulada"
          };
        }
        if (Number(rule.indicadorId) === 10) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[9],
            tipoCalculo: "projeto_marco_entrega",
            tipoConsolidacao: "ultima_posicao_trimestral",
            unidadeMedida: "percentual",
            metaAnualValor: null,
            parametrosCalculo: {
              campoMarco: "marcoAtualPlataformaJogos",
              campoStatus: "statusProjetoPlataformaJogos",
              campoPercentual: "percentualEvolucaoPlataformaJogos",
              metaTipo: "meta_oficial_trimestral_projeto",
              metasTrimestraisOficiais: PLATAFORMA_JOGOS_METAS_2026,
              mesesFechamentoTrimestral: [3, 6, 9, 12],
              apresentacoesOficiaisTrimestrais: {
                "2TRI/2026": { metaOficialReportada: 1 / 3, resultadoOficialReportado: 0.1, percentualAtingidoOficialReportado: 0.3, situacaoOficial: "Abaixo da meta" },
                "3TRI/2026": { metaOficialReportada: 0.67, resultadoOficialReportado: 0.38, percentualAtingidoOficialReportado: 0.5672, situacaoOficial: "Abaixo da meta", nota: "Resultado oficial do Informe 0078/2026: evolução acumulada do MVP de 38%." }
              },
              marcosTrimestraisOficiais: {
                "4TRI/2026": "Piloto/MVP da Plataforma de Jogos"
              },
              sentidoMeta: "quanto_maior_melhor",
              metaAnualMarco: "Piloto/MVP da Plataforma de Jogos",
              marcoConcluido: "Piloto/MVP concluído",
              statusConcluido: "Piloto/MVP concluído",
              marcosPlataformaJogos2026: MARCOS_PLATAFORMA_JOGOS_2026,
              statusProjetoPlataformaJogos: STATUS_PROJETO_PLATAFORMA_JOGOS
            },
            camposEntrada: [
              { nome: "statusProjetoPlataformaJogos", rotulo: "Status do projeto", tipo: "selecao", obrigatorio: true, opcoes: STATUS_PROJETO_PLATAFORMA_JOGOS },
              { nome: "marcoAtualPlataformaJogos", rotulo: "Marco/etapa atual do projeto", tipo: "selecao", obrigatorio: true, opcoes: MARCOS_PLATAFORMA_JOGOS_2026 },
              { nome: "percentualEvolucaoPlataformaJogos", rotulo: "Percentual oficial de evolução do projeto", tipo: "percentual", entradaPtBr: true, obrigatorio: false },
              { nome: "descricaoAndamentoPlataformaJogos", rotulo: "Descrição do andamento", tipo: "texto", obrigatorio: false },
              { nome: "evidenciaPlataformaJogos", rotulo: "Evidência", tipo: "texto", obrigatorio: false },
              { nome: "observacaoArea", rotulo: "Observação da área", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "resultadoMensal",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "ultima_posicao_trimestral"
          };
        }
        if (Number(rule.indicadorId) === 11) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[10],
            tipoCalculo: "marco_projeto_percentual",
            tipoConsolidacao: "ultima_posicao_trimestral",
            unidadeMedida: "percentual",
            metaAnualValor: 1,
            parametrosCalculo: {
              campoStatus: "marcoAlcancadoTIC",
              campoPercentual: "percentualRealizadoTIC",
              metaTipo: "curva_trimestral_percentual",
              curvaTrimestralPercentual: CAPACIDADE_TIC_CURVA_TRIMESTRAL_2026,
              mesesFechamentoTrimestral: [3, 6, 9, 12],
              marcosCapacidadeTIC: CAPACIDADE_TIC_MARCOS,
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [
              { nome: "marcoAlcancadoTIC", rotulo: "Marco alcançado", tipo: "selecao", obrigatorio: true, opcoes: CAPACIDADE_TIC_MARCOS },
              { nome: "percentualRealizadoTIC", rotulo: "Percentual realizado", tipo: "percentual", obrigatorio: false },
              { nome: "descricaoAndamentoTIC", rotulo: "Descrição do andamento", tipo: "texto", obrigatorio: false },
              { nome: "evidenciaTIC", rotulo: "Evidência", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "resultadoMensal",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "ultima_posicao_trimestral"
          };
        }
        if (Number(rule.indicadorId) === 12) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[11],
            tipoCalculo: "nota_pesquisa_anual",
            tipoConsolidacao: "resultado_pesquisa_ou_ultima_posicao",
            unidadeMedida: "pontos",
            metaAnualValor: 60,
            parametrosCalculo: {
              campoTipoPosicao: "tipoPosicaoClima",
              campoMetaReferencia: "metaReferenciaClima",
              campoNota: "notaClimaApurada",
              campoDataBase: "dataBasePesquisaClima",
              campoFonte: "fonteEvidenciaClima",
              metaTipo: "fixa_anual",
              metaReferencia: 60,
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [
              { nome: "tipoPosicaoClima", rotulo: "Tipo da posição", tipo: "selecao", obrigatorio: true, opcoes: TIPOS_POSICAO_CLIMA },
              { nome: "metaReferenciaClima", rotulo: "Meta de referência", tipo: "numero", obrigatorio: false },
              { nome: "notaClimaApurada", rotulo: "Nota/média geral apurada", tipo: "numero", obrigatorio: false },
              { nome: "dataBasePesquisaClima", rotulo: "Data-base da pesquisa", tipo: "data", obrigatorio: false },
              { nome: "acoesRealizadasClima", rotulo: "Ações realizadas no período", tipo: "texto", obrigatorio: false },
              { nome: "descricaoAndamentoClima", rotulo: "Descrição do andamento", tipo: "texto", obrigatorio: false },
              { nome: "fonteEvidenciaClima", rotulo: "Fonte/evidência", tipo: "texto", obrigatorio: false },
              { nome: "observacaoArea", rotulo: "Observação da área", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "notaClimaApurada",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "resultado_pesquisa_ou_ultima_posicao_homologada"
          };
        }
        if (Number(rule.indicadorId) === 5) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[4],
            tipoCalculo: "ggr_formula",
            tipoConsolidacao: "acumulado_por_soma_mensal",
            unidadeMedida: "moeda",
            metaAnualValor: 14996238568.92,
            parametrosCalculo: {
              campoArrecadacao: "arrecadacaoTotalMes",
              campoPremios: "premiosAPagarMes",
              campoGgrAcumuladoDocumental: "ggrAcumuladoOficial",
              campoTipoPosicao: "tipoPosicaoGGR",
              metaTipo: "curva_acumulada_por_competencia",
              metasAcumuladasPorCompetencia: GGR_META_ACUMULADA_2026,
              sentidoMeta: "quanto_maior_melhor",
              mesesFechamentoTrimestral: [3, 6, 9, 12],
              metaAnualOriginalGGR: 15600000000,
              fonteMetaAnualVigente: "Proposição DILOT/GERIN nº 0050/2026, de 06/08/2026",
              apresentacoesOficiaisTrimestrais: {
                "1TRI/2026": { metaOficialReportada: 3070246140.78, resultadoOficialReportado: 3322204494.29, percentualAtingidoOficialReportado: 1.0820645453025435, situacaoOficial: "Atingido", fonte: "Informe DILOT/GERIN nº 0029/2026" },
                "2TRI/2026": { metaOficialReportada: 6782063824.52, resultadoOficialReportado: 6784050495.32, percentualAtingidoOficialReportado: 1.0002929301244285, situacaoOficial: "Atingido", fonte: "Informe DILOT/GERIN nº 0056/2026" },
                "3TRI/2026": { metaOficialReportada: 10271204883.87, resultadoOficialReportado: 10435959467.05, percentualAtingidoOficialReportado: 1.0160404339162517, situacaoOficial: "Atingido", fonte: "Informe DILOT/GERIN nº 0078/2026" },
                "4TRI/2026": { metaOficialReportada: 14996238568.92, resultadoOficialReportado: null, percentualAtingidoOficialReportado: null, situacaoOficial: "Sem dados", fonte: "Proposição DILOT/GERIN nº 0050/2026" }
              }
            },
            camposEntrada: [
              { nome: "arrecadacaoTotalMes", rotulo: "Arrecadação total no mês", tipo: "moeda", obrigatorio: false },
              { nome: "premiosAPagarMes", rotulo: "Prêmios a pagar no mês", tipo: "moeda", obrigatorio: false },
              { nome: "ggrAcumuladoOficial", rotulo: "GGR acumulado documental até a competência", tipo: "moeda", obrigatorio: false },
              { nome: "tipoPosicaoGGR", rotulo: "Tipo da posição", tipo: "selecao", obrigatorio: false, opcoes: ["acompanhamento", "fechamento_trimestral"] },
              { nome: "fonteResultadoGGR", rotulo: "Fonte do resultado acumulado", tipo: "texto", obrigatorio: false },
              { nome: "metaPlanilhaGGR", rotulo: "Meta de acompanhamento da planilha", tipo: "moeda", obrigatorio: false },
              { nome: "atingimentoPlanilhaGGR", rotulo: "Atingimento de acompanhamento da planilha", tipo: "percentual", entradaPtBr: true, escalaPercentual: "decimal", obrigatorio: false }
            ],
            campoResultadoPrincipal: "resultadoAcumulado",
            campoPercentualAtingido: "percentualAtingidoAnual",
            resultadoOficial: "ggr_acumulado_por_curva"
          };
        }
        if (Number(rule.indicadorId) === 6) {
          const normalizedIeoRule = {
            ...rule,
            nome: INDICATOR_NAMES[5],
            tipoCalculo: "indice_inverso",
            tipoConsolidacao: "ultima_posicao_acumulada",
            unidadeMedida: "percentual",
            metaAnualValor: 0.1403,
            parametrosCalculo: {
              campoDespesaPessoal: "despesaPessoalMes",
              campoDespesasAdministrativas: "despesasAdministrativasMes",
              campoReceitasLiquidas: "receitasLiquidasMes",
              campoIeoInformado: "ieoApuradoInformado",
              metaTipo: "curva_acumulada_por_competencia",
              metasAcumuladasPorCompetencia: IEO_META_ACUMULADA_2026,
              sentidoMeta: "quanto_menor_melhor"
            },
            camposEntrada: [
              { nome: "despesaPessoalMes", rotulo: "Despesa de pessoal", tipo: "moeda", obrigatorio: true },
              { nome: "despesasAdministrativasMes", rotulo: "Despesas administrativas", tipo: "moeda", obrigatorio: true },
              { nome: "receitasLiquidasMes", rotulo: "Receitas líquidas", tipo: "moeda", obrigatorio: true },
              { nome: "ieoApuradoInformado", rotulo: "IEO apurado pela unidade", tipo: "percentual", obrigatorio: false }
            ],
            campoResultadoPrincipal: "resultadoMensal",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "ultima_posicao_acumulada_homologada"
          };
          return window.IeoRecorrente?.ajustarRegraIeo(normalizedIeoRule) || normalizedIeoRule;
        }
        if (Number(rule.indicadorId) === 7) {
          const normalizedLucroRule = {
            ...rule,
            nome: INDICATOR_NAMES[6],
            tipoCalculo: "lucro_recorrente_mensal",
            tipoConsolidacao: "ultima_posicao_mensal_homologada",
            unidadeMedida: "moeda",
            metaAnualValor: 1209000000.00,
            parametrosCalculo: {
              ...(rule.parametrosCalculo || {}),
              campoValorMensal: "lucroLiquidoRecorrenteCompetencia",
              campoValorAcumuladoLegado: "lucroLiquidoRecorrenteAcumulado",
              metaTipo: "curva_mensal_por_competencia",
              metasMensaisPorCompetencia: LUCRO_RECORRENTE_META_MENSAL_2026,
              metasAcumuladasPorCompetencia: LUCRO_RECORRENTE_META_ACUMULADA_2026,
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [{
              nome: "lucroLiquidoRecorrenteCompetencia",
              rotulo: "Lucro líquido recorrente da competência",
              tipo: "moeda",
              obrigatorio: true
            }],
            campoResultadoPrincipal: "resultadoMensal",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "ultima_posicao_mensal_homologada"
          };
          return window.LucroRecorrente?.ajustarRegra(normalizedLucroRule) || normalizedLucroRule;
        }
        if (Number(rule.indicadorId) === 16) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[15],
            tipoCalculo: "iniciativas_apoiadas",
            tipoConsolidacao: "iniciativas_acumuladas",
            unidadeMedida: "quantidade",
            metaAnualValor: 2,
            parametrosCalculo: {
              campoNome: "nomeIniciativaSocioambiental",
              campoStatus: "statusIniciativaSocioambiental",
              campoDataApoio: "dataApoioIniciativa",
              statusQueConta: "Apoiada/realizada",
              metaTipo: "curva_trimestral_acumulada",
              curvaTrimestralAcumulada: APOIO_SOCIOAMBIENTAL_CURVA_2026,
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [
              { nome: "nomeIniciativaSocioambiental", rotulo: "Nome da iniciativa", tipo: "texto", obrigatorio: false },
              { nome: "tipoIniciativaSocioambiental", rotulo: "Tipo da iniciativa", tipo: "texto", obrigatorio: false },
              { nome: "statusIniciativaSocioambiental", rotulo: "Status da iniciativa", tipo: "selecao", obrigatorio: true, opcoes: STATUS_INICIATIVA_SOCIOAMBIENTAL },
              { nome: "dataApoioIniciativa", rotulo: "Data de apoio/realização", tipo: "data", obrigatorio: false },
              { nome: "descricaoAndamentoSocioambiental", rotulo: "Descrição do andamento", tipo: "texto", obrigatorio: false },
              { nome: "evidenciaIniciativaSocioambiental", rotulo: "Evidência", tipo: "texto", obrigatorio: false },
              { nome: "observacaoArea", rotulo: "Observação da área", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "iniciativasApoiadasAcumuladas",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "iniciativas_acumuladas_homologadas"
          };
        }
        if (Number(rule.indicadorId) === 17) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[16],
            tipoCalculo: "valor_financeiro_acumulado",
            tipoConsolidacao: "ultima_posicao_acumulada",
            unidadeMedida: "moeda",
            metaAnualValor: 10400000000,
            parametrosCalculo: {
              valorAcumuladoCampo: "repasseSocialAcumuladoCompetencia",
              metaTipo: "curva_acumulada_por_competencia",
              metasAcumuladasPorCompetencia: REPASSE_SOCIAL_META_ACUMULADA_2026,
              priorizarMetaCurvaConfigurada: true,
              mesesFechamentoTrimestral: [3, 6, 9, 12],
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [{
              nome: "repasseSocialAcumuladoCompetencia",
              rotulo: "Repasse social acumulado até a competência",
              tipo: "moeda",
              obrigatorio: true
            }],
            campoResultadoPrincipal: "resultadoMensal",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "ultima_posicao_acumulada_homologada"
          };
        }
        if (Number(rule.indicadorId) === 18) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[17],
            tipoCalculo: "plano_acao_por_elementos",
            tipoConsolidacao: "elementos_acumulados",
            unidadeMedida: "quantidade",
            metaAnualValor: 10,
            parametrosCalculo: {
              campoElemento: "elementoRGF",
              campoStatus: "statusAcao",
              metaTipo: "curva_trimestral_acumulada",
              curvaTrimestralAcumulada: PRINCIPIOS_JOGO_RESPONSAVEL_CURVA_2026,
              elementosJogoResponsavel: ELEMENTOS_JOGO_RESPONSAVEL,
              statusQueContam: ["Concluída", "Homologada"],
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [
              { nome: "elementoRGF", rotulo: "Elemento RGF-WLA atendido", tipo: "selecao", obrigatorio: true, opcoes: ELEMENTOS_JOGO_RESPONSAVEL },
              { nome: "acaoExecutada", rotulo: "Ação executada", tipo: "texto", obrigatorio: true },
              { nome: "descricaoAcao", rotulo: "Descrição da ação", tipo: "texto", obrigatorio: false },
              { nome: "statusAcao", rotulo: "Status da ação", tipo: "selecao", obrigatorio: true, opcoes: STATUS_ACAO_JOGO_RESPONSAVEL },
              { nome: "dataConclusao", rotulo: "Data de conclusão", tipo: "data", obrigatorio: false },
              { nome: "evidenciaAcao", rotulo: "Evidência", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "elementosAtendidosAcumulados",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "elementos_acumulados_homologados"
          };
        }
        if (Number(rule.indicadorId) === 15) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[14],
            tipoCalculo: "cobertura_capacitacao",
            tipoConsolidacao: "ultima_posicao_acumulada",
            unidadeMedida: "percentual",
            metaAnualValor: 0.90,
            parametrosCalculo: {
              campoTipoPosicao: "tipoPosicaoCapacitacao",
              campoModoResultado: "modoResultadoCapacitacao",
              campoResultadoOficialInformado: "resultadoOficialInformadoCapacitacao",
              campoPercentualAtingidoOficial: "percentualAtingidoOficialCapacitacao",
              campoComponentesResultado: "componentesResultadoCapacitacao",
              campoPublicoAlvo: "publicoAlvoElegivelCapacitacao",
              campoCapacitados: "empregadosCapacitadosCapacitacao",
              campoAcoesAcompanhamento: "acoesAcompanhamentoCapacitacao",
              campoQuantidadeCursos: "quantidadeCursosMinimaCapacitacao",
              campoCursosConsiderados: "cursosConsideradosCapacitacao",
              campoDataBase: "dataBaseApuracaoCapacitacao",
              campoFonte: "fonteEvidenciaCapacitacao",
              metaTipo: "curva_trimestral_quantidade_cursos",
              metaCobertura: 0.90,
              curvaTrimestralCursos: CAPACITACAO_EMPREGADOS_CURVA_TRIMESTRAL_2026,
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [
              {
                nome: "tipoPosicaoCapacitacao",
                rotulo: "Tipo da posição",
                tipo: "selecao",
                obrigatorio: true,
                opcoes: [
                  { value: "", label: "Selecione o tipo da posição" },
                  { value: "acompanhamento", label: "Acompanhamento sem nova medição" },
                  { value: "apuracao_quantitativa", label: "Apuração quantitativa" }
                ]
              },
              { nome: "acoesAcompanhamentoCapacitacao", rotulo: "Ações realizadas / andamento", tipo: "textarea", obrigatorio: false },
              {
                nome: "modoResultadoCapacitacao",
                rotulo: "Modo do resultado quantitativo",
                tipo: "selecao",
                obrigatorio: false,
                opcoes: [
                  { value: "calculado", label: "Calculado a partir de capacitados / elegíveis" },
                  { value: "oficial_informado", label: "Resultado oficial informado" }
                ]
              },
              { nome: "resultadoOficialInformadoCapacitacao", rotulo: "Resultado oficial informado", tipo: "percentual", entradaPtBr: true, obrigatorio: false },
              { nome: "percentualAtingidoOficialCapacitacao", rotulo: "% atingido oficial informado", tipo: "percentual", entradaPtBr: true, obrigatorio: false },
              { nome: "publicoAlvoElegivelCapacitacao", rotulo: "Público-alvo elegível", tipo: "inteiro", obrigatorio: false },
              { nome: "empregadosCapacitadosCapacitacao", rotulo: "Empregados capacitados no critério do trimestre", tipo: "inteiro", obrigatorio: false },
              { nome: "quantidadeCursosMinimaCapacitacao", rotulo: "Quantidade mínima de cursos exigida", tipo: "inteiro", obrigatorio: false, somenteLeitura: true },
              { nome: "cursosConsideradosCapacitacao", rotulo: "Curso(s)/trilha considerada", tipo: "texto", obrigatorio: false },
              { nome: "dataBaseApuracaoCapacitacao", rotulo: "Data-base da posição", tipo: "data", obrigatorio: false },
              { nome: "fonteEvidenciaCapacitacao", rotulo: "Fonte/evidência", tipo: "texto", obrigatorio: false },
              { nome: "observacaoArea", rotulo: "Observação da área", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "resultadoMensal",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "ultima_posicao_acumulada_homologada"
          };
        }
        if (Number(rule.indicadorId) === 21) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[20],
            tipoCalculo: "cobertura_capacitacao_jogo_responsavel",
            tipoConsolidacao: "ultima_posicao_acumulada",
            unidadeMedida: "percentual",
            metaAnualValor: 0.90,
            parametrosCalculo: {
              campoPublicoAlvo: "publicoAlvoElegivelJR",
              campoCapacitados: "empregadosCapacitadosJR",
              campoQuantidadeMinima: "quantidadeMinimaIniciativasJR",
              campoIniciativas: "iniciativasConsideradasJR",
              campoDataBase: "dataBaseApuracaoJR",
              campoFonte: "fonteEvidenciaJR",
              metaTipo: "cobertura_com_quantidade_minima_de_iniciativas",
              metaCobertura: 0.90,
              quantidadeMinimaIniciativasAnual: 2,
              mesesFechamentoTrimestral: [3, 6, 9, 12],
              curvaJogoResponsavel2026: JOGO_RESPONSAVEL_CAPACITACAO_CURVA_2026,
              apresentacoesOficiaisTrimestrais: {
                "2TRI/2026": {
                  metaIntermediariaAplicavel: false,
                  metaOficialReportada: 0,
                  resultadoOficialReportado: 0.6685,
                  percentualAtingidoOficialReportado: 0.6685,
                  situacaoOficial: "No prazo",
                  observacao: "Sem meta intermediária vinculante no período."
                }
              },
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [
              { nome: "publicoAlvoElegivelJR", rotulo: "Público-alvo elegível", tipo: "inteiro", obrigatorio: true },
              { nome: "empregadosCapacitadosJR", rotulo: "Empregados capacitados no critério do período", tipo: "inteiro", obrigatorio: true },
              { nome: "quantidadeMinimaIniciativasJR", rotulo: "Quantidade mínima de iniciativas exigida", tipo: "inteiro", obrigatorio: false },
              { nome: "iniciativasConsideradasJR", rotulo: "Iniciativas consideradas", tipo: "texto", obrigatorio: false },
              { nome: "dataBaseApuracaoJR", rotulo: "Data-base da apuração", tipo: "data", obrigatorio: false },
              { nome: "fonteEvidenciaJR", rotulo: "Fonte/evidência", tipo: "texto", obrigatorio: false },
              { nome: "observacaoArea", rotulo: "Observação da área", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "resultadoMensal",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "ultima_posicao_homologada"
          };
        }
        if (Number(rule.indicadorId) === 22) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[21],
            tipoCalculo: "participacao_ecossistema_lotex",
            tipoConsolidacao: "ultima_posicao_acumulada",
            unidadeMedida: "percentual",
            metaAnualValor: 1.10,
            parametrosCalculo: {
              ...(rule.parametrosCalculo || {}),
              campoArrTotal2025: "arrTotal2025",
              campoArrLotex2025: "arrEcoLotex2025",
              campoArrMarketplace2025: "arrEcoMarketplace2025",
              campoArrTotal2026: "arrTotal2026",
              campoArrLotex2026: "arrEcoLotex2026",
              campoArrMarketplace2026: "arrEcoMarketplace2026",
              campoResultadoDocumental: "resultadoDocumentalEcossistema",
              campoPercentualAtingidoOficial: "percentualAtingidoOficialEcossistema",
              campoMetaDocumental: "metaDocumentalEcossistema",
              campoTipoPosicao: "tipoPosicaoEcossistema",
              campoFonteResultado: "fonteResultadoEcossistema",
              metaTipo: "referencia_lotex_2025_por_vigencia",
              sentidoMeta: "quanto_maior_melhor",
              cenarioOficialResumoExecutivo: "lotex",
              marketplaceAplicaAoCalculo: false,
              acompanhamentoMensal: true,
              mesesFechamentoTrimestral: [3, 6, 9, 12],
              vigenciasMeta: [
                { inicio: "2026-01", fim: "2026-07", fator: 1.10, descricao: "≥ 10% em relação ao exercício de 2025" },
                { inicio: "2026-08", fim: "2026-12", fator: 1.01, descricao: "≥ 1% em relação ao exercício de 2025" }
              ],
              componentes2025PorCompetencia: { ...ECOSSISTEMA_COMPONENTES_2025 },
              componentes2026PorCompetencia: { ...ECOSSISTEMA_COMPONENTES_2026 },
              referenciasLotex2025PorCompetencia: Object.fromEntries(Object.keys(ECOSSISTEMA_COMPONENTES_2025).map((key) => [key, ECOSSISTEMA_COMPONENTES_2025[key].arrEcoLotex2025 / ECOSSISTEMA_COMPONENTES_2025[key].arrTotal2025])),
              metasTecnicasPorCompetencia: Object.fromEntries(Object.keys(ECOSSISTEMA_COMPONENTES_2025).map((key) => {
                const month = Number(key.slice(5, 7));
                const reference = ECOSSISTEMA_COMPONENTES_2025[key].arrEcoLotex2025 / ECOSSISTEMA_COMPONENTES_2025[key].arrTotal2025;
                return [key, reference * (month <= 7 ? 1.10 : 1.01)];
              })),
              apresentacoesOficiaisTrimestrais: { ...ECOSSISTEMA_APRESENTACOES_2026 },
              historicoRevisao: { ...ECOSSISTEMA_HISTORICO_REVISAO_2026 },
              cenariosHistoricos: [
                { value: "lotex_marketplace", label: "Lotex + Marketplace", aplicaAoCalculo: false }
              ]
            },
            camposEntrada: [
              { nome: "arrTotal2025", rotulo: "ARR Total 2025", tipo: "moeda", obrigatorio: true, somenteLeitura: true },
              { nome: "arrEcoLotex2025", rotulo: "ARR Eco Lotex 2025", tipo: "moeda", obrigatorio: true, somenteLeitura: true },
              { nome: "arrEcoMarketplace2025", rotulo: "ARR Eco Marketplace 2025 — auxiliar", tipo: "moeda", obrigatorio: false, somenteLeitura: true, aplicaAoCalculo: false },
              { nome: "referenciaLotex2025", rotulo: "Referência Lotex 2025", tipo: "percentual", obrigatorio: false, somenteLeitura: true, escalaPercentual: "decimal" },
              { nome: "fatorMetaVigente", rotulo: "Fator estratégico vigente", tipo: "percentual", obrigatorio: false, somenteLeitura: true, escalaPercentual: "decimal" },
              { nome: "metaParticipacao2026", rotulo: "Meta técnica de participação 2026", tipo: "percentual", obrigatorio: false, somenteLeitura: true, escalaPercentual: "decimal" },
              { nome: "arrTotal2026", rotulo: "ARR Total 2026", tipo: "moeda", obrigatorio: false },
              { nome: "arrEcoLotex2026", rotulo: "ARR Eco Lotex 2026", tipo: "moeda", obrigatorio: false },
              { nome: "arrEcoMarketplace2026", rotulo: "ARR Eco Marketplace 2026 — auxiliar", tipo: "moeda", obrigatorio: false, aplicaAoCalculo: false },
              { nome: "resultadoDocumentalEcossistema", rotulo: "Resultado Lotex documental", tipo: "percentual", obrigatorio: false, escalaPercentual: "decimal" },
              { nome: "metaDocumentalEcossistema", rotulo: "Meta documental do fechamento", tipo: "percentual", obrigatorio: false, escalaPercentual: "decimal" },
              { nome: "percentualAtingidoOficialEcossistema", rotulo: "Atingimento oficial documental", tipo: "percentual", obrigatorio: false, escalaPercentual: "decimal" },
              { nome: "tipoPosicaoEcossistema", rotulo: "Natureza da posição", tipo: "selecao", obrigatorio: false, opcoes: [{ value: "acompanhamento", label: "Acompanhamento mensal" }, { value: "fechamento_trimestral", label: "Fechamento trimestral" }] },
              { nome: "fonteResultadoEcossistema", rotulo: "Fonte documental", tipo: "texto", obrigatorio: false },
              { nome: "fonteEvidenciaEcossistema", rotulo: "Referência da evidência", tipo: "texto", obrigatorio: false },
              { nome: "observacaoArea", rotulo: "Observação da área", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "resultadoCalculado",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "ultima_posicao_homologada"
          };
        }
        if (Number(rule.indicadorId) === 23) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[22],
            tipoCalculo: "crescimento_rede_loterica_base_2025",
            tipoConsolidacao: "acumulado_periodo_equivalente",
            unidadeMedida: "percentual",
            metaAnualValor: 1.02,
            parametrosCalculo: {
              ...(rule.parametrosCalculo || {}),
              campoValor2026Mes: "arrecadacaoRedeLotericaMes2026",
              campoValor2026Acumulado: "arrecadacaoRedeLotericaAcumulada2026",
              campoBase2025PeriodoEquivalente: "arrecadacaoRedeLoterica2025PeriodoEquivalente",
              campoBase2025Acumulada: "arrecadacaoRedeLoterica2025Acumulada",
              metaTipo: "curva_indice_periodo_equivalente",
              metaIndice: 1.02,
              sentidoMeta: "quanto_maior_melhor",
              mesesFechamentoTrimestral: [3, 6, 9, 12],
              metasPorCompetencia: { ...REDE_LOTERICA_METAS_INDICE_2026 },
              apresentacoesOficiaisTrimestrais: { ...REDE_LOTERICA_APRESENTACOES_2026 },
              campoResultadoDocumental: "resultadoDocumentalRedeLoterica",
              campoPercentualAtingidoOficial: "percentualAtingidoOficialRedeLoterica",
              campoTipoPosicao: "tipoPosicaoRedeLoterica",
              campoFonteResultado: "fonteResultadoRedeLoterica",
              campoEscalaResultadoDocumental: "escalaResultadoDocumentalRedeLoterica"
            },
            camposEntrada: [
              { nome: "arrecadacaoRedeLoterica2025PeriodoEquivalente", rotulo: "Arrecadação Rede Lotérica 2025 no mês equivalente", tipo: "moeda", obrigatorio: false },
              { nome: "arrecadacaoRedeLotericaMes2026", rotulo: "Arrecadação Rede Lotérica 2026 no mês", tipo: "moeda", obrigatorio: false },
              { nome: "resultadoDocumentalRedeLoterica", rotulo: "Resultado documental", tipo: "percentual", obrigatorio: false, escalaPercentual: "decimal" },
              { nome: "percentualAtingidoOficialRedeLoterica", rotulo: "Atingimento oficial documental", tipo: "percentual", obrigatorio: false, escalaPercentual: "decimal" },
              { nome: "tipoPosicaoRedeLoterica", rotulo: "Natureza da posição", tipo: "selecao", obrigatorio: false, opcoes: [{ value: "", label: "Selecione..." }, { value: "fechamento_trimestral", label: "Fechamento trimestral" }] },
              { nome: "fonteResultadoRedeLoterica", rotulo: "Fonte documental", tipo: "texto", obrigatorio: false },
              { nome: "escalaResultadoDocumentalRedeLoterica", rotulo: "Escala do resultado documental", tipo: "selecao", obrigatorio: false, opcoes: [{ value: "indice", label: "Índice" }, { value: "incremento", label: "Incremento" }] }
            ],
            campoResultadoPrincipal: "indiceEmRelacaoA2025",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "ultima_posicao_homologada"
          };
        }
        if (Number(rule.indicadorId) === 19) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[18],
            tipoCalculo: "investimento_socioambiental",
            tipoConsolidacao: "valor_acumulado",
            unidadeMedida: "moeda",
            metaAnualValor: 4307900,
            parametrosCalculo: {
              campoNome: "nomeProjetoIncentivoSocioambiental",
              campoTipo: "tipoIncentivoSocioambiental",
              campoStatus: "statusProjetoIncentivoSocioambiental",
              campoValorMes: "valorInvestidoMes",
              campoValorAcumulado: "valorInvestidoAcumuladoCompetencia",
              campoDataInvestimento: "dataInvestimentoSocioambiental",
              campoDescricao: "descricaoAndamentoIncentivoSocioambiental",
              campoEvidencia: "evidenciaIncentivoSocioambiental",
              statusQueConta: "Investimento realizado",
              metaTipo: "curva_trimestral_acumulada",
              lucroLiquidoReferencia: 1305400000,
              percentualMetaAnual: 0.0033,
              mesesFechamentoTrimestral: [3, 6, 9, 12],
              curvaTrimestralAcumulada: INCENTIVO_SOCIOAMBIENTAL_CURVA_2026,
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [
              { nome: "nomeProjetoIncentivoSocioambiental", rotulo: "Nome do projeto/iniciativa", tipo: "texto", obrigatorio: true },
              { nome: "tipoIncentivoSocioambiental", rotulo: "Tipo de incentivo/patrocínio", tipo: "texto", obrigatorio: false },
              { nome: "statusProjetoIncentivoSocioambiental", rotulo: "Status do projeto", tipo: "selecao", obrigatorio: true, opcoes: STATUS_INCENTIVO_SOCIOAMBIENTAL },
              { nome: "valorInvestidoMes", rotulo: "Valor investido no mês", tipo: "moeda", obrigatorio: false },
              { nome: "valorInvestidoAcumuladoCompetencia", rotulo: "Valor investido acumulado até a competência", tipo: "moeda", obrigatorio: false },
              { nome: "dataInvestimentoSocioambiental", rotulo: "Data do investimento", tipo: "data", obrigatorio: false },
              { nome: "descricaoAndamentoIncentivoSocioambiental", rotulo: "Descrição do andamento", tipo: "texto", obrigatorio: false },
              { nome: "evidenciaIncentivoSocioambiental", rotulo: "Evidência", tipo: "texto", obrigatorio: false },
              { nome: "observacaoArea", rotulo: "Observação da área", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "valorInvestidoAcumuladoCompetencia",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "valor_acumulado_homologado"
          };
        }
        if (Number(rule.indicadorId) === 20) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[19],
            tipoCalculo: "execucao_acoes_propostas",
            tipoConsolidacao: "acoes_realizadas_acumuladas",
            unidadeMedida: "percentual",
            metaAnualValor: 1,
            parametrosCalculo: {
              campoAcao: "acaoPropostaVisibilidade",
              campoStatus: "statusAcaoVisibilidade",
              campoEtapa: "etapaAtualVisibilidade",
              campoDescricao: "descricaoAndamentoVisibilidade",
              campoDataConclusao: "dataConclusaoVisibilidade",
              campoEvidencia: "evidenciaVisibilidade",
              statusQueConta: "Publicada/realizada",
              totalAcoesPropostas: 2,
              metaTipo: "curva_trimestral_acumulada",
              curvaTrimestralAcumulada: VISIBILIDADE_REPASSES_CURVA_2026,
              acoesPropostasVisibilidade: ACOES_VISIBILIDADE_REPASSES_2026,
              sentidoMeta: "quanto_maior_melhor"
            },
            camposEntrada: [
              { nome: "acaoPropostaVisibilidade", rotulo: "Ação proposta", tipo: "selecao", obrigatorio: true, opcoes: ACOES_VISIBILIDADE_REPASSES_2026 },
              { nome: "statusAcaoVisibilidade", rotulo: "Status da ação", tipo: "selecao", obrigatorio: true, opcoes: STATUS_ACAO_VISIBILIDADE },
              { nome: "etapaAtualVisibilidade", rotulo: "Etapa atual", tipo: "texto", obrigatorio: false },
              { nome: "descricaoAndamentoVisibilidade", rotulo: "Descrição do andamento", tipo: "texto", obrigatorio: false },
              { nome: "dataConclusaoVisibilidade", rotulo: "Data de conclusão/publicação", tipo: "data", obrigatorio: false },
              { nome: "evidenciaVisibilidade", rotulo: "Evidência", tipo: "texto", obrigatorio: false },
              { nome: "observacaoArea", rotulo: "Observação da área", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "resultadoMensal",
            campoPercentualAtingido: "percentualAtingidoMensal",
            resultadoOficial: "acoes_realizadas_acumuladas_homologadas"
          };
        }
        if (Number(rule.indicadorId) === 8) {
          return {
            ...rule,
            nome: INDICATOR_NAMES[7],
            tipoCalculo: "razao_canais_digitais",
            tipoConsolidacao: "razao_acumulada_no_periodo",
            unidadeMedida: "percentual",
            metaAnualValor: 0.2911,
            parametrosCalculo: {
              campoNumerador: "arrecadacaoCanaisEletronicosMes",
              campoDenominador: "arrecadacaoTotalProdutosLoteriasMes",
              campoResultadoAcumuladoDocumental: "resultadoAcumuladoDocumentalCanaisDigitais",
              campoPercentualAtingidoOficial: "percentualAtingidoOficialCanaisDigitais",
              percentualReferencia2025: 0.2305,
              acrescimoMetaPontosPercentuais: 0.05,
              metaTipo: "curva_por_competencia",
              metasPorCompetencia: CANAIS_DIGITAIS_METAS_2026,
              mesesFechamentoTrimestral: [3, 6, 9, 12],
              apresentacoesOficiaisTrimestrais: {
                "1TRI/2026": { metaOficialReportada: 0.2805, resultadoOficialReportado: 0.2967, percentualAtingidoOficialReportado: 1.058, situacaoOficial: "Atingido", fonte: "Informe DILOT/GERIN nº 0029/2026" },
                "2TRI/2026": { metaOficialReportada: 0.2798, resultadoOficialReportado: 0.2902, percentualAtingidoOficialReportado: 1.0372, situacaoOficial: "Atingido", fonte: "Informe DILOT/GERIN nº 0056/2026" },
                "3TRI/2026": { metaOficialReportada: 0.2837, resultadoOficialReportado: 0.2917, percentualAtingidoOficialReportado: 1.0282, situacaoOficial: "Atingido", fonte: "Informe DILOT/GERIN nº 0078/2026" },
                "4TRI/2026": { metaOficialReportada: 0.2911, resultadoOficialReportado: null, percentualAtingidoOficialReportado: null, situacaoOficial: "Sem dados", fonte: "16.10(3).xlsx" }
              }
            },
            camposEntrada: [
              { nome: "arrecadacaoCanaisEletronicosMes", rotulo: "Arrecadação total nos canais eletrônicos no mês", tipo: "moeda", obrigatorio: false },
              { nome: "arrecadacaoTotalProdutosLoteriasMes", rotulo: "Arrecadação total dos produtos de loterias no mês", tipo: "moeda", obrigatorio: false },
              { nome: "resultadoAcumuladoDocumentalCanaisDigitais", rotulo: "Resultado acumulado documental", tipo: "percentual", escalaPercentual: "decimal", obrigatorio: false },
              { nome: "percentualAtingidoOficialCanaisDigitais", rotulo: "Atingimento oficial documental", tipo: "percentual", escalaPercentual: "decimal", obrigatorio: false },
              { nome: "tipoPosicaoCanaisDigitais", rotulo: "Natureza da posição", tipo: "texto", obrigatorio: false },
              { nome: "fonteResultadoCanaisDigitais", rotulo: "Fonte documental", tipo: "texto", obrigatorio: false }
            ],
            campoResultadoPrincipal: "resultadoAcumulado",
            campoPercentualAtingido: "percentualAtingidoAnual",
            resultadoOficial: "razao_acumulada_homologada_no_periodo"
          };
        }
        return Number(rule.indicadorId) === 9 ? {
        ...rule,
        nome: INDICATOR_NAMES[8],
        tipoCalculo: "razao_pix",
        tipoConsolidacao: "ultima_posicao_acumulada",
        unidadeMedida: "percentual",
        metaAnualValor: 0.65,
        parametrosCalculo: {
          campoNumeradorAcumulado: "arrecadacaoPixAcumuladaCompetencia",
          campoDenominadorAcumulado: "arrecadacaoTotalCanaisEletronicosAcumuladaCompetencia",
          campoNumeradorMensalLegado: "arrecadacaoPixMes",
          campoDenominadorMensalLegado: "arrecadacaoTotalCanaisEletronicosMes",
          campoResultadoOficial: "resultadoOficialPix",
          campoPercentualAtingidoOficial: "percentualAtingidoOficialPix",
          modoEntrada: "posicao_acumulada_prioritaria",
          excluirInternetBankingCaixa: true,
          observacaoMetodologica: "O denominador exclui Internet Banking CAIXA (IBC), pois o PIX não é aceito nesse canal.",
          metasTrimestrais: {
            "1TRI/2026": 0.61,
            "2TRI/2026": 0.62,
            "3TRI/2026": 0.63,
            "4TRI/2026": 0.65
          },
          metasOperacionaisPorCompetencia: {
            "2026-01": 0.63, "2026-02": 0.61, "2026-03": 0.61,
            "2026-04": 0.61, "2026-05": 0.61, "2026-06": 0.62,
            "2026-07": 0.63, "2026-08": 0.63, "2026-09": 0.63,
            "2026-10": 0.6342, "2026-11": 0.6383, "2026-12": 0.6543
          },
          trajetoriaTecnicaAuxiliar: {
            "2026-07": 0.6215, "2026-08": 0.6255, "2026-09": 0.6298
          },
          mesesFechamentoTrimestral: [3, 6, 9, 12],
          apresentacoesOficiaisTrimestrais: {
            "1TRI/2026": { metaOficialReportada: 0.61, resultadoOficialReportado: 0.67, percentualAtingidoOficialReportado: 1.1009, situacaoOficial: "Atingido", fonte: "Informe DILOT/GERIN nº 0029/2026" },
            "2TRI/2026": { metaOficialReportada: 0.62, resultadoOficialReportado: 0.6713, percentualAtingidoOficialReportado: 1.0914, situacaoOficial: "Atingido", fonte: "Informe DILOT/GERIN nº 0056/2026" },
            "3TRI/2026": { metaOficialReportada: 0.63, resultadoOficialReportado: 0.6764, percentualAtingidoOficialReportado: 1.0737, situacaoOficial: "Atingido", fonte: "Informe DILOT/GERIN nº 0078/2026" },
            "4TRI/2026": { metaOficialReportada: 0.65, resultadoOficialReportado: null, percentualAtingidoOficialReportado: null, situacaoOficial: "Sem dados", fonte: "Curva trimestral oficial 2026" }
          }
        },
        camposEntrada: [
          { nome: "arrecadacaoPixAcumuladaCompetencia", rotulo: "Arrecadação com PIX acumulada até a competência", tipo: "moeda", obrigatorio: false },
          { nome: "arrecadacaoTotalCanaisEletronicosAcumuladaCompetencia", rotulo: "Arrecadação total acumulada nos canais eletrônicos (sem IBC)", tipo: "moeda", obrigatorio: false },
          { nome: "resultadoOficialPix", rotulo: "Resultado oficial reportado", tipo: "percentual", entradaPtBr: true, escalaPercentual: "decimal", obrigatorio: false },
          { nome: "percentualAtingidoOficialPix", rotulo: "Atingimento oficial reportado", tipo: "percentual", entradaPtBr: true, escalaPercentual: "decimal", obrigatorio: false }
        ],
        campoResultadoPrincipal: "resultadoAcumulado",
        campoPercentualAtingido: "percentualAtingidoAnual",
        resultadoOficial: "resultado_documental_do_informe_preservado"
      } : {
        ...rule,
        nome: INDICATOR_NAMES[Number(rule.indicadorId) - 1] || rule.nome,
        camposEntrada: normalizedFields
      };
      });
    }

    if (key === "metas" && Array.isArray(value)) {
      return value.map((meta) => ({
        ...meta,
        metaMensal: resolveMeta(meta.indicadorId, meta.ano, meta.mes, value, meta.metaMensal)
      }));
    }

    if (key === "pilares" && Array.isArray(value)) {
      return value.map((pillar) => ({
        ...pillar,
        nome: PILLAR_NAMES[Number(pillar.id) - 1] || pillar.nome
      }));
    }

    if (key === "lancamentos" && Array.isArray(value)) {
      return value.map((launch) => {
        const persistedMeta = launch.metaReferencia ?? launch.metaMensal ?? null;
        const normalized = normalizarSituacaoLancamento(normalizarCamposMoeda(migrarCampoJogoResponsavelCapacitacaoLegado(migrarCampoVisibilidadeRepassesLegado(migrarCampoIncentivoSocioambientalLegado(migrarCampoApoioSocioambientalLegado(migrarCampoPrincipiosJogoResponsavelLegado(migrarCampoCapacidadeTicLegado(migrarCampoPlataformaJogosLegado(migrarCampoAprimoramentoLegado(migrarCampoCapacitacaoLegado(migrarCampoClimaLegado(migrarCampoNpsLegado(migrarCampoOfertasLegado(migrarCampoRedeLotericaLegado(migrarCampoEcossistemaLegado(migrarCampoRepasseSocialLegado(migrarCampoGgrLegado({
        ...launch,
        id: /^\d+$/.test(String(launch.id ?? "")) ? Number(launch.id) : launch.id,
        indicadorId: /^\d+$/.test(String(launch.indicadorId ?? launch.indicador_id ?? ""))
          ? Number(launch.indicadorId ?? launch.indicador_id)
          : (launch.indicadorId ?? launch.indicador_id),
        pilar: getCanonicalPillar(Number(launch.indicadorId ?? launch.indicador_id)),
        competencia: launch.competencia || `${launch.ano}-${String(launch.mes).padStart(2, "0")}`,
        trimestre: launch.trimestre || `${Math.ceil(Number(launch.mes) / 3)}TRI/${launch.ano}`,
        nomeMes: launch.nomeMes || (MESES.find(([mes]) => mes === Number(launch.mes)) || [null, ""])[1],
        ...(Number(launch.indicadorId) === 9 ? {
          metaMensal: resolveMeta(9, launch.ano, launch.mes, cache.metas, persistedMeta),
          metaAnualDescricao: "Aumentar em 05 p.p. as vendas com o meio de pagamento PIX no canal eletrônico."
        } : {}),
        ...(Number(launch.indicadorId) === 1 ? {
          metaMensal: 0.10,
          metaAnualDescricao: "≥ 10%"
        } : {}),
        ...(Number(launch.indicadorId) === 2 ? {
          metaAnualDescricao: "Meta vigente nos fechamentos do 2TRI ao 4TRI/2026: NPS 60 pontos.",
          ...resolveNpsLaunchState(launch, persistedMeta)
        } : {}),
        ...(Number(launch.indicadorId) === 4 ? {
          metaMensal: getAprimoramentoMetaTrimestral(launch.ano, launch.mes),
          metaAnualDescricao: "Implementar melhorias que atendam a 25% das ocorrências apontadas na pesquisa NPS de baseline."
        } : {}),
        ...(Number(launch.indicadorId) === 10 ? {
          metaMensal: getPlataformaJogosMetaTrimestral(launch.ano, launch.mes),
          metaAnualDescricao: "Piloto ou MVP da Plataforma de Jogos"
        } : {}),
        ...(Number(launch.indicadorId) === 11 ? {
          metaMensal: getCapacidadeTicMetaOficialCompetencia(launch.ano, launch.mes),
          metaReferenciaTrimestre: getCapacidadeTicMetaTrimestral(launch.ano, launch.mes),
          tipoPosicaoTIC: isCapacidadeTicFechamento(launch.mes) ? "fechamento_trimestral" : "acompanhamento",
          metaAnualDescricao: "Contratação e/ou celebração de parceria para o desenvolvimento de soluções de TIC até o final do exercício de 2026."
        } : {}),
        ...(Number(launch.indicadorId) === 12 ? {
          unidadeApuradora: "GERIN",
          diretoriaResponsavel: "DILOT",
          metaMensal: 60,
          metaAnualDescricao: "Média geral ≥ 60"
        } : {}),
        ...(Number(launch.indicadorId) === 15 ? {
          unidadeApuradora: "GERIN",
          diretoriaResponsavel: "DILOT",
          metaMensal: getCapacitacaoEmpregadosMetaTrimestral(launch.ano, launch.mes),
          metaAnualDescricao: "≥ 90%"
        } : {}),
        ...(Number(launch.indicadorId) === 18 ? {
          metaMensal: getPrincipiosJogoResponsavelMetaTrimestral(launch.ano, launch.mes),
          metaAnualDescricao: "Nível 3 RGF-WLA - Executar ações de melhoria para os 10 elementos."
        } : {}),
        ...(Number(launch.indicadorId) === 16 ? {
          metaMensal: getApoioSocioambientalMetaTrimestral(launch.ano, launch.mes),
          metaAnualDescricao: "02 iniciativas apoiadas"
        } : {}),
        ...(Number(launch.indicadorId) === 5 ? {
          metaMensal: getGgrMetaAcumulada(launch.ano, launch.mes),
          metaAnualDescricao: "≥ R$ 14.996.238.568,92"
        } : {}),
        ...(Number(launch.indicadorId) === 6 ? {
          metaMensal: getIeoMetaAcumulada(launch.ano, launch.mes),
          metaAnualDescricao: "A meta vigente de cada competência é a cadastrada em Configurações > Metas."
        } : {}),
        ...(Number(launch.indicadorId) === 7 ? {
          metaMensal: getLucroRecorrenteMetaMensal(launch.ano, launch.mes),
          metaAcumulada: getLucroRecorrenteMetaAcumulada(launch.ano, launch.mes),
          metaReferencia: getLucroRecorrenteMetaMensal(launch.ano, launch.mes),
          metaAnualDescricao: "R$ 1.209.000.000,00"
        } : {}),
        ...(Number(launch.indicadorId) === 17 ? {
          metaMensal: getRepasseSocialMetaAcumulada(launch.ano, launch.mes),
          metaAnualDescricao: "≥ R$ 10,4 bilhões"
        } : {}),
        ...(Number(launch.indicadorId) === 19 ? {
          metaMensal: getIncentivoSocioambientalMetaTrimestral(launch.ano, launch.mes),
          metaAnualDescricao: "0,33% do Lucro Líquido do ano (R$ 4.307.900,00 estimados)"
        } : {}),
        ...(Number(launch.indicadorId) === 20 ? {
          metaMensal: getVisibilidadeRepassesMetaTrimestral(launch.ano, launch.mes),
          metaAnualDescricao: "Implantar 100% das ações propostas"
        } : {}),
        ...(Number(launch.indicadorId) === 21 ? {
          metaMensal: getJogoResponsavelCapacitacaoMetaTrimestral(launch.ano, launch.mes),
          metaAnualDescricao: "≥ 90% do público-alvo capacitado em pelo menos 2 iniciativas de Jogo Responsável"
        } : {}),
        ...(Number(launch.indicadorId) === 22 ? {
          metaMensal: (launch.camposEntrada?.arrTotal2025 !== undefined && persistedMeta !== null)
            ? persistedMeta
            : getEcossistemaMetaCompetencia(launch.ano, launch.mes),
          metaReferencia: (launch.camposEntrada?.arrTotal2025 !== undefined && persistedMeta !== null)
            ? persistedMeta
            : getEcossistemaMetaCompetencia(launch.ano, launch.mes),
          metaAnualDescricao: getEcossistemaMetaAnualDescricao(launch.ano, launch.mes)
        } : {}),
        ...(Number(launch.indicadorId) === 23 ? {
          metaMensal: getRedeLotericaMetaIndiceTrimestral(launch.ano, launch.mes),
          metaAnualDescricao: "Índice anual ≥ 102,00% da base 2025 equivalente"
        } : {}),
        ...(Number(launch.indicadorId) === 8 ? {
          unidadeApuradora: "SUCOL",
          diretoriaResponsavel: "DICOT",
          metaMensal: getCanaisDigitaisMeta(launch.ano, launch.mes),
          metaAnualDescricao: "Aumentar em 05 p.p. as vendas provenientes de canais digitais."
        } : {})
      }))))))))))))))))));
        const officialMeta = resolveMeta(launch.indicadorId ?? launch.indicador_id, launch.ano, launch.mes, cache.metas || [], persistedMeta);
        return normalizarPosicaoCapacidadeTic({
          ...normalized,
          ...(Number(launch.indicadorId ?? launch.indicador_id) === 7 ? {
            metaAcumulada: getLucroRecorrenteMetaAcumuladaOficial(launch.ano, launch.mes)
          } : {})
        }, launch, officialMeta);
      });
    }

    if ((key === "homologacoes" || key === "historico") && Array.isArray(value)) {
      return value;
    }

    if (key !== "usuarios" || !Array.isArray(value)) {
      return value;
    }

    if (value.some((user) => user.id === "usuario-companhia")) {
      return value;
    }

    return [
      ...value,
      {
        id: "usuario-companhia",
        nome: "Usuário da Companhia",
        email: "usuario.companhia@caixaloterias.local",
        perfil: "Usuário Companhia",
        unidadeApuradora: "",
        diretoriaResponsavel: ""
      }
    ];
  }

  async function loadJson(key) {
    if (cache[key]) {
      return cache[key];
    }

    if (isReadRestrictedCollectionForProfile(key)) {
      cache[key] = normalizeData(key, []);
      return cache[key];
    }

    const centralValue = await loadFromJsonDb(key);
    if (centralValue === null) {
      throw new Error(`A colecao ${key} nao foi retornada pelo SQL Server.`);
    }
    cache[key] = normalizeData(key, centralValue);
    return cache[key];
  }

  async function loadAll() {
    const metas = await loadJson("metas");
    const entries = await Promise.all(
      Object.keys(DATA_FILES).filter((key) => key !== "metas").map(async (key) => [key, await loadJson(key)])
    );
    const data = { ...Object.fromEntries(entries), metas };
    if (Array.isArray(data.regrasIndicadores)) {
      data.regrasIndicadores = data.regrasIndicadores.map((rule) => metasForRule(rule, metas));
      cache.regrasIndicadores = data.regrasIndicadores;
    }
    return data;
  }

  async function carregarBaseValidacaoCompleta() {
    return loadAll();
  }

  async function salvarBaseValidacaoCompleta() {
    throw new Error("Importacao de base local desativada: utilize os fluxos persistidos no SQL Server.");
  }

  async function getLancamentos() {
    return loadJson("lancamentos");
  }

  function salvarLancamentos(lancamentos) {
    return saveLocal("lancamentos", lancamentos);
  }

  function carregarLancamentos() {
    const lancamentos = cache.lancamentos;
    return Array.isArray(lancamentos) ? lancamentos : [];
  }

  async function saveLocal(key, value) {
    if (key === "lancamentos" && Array.isArray(value)) {
      value = value.map(normalizarSituacaoLancamento);
    }
    if (key === "historico") {
      return true;
    }
    const centralSaved = await enqueueJsonDbWrite(key, value);
    if (!centralSaved) {
      throw new Error(`A colecao ${key} nao foi confirmada pelo SQL Server.`);
    }
    cache[key] = value;
    return true;
  }

  async function getStorageInfo() {
    const centralAvailable = await checkJsonDb();
    return {
      mode: "php_sqlserver",
      centralAvailable,
      localDatabase: "SQL Server",
      hasPendingLocalBackup: false,
      message: "Fonte central SQL Server ativa."
    };
  }

  async function publicarDadosLocaisNaBaseCentral() {
    throw new Error("A publicacao de dados locais foi desativada: o SQL Server e a fonte exclusiva.");
  }

  async function appendHistory(entry) {
    const historico = await loadJson("historico");
    const nextEntry = {
      id: historico.length ? Math.max(...historico.map((item) => Number(item.id) || 0)) + 1 : 1,
      dataHora: new Date().toISOString(),
      ...entry
    };
    const updated = [...historico, nextEntry];
    await saveLocal("historico", updated);
    return nextEntry;
  }

  function clearLocalData() {
    Object.keys(cache).forEach((key) => delete cache[key]);
  }

  window.DataStore = {
    loadJson,
    loadAll,
    carregarBaseValidacaoCompleta,
    salvarBaseValidacaoCompleta,
    saveLocal,
    salvarLancamentos,
    carregarLancamentos,
    appendHistory,
    clearLocalData,
    getLancamentos,
    getStorageInfo,
    publicarDadosLocaisNaBaseCentral,
    normalizeData,
    gerarLancamentosLimpos,
    completarLancamentosAusentes,
    resetarBaseOperacionalGlobal,
    resolveMeta,
    getCapacidadeTicMetaTrimestral,
    getCapacidadeTicMetaOficialCompetencia,
    isCapacidadeTicFechamento,
    metasForRule,
    resolveNpsLaunchState,
    getLucroRecorrenteMetaAcumuladaOficial,
    resetarDadosOperacionais,
    resetarLancamentosIniciais
  };
})();

