const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const shared = read("assets/js/action-feedback.js");
const launchView = read("views/frontend/lancamentos.php");
const approvalView = read("views/frontend/homologacao.php");
const launches = read("assets/js/launches.js");
const approvals = read("assets/js/approvals.js");
const centralPersistence = read("assets/js/central-persistence.js");
const css = read("assets/css/styles.css");

assert.equal(shared, read("public/assets/js/action-feedback.js"), "componente compartilhado deve estar sincronizado");
assert.equal(css, read("public/assets/css/styles.css"), "CSS deve estar sincronizado");
assert(launchView.indexOf('id="launchActionFeedback"') < launchView.indexOf('id="saveDraftButton"'), "feedback de lançamento deve ficar à esquerda dos botões");
assert(approvalView.indexOf('id="approvalActionFeedback"') < approvalView.indexOf('id="approveButton"'), "feedback de homologação deve ficar à esquerda dos botões");
assert(launchView.includes("action-feedback.js?v=ACTION-FEEDBACK-001"), "lançamentos deve carregar o componente versionado");
assert(approvalView.includes("action-feedback.js?v=ACTION-FEEDBACK-001"), "homologação deve carregar o componente versionado");
assert(launchView.includes('id="launchMessage" class="notice"'), "aviso geral de lançamentos deve permanecer no topo");
assert(approvalView.includes('id="approvalMessage" class="notice"'), "aviso geral de homologação deve permanecer no topo");
assert(css.includes(".action-feedback-bar .action-feedback"), "responsividade deve colocar o feedback em linha própria");

const persistLaunch = launches.slice(launches.indexOf("async function persistLaunch"), launches.indexOf("async function saveLaunchData"));
const persistDecision = approvals.slice(approvals.indexOf("async function persistDecision"), approvals.indexOf("async function reopenLaunch"));
assert(persistLaunch.includes('showActionFeedback("Rascunho salvo com sucesso.")'), "rascunho deve usar feedback junto aos botões");
assert(persistLaunch.includes('showActionFeedback("Lançamento enviado para homologação com sucesso.")'), "envio deve usar feedback junto aos botões");
assert(persistDecision.includes("showActionFeedback("), "decisão deve usar feedback junto aos botões");
assert(!persistDecision.includes("approvalPanel\").hidden = true"), "painel deve permanecer visível para apresentar o feedback");
assert(persistDecision.indexOf("await apiJson") < persistDecision.indexOf("showActionFeedback("), "sucesso deve aparecer somente após confirmação da API");
assert(centralPersistence.includes('getElementById("launchActionFeedback")'), "falha de persistência deve priorizar o feedback contextual");
assert.equal(centralPersistence, read("public/assets/js/central-persistence.js"), "persistência central deve estar sincronizada");

function element() {
  return {
    hidden: true,
    className: "action-feedback",
    dataset: {},
    children: [],
    textContent: "",
    replaceChildren(...children) { this.children = children; },
    removeAttribute(name) { if (name === "data-feedback-type") delete this.dataset.feedbackType; }
  };
}

const target = element();
const scheduled = [];
const context = {
  document: {
    getElementById: (id) => id === "target" ? target : null,
    createElement: () => ({ className: "", textContent: "", setAttribute() {} })
  },
  window: {
    setTimeout(callback, duration) { scheduled.push({ callback, duration }); return scheduled.length; },
    clearTimeout() {}
  }
};
context.window.window = context.window;
context.window.document = context.document;
vm.createContext(context);
vm.runInContext(shared, context);

context.window.ActionFeedback.show("target", "Operação concluída.", "success");
assert.equal(target.hidden, false);
assert.equal(target.children[0].textContent, "✓");
assert.equal(target.children[1].textContent, "Operação concluída.");
assert.equal(scheduled[0].duration, 5000, "sucesso deve desaparecer após cinco segundos");
scheduled[0].callback();
assert.equal(target.hidden, true);

const timersBeforeError = scheduled.length;
context.window.ActionFeedback.show("target", "Falha persistente.", "error");
assert.equal(target.children[0].textContent, "✕");
assert.equal(target.dataset.feedbackType, "error");
assert.equal(scheduled.length, timersBeforeError, "erro não deve desaparecer automaticamente");

console.log("Testes do feedback contextual de ações OK");
