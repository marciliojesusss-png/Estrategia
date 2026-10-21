<?php
declare(strict_types=1);

function versioning_ok($condition, $message)
{
    if (!$condition) {
        fwrite(STDERR, 'FALHA: ' . $message . PHP_EOL);
        exit(1);
    }
}

function versioning_read($path)
{
    return file_get_contents(__DIR__ . '/../' . $path);
}

$migration = versioning_read('database/sqlserver/migrations/20261020_002_versionamento_evidencias.sql');
$schema = versioning_read('database/sqlserver/schema.sql');
$launchRepository = versioning_read('app/repositories/LancamentosRepository.php');
$evidenceRepository = versioning_read('app/repositories/EvidenciasRepository.php');
$evidenceService = versioning_read('app/services/EvidenciaService.php');
$launchService = versioning_read('app/services/LancamentoService.php');
$databaseService = versioning_read('app/services/BaseDadosService.php');
$approvalService = versioning_read('app/services/HomologacaoService.php');

versioning_ok(strpos($schema, 'versao_atual INT NOT NULL') !== false, 'schema deve criar versao_atual obrigatoria');
versioning_ok(strpos($schema, 'versao_lancamento INT NOT NULL') !== false, 'schema deve criar versao_lancamento obrigatoria');
versioning_ok(strpos($schema, 'versao_anterior INT NULL') !== false && strpos($schema, 'versao_nova INT NULL') !== false, 'schema deve versionar retificacoes');
versioning_ok(strpos($migration, 'BEGIN TRANSACTION') !== false && strpos($migration, 'ROLLBACK TRANSACTION') !== false, 'migration deve ser transacional');
versioning_ok(strpos($migration, "DB_NAME() <> N'Estrategia'") !== false, 'migration deve proteger o banco alvo');
versioning_ok(strpos($migration, 'ck_lancamentos_versao_atual') !== false && strpos($migration, 'ck_evidencias_versao_lancamento') !== false, 'migration deve criar checks de versao minima');
versioning_ok(strpos($migration, 'idx_evidencias_lancamento_versao') !== false, 'migration deve criar indice versionado');
versioning_ok(stripos($migration, 'DELETE FROM dbo.evidencias') === false, 'migration nao pode apagar evidencias');
versioning_ok(strpos($migration, "id=N'152'") !== false && strpos($migration, 'versao_atual=1') !== false, 'migration deve proteger o caso 152');
versioning_ok(strpos($migration, '#reaberturas') !== false && strpos($migration, "N'auditoria'") !== false, 'migration deve reconciliar reabertura legada do caso 39');

versioning_ok(strpos($launchRepository, 'versao_atual=versao_atual+1,evidencia_id=NULL') !== false, 'reabertura deve incrementar versao e limpar ponteiro legado');
versioning_ok(strpos($launchService, 'reopenWithNextVersion') !== false, 'servico deve usar reabertura versionada');
versioning_ok(strpos($launchService, "'versaoAnterior'=>\$previousVersion") !== false && strpos($launchService, "'versaoNova'=>\$newVersion") !== false, 'auditoria deve registrar as duas versoes');
versioning_ok(strpos($evidenceRepository, 'e.versao_lancamento=l.versao_atual') !== false, 'consulta produtiva deve filtrar versao atual');
versioning_ok(strpos($evidenceRepository, 'e.versao_lancamento<l.versao_atual') !== false, 'repositorio deve expor historico separado');
versioning_ok(strpos($evidenceRepository, 'versao_lancamento') !== false && strpos($evidenceService, "'versao_lancamento'=>\$version") !== false, 'upload deve gravar versao atual');
versioning_ok(strpos($evidenceService, 'findForUpdate($launchId)') !== false, 'upload deve bloquear lancamento contra corrida de versao');
versioning_ok(substr_count($evidenceService, 'Evidencia historica nao pode ser removida.') === 2, 'remocao historica deve ser bloqueada antes e dentro da transacao');
versioning_ok(strpos($evidenceService, 'public function download') !== false && strpos($evidenceService, 'historicalByLaunch') !== false, 'historico deve continuar consultavel e baixavel');
versioning_ok(strpos($launchService, 'hasCurrent($id)') !== false, 'LancamentoService deve validar somente evidencia atual');
versioning_ok(strpos($databaseService, 'hasCurrent($id)') !== false, 'BaseDadosService deve validar somente evidencia atual');
versioning_ok(strpos($approvalService, "'evidenciasHistoricas'=>\$historicalEvidences") !== false, 'homologacao deve separar evidencia atual e historica');

$isCurrent = function ($launchVersion, $evidenceVersion) {
    return (int)$launchVersion === (int)$evidenceVersion;
};
versioning_ok($isCurrent(1, 1), 'evidencia v1 deve satisfazer lancamento v1');
versioning_ok(!$isCurrent(2, 1), 'evidencia v1 nao deve satisfazer lancamento v2');
versioning_ok($isCurrent(2, 2), 'evidencia v2 deve satisfazer lancamento v2');
versioning_ok(!$isCurrent(3, 1) && !$isCurrent(3, 2), 'evidencias v1/v2 devem ser historicas na v3');

echo 'Versionamento estrutural de evidencias OK' . PHP_EOL;
