const assert = require("node:assert/strict");
const currency = require("../assets/js/currency.js");

assert.equal(currency.parseMoedaBR("411.428.638,26"), 411428638.26);
assert.equal(currency.parseMoedaBR("R$ 411.428.638,26"), 411428638.26);
assert.equal(currency.parseMoedaBR("625.000.000,00"), 625000000);
assert.equal(currency.parseMoedaBR(359270143.4), 359270143.4);
assert.equal(currency.parseMoedaBR("359270143.40"), 359270143.4);
assert.equal(currency.parseMoedaBR(""), null);
assert.equal(currency.parseMoedaBR("inválido"), null);
assert.equal(currency.formatarMoedaBR(411428638.26), "R$ 411.428.638,26");
assert.equal(currency.formatarMoedaBR("359.270.143,40"), "R$ 359.270.143,40");

console.log("Testes de moeda brasileira OK");
