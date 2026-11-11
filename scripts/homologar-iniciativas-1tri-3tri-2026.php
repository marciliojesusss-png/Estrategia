<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/config/config.php';
require_once __DIR__ . '/../app/core/database/SqlsrvConnectionAdapter.php';
require_once __DIR__ . '/../app/repositories/IniciativasAcompanhamentosRepository.php';
require_once __DIR__ . '/../app/repositories/IniciativasHomologacoesRepository.php';
require_once __DIR__ . '/../app/repositories/ConfiguracoesRepository.php';
require_once __DIR__ . '/../app/repositories/AuditoriaRepository.php';
require_once __DIR__ . '/../app/services/IniciativaStateMachine.php';
require_once __DIR__ . '/../app/services/GovernancaHomologacao.php';

set_exception_handler(static function (Throwable $error): void {
    fwrite(STDERR, get_class($error) . ': ' . $error->getMessage() . PHP_EOL);
    exit(1);
});

const INITIATIVE_HOMOLOGATION_YEAR = 2026;
const INITIATIVE_HOMOLOGATION_ACTOR = 'C118119';
const INITIATIVE_EXPECTED_TARGETS = 27;
const INITIATIVE_EXPECTED_MASTERS = 9;
const INITIATIVE_APPLY_CONFIRMATION = 'HOMOLOGAR-INICIATIVAS-27';

function initiativeArgumentValue(array $arguments, string $name, ?string $default = null): ?string
{
    $prefix = '--' . $name . '=';
    foreach ($arguments as $argument) {
        if (strpos($argument, $prefix) === 0) return substr($argument, strlen($prefix));
    }
    return $default;
}

function initiativeConnectDatabase(string $database)
{
    if (!function_exists('sqlsrv_connect')) throw new RuntimeException('Extensao sqlsrv indisponivel.');
    if (function_exists('sqlsrv_configure')) {
        sqlsrv_configure('WarningsReturnAsErrors', 0);
    }
    $server = SQLSERVER_HOST . (SQLSERVER_PORT !== '' ? ',' . SQLSERVER_PORT : '');
    $options = array('Database' => $database, 'CharacterSet' => 'UTF-8');
    if (SQLSERVER_USER !== '' || DB_AUTH_MODE === 'sql') {
        $options['UID'] = SQLSERVER_USER;
        $options['PWD'] = SQLSERVER_PASSWORD;
    }
    if (SQLSERVER_ENCRYPT !== '') {
        $options['Encrypt'] = filter_var(SQLSERVER_ENCRYPT, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false;
    }
    if (SQLSERVER_TRUST_SERVER_CERTIFICATE !== '') {
        $options['TrustServerCertificate'] = filter_var(
            SQLSERVER_TRUST_SERVER_CERTIFICATE,
            FILTER_VALIDATE_BOOLEAN,
            FILTER_NULL_ON_FAILURE
        ) ?? false;
    }
    $connection = sqlsrv_connect($server, $options);
    if ($connection === false) throw new RuntimeException('Falha ao conectar ao banco solicitado.');
    return new SqlsrvConnectionAdapter($connection);
}

function initiativeApplicationUser($db, string $registration): array
{
    $stmt = $db->prepare(
        'SELECT TOP 1 matricula,nome,perfil,unidade_apuradora,diretoria_responsavel,ativo '
        . 'FROM dbo.usuarios_acesso WHERE UPPER(matricula)=UPPER(:matricula)'
    );
    $stmt->execute(array(':matricula' => $registration));
    $row = $stmt->fetch();
    if (!$row || empty($row['ativo'])) throw new RuntimeException('Administrador C118119 ausente ou inativo.');
    $profile = GovernancaHomologacao::normalizeProfile($row['perfil'] ?? '');
    if ($profile !== 'administrador') throw new RuntimeException('C118119 nao possui perfil administrador.');
    return array(
        'matricula' => strtoupper((string) $row['matricula']),
        'nome' => (string) ($row['nome'] ?? ''),
        'perfil' => 'administrador',
        'perfil_original' => 'administrador',
        'unidade_apuradora' => $row['unidade_apuradora'] ?? null,
        'diretoria_responsavel' => $row['diretoria_responsavel'] ?? null,
    );
}

function initiativeSqlLiteral(string $value): string
{
    return str_replace("'", "''", $value);
}

function initiativeCreateAndVerifyBackup($db, string $database): array
{
    $directory = trim((string) $db->query(
        "SELECT CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS nvarchar(4000))"
    )->fetchColumn());
    if ($directory === '') {
        $dataFile = trim((string) $db->query(
            "SELECT TOP 1 physical_name FROM sys.database_files WHERE type=0 ORDER BY file_id"
        )->fetchColumn());
        if ($dataFile === '') {
            throw new RuntimeException('Nao foi possivel identificar o diretorio nativo de backup do SQL Server.');
        }
        $directory = dirname(dirname($dataFile)) . DIRECTORY_SEPARATOR . 'Backup';
    }
    $filename = sprintf(
        '%s_PRE_HOMOLOGACAO_INICIATIVAS_%s.bak',
        $database,
        date('Ymd_His')
    );
    $path = rtrim($directory, "\\/") . DIRECTORY_SEPARATOR . $filename;
    $escapedPath = initiativeSqlLiteral($path);
    $escapedName = initiativeSqlLiteral($database . ' antes da homologacao das iniciativas 1TRI-3TRI/2026');
    $db->exec(
        'BACKUP DATABASE [' . $database . '] TO DISK=N\'' . $escapedPath
        . '\' WITH COPY_ONLY, CHECKSUM, INIT, NAME=N\'' . $escapedName . '\''
    );
    $db->exec('RESTORE VERIFYONLY FROM DISK=N\'' . $escapedPath . '\' WITH CHECKSUM');
    return array('arquivo' => $path, 'verificado' => true);
}

function initiativeTargetIds($db): array
{
    $stmt = $db->query(
        "SELECT a.id FROM dbo.iniciativas_acompanhamentos a "
        . "INNER JOIN dbo.iniciativas_estrategicas i ON i.id=a.iniciativa_id "
        . "WHERE i.ativo=1 AND a.ano=2026 AND a.trimestre IN (N'1TRI',N'2TRI',N'3TRI') "
        . "ORDER BY i.codigo,CASE a.trimestre WHEN N'1TRI' THEN 1 WHEN N'2TRI' THEN 2 ELSE 3 END"
    );
    return array_map(static function (array $row): string {
        return (string) $row['id'];
    }, $stmt->fetchAll());
}

function initiativePreflight(
    array $ids,
    IniciativasAcompanhamentosRepository $records,
    IniciativasHomologacoesRepository $homologations,
    ConfiguracoesRepository $configurations,
    array $actor
): array {
    $closures = $configurations->get(GovernancaHomologacao::CLOSURES_KEY, array());
    $targets = array();
    $blocked = array();
    $initiativeIds = array();
    foreach ($ids as $id) {
        $record = $records->find($id);
        if (!$record) {
            $blocked[] = array('id' => $id, 'motivo' => 'acompanhamento_ausente');
            continue;
        }
        $initiativeIds[(string) $record['iniciativaId']] = true;
        try {
            IniciativaStateMachine::assertTransition(
                $record['statusFluxo'],
                IniciativaStateMachine::HOMOLOGATED
            );
            $exceptional = $homologations->exceptionalCycleActive($id);
            GovernancaHomologacao::assertInitiativeMutable($record, $closures, $exceptional);
            GovernancaHomologacao::assertIndependentInitiativeReviewer(
                $record,
                $homologations->latestSubmissionUser($id),
                $actor,
                $homologations->participantUsers($id, GovernancaHomologacao::initiativeProductionActions())
            );
            if (trim((string) ($record['statusIniciativa'] ?? '')) === '') {
                throw new DomainException('Status da iniciativa ausente.');
            }
            if (trim((string) ($record['andamentoUnidade'] ?? '')) === '') {
                throw new DomainException('Andamento da unidade ausente.');
            }
            if (trim((string) ($record['referenciaEvidencia'] ?? '')) === '') {
                throw new DomainException('Referencia documental ausente.');
            }
            $targets[] = $record;
        } catch (Throwable $error) {
            $blocked[] = array(
                'id' => $id,
                'codigo' => $record['codigo'],
                'competencia' => $record['competencia'],
                'status' => $record['statusFluxo'],
                'motivo' => $error->getMessage(),
            );
        }
    }
    return array(
        'targets' => $targets,
        'blocked' => $blocked,
        'initiativeCount' => count($initiativeIds),
    );
}

$arguments = array_slice($argv, 1);
$dryRun = in_array('--dry-run', $arguments, true);
$apply = in_array('--apply', $arguments, true);
$database = (string) initiativeArgumentValue($arguments, 'database', 'Estrategia');
$confirmation = (string) initiativeArgumentValue($arguments, 'confirm', '');

if ($database !== 'Estrategia') throw new RuntimeException('Este procedimento aceita apenas o banco Estrategia.');
if ($dryRun === $apply) {
    fwrite(STDERR, "Uso: php scripts/homologar-iniciativas-1tri-3tri-2026.php --database=Estrategia --dry-run\n");
    fwrite(STDERR, "  ou: php scripts/homologar-iniciativas-1tri-3tri-2026.php --database=Estrategia --apply --confirm=HOMOLOGAR-INICIATIVAS-27\n");
    exit(2);
}
if ($apply && $confirmation !== INITIATIVE_APPLY_CONFIRMATION) {
    throw new RuntimeException('Confirmacao de aplicacao ausente ou incorreta.');
}

$db = initiativeConnectDatabase($database);
if ((string) $db->query('SELECT DB_NAME()')->fetchColumn() !== $database) {
    throw new RuntimeException('Conexao aberta em banco diferente do solicitado.');
}

$actor = initiativeApplicationUser($db, INITIATIVE_HOMOLOGATION_ACTOR);
$records = new IniciativasAcompanhamentosRepository($db);
$homologations = new IniciativasHomologacoesRepository($db);
$configurations = new ConfiguracoesRepository($db);
$audits = new AuditoriaRepository($db);
$ids = initiativeTargetIds($db);
$preflight = initiativePreflight($ids, $records, $homologations, $configurations, $actor);

$summary = array(
    'banco' => $database,
    'modo' => $dryRun ? 'dry-run' : 'apply',
    'ano' => INITIATIVE_HOMOLOGATION_YEAR,
    'trimestres' => array('1TRI', '2TRI', '3TRI'),
    'administrador' => $actor['matricula'],
    'iniciativas' => $preflight['initiativeCount'],
    'alvos' => count($preflight['targets']),
    'bloqueados' => count($preflight['blocked']),
    'detalhesBloqueados' => $preflight['blocked'],
    'idsAlvo' => array_map(static function (array $record): string {
        return (string) $record['id'];
    }, $preflight['targets']),
);

if ($apply) {
    if (count($ids) !== INITIATIVE_EXPECTED_TARGETS
        || count($preflight['targets']) !== INITIATIVE_EXPECTED_TARGETS
        || $preflight['initiativeCount'] !== INITIATIVE_EXPECTED_MASTERS
        || count($preflight['blocked']) !== 0) {
        throw new RuntimeException('Pre-condicoes divergiram do dry-run autorizado; nenhuma alteracao foi aplicada.');
    }

    $summary['backup'] = initiativeCreateAndVerifyBackup($db, $database);
    $reason = 'Homologacao administrativa em lote autorizada para os acompanhamentos de iniciativas do 1TRI ao 3TRI de 2026.';
    $decisionUser = array(
        'matricula' => $actor['matricula'],
        'perfil' => GovernancaHomologacao::profileLabel($actor['perfil']),
    );
    $closures = $configurations->get(GovernancaHomologacao::CLOSURES_KEY, array());

    $db->beginTransaction();
    try {
        foreach ($preflight['targets'] as $candidate) {
            $before = $records->findForUpdate($candidate['id']);
            if (!$before || $before['statusFluxo'] !== $candidate['statusFluxo']) {
                throw new RuntimeException('Acompanhamento mudou depois do dry-run: ' . (string) $candidate['id']);
            }
            IniciativaStateMachine::assertTransition(
                $before['statusFluxo'],
                IniciativaStateMachine::HOMOLOGATED
            );
            $exceptional = $homologations->exceptionalCycleActive($before['id']);
            GovernancaHomologacao::assertInitiativeMutable($before, $closures, $exceptional);
            GovernancaHomologacao::assertIndependentInitiativeReviewer(
                $before,
                $homologations->latestSubmissionUser($before['id']),
                $actor,
                $homologations->participantUsers(
                    $before['id'],
                    GovernancaHomologacao::initiativeProductionActions()
                )
            );
            if (!$records->updateWorkflow(
                $before['id'],
                IniciativaStateMachine::SUBMITTED,
                IniciativaStateMachine::HOMOLOGATED
            )) {
                throw new LogicException('Decisao processada por outra requisicao: ' . (string) $before['id']);
            }
            $homologations->record(
                $before['id'],
                'homologacao_iniciativa',
                IniciativaStateMachine::SUBMITTED,
                IniciativaStateMachine::HOMOLOGATED,
                $reason,
                $decisionUser
            );
            $after = $records->find($before['id']);
            $audits->append(array(
                'entidade' => 'iniciativas_acompanhamentos',
                'registroId' => $before['id'],
                'acao' => 'acompanhamento_homologado',
                'descricao' => 'Decisao administrativa de homologacao em lote das iniciativas.',
                'valorAnterior' => $before,
                'valorNovo' => array('acompanhamento' => $after, 'justificativa' => $reason),
                'usuario' => $actor['matricula'],
                'perfilUsuario' => GovernancaHomologacao::profileLabel($actor['perfil']),
            ));
        }

        $homologatedCount = (int) $db->query(
            "SELECT COUNT(*) FROM dbo.iniciativas_acompanhamentos a "
            . "INNER JOIN dbo.iniciativas_estrategicas i ON i.id=a.iniciativa_id "
            . "WHERE i.ativo=1 AND a.ano=2026 AND a.trimestre IN (N'1TRI',N'2TRI',N'3TRI') "
            . "AND a.status_fluxo=N'HOMOLOGADO'"
        )->fetchColumn();
        $decisionCount = (int) $db->query(
            "SELECT COUNT(*) FROM dbo.iniciativas_homologacoes "
            . "WHERE acao=N'homologacao_iniciativa' AND status_novo=N'HOMOLOGADO' "
            . "AND UPPER(usuario)=N'C118119'"
        )->fetchColumn();
        if ($homologatedCount !== INITIATIVE_EXPECTED_TARGETS
            || $decisionCount !== INITIATIVE_EXPECTED_TARGETS) {
            throw new RuntimeException('Verificacao transacional final divergente; operacao revertida.');
        }
        $db->commit();
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }

    $summary['aplicados'] = INITIATIVE_EXPECTED_TARGETS;
    $summary['homologadosAposAplicacao'] = INITIATIVE_EXPECTED_TARGETS;
    $summary['aguardandoAposAplicacao'] = (int) $db->query(
        "SELECT COUNT(*) FROM dbo.iniciativas_acompanhamentos "
        . "WHERE ano=2026 AND trimestre IN (N'1TRI',N'2TRI',N'3TRI') "
        . "AND status_fluxo=N'ENVIADO_HOMOLOGACAO'"
    )->fetchColumn();
}

echo json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), PHP_EOL;
