const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const dataStore = fs.readFileSync(path.join(root, 'assets', 'js', 'dataStore.js'), 'utf8');
assert.doesNotMatch(dataStore, /pathname\?\.endsWith\("\.php"\)/);
assert.match(dataStore, /Boolean\(window\.CAIXA_LOTERIAS_AUTH_USER\)/);

const summary = fs.readFileSync(path.join(root, 'views', 'legacy', 'resumo-executivo.php'), 'utf8');
assert.match(summary, /\/assets\/vendor\/chart\.umd\.min\.js/);
assert.doesNotMatch(summary, /cdn\.jsdelivr\.net/);

function hash(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
for (const directory of ['css', 'js', 'img', 'vendor']) {
  const source = path.join(root, 'assets', directory);
  if (!fs.existsSync(source)) continue;
  for (const name of fs.readdirSync(source)) {
    const sourceFile = path.join(source, name);
    if (!fs.statSync(sourceFile).isFile()) continue;
    const publicFile = path.join(root, 'public', 'assets', directory, name);
    assert.equal(fs.existsSync(publicFile), true, `asset publico ausente: ${directory}/${name}`);
    assert.equal(hash(sourceFile), hash(publicFile), `asset dessincronizado: ${directory}/${name}`);
  }
}

console.log('Testes de rotas backend e assets OK');
