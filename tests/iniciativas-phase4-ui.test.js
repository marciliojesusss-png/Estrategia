const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const js = read('assets/js/iniciativas.js');
const view = read('views/frontend/iniciativas.php');
const approval = read('views/frontend/iniciativas-homologacao.php');
const consolidation = read('views/frontend/iniciativas-consolidacao.php');
const css = read('assets/css/styles.css');
const routes = read('public/index.php');
const masterPage = read('public/iniciativas.php');
const approvalPage = read('public/iniciativas-homologacao.php');
const consolidationPage = read('public/iniciativas-consolidacao.php');

assert(js.includes('itemEditor("MARCO_ENTREGA"'), 'MARCO_ENTREGA deve ter editor explícito');
assert(js.includes('itemEditor("PROXIMO_PASSO"'), 'PROXIMO_PASSO deve ter editor explícito');
assert(js.includes('itemEditor("FRENTE_PROJETO"'), 'FRENTE_PROJETO deve ter editor explícito');
assert(js.includes('move-item-up') && js.includes('move-item-down'), 'ordenação explícita deve existir');
assert(js.includes('row.dataset.id||""'), 'edição deve reenviar identificadores persistidos');
assert(js.includes('textContent') && !js.includes('innerHTML') && !js.includes('insertAdjacentHTML'), 'conteúdo deve ser renderizado como texto contra XSS');
assert(js.includes('applyTabAccess') && js.includes('Auth.canAccess("iniciativasConsolidacao"'), 'abas devem respeitar o perfil na UI');
assert(js.includes('disabled=!podeEditar') && js.includes('hidden=!podeEditar'), 'controles devem refletir a política retornada pelo backend');
for (const code of ['NAO_INICIADA','EM_ANDAMENTO','CONCLUIDA','SUSPENSA','CANCELADA']) assert(js.includes(code), `status ${code} deve possuir apresentação amigável`);

assert(view.includes('id="trackingSnapshot"') && !view.match(/id="trackingSnapshot"[^]*?<input[^>]+snapshot/i), 'snapshots não podem ser campos editáveis');
assert(approval.includes('Andamento da Unidade') && approval.includes('Histórico'), 'homologação deve separar origem e histórico');
assert(consolidation.includes('Andamento homologado da Unidade') && consolidation.includes('Síntese Executiva'), 'consolidação deve separar texto da Unidade e síntese CA');
assert(css.includes('.table-wrap') && css.includes('overflow'), 'tabelas devem preservar layout com conteúdo longo');
assert(css.includes('.preserve-lines'), 'textos longos devem preservar quebras');

assert(masterPage.includes("requirePagePermission('iniciativas','visualizar')"), 'página principal deve validar permissão no servidor');
assert(approvalPage.includes("requirePagePermission('iniciativas','decidir')"), 'página de homologação deve validar permissão no servidor');
assert(consolidationPage.includes("requirePagePermission('iniciativas','consolidar')"), 'página de consolidação deve validar permissão no servidor');
assert(!routes.includes("$router->put('/api/iniciativas") && !routes.includes("$router->delete('/api/iniciativas"), 'fluxos críticos não devem depender de PUT/DELETE');

for (const pair of [
  ['assets/js/app.js','public/assets/js/app.js'],
  ['assets/js/auth.js','public/assets/js/auth.js'],
  ['assets/js/iniciativas.js','public/assets/js/iniciativas.js'],
  ['assets/css/styles.css','public/assets/css/styles.css'],
]) assert.strictEqual(read(pair[0]), read(pair[1]), `${pair[0]} deve ser byte a byte idêntico ao duplicado público`);

console.log('FASE4_UI itens=3 xss=OK perfis=OK snapshots=readonly assets=identicos');
