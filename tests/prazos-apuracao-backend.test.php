<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/repositories/AuditoriaRepository.php';
require_once __DIR__ . '/../app/services/PrazosApuracaoService.php';

function ok_prazo($condition, $message)
{
    if (!$condition) {
        fwrite(STDERR, 'FALHA: ' . $message . PHP_EOL);
        exit(1);
    }
}

$db = new PDO('sqlite::memory:');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$db->exec(
    'CREATE TABLE prazos_apuracao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        competencia CHAR(7) NOT NULL UNIQUE,
        data_limite_preenchimento DATE NOT NULL,
        data_limite_homologacao DATE NOT NULL,
        ativo INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NULL
    )'
);
$db->exec(
    'CREATE TABLE auditoria (
        id TEXT PRIMARY KEY,
        entidade TEXT,
        entidade_id TEXT,
        acao TEXT,
        descricao TEXT,
        dados_anteriores_json TEXT,
        dados_novos_json TEXT,
        usuario TEXT,
        perfil_usuario TEXT,
        data_acao TEXT,
        created_at TEXT
    )'
);

$service = new PrazosApuracaoService($db);
$actor = array('matricula' => 'ADMIN', 'perfil' => 'administrador');
$created = $service->create(array(
    'competencia' => '2026-08',
    'dataLimitePreenchimento' => '2026-09-05',
    'dataLimiteHomologacao' => '2026-09-09',
    'ativo' => true,
), $actor);

ok_prazo($created['competencia'] === '2026-08', 'competencia deve persistir');
ok_prazo($created['dataLimitePreenchimento'] === '2026-09-05', 'prazo de preenchimento deve persistir');
ok_prazo($created['ativo'] === true, 'prazo deve iniciar ativo');

$updated = $service->update($created['id'], array(
    'competencia' => '2026-08',
    'dataLimitePreenchimento' => '2026-09-06',
    'dataLimiteHomologacao' => '2026-09-10',
    'ativo' => false,
), $actor);
ok_prazo($updated['dataLimiteHomologacao'] === '2026-09-10', 'prazo deve ser editável');
ok_prazo($updated['ativo'] === false, 'prazo deve poder ser desativado');
ok_prazo(count($service->all()) === 1, 'edicao nao deve duplicar registros');
ok_prazo((int) $db->query("SELECT COUNT(*) FROM auditoria WHERE entidade='prazos_apuracao'")->fetchColumn() === 2, 'criacao e alteracao devem ser auditadas');

$invalidDateOrder = false;
try {
    $service->create(array(
        'competencia' => '2026-09',
        'dataLimitePreenchimento' => '2026-10-10',
        'dataLimiteHomologacao' => '2026-10-09',
    ), $actor);
} catch (DomainException $error) {
    $invalidDateOrder = true;
}
ok_prazo($invalidDateOrder, 'homologacao anterior ao preenchimento deve ser rejeitada');

$invalidCompetence = false;
try {
    $service->create(array(
        'competencia' => '2026-13',
        'dataLimitePreenchimento' => '2026-10-10',
        'dataLimiteHomologacao' => '2026-10-11',
    ), $actor);
} catch (DomainException $error) {
    $invalidCompetence = true;
}
ok_prazo($invalidCompetence, 'competencia invalida deve ser rejeitada');

echo 'Testes de backend dos prazos de apuracao OK' . PHP_EOL;

