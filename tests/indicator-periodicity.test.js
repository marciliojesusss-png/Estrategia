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

console.log("Testes do helper de periodicidade OK");
