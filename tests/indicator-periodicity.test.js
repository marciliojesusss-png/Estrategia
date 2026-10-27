const assert = require("node:assert/strict");
const Periodicity = require("../assets/js/indicator-periodicity.js");

assert.deepEqual(Periodicity.expectedMonths("Mensal"), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
assert.deepEqual(Periodicity.expectedMonths("Trimestral"), [3, 6, 9, 12]);
assert.deepEqual(Periodicity.expectedMonths("Semestral"), [6, 12]);
assert.deepEqual(Periodicity.expectedMonths("Anual"), [12]);
assert.deepEqual(Periodicity.expectedMonths("Não especificada"), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

const indicador18 = { id: 18, periodicidade: "Trimestral" };
assert.equal(Periodicity.isExpectedCompetence(indicador18, "2026-04"), false);
assert.equal(Periodicity.isExpectedCompetence(indicador18, "2026-05"), false);
assert.equal(Periodicity.isExpectedCompetence(indicador18, "2026-06"), true);
assert.equal(Periodicity.isExpectedCompetence(indicador18, "2026-09"), true);
assert.equal(Periodicity.isExpectedCompetence(indicador18, "2026-12"), true);
assert.equal(Periodicity.compositionLabel(indicador18), "Composição trimestral");
assert.equal(Periodicity.competenceLabel(indicador18, { ano: 2026, mes: 6 }), "2TRI/2026");

const indicador21 = { id: 21, periodicidade: "Não especificada" };
assert.equal(Periodicity.isExpectedCompetence(indicador21, "2026-04"), true);
assert.equal(Periodicity.isExpectedCompetence(indicador21, "2026-05"), true);
assert.equal(Periodicity.isExpectedCompetence(indicador21, "2026-06"), true);

const indicador01 = { id: 1, periodicidade: "Trimestral" };
assert.deepEqual(Periodicity.trackingMonths(indicador01), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
assert.equal(Periodicity.isExpectedCompetence(indicador01, "2026-01"), false);
assert.equal(Periodicity.isExpectedCompetence(indicador01, "2026-02"), false);
assert.equal(Periodicity.isExpectedCompetence(indicador01, "2026-03"), true);

const indicador03 = { id: 3, periodicidade: "Mensal", permiteAcompanhamentoMensal: true };
const regra03 = {
  exigeEvidencia: true,
  exigeEvidenciaNosFechamentos: true,
  parametrosCalculo: { mesesFechamentoTrimestral: [3, 6, 9, 12] }
};
assert.deepEqual(Periodicity.closingMonths(indicador03, regra03), [3, 6, 9, 12]);
for (const month of [1, 2, 4, 5, 7, 8, 10, 11]) {
  assert.equal(Periodicity.isClosingCompetence(indicador03, regra03, { ano: 2026, mes: month }), false);
  assert.equal(Periodicity.requiresEvidence(indicador03, regra03, { ano: 2026, mes: month }), false);
}
for (const month of [3, 6, 9, 12]) {
  assert.equal(Periodicity.isClosingCompetence(indicador03, regra03, { ano: 2026, mes: month }), true);
  assert.equal(Periodicity.requiresEvidence(indicador03, regra03, { ano: 2026, mes: month }), true);
}
assert.equal(Periodicity.requiresEvidence(indicador18, { exigeEvidencia: true }, { mes: 4 }), true, "regras antigas continuam exigindo evidência em todas as competências");
assert.equal(Periodicity.requiresEvidence(indicador03, {
  exigeEvidencia: true,
  parametrosCalculo: { mesesFechamentoTrimestral: [3, 6, 9, 12] }
}, { mes: 1 }), false, "configuração persistida anterior do Indicador 03 deve receber o escopo trimestral sem DML");
assert.equal(Periodicity.requiresEvidence(indicador03, { exigeEvidencia: false }, { mes: 3 }), false);

console.log("Testes do helper de periodicidade OK");
