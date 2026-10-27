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
resumo_dados_ok(count($data['governancaHomologacaoAtual']) === 23, 'banco real deve ter 23 posicoes com homologacao corrente valida');

$governedIds = array_map('strval', array_column($data['governancaHomologacaoAtual'], 'lancamentoId'));
foreach (array('1','2','3','6','9','12') as $indicator01LaunchId) {
    resumo_dados_ok(!in_array($indicator01LaunchId, $governedIds, true), 'Indicador 01 nao pode ganhar posicao oficial pelo lancamento ' . $indicator01LaunchId);
}

echo 'Resumo Executivo: schema real, governanca moderna/legada e 23 posicoes correntes validadas.' . PHP_EOL;
