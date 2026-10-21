<?php
declare(strict_types=1);

putenv('APP_ENV=local');
putenv('DB_CONNECTION=sqlsrv');
require_once __DIR__ . '/../app/bootstrap.php';
require_once __DIR__ . '/../app/core/Database.php';
require_once __DIR__ . '/../app/repositories/LancamentosRepository.php';
require_once __DIR__ . '/../app/repositories/EvidenciasRepository.php';

function evidence_db_ok($condition, $message)
{
    if (!$condition) throw new RuntimeException('FALHA: ' . $message);
}

$db = Database::getConnection();
$launches = new LancamentosRepository($db);
$evidences = new EvidenciasRepository($db);

$launch152 = $launches->find('152');
evidence_db_ok($launch152 !== null, 'lancamento 152 deve existir');
evidence_db_ok($launch152['status'] === 'Homologado', 'lancamento 152 deve continuar homologado');
evidence_db_ok($launch152['versaoAtual'] === 1, 'lancamento 152 deve permanecer na versao 1');
evidence_db_ok((int)$launch152['camposEntrada']['mulheresGestorasMes'] === 15, 'lancamento 152 deve preservar 15 mulheres');
evidence_db_ok((int)$launch152['camposEntrada']['totalGestoresMes'] === 30, 'lancamento 152 deve preservar 30 gestores');

$current152 = $evidences->byLaunch('152');
evidence_db_ok(count($current152) === 1, 'lancamento 152 deve ter uma evidencia atual');
evidence_db_ok((int)$current152[0]['versao_lancamento'] === 1, 'evidencia do lancamento 152 deve estar na versao 1');
evidence_db_ok($current152[0]['nome_arquivo'] === 'PEI_PN_31_08_ (1).xlsx', 'nome da evidencia 152 deve ser preservado');
evidence_db_ok(count($evidences->historicalByLaunch('152')) === 0, 'lancamento 152 ainda nao deve ter evidencia historica');

$launch39 = $launches->find('39');
evidence_db_ok($launch39 !== null && $launch39['versaoAtual'] === 2, 'reabertura legada do lancamento 39 deve resultar na versao 2');
evidence_db_ok(count($evidences->allByLaunch('39')) === 0, 'lancamento 39 deve continuar sem evidencia');

evidence_db_ok((int)$db->query('SELECT COUNT(*) FROM dbo.evidencias')->fetchColumn() === 55, 'nenhuma evidencia pode ser criada ou apagada');
evidence_db_ok((int)$db->query('SELECT COUNT(*) FROM dbo.homologacoes')->fetchColumn() === 57, 'homologacoes devem permanecer intactas');
evidence_db_ok((int)$db->query('SELECT COUNT(*) FROM dbo.retificacoes')->fetchColumn() === 0, 'migration nao pode criar retificacao produtiva');

echo 'Banco versionado: casos 39 e 152 validados' . PHP_EOL;
