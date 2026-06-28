const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const EXTENSIONS = new Set([".html", ".js", ".json", ".css", ".md", ".bat"]);
const SKIP_DIRS = new Set([".git", "dist", "node_modules"]);
const SKIP_FILES = new Set([
  path.resolve(__filename),
  path.join(ROOT, "assets", "js", "dataStore.js")
]);

const CP1252_REVERSE = new Map([
  ["€", 0x80], ["‚", 0x82], ["ƒ", 0x83], ["„", 0x84], ["…", 0x85],
  ["†", 0x86], ["‡", 0x87], ["ˆ", 0x88], ["‰", 0x89], ["Š", 0x8a],
  ["‹", 0x8b], ["Œ", 0x8c], ["Ž", 0x8e], ["‘", 0x91], ["’", 0x92],
  ["“", 0x93], ["”", 0x94], ["•", 0x95], ["–", 0x96], ["—", 0x97],
  ["˜", 0x98], ["™", 0x99], ["š", 0x9a], ["›", 0x9b], ["œ", 0x9c],
  ["ž", 0x9e], ["Ÿ", 0x9f]
]);

const TEXT_REPLACEMENTS = [
  ["Efici?ncia", "Eficiência"],
  ["Inova?o", "Inovação"],
  ["Atua?o", "Atuação"],
  ["per?odo", "período"],
  ["Per?odo", "Período"],
  ["apura?o", "apuração"],
  ["Apura?o", "Apuração"],
  ["situa?o", "situação"],
  ["Situa?o", "Situação"],
  ["N?o", "Não"],
  ["n?o", "não"],
  ["m?s", "mês"],
  ["M?s", "Mês"],
  ["Mar?o", "Março"],
  ["Estrat?gico", "Estratégico"],
  ["Neg?cios", "Negócios"],
  ["Relat?rio", "Relatório"],
  ["relat?rio", "relatório"],
  ["A?o", "Ação"],
  ["a?o", "ação"],
  ["Conclu?da", "Concluída"],
  ["conclu?das", "concluídas"],
  ["l?quido", "líquido"],
  ["Arrecada?o", "Arrecadação"],
  ["eletr?nicos", "eletrônicos"],
  ["lot?ricos", "lotéricos"],
  ["execu?o", "execução"],
  ["Evid?ncia", "Evidência"],
  ["N?mero", "Número"],
  ["M?dia", "Média"],
  ["Refer?ncia", "Referência"],
  ["Gest?o", "Gestão"]
];

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
  "Ampliar Capacidade de Desenvolvimento de Soluções de TIC",
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
  "Participação da Rede Lotérica nos Negócios"
];

const PILLAR_NAMES = [
  "Cliente no Centro",
  "Eficiência e Rentabilidade",
  "Tecnologia e Inovação",
  "Pessoas, Cultura e Agilidade",
  "Sustentabilidade e Cidadania",
  "Atuação em Ecossistema"
];
const NPS_REFERENCIAS_2026 = {
  "2026-03": 55
};
const TIPOS_POSICAO_NPS = [
  "Baseline",
  "Acompanhamento",
  "Pesquisa oficial",
  "Revis\u00e3o metodol\u00f3gica",
  "Fechamento anual"
];
const TIPOS_POSICAO_CLIMA = [
  "Acompanhamento",
  "Plano de a\u00e7\u00e3o",
  "Pesquisa oficial",
  "Revis\u00e3o metodol\u00f3gica",
  "Fechamento anual"
];
const CAPACITACAO_EMPREGADOS_CURVA_TRIMESTRAL_2026 = {
  "1TRI/2026": { metaCobertura: 0.90, quantidadeCursosMinima: 1, descricao: "90% do p\u00fablico-alvo com 01 curso conclu\u00eddo: Curso de Jogo Respons\u00e1vel" },
  "2TRI/2026": { metaCobertura: 0.90, quantidadeCursosMinima: 2, descricao: "90% do p\u00fablico-alvo com 02 cursos conclu\u00eddos acumulados" },
  "3TRI/2026": { metaCobertura: 0.90, quantidadeCursosMinima: 4, descricao: "90% do p\u00fablico-alvo com 04 cursos conclu\u00eddos acumulados" },
  "4TRI/2026": { metaCobertura: 0.90, quantidadeCursosMinima: 5, descricao: "90% do p\u00fablico-alvo com 05 cursos conclu\u00eddos acumulados" }
};
const JOGO_RESPONSAVEL_CAPACITACAO_CURVA_2026 = {
  "1TRI/2026": { metaCobertura: 0.90, quantidadeMinimaIniciativas: 1, descricao: "90% do p\u00fablico-alvo com pelo menos 1 a\u00e7\u00e3o de dissemina\u00e7\u00e3o de Jogo Respons\u00e1vel conclu\u00edda" },
  "2TRI/2026": { metaCobertura: 0.90, quantidadeMinimaIniciativas: 2, descricao: "90% do p\u00fablico-alvo com pelo menos 2 iniciativas de Jogo Respons\u00e1vel conclu\u00eddas" },
  "3TRI/2026": { metaCobertura: 0.90, quantidadeMinimaIniciativas: 2, descricao: "90% do p\u00fablico-alvo com pelo menos 2 iniciativas de Jogo Respons\u00e1vel conclu\u00eddas" },
  "4TRI/2026": { metaCobertura: 0.90, quantidadeMinimaIniciativas: 2, descricao: "90% do p\u00fablico-alvo com pelo menos 2 iniciativas de Jogo Respons\u00e1vel conclu\u00eddas" }
};
const INCENTIVO_SOCIOAMBIENTAL_CURVA_2026 = {
  "1TRI/2026": { metaPercentualLucro: 0, metaValorAcumulado: 0, marcoEsperado: "Sem meta de investimento no per\u00edodo; projetos em prospec\u00e7\u00e3o e estrutura\u00e7\u00e3o" },
  "2TRI/2026": { metaPercentualLucro: 0.0005, metaValorAcumulado: 652700, marcoEsperado: "Investimento acumulado de 0,05% do lucro l\u00edquido de refer\u00eancia" },
  "3TRI/2026": { metaPercentualLucro: 0.0010, metaValorAcumulado: 1305400, marcoEsperado: "Investimento acumulado de 0,10% do lucro l\u00edquido de refer\u00eancia" },
  "4TRI/2026": { metaPercentualLucro: 0.0033, metaValorAcumulado: 4307900, marcoEsperado: "Investimento acumulado de 0,33% do lucro l\u00edquido de refer\u00eancia" }
};
const STATUS_INCENTIVO_SOCIOAMBIENTAL = [
  "N\u00e3o iniciado",
  "Em prospec\u00e7\u00e3o",
  "Em estrutura\u00e7\u00e3o",
  "Em rito de governan\u00e7a",
  "Aprovado",
  "Investimento realizado",
  "Cancelado"
];
const VISIBILIDADE_REPASSES_CURVA_2026 = {
  "1TRI/2026": { metaPercentual: 0, metaAcoesRealizadasAcumuladas: 0, marcoEsperado: "Sem meta de entrega no per\u00edodo; relat\u00f3rio em elabora\u00e7\u00e3o/homologa\u00e7\u00e3o" },
  "2TRI/2026": { metaPercentual: 0.50, metaAcoesRealizadasAcumuladas: 1, marcoEsperado: "Publicar relat\u00f3rio institucional \"A Sorte em N\u00fameros \u2014 2025\"" },
  "3TRI/2026": { metaPercentual: 0.50, metaAcoesRealizadasAcumuladas: 1, marcoEsperado: "Sem nova meta no per\u00edodo; acumulado de 50% considerando a meta do 2TRI" },
  "4TRI/2026": { metaPercentual: 1.00, metaAcoesRealizadasAcumuladas: 2, marcoEsperado: "Realizar campanha publicit\u00e1ria exclusiva sobre repasse social das Loterias CAIXA" }
};
const ACOES_VISIBILIDADE_REPASSES_2026 = [
  { id: "relatorio_sorte_em_numeros_2025", nome: "Publicar relat\u00f3rio institucional \"A Sorte em N\u00fameros \u2014 2025\"", semestrePrevisto: "1\u00ba semestre/2026", pesoPercentual: 0.50 },
  { id: "campanha_repasses_sociais", nome: "Realizar campanha publicit\u00e1ria exclusiva com foco no repasse social das Loterias CAIXA", semestrePrevisto: "2\u00ba semestre/2026", pesoPercentual: 0.50 }
];
const STATUS_ACAO_VISIBILIDADE = [
  "N\u00e3o iniciada",
  "Em planejamento",
  "Em elabora\u00e7\u00e3o",
  "Em homologa\u00e7\u00e3o",
  "Publicada/realizada",
  "Cancelada"
];
const PIX_QUARTER_TARGETS = [0.61, 0.62, 0.63, 0.65];
const APRIMORAMENTO_CURVA_TRIMESTRAL_2026 = {
  "1TRI/2026": { metaPercentual: 0.0454, metaQuantidadeAcumulada: 1 },
  "2TRI/2026": { metaPercentual: 0.1364, metaQuantidadeAcumulada: 3 },
  "3TRI/2026": { metaPercentual: 0.1818, metaQuantidadeAcumulada: 4 },
  "4TRI/2026": { metaPercentual: 0.25, metaQuantidadeAcumulada: 6 }
};
const CAPACIDADE_TIC_CURVA_TRIMESTRAL_2026 = {
  "1TRI/2026": { metaPercentual: 0.35, marcoEsperado: "Realiza\u00e7\u00e3o de Consulta P\u00fablica de Informa\u00e7\u00f5es - RFI" },
  "2TRI/2026": { metaPercentual: 0.70, marcoEsperado: "Realiza\u00e7\u00e3o de Consulta P\u00fablica de Propostas - RFP" },
  "3TRI/2026": { metaPercentual: 0.85, marcoEsperado: "Inicia\u00e7\u00e3o da Fase Sele\u00e7\u00e3o" },
  "4TRI/2026": { metaPercentual: 1.00, marcoEsperado: "Contrato assinado com fornecedor" }
};
const CAPACIDADE_TIC_MARCOS = [
  { label: "N\u00e3o iniciado", percentual: 0 },
  { label: "Consulta P\u00fablica de Informa\u00e7\u00f5es - RFI realizada", percentual: 0.35 },
  { label: "Consulta P\u00fablica de Propostas - RFP realizada", percentual: 0.70 },
  { label: "Fase de Sele\u00e7\u00e3o iniciada", percentual: 0.85 },
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
  "Publicidade, comunica\u00e7\u00e3o e marketing",
  "Educa\u00e7\u00e3o do jogador",
  "Orienta\u00e7\u00e3o ao jogador para tratamento",
  "Envolvimento das partes interessadas",
  "Relat\u00f3rio de medi\u00e7\u00f5es e riscos"
];
const STATUS_ACAO_JOGO_RESPONSAVEL = [
  "N\u00e3o iniciada",
  "Em andamento",
  "Conclu\u00edda",
  "Homologada",
  "Cancelada"
];
const STATUS_PROJETO_PLATAFORMA_JOGOS = [
  "N\u00e3o iniciado",
  "Em planejamento",
  "Em andamento",
  "Piloto/MVP em desenvolvimento",
  "Piloto/MVP conclu\u00eddo",
  "Cancelado"
];
const MARCOS_PLATAFORMA_JOGOS_2026 = [
  { label: "N\u00e3o iniciado", percentualReferencia: 0 },
  { label: "Equipe do projeto alocada", percentualReferencia: null },
  { label: "Kickoff realizado", percentualReferencia: null },
  { label: "Sprints iniciais executadas", percentualReferencia: null },
  { label: "Arquitetura do sistema em defini\u00e7\u00e3o", percentualReferencia: null },
  { label: "Ambiente tecnol\u00f3gico criado", percentualReferencia: null },
  { label: "Acessos concedidos", percentualReferencia: null },
  { label: "Funcionalidade negocial definida", percentualReferencia: null },
  { label: "Piloto/MVP conclu\u00eddo", percentualReferencia: 1 }
];
const APOIO_SOCIOAMBIENTAL_CURVA_2026 = {
  "1TRI/2026": {
    metaPercentual: 0,
    metaQuantidadeAcumulada: 0,
    marcoEsperado: "Sem meta de entrega no per\u00edodo; projetos em prospec\u00e7\u00e3o e estrutura\u00e7\u00e3o"
  },
  "2TRI/2026": {
    metaPercentual: 0.50,
    metaQuantidadeAcumulada: 1,
    marcoEsperado: "1\u00aa iniciativa realizada"
  },
  "3TRI/2026": {
    metaPercentual: 0.50,
    metaQuantidadeAcumulada: 1,
    marcoEsperado: "Manuten\u00e7\u00e3o do acumulado de 50%, considerando a meta do 2TRI"
  },
  "4TRI/2026": {
    metaPercentual: 1.00,
    metaQuantidadeAcumulada: 2,
    marcoEsperado: "2\u00aa iniciativa realizada"
  }
};
const STATUS_INICIATIVA_SOCIOAMBIENTAL = [
  "N\u00e3o iniciada",
  "Em prospec\u00e7\u00e3o",
  "Em estrutura\u00e7\u00e3o",
  "Em rito de governan\u00e7a",
  "Apoiada/realizada",
  "Cancelada"
];
const GGR_META_ACUMULADA_2026 = {
  "2026-01": 1056593039,
  "2026-02": 1997659493,
  "2026-03": 3070246140.78,
  "2026-04": 4193018947,
  "2026-05": 5285128208,
  "2026-06": 6512131485,
  "2026-07": 7644597006,
  "2026-08": 8771034927,
  "2026-09": 10271204884,
  "2026-10": 11442642920,
  "2026-11": 12525118608,
  "2026-12": 15600000000
};
const IEO_META_ACUMULADA_2026 = {
  "2026-01": null,
  "2026-02": null,
  "2026-03": 0.1441,
  "2026-04": null,
  "2026-05": null,
  "2026-06": null,
  "2026-07": null,
  "2026-08": null,
  "2026-09": null,
  "2026-10": null,
  "2026-11": null,
  "2026-12": 0.1403
};
const REPASSE_SOCIAL_META_ACUMULADA_2026 = {
  "2026-01": 737118539.30,
  "2026-02": 1394613495.00,
  "2026-03": 2142991572.00,
  "2026-04": 2926098294.00,
  "2026-05": 3688125380.00,
  "2026-06": 4545104157.00,
  "2026-07": 5335136943.00,
  "2026-08": 6121095220.00,
  "2026-09": 7165115749.00,
  "2026-10": 7982318714.00,
  "2026-11": 8738217864.00,
  "2026-12": 10452751135.00
};
const CURRENCY_FIELD_NAMES = new Set([
  "ggrRealizadoMes", "arrecadacaoTotalMes", "premiosAPagarMes",
  "despesaPessoalMes", "despesasAdministrativasMes", "receitasLiquidasMes",
  "lucroLiquidoRecorrenteAcumulado",
  "arrecadacaoCanaisEletronicosMes", "arrecadacaoTotalProdutosLoteriasMes",
  "arrecadacaoPixMes", "arrecadacaoTotalCanaisEletronicosMes",
  "repasseSocialAcumulado", "repasseSocialAcumuladoCompetencia", "valorInvestidoAcumulado", "valorInvestidoMes",
  "valorInvestidoAcumuladoCompetencia", "lucroLiquidoBase",
  "arrecadacaoEcossistemaMes", "arrecadacaoTotalMes",
  "arrecadacaoEcossistema2025", "arrecadacaoTotal2025",
  "arrecadacaoRedeLotericaMes2026", "arrecadacaoRedeLotericaMes2025"
]);

function cp1252ToUtf8(value) {
  const bytes = [];
  for (const character of value) {
    const code = character.codePointAt(0);
    if (CP1252_REVERSE.has(character)) {
      bytes.push(CP1252_REVERSE.get(character));
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

function mojibakeScore(value) {
  const markers = value.match(/[ÃÂâ�]/g) || [];
  return markers.length;
}

function repairToken(value) {
  let repaired = value;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const decoded = cp1252ToUtf8(repaired);
    if (!decoded || mojibakeScore(decoded) >= mojibakeScore(repaired)) break;
    repaired = decoded;
  }
  return repaired;
}

function repairText(value) {
  let repaired = value.replace(/[^ \t\r\n]+/gu, (token) => (
    mojibakeScore(token) ? repairToken(token) : token
  ));
  TEXT_REPLACEMENTS.forEach(([broken, correct]) => {
    repaired = repaired.replaceAll(broken, correct);
  });
  return repaired;
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) return [];
      return listFiles(path.join(directory, entry.name));
    }
    const filePath = path.join(directory, entry.name);
    if (SKIP_FILES.has(path.resolve(filePath))) return [];
    return EXTENSIONS.has(path.extname(entry.name).toLowerCase()) ? [filePath] : [];
  });
}

function writeUtf8(filePath, content) {
  fs.writeFileSync(filePath, content, { encoding: "utf8" });
}

function repairFiles() {
  const changed = [];
  listFiles(ROOT).forEach((filePath) => {
    const original = fs.readFileSync(filePath, "utf8");
    const repaired = repairText(original);
    if (repaired !== original) {
      writeUtf8(filePath, repaired);
      changed.push(path.relative(ROOT, filePath));
    }
  });
  return changed;
}

function standardizeHtml() {
  fs.readdirSync(ROOT)
    .filter((name) => name.endsWith(".html"))
    .forEach((name) => {
      const filePath = path.join(ROOT, name);
      const original = fs.readFileSync(filePath, "utf8");
      const updated = original
        .replace(/<meta charset="utf-8">/gi, '<meta charset="UTF-8">')
        .replace(/(assets\/(?:css|js)\/[^"'?]+)\?v=[^"']+/g, "$1?v=PERSISTENCIA-CENTRAL-002");
      if (updated !== original) writeUtf8(filePath, updated);
    });
}

function updateCanonicalData() {
  const indicatorPath = path.join(ROOT, "data", "indicadores.json");
  const indicators = JSON.parse(fs.readFileSync(indicatorPath, "utf8"));
  indicators.forEach((indicator) => {
    indicator.indicador = INDICATOR_NAMES[indicator.id - 1] || indicator.indicador;
    const pillar = PILLAR_NAMES.find((name) => repairText(indicator.pilar) === name);
    if (pillar) indicator.pilar = pillar;
    if (indicator.periodicidade === "Não especificado") {
      indicator.periodicidade = "Não especificada";
    }
  });
  indicators[3].metaAnualDescricao = "Implementar melhorias que atendam a 25% das ocorrências apontadas na pesquisa NPS de baseline.";
  indicators[11].metaAnualDescricao = "Média geral ≥ 60";
  indicators[16].metaAnualDescricao = "≥ R$ 10,4 bilhões";
  Object.assign(indicators[0], {
    metaAnualDescricao: "\u2265 10%",
    metrica: "Clientes \u00fanicos com oferta personalizada / Base de clientes ativos identific\u00e1veis",
    tipoCalculo: "percentual_direto",
    unidadeMedida: "percentual"
  });
  Object.assign(indicators[1], {
    metaAnualDescricao: "Meta anual correta: NPS 58",
    metrica: "NPS = % promotores - % detratores. Baseline 55; refer\u00eancia 70; redu\u00e7\u00e3o esperada do gap 20%.",
    tipoCalculo: "nota_pesquisa_nps",
    unidadeMedida: "pontos"
  });
  Object.assign(indicators[3], {
    metaAnualDescricao: "Implementar melhorias que atendam a 25% das ocorr\u00eancias apontadas na pesquisa NPS de baseline.",
    metrica: "Melhorias implementadas acumuladas / 22 melhorias mapeadas no plano de trabalho",
    tipoCalculo: "melhorias_acumuladas",
    unidadeMedida: "percentual"
  });
  Object.assign(indicators[9], {
    metaAnualDescricao: "Piloto ou MVP da Plataforma de Jogos",
    metrica: "Refer\u00eancia futura: (GGR da CAIXA Loterias) / (Total de GGR do Mercado) x 100. Aplic\u00e1vel ap\u00f3s implementa\u00e7\u00e3o da plataforma e disponibilidade de dados oficiais de mercado.",
    tipoCalculo: "projeto_marco_entrega",
    unidadeMedida: "marco"
  });
  Object.assign(indicators[10], {
    metaAnualDescricao: "Contrata\u00e7\u00e3o e/ou celebra\u00e7\u00e3o de parceria para o desenvolvimento de solu\u00e7\u00f5es de TIC at\u00e9 o final do exerc\u00edcio de 2026.",
    metrica: "Avan\u00e7o por marcos trimestrais de contrata\u00e7\u00e3o/parceria de TIC",
    tipoCalculo: "marco_projeto_percentual",
    unidadeMedida: "percentual"
  });
  Object.assign(indicators[11], {
    unidadeApuradora: "GERIN",
    diretoriaResponsavel: "DILOT",
    metaAnualDescricao: "M\u00e9dia geral \u2265 60",
    metrica: "Resultado da m\u00e9dia geral da pesquisa de clima para o ano de 2026",
    tipoCalculo: "nota_pesquisa_anual",
    unidadeMedida: "pontos"
  });
  Object.assign(indicators[14], {
    unidadeApuradora: "GERIN",
    diretoriaResponsavel: "DILOT",
    metaAnualDescricao: "\u2265 90%",
    metrica: "Empregados capacitados no crit\u00e9rio trimestral / P\u00fablico-alvo eleg\u00edvel",
    tipoCalculo: "cobertura_capacitacao",
    unidadeMedida: "percentual"
  });
  Object.assign(indicators[15], {
    metaAnualDescricao: "02 iniciativas apoiadas",
    metrica: "Quantidade de iniciativas socioambientais \u00fanicas com status Apoiada/realizada",
    tipoCalculo: "iniciativas_apoiadas",
    unidadeMedida: "quantidade"
  });
  Object.assign(indicators[17], {
    metaAnualDescricao: "N\u00edvel 3 RGF-WLA - Executar a\u00e7\u00f5es de melhoria para os 10 elementos.",
    metrica: "Quantidade de elementos RGF-WLA \u00fanicos atendidos por a\u00e7\u00f5es conclu\u00eddas ou homologadas",
    tipoCalculo: "plano_acao_por_elementos",
    unidadeMedida: "quantidade"
  });
  Object.assign(indicators[18], {
    metaAnualDescricao: "0,33% do Lucro L\u00edquido do ano (R$ 4.307.900,00 estimados)",
    metrica: "Valor investido em iniciativas com impacto socioambiental",
    tipoCalculo: "investimento_socioambiental",
    unidadeMedida: "moeda"
  });
  Object.assign(indicators[19], {
    metaAnualDescricao: "Implantar 100% das a\u00e7\u00f5es propostas",
    metrica: "A\u00e7\u00f5es propostas publicadas/realizadas / 2 a\u00e7\u00f5es propostas em 2026",
    tipoCalculo: "execucao_acoes_propostas",
    unidadeMedida: "percentual"
  });
  Object.assign(indicators[20], {
    metaAnualDescricao: "\u2265 90% do p\u00fablico-alvo capacitado em pelo menos 2 iniciativas de Jogo Respons\u00e1vel",
    metrica: "Empregados eleg\u00edveis com a quantidade m\u00ednima de iniciativas conclu\u00eddas / P\u00fablico-alvo eleg\u00edvel",
    tipoCalculo: "cobertura_capacitacao_jogo_responsavel",
    unidadeMedida: "percentual"
  });
  Object.assign(indicators[4], {
    metaAnualDescricao: "\u2265 R$ 15,6 bilh\u00f5es",
    metrica: "GGR = Arrecada\u00e7\u00e3o total - Pr\u00eamios a pagar",
    tipoCalculo: "ggr_formula",
    unidadeMedida: "moeda"
  });
  Object.assign(indicators[5], {
    metaAnualDescricao: "\u2264 14,03%",
    metrica: "((Despesa de pessoal + Despesas Administrativas) / Receitas L\u00edquidas) \u00d7 100",
    tipoCalculo: "indice_inverso",
    unidadeMedida: "percentual"
  });
  Object.assign(indicators[16], {
    metaAnualDescricao: "\u2265 R$ 10,4 bilh\u00f5es",
    metrica: "Repasse social acumulado at\u00e9 a compet\u00eancia",
    tipoCalculo: "valor_financeiro_acumulado",
    unidadeMedida: "moeda"
  });
  Object.assign(indicators[7], {
    unidadeApuradora: "SUCOL",
    diretoriaResponsavel: "DICOT",
    metaAnualDescricao: "Aumentar em 05 p.p. as vendas provenientes de canais digitais.",
    metrica: "(Arrecadação total nos canais eletrônicos) / (Arrecadação total dos produtos de loterias)",
    tipoCalculo: "razao_canais_digitais",
    unidadeMedida: "percentual"
  });
  Object.assign(indicators[8], {
    metaAnualDescricao: "Aumentar em 05 p.p. as vendas com o meio de pagamento PIX no canal eletrônico.",
    metrica: "(Arrecadação com o meio de pagamento PIX no ano corrente) / (Arrecadação total nos canais eletrônicos no ano corrente)",
    tipoCalculo: "razao_pix",
    unidadeMedida: "percentual"
  });
  writeUtf8(indicatorPath, `${JSON.stringify(indicators, null, 2)}\n`);

  const pillarPath = path.join(ROOT, "data", "pilares.json");
  const pillars = JSON.parse(fs.readFileSync(pillarPath, "utf8"));
  pillars.forEach((pillar) => {
    pillar.nome = PILLAR_NAMES[pillar.id - 1] || pillar.nome;
  });
  writeUtf8(pillarPath, `${JSON.stringify(pillars, null, 2)}\n`);

  const rulesPath = path.join(ROOT, "data", "regras-indicadores.json");
  const rules = JSON.parse(fs.readFileSync(rulesPath, "utf8"));
  rules.forEach((rule) => {
    rule.nome = INDICATOR_NAMES[rule.indicadorId - 1] || rule.nome;
    rule.camposEntrada = (rule.camposEntrada || []).map((field) => (
      CURRENCY_FIELD_NAMES.has(field.nome) ? { ...field, tipo: "moeda" } : field
    ));
  });
  Object.assign(rules.find((rule) => Number(rule.indicadorId) === 1), {
    tipoCalculo: "percentual_direto",
    tipoConsolidacao: "acumulado_por_competencia",
    unidadeMedida: "percentual",
    metaAnualValor: 0.10,
    parametrosCalculo: {
      numeradorCampo: "clientesUnicosComOfertaPersonalizadaCompetencia",
      denominadorCampo: "baseClientesAtivosCompetencia",
      metaReferencia: 0.10,
      metaTipo: "fixa",
      sentidoMeta: "quanto_maior_melhor",
      validarNumeradorAteDenominador: false
    },
    camposEntrada: [
      { nome: "baseClientesAtivosCompetencia", rotulo: "Base de clientes ativos identific\u00e1veis da compet\u00eancia", tipo: "numero", obrigatorio: true },
      { nome: "clientesUnicosComOfertaPersonalizadaCompetencia", rotulo: "Clientes \u00fanicos com oferta personalizada at\u00e9 a compet\u00eancia", tipo: "numero", obrigatorio: true }
    ],
    resultadoOficial: "ultima_posicao_homologada"
  });
  Object.assign(rules.find((rule) => Number(rule.indicadorId) === 2), {
    tipoCalculo: "nota_pesquisa_nps",
    tipoConsolidacao: "resultado_pesquisa_ou_ultima_posicao",
    unidadeMedida: "pontos",
    metaAnualValor: 58,
    parametrosCalculo: {
      campoTipoPosicao: "tipoPosicaoNPS",
      campoMetaReferencia: "metaReferenciaCompetenciaNPS",
      campoNps: "npsApurado",
      campoPromotores: "percentualPromotores",
      campoDetratores: "percentualDetratores",
      campoDataBase: "dataBasePesquisaNPS",
      campoFonte: "fontePesquisaNPS",
      metaTipo: "baseline_com_meta_anual_corrigida",
      baselineNPS: 55,
      notaReferenciaNPS: 70,
      percentualReducaoGap: 0.20,
      metaAnualMetodologica: 58,
      referenciasPorCompetencia: NPS_REFERENCIAS_2026,
      sentidoMeta: "quanto_maior_melhor"
    },
    camposEntrada: [
      { nome: "tipoPosicaoNPS", rotulo: "Tipo da posi\u00e7\u00e3o", tipo: "selecao", obrigatorio: true, opcoes: TIPOS_POSICAO_NPS },
      { nome: "metaReferenciaCompetenciaNPS", rotulo: "Meta de refer\u00eancia da compet\u00eancia", tipo: "numero", obrigatorio: false },
      { nome: "npsApurado", rotulo: "NPS apurado na pesquisa", tipo: "numero", obrigatorio: false },
      { nome: "percentualPromotores", rotulo: "Percentual de promotores", tipo: "percentual", obrigatorio: false },
      { nome: "percentualDetratores", rotulo: "Percentual de detratores", tipo: "percentual", obrigatorio: false },
      { nome: "dataBasePesquisaNPS", rotulo: "Data-base da pesquisa", tipo: "data", obrigatorio: false },
      { nome: "fontePesquisaNPS", rotulo: "Fonte/evid\u00eancia da pesquisa", tipo: "texto", obrigatorio: false },
      { nome: "observacaoArea", rotulo: "Observa\u00e7\u00e3o da \u00e1rea", tipo: "texto", obrigatorio: false }
    ],
    resultadoOficial: "resultado_pesquisa_ou_ultima_posicao_homologada"
  });
  Object.assign(rules.find((rule) => Number(rule.indicadorId) === 4), {
    tipoCalculo: "melhorias_acumuladas",
    tipoConsolidacao: "quantidade_acumulada",
    unidadeMedida: "percentual",
    metaAnualValor: 0.25,
    parametrosCalculo: {
      campoValor: "melhoriasImplementadasMes",
      campoValorLegado: "melhoriasEntreguesMes",
      totalMelhoriasPlano2026: 22,
      metaPercentualAnualAprimoramento: 0.25,
      metaMinimaMelhoriasAno: 6,
      metaTipo: "curva_trimestral_acumulada",
      curvaTrimestralAcumulada: APRIMORAMENTO_CURVA_TRIMESTRAL_2026,
      sentidoMeta: "quanto_maior_melhor"
    },
    camposEntrada: [
      { nome: "melhoriasImplementadasMes", rotulo: "Quantidade de melhorias implementadas no m\u00eas", tipo: "numero", obrigatorio: true },
      { nome: "descricaoMelhoriasMes", rotulo: "Descri\u00e7\u00e3o da melhoria implementada", tipo: "texto", obrigatorio: false },
      { nome: "evidenciaMelhoriasMes", rotulo: "Evid\u00eancia da melhoria", tipo: "texto", obrigatorio: false }
    ],
    resultadoOficial: "curva_trimestral_acumulada"
  });
  Object.assign(rules.find((rule) => Number(rule.indicadorId) === 10), {
    tipoCalculo: "projeto_marco_entrega",
    tipoConsolidacao: "ultima_posicao_trimestral",
    unidadeMedida: "marco",
    metaAnualValor: null,
    parametrosCalculo: {
      campoMarco: "marcoAtualPlataformaJogos",
      campoStatus: "statusProjetoPlataformaJogos",
      metaTipo: "marco_anual",
      sentidoMeta: "marco_concluido",
      metaAnualMarco: "Piloto/MVP da Plataforma de Jogos",
      marcoConcluido: "Piloto/MVP conclu\u00eddo",
      statusConcluido: "Piloto/MVP conclu\u00eddo",
      marcosPlataformaJogos2026: MARCOS_PLATAFORMA_JOGOS_2026,
      statusProjetoPlataformaJogos: STATUS_PROJETO_PLATAFORMA_JOGOS
    },
    camposEntrada: [
      { nome: "marcoAtualPlataformaJogos", rotulo: "Marco/etapa atual do projeto", tipo: "selecao", obrigatorio: true, opcoes: MARCOS_PLATAFORMA_JOGOS_2026 },
      { nome: "statusProjetoPlataformaJogos", rotulo: "Status do projeto", tipo: "selecao", obrigatorio: true, opcoes: STATUS_PROJETO_PLATAFORMA_JOGOS },
      { nome: "descricaoAndamentoPlataformaJogos", rotulo: "Descri\u00e7\u00e3o do andamento", tipo: "texto", obrigatorio: false },
      { nome: "evidenciaPlataformaJogos", rotulo: "Evid\u00eancia", tipo: "texto", obrigatorio: false },
      { nome: "observacaoArea", rotulo: "Observa\u00e7\u00e3o da \u00e1rea", tipo: "texto", obrigatorio: false }
    ],
    resultadoOficial: "ultima_posicao_trimestral"
  });
  Object.assign(rules.find((rule) => Number(rule.indicadorId) === 11), {
    tipoCalculo: "marco_projeto_percentual",
    tipoConsolidacao: "ultima_posicao_trimestral",
    unidadeMedida: "percentual",
    metaAnualValor: 1,
    parametrosCalculo: {
      campoStatus: "marcoAlcancadoTIC",
      campoPercentual: "percentualRealizadoTIC",
      metaTipo: "curva_trimestral_percentual",
      curvaTrimestralPercentual: CAPACIDADE_TIC_CURVA_TRIMESTRAL_2026,
      marcosCapacidadeTIC: CAPACIDADE_TIC_MARCOS,
      sentidoMeta: "quanto_maior_melhor"
    },
    camposEntrada: [
      { nome: "marcoAlcancadoTIC", rotulo: "Marco alcan\u00e7ado", tipo: "selecao", obrigatorio: true, opcoes: CAPACIDADE_TIC_MARCOS },
      { nome: "percentualRealizadoTIC", rotulo: "Percentual realizado", tipo: "percentual", obrigatorio: false },
      { nome: "descricaoAndamentoTIC", rotulo: "Descri\u00e7\u00e3o do andamento", tipo: "texto", obrigatorio: false },
      { nome: "evidenciaTIC", rotulo: "Evid\u00eancia", tipo: "texto", obrigatorio: false }
    ],
    resultadoOficial: "ultima_posicao_trimestral"
  });
  Object.assign(rules.find((rule) => Number(rule.indicadorId) === 12), {
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
      { nome: "tipoPosicaoClima", rotulo: "Tipo da posi\u00e7\u00e3o", tipo: "selecao", obrigatorio: true, opcoes: TIPOS_POSICAO_CLIMA },
      { nome: "metaReferenciaClima", rotulo: "Meta de refer\u00eancia", tipo: "numero", obrigatorio: false },
      { nome: "notaClimaApurada", rotulo: "Nota/m\u00e9dia geral apurada", tipo: "numero", obrigatorio: false },
      { nome: "dataBasePesquisaClima", rotulo: "Data-base da pesquisa", tipo: "data", obrigatorio: false },
      { nome: "acoesRealizadasClima", rotulo: "A\u00e7\u00f5es realizadas no per\u00edodo", tipo: "texto", obrigatorio: false },
      { nome: "descricaoAndamentoClima", rotulo: "Descri\u00e7\u00e3o do andamento", tipo: "texto", obrigatorio: false },
      { nome: "fonteEvidenciaClima", rotulo: "Fonte/evid\u00eancia", tipo: "texto", obrigatorio: false },
      { nome: "observacaoArea", rotulo: "Observa\u00e7\u00e3o da \u00e1rea", tipo: "texto", obrigatorio: false }
    ],
    campoResultadoPrincipal: "notaClimaApurada",
    campoPercentualAtingido: "percentualAtingidoMensal",
    resultadoOficial: "resultado_pesquisa_ou_ultima_posicao_homologada"
  });
  Object.assign(rules.find((rule) => Number(rule.indicadorId) === 15), {
    tipoCalculo: "cobertura_capacitacao",
    tipoConsolidacao: "ultima_posicao_acumulada",
    unidadeMedida: "percentual",
    metaAnualValor: 0.90,
    parametrosCalculo: {
      campoPublicoAlvo: "publicoAlvoElegivelCapacitacao",
      campoCapacitados: "empregadosCapacitadosCapacitacao",
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
      { nome: "publicoAlvoElegivelCapacitacao", rotulo: "P\u00fablico-alvo eleg\u00edvel", tipo: "numero", obrigatorio: true },
      { nome: "empregadosCapacitadosCapacitacao", rotulo: "Empregados capacitados no crit\u00e9rio do trimestre", tipo: "numero", obrigatorio: true },
      { nome: "quantidadeCursosMinimaCapacitacao", rotulo: "Quantidade m\u00ednima de cursos exigida", tipo: "numero", obrigatorio: false },
      { nome: "cursosConsideradosCapacitacao", rotulo: "Curso(s)/trilha considerada", tipo: "texto", obrigatorio: false },
      { nome: "dataBaseApuracaoCapacitacao", rotulo: "Data-base da apura\u00e7\u00e3o", tipo: "data", obrigatorio: false },
      { nome: "fonteEvidenciaCapacitacao", rotulo: "Fonte/evid\u00eancia", tipo: "texto", obrigatorio: false },
      { nome: "observacaoArea", rotulo: "Observa\u00e7\u00e3o da \u00e1rea", tipo: "texto", obrigatorio: false }
    ],
    campoResultadoPrincipal: "resultadoMensal",
    campoPercentualAtingido: "percentualAtingidoMensal",
    resultadoOficial: "ultima_posicao_acumulada_homologada"
  });
  Object.assign(rules.find((rule) => Number(rule.indicadorId) === 21), {
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
      curvaJogoResponsavel2026: JOGO_RESPONSAVEL_CAPACITACAO_CURVA_2026,
      sentidoMeta: "quanto_maior_melhor"
    },
    camposEntrada: [
      { nome: "publicoAlvoElegivelJR", rotulo: "P\u00fablico-alvo eleg\u00edvel", tipo: "numero", obrigatorio: true },
      { nome: "empregadosCapacitadosJR", rotulo: "Empregados capacitados no crit\u00e9rio do per\u00edodo", tipo: "numero", obrigatorio: true },
      { nome: "quantidadeMinimaIniciativasJR", rotulo: "Quantidade m\u00ednima de iniciativas exigida", tipo: "numero", obrigatorio: false },
      { nome: "iniciativasConsideradasJR", rotulo: "Iniciativas consideradas", tipo: "texto", obrigatorio: false },
      { nome: "dataBaseApuracaoJR", rotulo: "Data-base da apura\u00e7\u00e3o", tipo: "data", obrigatorio: false },
      { nome: "fonteEvidenciaJR", rotulo: "Fonte/evid\u00eancia", tipo: "texto", obrigatorio: false },
      { nome: "observacaoArea", rotulo: "Observa\u00e7\u00e3o da \u00e1rea", tipo: "texto", obrigatorio: false }
    ],
    campoResultadoPrincipal: "resultadoMensal",
    campoPercentualAtingido: "percentualAtingidoMensal",
    resultadoOficial: "ultima_posicao_homologada"
  });
  Object.assign(rules.find((rule) => Number(rule.indicadorId) === 18), {
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
      statusQueContam: ["Conclu\u00edda", "Homologada"],
      sentidoMeta: "quanto_maior_melhor"
    },
    camposEntrada: [
      { nome: "elementoRGF", rotulo: "Elemento RGF-WLA atendido", tipo: "selecao", obrigatorio: true, opcoes: ELEMENTOS_JOGO_RESPONSAVEL },
      { nome: "acaoExecutada", rotulo: "A\u00e7\u00e3o executada", tipo: "texto", obrigatorio: true },
      { nome: "descricaoAcao", rotulo: "Descri\u00e7\u00e3o da a\u00e7\u00e3o", tipo: "texto", obrigatorio: false },
      { nome: "statusAcao", rotulo: "Status da a\u00e7\u00e3o", tipo: "selecao", obrigatorio: true, opcoes: STATUS_ACAO_JOGO_RESPONSAVEL },
      { nome: "dataConclusao", rotulo: "Data de conclus\u00e3o", tipo: "data", obrigatorio: false },
      { nome: "evidenciaAcao", rotulo: "Evid\u00eancia", tipo: "texto", obrigatorio: false }
    ],
    resultadoOficial: "elementos_acumulados_homologados"
  });
  Object.assign(rules.find((rule) => Number(rule.indicadorId) === 19), {
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
      curvaTrimestralAcumulada: INCENTIVO_SOCIOAMBIENTAL_CURVA_2026,
      sentidoMeta: "quanto_maior_melhor"
    },
    camposEntrada: [
      { nome: "nomeProjetoIncentivoSocioambiental", rotulo: "Nome do projeto/iniciativa", tipo: "texto", obrigatorio: true },
      { nome: "tipoIncentivoSocioambiental", rotulo: "Tipo de incentivo/patroc\u00ednio", tipo: "texto", obrigatorio: false },
      { nome: "statusProjetoIncentivoSocioambiental", rotulo: "Status do projeto", tipo: "selecao", obrigatorio: true, opcoes: STATUS_INCENTIVO_SOCIOAMBIENTAL },
      { nome: "valorInvestidoMes", rotulo: "Valor investido no m\u00eas", tipo: "moeda", obrigatorio: false },
      { nome: "valorInvestidoAcumuladoCompetencia", rotulo: "Valor investido acumulado at\u00e9 a compet\u00eancia", tipo: "moeda", obrigatorio: false },
      { nome: "dataInvestimentoSocioambiental", rotulo: "Data do investimento", tipo: "data", obrigatorio: false },
      { nome: "descricaoAndamentoIncentivoSocioambiental", rotulo: "Descri\u00e7\u00e3o do andamento", tipo: "texto", obrigatorio: false },
      { nome: "evidenciaIncentivoSocioambiental", rotulo: "Evid\u00eancia", tipo: "texto", obrigatorio: false },
      { nome: "observacaoArea", rotulo: "Observa\u00e7\u00e3o da \u00e1rea", tipo: "texto", obrigatorio: false }
    ],
    campoResultadoPrincipal: "valorInvestidoAcumuladoCompetencia",
    campoPercentualAtingido: "percentualAtingidoMensal",
    resultadoOficial: "valor_acumulado_homologado"
  });
  Object.assign(rules.find((rule) => Number(rule.indicadorId) === 20), {
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
      { nome: "acaoPropostaVisibilidade", rotulo: "A\u00e7\u00e3o proposta", tipo: "selecao", obrigatorio: true, opcoes: ACOES_VISIBILIDADE_REPASSES_2026 },
      { nome: "statusAcaoVisibilidade", rotulo: "Status da a\u00e7\u00e3o", tipo: "selecao", obrigatorio: true, opcoes: STATUS_ACAO_VISIBILIDADE },
      { nome: "etapaAtualVisibilidade", rotulo: "Etapa atual", tipo: "texto", obrigatorio: false },
      { nome: "descricaoAndamentoVisibilidade", rotulo: "Descri\u00e7\u00e3o do andamento", tipo: "texto", obrigatorio: false },
      { nome: "dataConclusaoVisibilidade", rotulo: "Data de conclus\u00e3o/publica\u00e7\u00e3o", tipo: "data", obrigatorio: false },
      { nome: "evidenciaVisibilidade", rotulo: "Evid\u00eancia", tipo: "texto", obrigatorio: false },
      { nome: "observacaoArea", rotulo: "Observa\u00e7\u00e3o da \u00e1rea", tipo: "texto", obrigatorio: false }
    ],
    campoResultadoPrincipal: "resultadoMensal",
    campoPercentualAtingido: "percentualAtingidoMensal",
    resultadoOficial: "acoes_realizadas_acumuladas_homologadas"
  });
  Object.assign(rules.find((rule) => Number(rule.indicadorId) === 5), {
    tipoCalculo: "ggr_formula",
    tipoConsolidacao: "acumulado_por_soma_mensal",
    unidadeMedida: "moeda",
    metaAnualValor: 15600000000,
    parametrosCalculo: {
      campoArrecadacao: "arrecadacaoTotalMes",
      campoPremios: "premiosAPagarMes",
      metaTipo: "curva_acumulada_por_competencia",
      metasAcumuladasPorCompetencia: GGR_META_ACUMULADA_2026,
      sentidoMeta: "quanto_maior_melhor"
    },
    camposEntrada: [
      { nome: "arrecadacaoTotalMes", rotulo: "Arrecada\u00e7\u00e3o total no m\u00eas", tipo: "moeda", obrigatorio: true },
      { nome: "premiosAPagarMes", rotulo: "Pr\u00eamios a pagar no m\u00eas", tipo: "moeda", obrigatorio: true }
    ],
    resultadoOficial: "ggr_acumulado_por_curva"
  });
  Object.assign(rules.find((rule) => Number(rule.indicadorId) === 6), {
    tipoCalculo: "indice_inverso",
    tipoConsolidacao: "ultima_posicao_acumulada",
    unidadeMedida: "percentual",
    metaAnualValor: 0.1403,
    parametrosCalculo: {
      campoDespesaPessoal: "despesaPessoalMes",
      campoDespesasAdministrativas: "despesasAdministrativasMes",
      campoReceitasLiquidas: "receitasLiquidasMes",
      campoIeoInformado: "ieoApuradoInformado",
      campoPercentualOficial: "percentualAtingidoOficialInformado",
      metaTipo: "curva_acumulada_por_competencia",
      metasAcumuladasPorCompetencia: IEO_META_ACUMULADA_2026,
      sentidoMeta: "quanto_menor_melhor"
    },
    camposEntrada: [
      { nome: "despesaPessoalMes", rotulo: "Despesa de pessoal", tipo: "moeda", obrigatorio: false },
      { nome: "despesasAdministrativasMes", rotulo: "Despesas administrativas", tipo: "moeda", obrigatorio: false },
      { nome: "receitasLiquidasMes", rotulo: "Receitas l\u00edquidas", tipo: "moeda", obrigatorio: false },
      { nome: "ieoApuradoInformado", rotulo: "IEO apurado pela unidade", tipo: "percentual", obrigatorio: false },
      { nome: "percentualAtingidoOficialInformado", rotulo: "% atingido oficial informado", tipo: "percentual", obrigatorio: false }
    ],
    resultadoOficial: "ultima_posicao_acumulada_homologada"
  });
  Object.assign(rules.find((rule) => Number(rule.indicadorId) === 16), {
    tipoCalculo: "iniciativas_apoiadas",
    tipoConsolidacao: "iniciativas_acumuladas",
    unidadeMedida: "quantidade",
    metaAnualValor: 2,
    parametrosCalculo: {
      campoNome: "nomeIniciativaSocioambiental",
      campoStatus: "statusIniciativaSocioambiental",
      statusQueConta: "Apoiada/realizada",
      metaTipo: "curva_trimestral_acumulada",
      curvaTrimestralAcumulada: APOIO_SOCIOAMBIENTAL_CURVA_2026,
      sentidoMeta: "quanto_maior_melhor"
    },
    camposEntrada: [
      { nome: "nomeIniciativaSocioambiental", rotulo: "Nome da iniciativa", tipo: "texto", obrigatorio: true },
      { nome: "tipoIniciativaSocioambiental", rotulo: "Tipo da iniciativa", tipo: "texto", obrigatorio: false },
      { nome: "statusIniciativaSocioambiental", rotulo: "Status da iniciativa", tipo: "selecao", obrigatorio: true, opcoes: STATUS_INICIATIVA_SOCIOAMBIENTAL },
      { nome: "dataApoioIniciativa", rotulo: "Data de apoio/realiza\u00e7\u00e3o", tipo: "data", obrigatorio: false },
      { nome: "descricaoAndamentoSocioambiental", rotulo: "Descri\u00e7\u00e3o do andamento", tipo: "texto", obrigatorio: false },
      { nome: "evidenciaIniciativaSocioambiental", rotulo: "Evid\u00eancia", tipo: "texto", obrigatorio: false },
      { nome: "observacaoArea", rotulo: "Observa\u00e7\u00e3o da \u00e1rea", tipo: "texto", obrigatorio: false }
    ],
    resultadoOficial: "iniciativas_acumuladas_homologadas"
  });
  Object.assign(rules.find((rule) => Number(rule.indicadorId) === 17), {
    tipoCalculo: "valor_financeiro_acumulado",
    tipoConsolidacao: "ultima_posicao_acumulada",
    unidadeMedida: "moeda",
    metaAnualValor: 10400000000,
    parametrosCalculo: {
      valorAcumuladoCampo: "repasseSocialAcumuladoCompetencia",
      metaTipo: "curva_acumulada_por_competencia",
      metasAcumuladasPorCompetencia: REPASSE_SOCIAL_META_ACUMULADA_2026,
      sentidoMeta: "quanto_maior_melhor"
    },
    camposEntrada: [{
      nome: "repasseSocialAcumuladoCompetencia",
      rotulo: "Repasse social acumulado at\u00e9 a compet\u00eancia",
      tipo: "moeda",
      obrigatorio: true
    }],
    resultadoOficial: "ultima_posicao_acumulada_homologada"
  });
  Object.assign(rules.find((rule) => Number(rule.indicadorId) === 8), {
    tipoCalculo: "razao_canais_digitais",
    tipoConsolidacao: "razao_acumulada_no_periodo",
    unidadeMedida: "percentual",
    metaAnualValor: 0.2805,
    parametrosCalculo: {
      campoNumerador: "arrecadacaoCanaisEletronicosMes",
      campoDenominador: "arrecadacaoTotalProdutosLoteriasMes",
      percentualReferencia2025: 0.2305,
      acrescimoMetaPontosPercentuais: 0.05,
      metaReferencia: 0.2805,
      metaTipo: "fixa_anual"
    },
    camposEntrada: [
      { nome: "arrecadacaoCanaisEletronicosMes", rotulo: "Arrecadação total nos canais eletrônicos no mês", tipo: "moeda", obrigatorio: true },
      { nome: "arrecadacaoTotalProdutosLoteriasMes", rotulo: "Arrecadação total dos produtos de loterias no mês", tipo: "moeda", obrigatorio: true }
    ],
    resultadoOficial: "razao_acumulada_homologada_no_periodo"
  });
  Object.assign(rules.find((rule) => Number(rule.indicadorId) === 9), {
    tipoCalculo: "razao_pix",
    tipoConsolidacao: "razao_acumulada_no_ano",
    unidadeMedida: "percentual",
    metaAnualValor: 0.65,
    parametrosCalculo: {
      campoNumerador: "arrecadacaoPixMes",
      campoDenominador: "arrecadacaoTotalCanaisEletronicosMes",
      metasTrimestrais: {
        "1TRI/2026": 0.61, "2TRI/2026": 0.62, "3TRI/2026": 0.63, "4TRI/2026": 0.65
      },
      arredondamentoOficialCasasPercentuais: 0
    },
    camposEntrada: [
      { nome: "arrecadacaoPixMes", rotulo: "Arrecadação com PIX no mês", tipo: "moeda", obrigatorio: true },
      { nome: "arrecadacaoTotalCanaisEletronicosMes", rotulo: "Arrecadação total nos canais eletrônicos no mês", tipo: "moeda", obrigatorio: false }
    ],
    resultadoOficial: "razao_trimestral_arredondada_informe"
  });
  writeUtf8(rulesPath, `${JSON.stringify(rules, null, 2)}\n`);

  const launchesPath = path.join(ROOT, "data", "lancamentos.json");
  const launches = JSON.parse(fs.readFileSync(launchesPath, "utf8"));
  const indicatorById = Object.fromEntries(indicators.map((indicator) => [indicator.id, indicator]));
  launches.forEach((launch) => {
    const indicator = indicatorById[launch.indicadorId];
    launch.competencia = launch.competencia || `${launch.ano}-${String(launch.mes).padStart(2, "0")}`;
    launch.trimestre = launch.trimestre || `${Math.ceil(Number(launch.mes) / 3)}TRI/${launch.ano}`;
    if (indicator) {
      launch.plano = indicator.plano;
      launch.pilar = indicator.pilar;
      launch.unidadeApuradora = indicator.unidadeApuradora;
      launch.diretoriaResponsavel = indicator.diretoriaResponsavel;
    }
    if (Number(launch.indicadorId) === 1) {
      launch.metaMensal = 0.10;
      launch.metaAnualDescricao = indicators[0].metaAnualDescricao;
      launch.camposEntrada = launch.camposEntrada || {};
      if (launch.camposEntrada.baseClientesAtivos !== undefined && launch.camposEntrada.baseClientesAtivosCompetencia === undefined) {
        launch.camposEntrada.baseClientesAtivosCompetencia = launch.camposEntrada.baseClientesAtivos;
        launch.camposEntrada.baseClientesAtivosMigrado = launch.camposEntrada.baseClientesAtivos;
        delete launch.camposEntrada.baseClientesAtivos;
      }
      if (launch.camposEntrada.clientesComOfertaPersonalizada !== undefined && launch.camposEntrada.clientesUnicosComOfertaPersonalizadaCompetencia === undefined) {
        launch.camposEntrada.clientesUnicosComOfertaPersonalizadaCompetencia = launch.camposEntrada.clientesComOfertaPersonalizada;
        launch.camposEntrada.clientesComOfertaPersonalizadaMigrado = launch.camposEntrada.clientesComOfertaPersonalizada;
        delete launch.camposEntrada.clientesComOfertaPersonalizada;
      }
    }
    if (Number(launch.indicadorId) === 2) {
      const key = `${launch.ano}-${String(launch.mes).padStart(2, "0")}`;
      launch.metaMensal = NPS_REFERENCIAS_2026[key] ?? 58;
      launch.metaAnualDescricao = indicators[1].metaAnualDescricao;
      launch.camposEntrada = launch.camposEntrada || {};
      if (launch.camposEntrada.metaReferenciaCompetenciaNPS === undefined) {
        launch.camposEntrada.metaReferenciaCompetenciaNPS = launch.metaMensal;
      }
      if (launch.camposEntrada.npsRealizado !== undefined && launch.camposEntrada.npsApurado === undefined) {
        launch.camposEntrada.npsApurado = launch.camposEntrada.npsRealizado;
        launch.camposEntrada.npsRealizadoMigrado = launch.camposEntrada.npsRealizado;
        delete launch.camposEntrada.npsRealizado;
      }
      if (launch.camposEntrada.dataPesquisa !== undefined && launch.camposEntrada.dataBasePesquisaNPS === undefined) {
        launch.camposEntrada.dataBasePesquisaNPS = launch.camposEntrada.dataPesquisa;
        launch.camposEntrada.dataPesquisaMigrado = launch.camposEntrada.dataPesquisa;
        delete launch.camposEntrada.dataPesquisa;
      }
      if (launch.camposEntrada.dataBaseApuracao !== undefined && launch.camposEntrada.dataBasePesquisaNPS === undefined) {
        launch.camposEntrada.dataBasePesquisaNPS = launch.camposEntrada.dataBaseApuracao;
        launch.camposEntrada.dataBaseApuracaoMigrado = launch.camposEntrada.dataBaseApuracao;
        delete launch.camposEntrada.dataBaseApuracao;
      }
      if (launch.camposEntrada.relatorioPesquisa !== undefined && launch.camposEntrada.fontePesquisaNPS === undefined) {
        launch.camposEntrada.fontePesquisaNPS = launch.camposEntrada.relatorioPesquisa;
        launch.camposEntrada.relatorioPesquisaMigrado = launch.camposEntrada.relatorioPesquisa;
        delete launch.camposEntrada.relatorioPesquisa;
      }
    }
    if (Number(launch.indicadorId) === 4) {
      const quarter = `${Math.ceil(Number(launch.mes) / 3)}TRI/${launch.ano}`;
      launch.metaMensal = APRIMORAMENTO_CURVA_TRIMESTRAL_2026[quarter]?.metaPercentual ?? launch.metaMensal;
      launch.metaAnualDescricao = indicators[3].metaAnualDescricao;
      launch.camposEntrada = launch.camposEntrada || {};
      if (launch.camposEntrada.melhoriasEntreguesMes !== undefined && launch.camposEntrada.melhoriasImplementadasMes === undefined) {
        launch.camposEntrada.melhoriasImplementadasMes = launch.camposEntrada.melhoriasEntreguesMes;
        launch.camposEntrada.melhoriasEntreguesMesMigrado = launch.camposEntrada.melhoriasEntreguesMes;
        delete launch.camposEntrada.melhoriasEntreguesMes;
      }
    }
    if (Number(launch.indicadorId) === 10) {
      launch.metaMensal = null;
      launch.metaAnualDescricao = indicators[9].metaAnualDescricao;
      launch.camposEntrada = launch.camposEntrada || {};
      if (launch.camposEntrada.etapaAtualProjeto !== undefined && launch.camposEntrada.marcoAtualPlataformaJogos === undefined) {
        launch.camposEntrada.marcoAtualPlataformaJogos = launch.camposEntrada.etapaAtualProjeto;
        launch.camposEntrada.etapaAtualProjetoMigrado = launch.camposEntrada.etapaAtualProjeto;
        delete launch.camposEntrada.etapaAtualProjeto;
      }
      if (launch.camposEntrada.evidenciaEntrega !== undefined && launch.camposEntrada.evidenciaPlataformaJogos === undefined) {
        launch.camposEntrada.evidenciaPlataformaJogos = launch.camposEntrada.evidenciaEntrega;
        launch.camposEntrada.evidenciaEntregaMigrado = launch.camposEntrada.evidenciaEntrega;
        delete launch.camposEntrada.evidenciaEntrega;
      }
      if (launch.camposEntrada.percentualExecucao !== undefined && launch.camposEntrada.percentualExecucaoMigrado === undefined) {
        launch.camposEntrada.percentualExecucaoMigrado = launch.camposEntrada.percentualExecucao;
        delete launch.camposEntrada.percentualExecucao;
      }
    }
    if (Number(launch.indicadorId) === 11) {
      const quarter = `${Math.ceil(Number(launch.mes) / 3)}TRI/${launch.ano}`;
      launch.metaMensal = CAPACIDADE_TIC_CURVA_TRIMESTRAL_2026[quarter]?.metaPercentual ?? launch.metaMensal;
      launch.metaAnualDescricao = indicators[10].metaAnualDescricao;
      launch.camposEntrada = launch.camposEntrada || {};
      if (launch.camposEntrada.etapaAtual !== undefined && launch.camposEntrada.marcoAlcancadoTIC === undefined) {
        launch.camposEntrada.marcoAlcancadoTIC = launch.camposEntrada.etapaAtual;
        launch.camposEntrada.etapaAtualMigrado = launch.camposEntrada.etapaAtual;
        delete launch.camposEntrada.etapaAtual;
      }
      if (launch.camposEntrada.percentualExecucao !== undefined && launch.camposEntrada.percentualRealizadoTIC === undefined) {
        launch.camposEntrada.percentualRealizadoTIC = launch.camposEntrada.percentualExecucao;
        launch.camposEntrada.percentualExecucaoMigrado = launch.camposEntrada.percentualExecucao;
        delete launch.camposEntrada.percentualExecucao;
      }
      if (launch.camposEntrada.numeroProcesso !== undefined && launch.camposEntrada.descricaoAndamentoTIC === undefined) {
        launch.camposEntrada.descricaoAndamentoTIC = launch.camposEntrada.numeroProcesso;
        launch.camposEntrada.numeroProcessoMigrado = launch.camposEntrada.numeroProcesso;
        delete launch.camposEntrada.numeroProcesso;
      }
    }
    if (Number(launch.indicadorId) === 12) {
      launch.unidadeApuradora = "GERIN";
      launch.diretoriaResponsavel = "DILOT";
      launch.metaMensal = 60;
      launch.metaAnualDescricao = indicators[11].metaAnualDescricao;
      launch.camposEntrada = launch.camposEntrada || {};
      if (launch.camposEntrada.mediaGeralGPTW !== undefined && launch.camposEntrada.notaClimaApurada === undefined) {
        launch.camposEntrada.notaClimaApurada = launch.camposEntrada.mediaGeralGPTW;
        launch.camposEntrada.mediaGeralGPTWMigrado = launch.camposEntrada.mediaGeralGPTW;
        delete launch.camposEntrada.mediaGeralGPTW;
      }
      if (launch.camposEntrada.dataPesquisa !== undefined && launch.camposEntrada.dataBasePesquisaClima === undefined) {
        launch.camposEntrada.dataBasePesquisaClima = launch.camposEntrada.dataPesquisa;
        launch.camposEntrada.dataPesquisaMigrado = launch.camposEntrada.dataPesquisa;
        delete launch.camposEntrada.dataPesquisa;
      }
      if (launch.camposEntrada.relatorioGPTW !== undefined && launch.camposEntrada.fonteEvidenciaClima === undefined) {
        launch.camposEntrada.fonteEvidenciaClima = launch.camposEntrada.relatorioGPTW;
        launch.camposEntrada.relatorioGPTWMigrado = launch.camposEntrada.relatorioGPTW;
        delete launch.camposEntrada.relatorioGPTW;
      }
      if ([1, 2, 3].includes(Number(launch.mes))) {
        launch.status = "Homologado";
        launch.homologadoPor = launch.homologadoPor || "Sistema";
        launch.dataHomologacao = launch.dataHomologacao || "2026-03-31";
        launch.camposEntrada.tipoPosicaoClima = "Acompanhamento";
        launch.camposEntrada.metaReferenciaClima = 60;
        launch.camposEntrada.acoesRealizadasClima = launch.camposEntrada.acoesRealizadasClima || "Acompanhamento do plano de a\u00e7\u00e3o de clima organizacional.";
        launch.camposEntrada.fonteEvidenciaClima = launch.camposEntrada.fonteEvidenciaClima || "Informe trimestral de acompanhamento";
        launch.camposEntrada.observacaoArea = launch.camposEntrada.observacaoArea || "Posi\u00e7\u00e3o de acompanhamento; resultado final depende da pesquisa oficial.";
      }
      if (Number(launch.mes) === 3) {
        launch.camposEntrada.notaClimaApurada = 60;
        launch.camposEntrada.dataBasePesquisaClima = "2026-03-31";
        launch.camposEntrada.descricaoAndamentoClima = "Divulga\u00e7\u00e3o aos gestores dos resultados da Pesquisa de Clima Organizacional referente ao exerc\u00edcio de 2025, identifica\u00e7\u00e3o e prioriza\u00e7\u00e3o dos principais pontos de aten\u00e7\u00e3o e realiza\u00e7\u00e3o do Workshop Plano de A\u00e7\u00e3o CAIXA Loterias, com apoio metodol\u00f3gico da GPTW, para defini\u00e7\u00e3o dos planos de a\u00e7\u00e3o do ciclo de 2026.";
        launch.resultadoMensal = 60;
        launch.realizadoMensal = 60;
        launch.valorRealizado = 60;
        launch.resultadoAcumulado = 60;
        launch.resultadoOficialAnual = 60;
        launch.percentualAtingido = 1;
        launch.percentualAtingidoMensal = 1;
        launch.percentualAtingidoAcumulado = 1;
        launch.percentualAtingidoAnual = 1;
        launch.situacaoCalculada = "Em acompanhamento";
      }
    }
    if (Number(launch.indicadorId) === 15) {
      launch.unidadeApuradora = "GERIN";
      launch.diretoriaResponsavel = "DILOT";
      launch.metaMensal = 0.90;
      launch.metaAnualDescricao = indicators[14].metaAnualDescricao;
      launch.camposEntrada = launch.camposEntrada || {};
      if (launch.camposEntrada.empregadosElegiveisMes !== undefined && launch.camposEntrada.publicoAlvoElegivelCapacitacao === undefined) {
        launch.camposEntrada.publicoAlvoElegivelCapacitacao = launch.camposEntrada.empregadosElegiveisMes;
        launch.camposEntrada.empregadosElegiveisMesMigrado = launch.camposEntrada.empregadosElegiveisMes;
        delete launch.camposEntrada.empregadosElegiveisMes;
      }
      if (launch.camposEntrada.empregadosCapacitadosMes !== undefined && launch.camposEntrada.empregadosCapacitadosCapacitacao === undefined) {
        launch.camposEntrada.empregadosCapacitadosCapacitacao = launch.camposEntrada.empregadosCapacitadosMes;
        launch.camposEntrada.empregadosCapacitadosMesMigrado = launch.camposEntrada.empregadosCapacitadosMes;
        delete launch.camposEntrada.empregadosCapacitadosMes;
      }
      if (launch.camposEntrada.dataBaseApuracao !== undefined && launch.camposEntrada.dataBaseApuracaoCapacitacao === undefined) {
        launch.camposEntrada.dataBaseApuracaoCapacitacao = launch.camposEntrada.dataBaseApuracao;
        launch.camposEntrada.dataBaseApuracaoMigrado = launch.camposEntrada.dataBaseApuracao;
        delete launch.camposEntrada.dataBaseApuracao;
      }
      if ([1, 2, 3].includes(Number(launch.mes))) {
        launch.status = "Homologado";
        launch.homologadoPor = launch.homologadoPor || "Sistema";
        launch.dataHomologacao = launch.dataHomologacao || "2026-03-31";
        launch.camposEntrada.quantidadeCursosMinimaCapacitacao = 1;
        launch.camposEntrada.cursosConsideradosCapacitacao = launch.camposEntrada.cursosConsideradosCapacitacao || "Curso de Jogo Respons\u00e1vel";
        launch.camposEntrada.fonteEvidenciaCapacitacao = launch.camposEntrada.fonteEvidenciaCapacitacao || "Informe trimestral de acompanhamento";
      }
      if (Number(launch.mes) === 3) {
        const cobertura = 137 / 151;
        launch.camposEntrada.publicoAlvoElegivelCapacitacao = 151;
        launch.camposEntrada.empregadosCapacitadosCapacitacao = 137;
        launch.camposEntrada.dataBaseApuracaoCapacitacao = "2026-03-31";
        launch.resultadoMensal = cobertura;
        launch.realizadoMensal = cobertura;
        launch.valorRealizado = cobertura;
        launch.resultadoAcumulado = cobertura;
        launch.resultadoOficialAnual = cobertura;
        launch.percentualAtingido = 1;
        launch.percentualAtingidoMensal = 1;
        launch.percentualAtingidoAcumulado = 1;
        launch.percentualAtingidoAnual = 1;
        launch.situacaoCalculada = "Atingido";
      }
    }
    if (Number(launch.indicadorId) === 21) {
      const quarter = `${Math.ceil(Number(launch.mes) / 3)}TRI/${launch.ano}`;
      launch.metaMensal = JOGO_RESPONSAVEL_CAPACITACAO_CURVA_2026[quarter]?.metaCobertura ?? launch.metaMensal;
      launch.metaAnualDescricao = indicators[20].metaAnualDescricao;
      launch.camposEntrada = launch.camposEntrada || {};
      if (launch.camposEntrada.empregadosElegiveisMes !== undefined && launch.camposEntrada.publicoAlvoElegivelJR === undefined) {
        launch.camposEntrada.publicoAlvoElegivelJR = launch.camposEntrada.empregadosElegiveisMes;
        launch.camposEntrada.empregadosElegiveisMesMigrado = launch.camposEntrada.empregadosElegiveisMes;
        delete launch.camposEntrada.empregadosElegiveisMes;
      }
      if (launch.camposEntrada.empregadosComDuasIniciativasConcluidas !== undefined && launch.camposEntrada.empregadosCapacitadosJR === undefined) {
        launch.camposEntrada.empregadosCapacitadosJR = launch.camposEntrada.empregadosComDuasIniciativasConcluidas;
        launch.camposEntrada.empregadosComDuasIniciativasConcluidasMigrado = launch.camposEntrada.empregadosComDuasIniciativasConcluidas;
        delete launch.camposEntrada.empregadosComDuasIniciativasConcluidas;
      }
      if ([1, 2, 3].includes(Number(launch.mes))) {
        launch.status = "Homologado";
        launch.homologadoPor = launch.homologadoPor || "Sistema";
        launch.dataHomologacao = launch.dataHomologacao || "2026-03-31";
        launch.camposEntrada.quantidadeMinimaIniciativasJR = 1;
        launch.camposEntrada.iniciativasConsideradasJR = "A\u00e7\u00e3o de dissemina\u00e7\u00e3o de Jogo Respons\u00e1vel na Universidade CAIXA";
        launch.camposEntrada.fonteEvidenciaJR = launch.camposEntrada.fonteEvidenciaJR || "Informe trimestral de acompanhamento";
        launch.camposEntrada.observacaoArea = launch.camposEntrada.observacaoArea || "Crit\u00e9rio 1TRI: pelo menos 1 a\u00e7\u00e3o de dissemina\u00e7\u00e3o conclu\u00edda.";
      }
      if (Number(launch.mes) === 3) {
        const cobertura = 137 / 151;
        launch.camposEntrada.publicoAlvoElegivelJR = 151;
        launch.camposEntrada.empregadosCapacitadosJR = 137;
        launch.camposEntrada.dataBaseApuracaoJR = "2026-03-31";
        launch.resultadoMensal = cobertura;
        launch.realizadoMensal = cobertura;
        launch.valorRealizado = cobertura;
        launch.resultadoAcumulado = cobertura;
        launch.resultadoOficialAnual = cobertura;
        launch.percentualAtingido = 1;
        launch.percentualAtingidoMensal = 1;
        launch.percentualAtingidoAcumulado = 1;
        launch.percentualAtingidoAnual = 1;
        launch.situacaoCalculada = "Atingido";
      }
    }
    if (Number(launch.indicadorId) === 18) {
      const quarter = `${Math.ceil(Number(launch.mes) / 3)}TRI/${launch.ano}`;
      launch.metaMensal = PRINCIPIOS_JOGO_RESPONSAVEL_CURVA_2026[quarter]?.metaElementosAcumulados ?? launch.metaMensal;
      launch.metaAnualDescricao = indicators[17].metaAnualDescricao;
      launch.camposEntrada = launch.camposEntrada || {};
      if (launch.camposEntrada.acaoMelhoria !== undefined && launch.camposEntrada.acaoExecutada === undefined) {
        launch.camposEntrada.acaoExecutada = launch.camposEntrada.acaoMelhoria;
        launch.camposEntrada.acaoMelhoriaMigrado = launch.camposEntrada.acaoMelhoria;
        delete launch.camposEntrada.acaoMelhoria;
      }
      if (launch.camposEntrada.dataExecucao !== undefined && launch.camposEntrada.dataConclusao === undefined) {
        launch.camposEntrada.dataConclusao = launch.camposEntrada.dataExecucao;
        launch.camposEntrada.dataExecucaoMigrado = launch.camposEntrada.dataExecucao;
        delete launch.camposEntrada.dataExecucao;
      }
      if (launch.camposEntrada.elementosExecutadosAcumulado !== undefined && launch.camposEntrada.elementosExecutadosAcumuladoMigrado === undefined) {
        launch.camposEntrada.elementosExecutadosAcumuladoMigrado = launch.camposEntrada.elementosExecutadosAcumulado;
        delete launch.camposEntrada.elementosExecutadosAcumulado;
      }
    }
    if (Number(launch.indicadorId) === 16) {
      const quarter = `${Math.ceil(Number(launch.mes) / 3)}TRI/${launch.ano}`;
      launch.metaMensal = APOIO_SOCIOAMBIENTAL_CURVA_2026[quarter]?.metaQuantidadeAcumulada ?? launch.metaMensal;
      launch.metaAnualDescricao = indicators[15].metaAnualDescricao;
      launch.camposEntrada = launch.camposEntrada || {};
      if (launch.camposEntrada.nomeIniciativa !== undefined && launch.camposEntrada.nomeIniciativaSocioambiental === undefined) {
        launch.camposEntrada.nomeIniciativaSocioambiental = launch.camposEntrada.nomeIniciativa;
        launch.camposEntrada.nomeIniciativaMigrado = launch.camposEntrada.nomeIniciativa;
        delete launch.camposEntrada.nomeIniciativa;
      }
      if (launch.camposEntrada.dataApoio !== undefined && launch.camposEntrada.dataApoioIniciativa === undefined) {
        launch.camposEntrada.dataApoioIniciativa = launch.camposEntrada.dataApoio;
        launch.camposEntrada.dataApoioMigrado = launch.camposEntrada.dataApoio;
        delete launch.camposEntrada.dataApoio;
      }
      if (launch.camposEntrada.quantidadeIniciativasApoiadasMes !== undefined && launch.camposEntrada.quantidadeIniciativasApoiadasMesMigrado === undefined) {
        launch.camposEntrada.quantidadeIniciativasApoiadasMesMigrado = launch.camposEntrada.quantidadeIniciativasApoiadasMes;
        delete launch.camposEntrada.quantidadeIniciativasApoiadasMes;
      }
    }
    if (Number(launch.indicadorId) === 9) {
      launch.metaMensal = PIX_QUARTER_TARGETS[Math.ceil(Number(launch.mes) / 3) - 1];
      launch.metaAnualDescricao = indicators[8].metaAnualDescricao;
    }
    if (Number(launch.indicadorId) === 5) {
      launch.metaMensal = GGR_META_ACUMULADA_2026[`${launch.ano}-${String(launch.mes).padStart(2, "0")}`] ?? launch.metaMensal;
      launch.metaAnualDescricao = indicators[4].metaAnualDescricao;
      launch.camposEntrada = launch.camposEntrada || {};
      if (launch.camposEntrada.ggrRealizadoMes !== undefined && launch.camposEntrada.ggrRealizadoMesMigrado === undefined) {
        launch.camposEntrada.ggrRealizadoMesMigrado = launch.camposEntrada.ggrRealizadoMes;
        delete launch.camposEntrada.ggrRealizadoMes;
      }
    }
    if (Number(launch.indicadorId) === 6) {
      const key = `${launch.ano}-${String(launch.mes).padStart(2, "0")}`;
      launch.metaMensal = Object.prototype.hasOwnProperty.call(IEO_META_ACUMULADA_2026, key) ? IEO_META_ACUMULADA_2026[key] : launch.metaMensal;
      launch.metaAnualDescricao = indicators[5].metaAnualDescricao;
    }
    if (Number(launch.indicadorId) === 17) {
      const key = `${launch.ano}-${String(launch.mes).padStart(2, "0")}`;
      launch.metaMensal = REPASSE_SOCIAL_META_ACUMULADA_2026[key] ?? launch.metaMensal;
      launch.metaAnualDescricao = indicators[16].metaAnualDescricao;
      launch.camposEntrada = launch.camposEntrada || {};
      if (launch.camposEntrada.repasseSocialAcumulado !== undefined && launch.camposEntrada.repasseSocialAcumuladoCompetencia === undefined) {
        launch.camposEntrada.repasseSocialAcumuladoCompetencia = launch.camposEntrada.repasseSocialAcumulado;
        launch.camposEntrada.repasseSocialAcumuladoMigrado = launch.camposEntrada.repasseSocialAcumulado;
        delete launch.camposEntrada.repasseSocialAcumulado;
      }
    }
    if (Number(launch.indicadorId) === 19) {
      const quarter = `${Math.ceil(Number(launch.mes) / 3)}TRI/${launch.ano}`;
      launch.metaMensal = INCENTIVO_SOCIOAMBIENTAL_CURVA_2026[quarter]?.metaValorAcumulado ?? launch.metaMensal;
      launch.metaAnualDescricao = indicators[18].metaAnualDescricao;
      launch.camposEntrada = launch.camposEntrada || {};
      if (launch.camposEntrada.valorInvestidoAcumulado !== undefined && launch.camposEntrada.valorInvestidoAcumuladoCompetencia === undefined) {
        launch.camposEntrada.valorInvestidoAcumuladoCompetencia = launch.camposEntrada.valorInvestidoAcumulado;
        launch.camposEntrada.valorInvestidoAcumuladoMigrado = launch.camposEntrada.valorInvestidoAcumulado;
        delete launch.camposEntrada.valorInvestidoAcumulado;
      }
      if ([1, 2, 3].includes(Number(launch.mes))) {
        launch.status = "Homologado";
        launch.homologadoPor = launch.homologadoPor || "Sistema";
        launch.dataHomologacao = launch.dataHomologacao || "2026-03-31";
        launch.camposEntrada.nomeProjetoIncentivoSocioambiental = "Projeto de impacto socioambiental em prospec\u00e7\u00e3o";
        launch.camposEntrada.tipoIncentivoSocioambiental = launch.camposEntrada.tipoIncentivoSocioambiental || "Lei de incentivo/patroc\u00ednio";
        launch.camposEntrada.statusProjetoIncentivoSocioambiental = Number(launch.mes) === 2 ? "Em estrutura\u00e7\u00e3o" : "Em prospec\u00e7\u00e3o";
        launch.camposEntrada.valorInvestidoMes = 0;
        launch.camposEntrada.valorInvestidoAcumuladoCompetencia = 0;
        launch.camposEntrada.descricaoAndamentoIncentivoSocioambiental = "Projetos em fase de prospec\u00e7\u00e3o e estrutura\u00e7\u00e3o, para posterior encaminhamento em rito de governan\u00e7a.";
        launch.camposEntrada.evidenciaIncentivoSocioambiental = launch.camposEntrada.evidenciaIncentivoSocioambiental || "Informe trimestral de acompanhamento";
        launch.resultadoMensal = 0;
        launch.realizadoMensal = 0;
        launch.valorRealizado = 0;
        launch.resultadoAcumulado = 0;
        launch.resultadoOficialAnual = 0;
        launch.percentualAtingido = null;
        launch.percentualAtingidoMensal = null;
        launch.percentualAtingidoAcumulado = null;
        launch.percentualAtingidoAnual = null;
        launch.situacaoCalculada = "Em prospec\u00e7\u00e3o/estrutura\u00e7\u00e3o";
      }
    }
    if (Number(launch.indicadorId) === 20) {
      const quarter = `${Math.ceil(Number(launch.mes) / 3)}TRI/${launch.ano}`;
      launch.metaMensal = VISIBILIDADE_REPASSES_CURVA_2026[quarter]?.metaAcoesRealizadasAcumuladas ?? launch.metaMensal;
      launch.metaAnualDescricao = indicators[19].metaAnualDescricao;
      launch.camposEntrada = launch.camposEntrada || {};
      if (launch.camposEntrada.statusAcao !== undefined && launch.camposEntrada.statusAcaoVisibilidade === undefined) {
        launch.camposEntrada.statusAcaoVisibilidade = launch.camposEntrada.statusAcao;
        launch.camposEntrada.statusAcaoMigrado = launch.camposEntrada.statusAcao;
        delete launch.camposEntrada.statusAcao;
      }
      if (launch.camposEntrada.evidencia !== undefined && launch.camposEntrada.evidenciaVisibilidade === undefined) {
        launch.camposEntrada.evidenciaVisibilidade = launch.camposEntrada.evidencia;
        launch.camposEntrada.evidenciaMigrada = launch.camposEntrada.evidencia;
        delete launch.camposEntrada.evidencia;
      }
      if (launch.camposEntrada.totalAcoesPropostas !== undefined && launch.camposEntrada.totalAcoesPropostasMigrado === undefined) {
        launch.camposEntrada.totalAcoesPropostasMigrado = launch.camposEntrada.totalAcoesPropostas;
        delete launch.camposEntrada.totalAcoesPropostas;
      }
      if (launch.camposEntrada.totalAcoesRealizadas !== undefined && launch.camposEntrada.totalAcoesRealizadasMigrado === undefined) {
        launch.camposEntrada.totalAcoesRealizadasMigrado = launch.camposEntrada.totalAcoesRealizadas;
        delete launch.camposEntrada.totalAcoesRealizadas;
      }
      if ([1, 2, 3].includes(Number(launch.mes))) {
        launch.status = "Homologado";
        launch.homologadoPor = launch.homologadoPor || "Sistema";
        launch.dataHomologacao = launch.dataHomologacao || "2026-03-31";
        launch.camposEntrada.acaoPropostaVisibilidade = "relatorio_sorte_em_numeros_2025";
        launch.camposEntrada.statusAcaoVisibilidade = Number(launch.mes) === 3 ? "Em homologa\u00e7\u00e3o" : "Em elabora\u00e7\u00e3o";
        launch.camposEntrada.etapaAtualVisibilidade = Number(launch.mes) === 3
          ? "Diagrama\u00e7\u00e3o e layout conclu\u00eddos; relat\u00f3rio em homologa\u00e7\u00e3o pr\u00e9via \u00e0 publica\u00e7\u00e3o"
          : "Relat\u00f3rio em elabora\u00e7\u00e3o";
        launch.camposEntrada.descricaoAndamentoVisibilidade = "Foram executadas as etapas de planejamento e briefing da empresa de comunica\u00e7\u00e3o, coleta e consolida\u00e7\u00e3o de conte\u00fado e dados, reda\u00e7\u00e3o do conte\u00fado, padroniza\u00e7\u00e3o visual, diagrama\u00e7\u00e3o e layout. O relat\u00f3rio encontra-se em fase de homologa\u00e7\u00e3o antes da publica\u00e7\u00e3o.";
        launch.camposEntrada.evidenciaVisibilidade = launch.camposEntrada.evidenciaVisibilidade || "Informe trimestral de acompanhamento";
        launch.resultadoMensal = 0;
        launch.realizadoMensal = 0;
        launch.valorRealizado = 0;
        launch.resultadoAcumulado = 0;
        launch.resultadoOficialAnual = 0;
        launch.percentualAtingido = null;
        launch.percentualAtingidoMensal = null;
        launch.percentualAtingidoAcumulado = null;
        launch.percentualAtingidoAnual = null;
        launch.situacaoCalculada = "Em elabora\u00e7\u00e3o/homologa\u00e7\u00e3o";
      }
    }
    if (Number(launch.indicadorId) === 8) {
      launch.unidadeApuradora = "SUCOL";
      launch.diretoriaResponsavel = "DICOT";
      launch.metaMensal = 0.2805;
      launch.metaAnualDescricao = indicators[7].metaAnualDescricao;
    }
  });
  writeUtf8(launchesPath, `${JSON.stringify(launches, null, 2)}\n`);

  const goalsPath = path.join(ROOT, "data", "metas-mensais.json");
  const goals = JSON.parse(fs.readFileSync(goalsPath, "utf8"));
  goals.forEach((goal) => {
    if (Number(goal.indicadorId) === 1) {
      goal.metaMensal = 0.10;
      goal.fonte = "meta_fixa_ofertas_personalizadas_2026";
    }
    if (Number(goal.indicadorId) === 2) {
      const key = `${goal.ano}-${String(goal.mes).padStart(2, "0")}`;
      goal.metaMensal = NPS_REFERENCIAS_2026[key] ?? 58;
      goal.fonte = "baseline_meta_anual_nps_2026";
    }
    if (Number(goal.indicadorId) === 4) {
      const quarter = `${Math.ceil(Number(goal.mes) / 3)}TRI/${goal.ano}`;
      goal.metaMensal = APRIMORAMENTO_CURVA_TRIMESTRAL_2026[quarter]?.metaPercentual ?? goal.metaMensal;
      goal.fonte = "curva_trimestral_aprimoramento_experiencia_2026";
    }
    if (Number(goal.indicadorId) === 10) {
      goal.metaMensal = null;
      goal.fonte = "marco_anual_plataforma_jogos_2026";
    }
    if (Number(goal.indicadorId) === 11) {
      const quarter = `${Math.ceil(Number(goal.mes) / 3)}TRI/${goal.ano}`;
      goal.metaMensal = CAPACIDADE_TIC_CURVA_TRIMESTRAL_2026[quarter]?.metaPercentual ?? goal.metaMensal;
      goal.fonte = "curva_trimestral_capacidade_tic_2026";
    }
    if (Number(goal.indicadorId) === 12) {
      goal.metaMensal = 60;
      goal.fonte = "meta_fixa_clima_organizacional_2026";
    }
    if (Number(goal.indicadorId) === 15) {
      goal.metaMensal = 0.90;
      goal.fonte = "curva_trimestral_capacitacao_empregados_2026";
    }
    if (Number(goal.indicadorId) === 21) {
      const quarter = `${Math.ceil(Number(goal.mes) / 3)}TRI/${goal.ano}`;
      goal.metaMensal = JOGO_RESPONSAVEL_CAPACITACAO_CURVA_2026[quarter]?.metaCobertura ?? goal.metaMensal;
      goal.fonte = "curva_trimestral_jogo_responsavel_capacitacao_2026";
    }
    if (Number(goal.indicadorId) === 18) {
      const quarter = `${Math.ceil(Number(goal.mes) / 3)}TRI/${goal.ano}`;
      goal.metaMensal = PRINCIPIOS_JOGO_RESPONSAVEL_CURVA_2026[quarter]?.metaElementosAcumulados ?? goal.metaMensal;
      goal.fonte = "curva_trimestral_principios_jogo_responsavel_2026";
    }
    if (Number(goal.indicadorId) === 16) {
      const quarter = `${Math.ceil(Number(goal.mes) / 3)}TRI/${goal.ano}`;
      goal.metaMensal = APOIO_SOCIOAMBIENTAL_CURVA_2026[quarter]?.metaQuantidadeAcumulada ?? goal.metaMensal;
      goal.fonte = "curva_trimestral_apoio_socioambiental_2026";
    }
    if (Number(goal.indicadorId) === 9) {
      goal.metaMensal = PIX_QUARTER_TARGETS[Math.ceil(Number(goal.mes) / 3) - 1];
      goal.fonte = "curva_oficial_pix_2026";
    }
    if (Number(goal.indicadorId) === 5) {
      goal.metaMensal = GGR_META_ACUMULADA_2026[`${goal.ano}-${String(goal.mes).padStart(2, "0")}`] ?? goal.metaMensal;
      goal.fonte = "curva_acumulada_ggr_2026";
    }
    if (Number(goal.indicadorId) === 6) {
      const key = `${goal.ano}-${String(goal.mes).padStart(2, "0")}`;
      goal.metaMensal = Object.prototype.hasOwnProperty.call(IEO_META_ACUMULADA_2026, key) ? IEO_META_ACUMULADA_2026[key] : goal.metaMensal;
      goal.fonte = "curva_acumulada_ieo_2026";
    }
    if (Number(goal.indicadorId) === 17) {
      goal.metaMensal = REPASSE_SOCIAL_META_ACUMULADA_2026[`${goal.ano}-${String(goal.mes).padStart(2, "0")}`] ?? goal.metaMensal;
      goal.fonte = "curva_acumulada_repasse_social_2026";
    }
    if (Number(goal.indicadorId) === 19) {
      const quarter = `${Math.ceil(Number(goal.mes) / 3)}TRI/${goal.ano}`;
      goal.metaMensal = INCENTIVO_SOCIOAMBIENTAL_CURVA_2026[quarter]?.metaValorAcumulado ?? goal.metaMensal;
      goal.fonte = "curva_trimestral_incentivo_socioambiental_2026";
    }
    if (Number(goal.indicadorId) === 20) {
      const quarter = `${Math.ceil(Number(goal.mes) / 3)}TRI/${goal.ano}`;
      goal.metaMensal = VISIBILIDADE_REPASSES_CURVA_2026[quarter]?.metaAcoesRealizadasAcumuladas ?? goal.metaMensal;
      goal.fonte = "curva_trimestral_visibilidade_repasses_2026";
    }
    if (Number(goal.indicadorId) === 8) {
      goal.metaMensal = 0.2805;
      goal.fonte = "meta_fixa_canais_digitais_2026";
    }
  });
  writeUtf8(goalsPath, `${JSON.stringify(goals, null, 2)}\n`);
}

const changed = repairFiles();
standardizeHtml();
updateCanonicalData();
console.log(`Encoding corrigido em ${changed.length} arquivo(s).`);
