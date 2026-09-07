const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const calculations = {
  formatarPercentual(value) { return `${Number(value) * 100}%`; },
  formatarValor(value, unit) {
    if (unit === "moeda") return `R$ ${Number(value).toFixed(2)}`;
    return String(Number(value));
  }
};
const context = {
  window: { PageModules: {}, Calculations: calculations },
  Calculations: calculations
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "assets", "js", "launches.js"), "utf8"), context);
const internals = context.window.__LAUNCHES_FILTER_TEST_INTERNALS__;

assert.deepEqual(
  JSON.parse(JSON.stringify(internals.quarterlyMetaDetail(
    { metaTrimestral: 2, unidadeMedida: "quantidade" },
    { tipoCalculo: "plano_acao_por_elementos", unidadeMedida: "quantidade" },
    { trimestre: "2TRI/2026", mes: 6 }
  ))),
  ["Meta do 2TRI", "2 elementos acumulados"]
);
assert.deepEqual(
  JSON.parse(JSON.stringify(internals.quarterlyMetaDetail(
    { metaTrimestral: 0.01, unidadeMedida: "percentual" },
    { tipoCalculo: "incremento_rede_loterica_base_2025", unidadeMedida: "percentual" },
    { mes: 6 }
  ))),
  ["Meta trimestral de incremento", "1%"]
);
assert.deepEqual(
  JSON.parse(JSON.stringify(internals.quarterlyMetaDetail(
    { metaTrimestral: 2500, unidadeMedida: "moeda" },
    { tipoCalculo: "valor_financeiro_acumulado", unidadeMedida: "moeda" },
    { mes: 9 }
  ))),
  ["Meta trimestral", "R$ 2500.00"]
);
assert.equal(internals.quarterLabel({ mes: 12 }), "4TRI");

const view = fs.readFileSync(path.join(root, "views", "frontend", "lancamentos.php"), "utf8");
assert.match(view, /Registro dos dados pelas unidades apuradoras\./);
assert.match(view, /<th>Mês \/ competência<\/th>/);
assert.match(view, /<th>Resultado da competência<\/th>/);
assert.match(view, /id="launchResultadoMensalLabel">Resultado da competência</);
assert.match(view, /id="launchPercentualCalculadoLabel">% da meta atingida</);
assert.match(view, /id="launchPercentualAcumuladoLabel">% da meta atingida anual</);
assert.match(view, /id="resultadoAnualWrapper"/);
assert.match(view, /documentation-fields\.js\?v=DOCUMENTACAO-CENTRAL-001/);
assert.match(view, /styles\.css\?v=SOCIOAMBIENTAL-UX-001/);
assert.match(view, /launches\.js\?v=SOCIOAMBIENTAL-UX-001/);
assert.match(view, /id="launchValidationFeedback"[^>]+role="alert"[^>]+aria-live="assertive"/);

const dataStoreSource = fs.readFileSync(path.join(root, "assets", "js", "dataStore.js"), "utf8");
assert.match(dataStoreSource, /nome: "tipoPosicaoCapacitacao"/);
assert.match(dataStoreSource, /Acompanhamento sem nova medição/);
assert.match(dataStoreSource, /nome: "acoesAcompanhamentoCapacitacao"/);
assert.match(dataStoreSource, /nome: "quantidadeCursosMinimaCapacitacao"[^\n]+somenteLeitura: true/);
assert.match(dataStoreSource, /nome: "tipoPosicaoAprimoramento"/);
assert.match(dataStoreSource, /nome: "melhoriasImplementadasMes"[^\n]+Melhorias implementadas no período de apuração[^\n]+tipo: "inteiro"/);
assert.match(dataStoreSource, /nome: "melhoriasImplementadasAcumuladas"[^\n]+tipo: "inteiro"[^\n]+somenteLeitura: true/);
assert.match(dataStoreSource, /Descrição das melhorias implementadas no período/);
assert.match(dataStoreSource, /nome: "percentualEvolucaoPlataformaJogos"[^\n]+Percentual oficial de evolução do projeto[^\n]+tipo: "percentual"[^\n]+entradaPtBr: true/);
assert.match(dataStoreSource, /"2TRI\/2026": 1 \/ 3/);
assert.match(dataStoreSource, /Registro de Aposta finalizado em ambiente de desenvolvimento/);

const launchesSource = fs.readFileSync(path.join(root, "assets", "js", "launches.js"), "utf8");
assert.match(launchesSource, /function updateCapacitacaoPositionFields/);
assert.match(launchesSource, /function updateNpsPositionFields/);
assert.match(launchesSource, /function updateAprimoramentoPositionFields/);
assert.match(launchesSource, /melhorias implementadas no período para o fechamento quantitativo/);
assert.match(launchesSource, /resultado\.origemNps === "componentes_formula"/);
assert.match(launchesSource, /Percentual de promotores − percentual de detratores/);
assert.match(launchesSource, /Informe as ações realizadas ou o andamento antes de enviar/);
assert.match(launchesSource, /async function persistLaunch\(action\) \{\s+const lancamento = getSelectedLaunch\(\);/);
assert.match(launchesSource, /Evidência anexada, mas não foi possível salvar o lançamento/);
assert.match(launchesSource, /meta_oficial_trimestral_projeto/);
assert.match(launchesSource, /Evolução oficial do projeto/);
assert.match(launchesSource, /\["nota_pesquisa_nps", "iniciativas_apoiadas", "execucao_acoes_propostas"\]\.includes\(regra\?\.tipoCalculo\)/);
assert.match(launchesSource, /function updateSocioambientalInitiativeFields/);
assert.match(launchesSource, /function validateSocioambientalRequiredFields/);
assert.match(launchesSource, /Campo obrigatório para iniciativa apoiada\/realizada\./);
assert.match(dataStoreSource, /nome: "nomeIniciativaSocioambiental"[^\n]+obrigatorio: false/);

const socioambientalRule = {
  tipoCalculo: "iniciativas_apoiadas",
  parametrosCalculo: {
    campoStatus: "statusIniciativaSocioambiental",
    campoNome: "nomeIniciativaSocioambiental",
    campoDataApoio: "dataApoioIniciativa",
    statusQueConta: "Apoiada/realizada"
  }
};
function socioambientalValidation(values) {
  return JSON.parse(JSON.stringify(internals.socioambientalRequiredFieldState(socioambientalRule, values)));
}
assert.deepEqual(socioambientalValidation({ statusIniciativaSocioambiental: "Apoiada/realizada" }), {
  applies: true,
  missing: ["nomeIniciativaSocioambiental", "dataApoioIniciativa"],
  message: "Para registrar uma iniciativa como Apoiada/realizada, preencha:\n• Nome da iniciativa\n• Data de apoio/realização"
});
assert.deepEqual(socioambientalValidation({
  statusIniciativaSocioambiental: "Apoiada/realizada",
  nomeIniciativaSocioambiental: "Iniciativa A"
}), {
  applies: true,
  missing: ["dataApoioIniciativa"],
  message: "Informe a data de apoio/realização da iniciativa."
});
assert.deepEqual(socioambientalValidation({
  statusIniciativaSocioambiental: "Apoiada/realizada",
  dataApoioIniciativa: "2026-06-10"
}), {
  applies: true,
  missing: ["nomeIniciativaSocioambiental"],
  message: "Informe o nome da iniciativa apoiada/realizada."
});
assert.deepEqual(socioambientalValidation({
  statusIniciativaSocioambiental: "Apoiada/realizada",
  nomeIniciativaSocioambiental: "Iniciativa A",
  dataApoioIniciativa: "2026-06-10"
}), { applies: true, missing: [], message: "" });
["Em prospecção", "Em estruturação", "Em rito de governança"].forEach((status) => {
  assert.deepEqual(socioambientalValidation({ statusIniciativaSocioambiental: status }), {
    applies: false,
    missing: [],
    message: ""
  });
});

const approvalsSource = fs.readFileSync(path.join(root, "assets", "js", "approvals.js"), "utf8");
assert.match(approvalsSource, /Acompanhamento sem nova medição/);
assert.match(approvalsSource, /Ações realizadas \/ andamento/);
assert.match(approvalsSource, /"Em acompanhamento"/);
assert.match(approvalsSource, /const componentesNps = regra\?\.tipoCalculo === "nota_pesquisa_nps"/);
assert.match(approvalsSource, /Percentual de promotores − percentual de detratores/);
assert.match(approvalsSource, /Novas melhorias no período/);
assert.match(approvalsSource, /Melhorias implementadas acumuladas/);
assert.match(approvalsSource, /Base de melhorias mapeadas/);
assert.match(approvalsSource, /const detalhesPlataformaJogos = isPlataformaJogos/);
assert.match(approvalsSource, /Marco\/etapa atual/);

const actionOptionsHtml = internals.renderEntryInput({
  nome: "acaoPropostaVisibilidade",
  rotulo: "Ação proposta",
  tipo: "selecao",
  opcoes: [
    "Opção em texto",
    { value: "valor_label", label: "Opção value/label" },
    { id: "id_label", label: "Opção id/label" },
    { id: "relatorio_sorte_em_numeros_2025", nome: "Publicar relatório institucional \"A Sorte em Números — 2025\"" },
    { id: "campanha_repasses_sociais", nome: "Realizar campanha publicitária exclusiva com foco no repasse social das Loterias CAIXA" }
  ]
}, "relatorio_sorte_em_numeros_2025");
assert.match(actionOptionsHtml, /value="Opção em texto"[^>]*>Opção em texto<\/option>/);
assert.match(actionOptionsHtml, /value="valor_label"[^>]*>Opção value\/label<\/option>/);
assert.match(actionOptionsHtml, /value="id_label"[^>]*>Opção id\/label<\/option>/);
assert.match(actionOptionsHtml, /value="relatorio_sorte_em_numeros_2025"[^>]*selected[^>]*>Publicar relatório institucional &quot;A Sorte em Números — 2025&quot;<\/option>/);
assert.match(actionOptionsHtml, /value="campanha_repasses_sociais"[^>]*>Realizar campanha publicitária exclusiva com foco no repasse social das Loterias CAIXA<\/option>/);

const visibilityRule = {
  tipoCalculo: "execucao_acoes_propostas",
  unidadeMedida: "percentual",
  metaAnualValor: 1,
  parametrosCalculo: {
    curvaTrimestralAcumulada: {
      "2TRI/2026": { metaPercentual: 0.5, metaAcoesRealizadasAcumuladas: 1 }
    }
  }
};
assert.equal(internals.getDisplayMeta(visibilityRule, { ano: 2026, mes: 6, trimestre: "2TRI/2026" }), 0.5);
assert.deepEqual(
  JSON.parse(JSON.stringify(internals.quarterlyMetaDetail(
    { metaTrimestral: 1, metaPercentualTrimestral: 0.5, unidadeMedida: "percentual" },
    visibilityRule,
    { ano: 2026, mes: 6, trimestre: "2TRI/2026" }
  ))),
  ["Meta trimestral", "50%"]
);

console.log("Testes de apresentação da tela de lançamentos OK");
