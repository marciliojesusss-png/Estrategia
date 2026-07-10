<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/repositories/IndicadoresRepository.php';
require_once __DIR__ . '/../app/services/IndicadorService.php';
require_once __DIR__ . '/../app/validators/IndicadorValidator.php';

function assert_indicator($condition, $message)
{
    if (!$condition) { fwrite(STDERR, 'FALHA: ' . $message . PHP_EOL); exit(1); }
}

$db = new PDO('sqlite::memory:');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$db->exec('CREATE TABLE indicadores (id TEXT PRIMARY KEY, numero INTEGER, nome TEXT NOT NULL, plano TEXT, pilar TEXT, unidade_apuradora TEXT, diretoria_responsavel TEXT, periodicidade TEXT, unidade_medida TEXT, tipo_calculo TEXT, tipo_consolidacao TEXT, meta_anual TEXT, formula_referencia TEXT, observacao_acompanhamento TEXT, ativo INTEGER DEFAULT 1, created_at TEXT, updated_at TEXT)');
$db->exec('CREATE TABLE lancamentos (id TEXT PRIMARY KEY, indicador_id TEXT NOT NULL)');
$db->exec('CREATE TABLE auditoria (id TEXT PRIMARY KEY, entidade TEXT, entidade_id TEXT, acao TEXT, descricao TEXT, dados_anteriores_json TEXT, dados_novos_json TEXT, usuario TEXT, perfil_usuario TEXT, data_acao TEXT, created_at TEXT)');

$validator = new IndicadorValidator();
$invalid = $validator->validate(array('numero' => 0, 'nome' => '', 'plano' => '', 'pilar' => ''));
assert_indicator(!$invalid['valid'] && isset($invalid['errors']['numero'], $invalid['errors']['nome']), 'validator deve retornar erros por campo');

$service = new IndicadorService($db);
$user = array('matricula' => 'C000001', 'perfil' => 'administrador');
$base = array('numero' => 10, 'nome' => 'Indicador Alfa', 'plano' => 'Plano A', 'pilar' => 'Pilar A', 'unidade_apuradora' => 'SUCOL', 'diretoria_responsavel' => 'DIFIR', 'periodicidade' => 'Mensal', 'unidade_medida' => 'percentual', 'tipo_calculo' => 'percentual_direto', 'ativo' => true);
$created = $service->create($base, $user);
assert_indicator($created['numero'] === 10 && $created['ativo'], 'service deve cadastrar indicador');
assert_indicator((int) $db->query('SELECT COUNT(*) FROM auditoria')->fetchColumn() === 1, 'cadastro deve gerar auditoria');

$second = $base; $second['numero'] = 20; $second['nome'] = 'Indicador Beta'; $second['pilar'] = 'Pilar B';
$service->create($second, $user);
$third = $base; $third['numero'] = 30; $third['nome'] = 'Indicador Gama'; $third['unidade_apuradora'] = 'GERIN';
$service->create($third, $user);

$duplicateRejected = false;
try { $service->create($base, $user); } catch (LogicException $error) { $duplicateRejected = true; }
assert_indicator($duplicateRejected, 'numero duplicado deve ser recusado');

$page = $service->listItems(array(), 1, 2);
assert_indicator(count($page['items']) === 2 && $page['pagination']['total'] === 3 && $page['pagination']['pages'] === 2, 'paginacao deve ser deterministica');
$filtered = $service->listItems(array('unidade_apuradora' => 'SUCOL', 'q' => 'Beta'), 1, 25);
assert_indicator($filtered['pagination']['total'] === 1 && $filtered['items'][0]['numero'] === 20, 'filtros e pesquisa devem combinar parametros');

$updatedInput = $base; $updatedInput['nome'] = 'Indicador Alfa Atualizado';
$updated = $service->update($created['id'], $updatedInput, $user);
assert_indicator($updated['nome'] === 'Indicador Alfa Atualizado', 'edicao deve persistir campos validados');

$db->prepare('INSERT INTO lancamentos (id, indicador_id) VALUES (:id, :indicador)')->execute(array(':id' => 'L1', ':indicador' => (string) $created['id']));
$repo = new IndicadoresRepository($db);
assert_indicator($repo->hasLaunches($created['id']), 'integridade deve detectar lancamentos associados');
$service->deactivateInsteadOfDelete($created['id'], $user);
assert_indicator((int) $db->query('SELECT COUNT(*) FROM indicadores')->fetchColumn() === 3, 'inativacao nao deve excluir fisicamente');
assert_indicator(!$service->find($created['id'])['ativo'], 'DELETE logico deve inativar indicador');
assert_indicator((int) $db->query('SELECT COUNT(*) FROM auditoria')->fetchColumn() === 5, 'todas as mutacoes devem gerar auditoria');

echo 'Testes do modulo de indicadores OK' . PHP_EOL;
