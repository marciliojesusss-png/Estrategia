const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const launchesView = read("views/frontend/lancamentos.php");
const approvalsView = read("views/frontend/homologacao.php");
const launches = read("public/assets/js/launches.js");
const approvals = read("public/assets/js/approvals.js");
const styles = read("public/assets/css/styles.css");

assert.match(launchesView, /id="launchObservacaoArea" class="area-observation-field" rows="8"/);
assert.match(approvalsView, /id="approvalObservacaoArea" class="area-observation-field" rows="8"/);
assert.match(styles, /\.area-observation-field\s*\{[\s\S]*min-height:\s*180px;[\s\S]*overflow-y:\s*hidden;[\s\S]*resize:\s*vertical;/);
assert.match(
  styles,
  /\.area-observation-field\[readonly\],\s*\.area-observation-field:disabled\s*\{[\s\S]*color:\s*#ffffff;[\s\S]*opacity:\s*1;[\s\S]*-webkit-text-fill-color:\s*#ffffff;/,
  "Observações bloqueadas devem manter texto branco e contraste integral",
);

for (const [name, source] of [["Lançamentos", launches], ["Homologação", approvals]]) {
  assert.match(source, /function resizeAreaObservation\(field\)/, `${name} deve possuir expansão automática`);
  assert.match(source, /Math\.max\(field\.scrollHeight, 180\)/, `${name} deve respeitar a altura mínima`);
}
assert.match(launches, /launchObservacaoArea[\s\S]*addEventListener\("input"/, "Lançamentos deve expandir durante a digitação");

assert.equal(read("assets/css/styles.css"), styles, "Os espelhos de styles.css devem permanecer idênticos");
assert.equal(read("assets/js/launches.js"), launches, "Os espelhos de launches.js devem permanecer idênticos");
assert.equal(read("assets/js/approvals.js"), approvals, "Os espelhos de approvals.js devem permanecer idênticos");

console.log("area-observation-height.test.js: OK");
