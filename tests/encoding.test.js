const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const indicatorNames = [
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
  "Participação da Rede Lotérica nos Negócios da CAIXA Loterias"
];
const pillarNames = [
  "Cliente no Centro",
  "Eficiência e Rentabilidade",
  "Tecnologia e Inovação",
  "Pessoas, Cultura e Agilidade",
  "Sustentabilidade e Cidadania",
  "Atuação em Ecossistema"
];

const bootstrap = loadBootstrapData(root);
const indicators = bootstrap.indicadores;
const pillars = bootstrap.pilares;
const rules = bootstrap.regrasIndicadores;

assert.deepEqual(indicators.map((item) => item.indicador), indicatorNames);
assert.deepEqual(pillars.map((item) => item.nome), pillarNames);
assert.deepEqual(rules.map((item) => item.nome), indicatorNames);
assert.equal(rules.find((item) => item.indicadorId === 9).tipoCalculo, "razao_pix");
assert.equal(rules.find((item) => item.indicadorId === 8).tipoCalculo, "razao_canais_digitais");
assert.equal(rules.find((item) => item.indicadorId === 8).metaAnualValor, 0.2805);
assert.equal(indicators.find((item) => item.id === 8).unidadeApuradora, "SUCOL");
assert.equal(indicators.find((item) => item.id === 8).diretoriaResponsavel, "DICOT");
assert.equal(indicators.find((item) => item.id === 1).tipoCalculo, "percentual_direto");
assert.equal(rules.find((item) => item.indicadorId === 9).unidadeMedida, "percentual");
assert.equal(rules.find((item) => item.indicadorId === 9).camposEntrada.every((field) => field.tipo === "moeda"), true);
assert.equal(rules.find((item) => item.indicadorId === 5).camposEntrada[0].tipo, "moeda");
assert.equal(indicators[0].metaAnualDescricao.startsWith("≥"), true);
assert.equal(indicators[5].metaAnualDescricao.startsWith("≤"), true);
assert.equal(indicators[16].metaAnualDescricao.startsWith("≥"), true);

const frontendViews = path.join(root, "views", "frontend");
fs.readdirSync(frontendViews)
  .filter((name) => name.endsWith(".php"))
  .forEach((name) => {
    const html = fs.readFileSync(path.join(frontendViews, name), "utf8");
    assert.match(html, /<meta charset="UTF-8">/);
    assert.doesNotMatch(html, /[\u00c3\u00c2\ufffd]|\u00e2[\u20ac-\u2122]/u);
  });

const storage = new Map([
  ["caixaLoterias:lancamentos", JSON.stringify([{
    status: "N\u00c3\u00a3o iniciado",
    pilar: "Efici\u003fncia e Rentabilidade",
    meta: "\u00e2\u2030\u00a5 10%"
  }, {
    indicadorId: 9,
    status: "Homologado",
    camposEntrada: {
      arrecadacaoPixMes: "R$ 411.428.638,26",
      arrecadacaoTotalCanaisEletronicosMes: "625.000.000,00"
    }
  }, {
    indicadorId: 9,
    status: "Homologado",
    camposEntrada: {
      arrecadacaoPixMes: 411.43,
      arrecadacaoTotalCanaisEletronicosMes: 625
    }
  }])]
]);
const localStorage = {
  "caixaLoterias:lancamentos": storage.get("caixaLoterias:lancamentos"),
  get length() { return storage.size; },
  key(index) { return [...storage.keys()][index] ?? null; },
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) {
    storage.set(key, String(value));
    this[key] = String(value);
  },
  removeItem(key) {
    storage.delete(key);
    delete this[key];
  }
};
const context = {
  window: { location: { protocol: "file:" } },
  localStorage,
  TextDecoder,
  Uint8Array,
  console
};
context.window.window = context.window;
vm.runInNewContext(fs.readFileSync(path.join(root, "assets", "js", "currency.js"), "utf8"), context);
context.CurrencyBR = context.window.CurrencyBR;
vm.runInNewContext(fs.readFileSync(path.join(root, "assets", "js", "dataStore.js"), "utf8"), context);

const migrated = JSON.parse(localStorage.getItem("caixaLoterias:lancamentos"));
assert.equal(migrated[0].status, "Não iniciado");
assert.equal(migrated[0].pilar, "Eficiência e Rentabilidade");
assert.equal(migrated[0].meta, "≥ 10%");
assert.equal(migrated[1].camposEntrada.arrecadacaoPixMes, 411428638.26);
assert.equal(migrated[1].camposEntrada.arrecadacaoTotalCanaisEletronicosMes, 625000000);
assert.equal(migrated[2].camposEntrada.arrecadacaoPixMes, 411.43);
assert.equal(migrated[2].revisaoMoedaPendente, true);
assert.equal(localStorage.getItem("caixaLoterias:textEncodingMigration"), "UTF8-PTBR-001");
assert.equal(localStorage.getItem("caixaLoterias:currencyMigration"), "MOEDA-BR-001");

console.log("Testes de encoding OK");
