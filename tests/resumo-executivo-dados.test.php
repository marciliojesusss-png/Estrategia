<?php
declare(strict_types=1);

putenv('APP_ENV=local');
putenv('DB_CONNECTION=sqlsrv');
require_once __DIR__ . '/../app/bootstrap.php';
require_once __DIR__ . '/../app/core/Database.php';
require_once __DIR__ . '/../app/services/ResumoExecutivoDadosService.php';

function resumo_dados_ok($condition, $message)
{
    if (!$condition) throw new RuntimeException('FALHA: ' . $message);
}

$db = Database::getConnection();
$service = new ResumoExecutivoDadosService($db);
$reflection = new ReflectionClass($service);
$sqlMethod = $reflection->getMethod('governancaHomologacaoAtualSql');
$sqlMethod->setAccessible(true);

$productionSql = $sqlMethod->invoke($service);
resumo_dados_ok(strpos($productionSql, 'l.versao_atual') !== false, 'consulta deve usar versao_atual');
resumo_dados_ok(strpos($productionSql, 'l.versao AS') === false, 'consulta nao pode usar a coluna inexistente versao');

$fixtureSql = $sqlMethod->invoke(
    $service,
    'lancamentos_fixture',
    'auditoria_fixture',
    'homologacoes_fixture',
    'retificacoes_fixture'
);
$fixtureQuery = <<<'SQL'
WITH lancamentos_fixture(id,status,versao_atual) AS (
    SELECT * FROM (VALUES
      (N'moderna_valida',N'Homologado',2),
      (N'versao_divergente',N'Homologado',2),
      (N'legada_valida',N'Homologado',1),
      (N'registro_generico',N'Homologado',1),
      (N'reaberta_depois',N'Homologado',1),
      (N'retificada_depois',N'Homologado',2),
      (N'status_isolado',N'Homologado',1)
    ) v(id,status,versao_atual)
),
auditoria_fixture(id,entidade,entidade_id,acao,dados_novos_json,data_acao,created_at) AS (
    SELECT * FROM (VALUES
      (N'a1',N'homologacoes',N'moderna_valida',N'homologacao_lancamento',N'{"lancamento":{"versaoAtual":2}}',N'2026-01-01T10:00:00-03:00',N'2026-01-01T10:00:00-03:00'),
      (N'a2',N'homologacoes',N'versao_divergente',N'homologacao_lancamento',N'{"lancamento":{"versaoAtual":1}}',N'2026-01-01T10:00:00-03:00',N'2026-01-01T10:00:00-03:00'),
      (N'a3',N'homologacoes',N'legada_valida',N'homologacao_lancamento',N'{"lancamento":{"status":"Homologado"}}',N'2026-01-01T10:00:00-03:00',N'2026-01-01T10:00:00-03:00'),
      (N'a4',N'homologacoes',N'registro_generico',N'registro',N'{"lancamento":{"status":"Homologado"}}',N'2026-01-01T10:00:00-03:00',N'2026-01-01T10:00:00-03:00'),
      (N'a5',N'homologacoes',N'reaberta_depois',N'homologacao_lancamento',N'{"lancamento":{"status":"Homologado"}}',N'2026-01-01T10:00:00-03:00',N'2026-01-01T10:00:00-03:00'),
      (N'a6',N'homologacoes',N'retificada_depois',N'homologacao_lancamento',N'{"lancamento":{"versaoAtual":1}}',N'2026-01-01T10:00:00-03:00',N'2026-01-01T10:00:00-03:00')
    ) v(id,entidade,entidade_id,acao,dados_novos_json,data_acao,created_at)
),
homologacoes_fixture(id,lancamento_id,acao,status_novo,data_acao,created_at) AS (
    SELECT * FROM (VALUES
      (N'h1',N'moderna_valida',N'homologacao_lancamento',N'Homologado',N'2026-01-01T10:00:00-03:00',N'2026-01-01T10:00:00-03:00'),
      (N'h2',N'versao_divergente',N'homologacao_lancamento',N'Homologado',N'2026-01-01T10:00:00-03:00',N'2026-01-01T10:00:00-03:00'),
      (N'h3',N'legada_valida',N'homologacao_lancamento',N'Homologado',N'2026-01-01T10:00:00-03:00',N'2026-01-01T10:00:00-03:00'),
      (N'h4',N'registro_generico',N'registro',NULL,N'2026-01-01T10:00:00-03:00',N'2026-01-01T10:00:00-03:00'),
      (N'h5',N'reaberta_depois',N'homologacao_lancamento',N'Homologado',N'2026-01-01T10:00:00-03:00',N'2026-01-01T10:00:00-03:00'),
      (N'h6',N'reaberta_depois',N'lancamento_reaberto',N'Reaberto',N'2026-01-02T10:00:00-03:00',N'2026-01-02T10:00:00-03:00'),
      (N'h7',N'retificada_depois',N'homologacao_lancamento',N'Homologado',N'2026-01-01T10:00:00-03:00',N'2026-01-01T10:00:00-03:00')
    ) v(id,lancamento_id,acao,status_novo,data_acao,created_at)
),
retificacoes_fixture(id,lancamento_id,versao_anterior,versao_nova) AS (
    SELECT * FROM (VALUES
      (N'r1',N'retificada_depois',1,2)
    ) v(id,lancamento_id,versao_anterior,versao_nova)
)
SQL;
$fixtureRows = $db->query($fixtureQuery . PHP_EOL . $fixtureSql)->fetchAll();
$fixtureIds = array_map('strval', array_column($fixtureRows, 'lancamento_id'));
sort($fixtureIds);
resumo_dados_ok($fixtureIds === array('legada_valida', 'moderna_valida'), 'somente homologacoes moderna e legada validas devem ser aceitas');

$data = $service->dados(array('ativo' => true));
resumo_dados_ok(count($data['indicadores']) === 23, 'servico deve retornar 23 indicadores');
resumo_dados_ok(count($data['lancamentos']) === 276, 'servico deve retornar 276 lancamentos');
resumo_dados_ok(count($data['regrasIndicadores']) === 23, 'servico deve retornar 23 regras');
resumo_dados_ok(count($data['prazos']) === 2, 'servico deve retornar 2 prazos');
resumo_dados_ok($data['fonte']['driver'] === 'sqlsrv', 'fonte deve usar driver sqlsrv');

$launchesById = array();
foreach ($data['lancamentos'] as $launch) {
    $launchesById[(string)$launch['id']] = $launch;
}

$governancePairs = array();
foreach ($data['governancaHomologacaoAtual'] as $position) {
    $launchId = isset($position['lancamentoId']) ? trim((string)$position['lancamentoId']) : '';
    $version = isset($position['versao']) ? $position['versao'] : null;
    resumo_dados_ok($launchId !== '', 'governanca corrente deve informar lancamentoId valido');
    resumo_dados_ok(is_int($version) && $version >= 1, 'governanca corrente deve informar versao valida');
    resumo_dados_ok(isset($launchesById[$launchId]), 'governanca corrente deve apontar para lancamento existente');
    resumo_dados_ok($launchesById[$launchId]['status'] === 'Homologado', 'governanca corrente deve apontar para lancamento homologado');
    resumo_dados_ok((int)$launchesById[$launchId]['versaoAtual'] === $version, 'governanca corrente deve corresponder a versao atual');
    $pair = $launchId . ':' . $version;
    resumo_dados_ok(!isset($governancePairs[$pair]), 'governanca corrente nao deve duplicar lancamento e versao');
    $governancePairs[$pair] = true;
}

resumo_dados_ok(isset($launchesById['27']), 'lancamento 27 deve existir');
$launch27 = $launchesById['27'];
resumo_dados_ok((string)$launch27['indicadorId'] === '3', 'lancamento 27 deve pertencer ao Indicador 03');
resumo_dados_ok($launch27['competencia'] === '2026-03', 'lancamento 27 deve representar MAR/2026');
resumo_dados_ok($launch27['status'] === 'Homologado', 'lancamento 27 deve permanecer homologado');
resumo_dados_ok((int)$launch27['versaoAtual'] === 2, 'lancamento 27 deve permanecer na versao 2');
resumo_dados_ok(isset($governancePairs['27:2']), 'inclui homologacao corrente da versao atual do lancamento 27');

resumo_dados_ok(isset($launchesById['152']), 'lancamento 152 deve existir');
$launch152 = $launchesById['152'];
resumo_dados_ok((string)$launch152['indicadorId'] === '13', 'lancamento 152 deve pertencer ao Indicador 13');
resumo_dados_ok($launch152['competencia'] === '2026-08', 'lancamento 152 deve representar AGO/2026');
resumo_dados_ok($launch152['status'] === 'Retificado', 'lancamento 152 deve permanecer retificado');
resumo_dados_ok((int)$launch152['versaoAtual'] === 2, 'lancamento 152 deve permanecer na versao 2');
resumo_dados_ok(!isset($governancePairs['152:2']), 'exclui homologacao historica do lancamento 152 apos retificacao');

$governedIds = array_map('strval', array_column($data['governancaHomologacaoAtual'], 'lancamentoId'));
foreach (array('1','2','3','6','9','12') as $indicator01LaunchId) {
    resumo_dados_ok(!in_array($indicator01LaunchId, $governedIds, true), 'Indicador 01 nao pode ganhar posicao oficial pelo lancamento ' . $indicator01LaunchId);
}

echo 'Resumo Executivo: governanca corrente validada por lancamento, versao e invariantes transacionais.' . PHP_EOL;
