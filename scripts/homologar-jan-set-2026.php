<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/config/config.php';
require_once __DIR__ . '/../app/core/database/SqlsrvConnectionAdapter.php';
require_once __DIR__ . '/../app/repositories/LancamentosRepository.php';
require_once __DIR__ . '/../app/repositories/IndicadoresRepository.php';
require_once __DIR__ . '/../app/repositories/ConfiguracoesRepository.php';
require_once __DIR__ . '/../app/repositories/HomologacoesRepository.php';
require_once __DIR__ . '/../app/repositories/EvidenciasRepository.php';
require_once __DIR__ . '/../app/repositories/AuditoriaRepository.php';
require_once __DIR__ . '/../app/repositories/LancamentosResultadosHomologadosRepository.php';
require_once __DIR__ . '/../app/services/LancamentoStateMachine.php';
require_once __DIR__ . '/../app/services/CompetenciaPeriodicidade.php';
require_once __DIR__ . '/../app/services/GovernancaHomologacao.php';
require_once __DIR__ . '/../app/services/CalculoIndicadoresService.php';

const HOMOLOGATION_YEAR = 2026;
const HOMOLOGATION_LAST_MONTH = 9;
const HOMOLOGATION_ACTOR = 'C118119';
const EXPECTED_TARGETS = 124;
const EXPECTED_ALREADY_APPROVED = 65;
const EXPECTED_EMPTY = 6;
const APPLY_CONFIRMATION = 'HOMOLOGAR-124';

function argumentValue(array $arguments, string $name, ?string $default = null): ?string
{
    $prefix = '--' . $name . '=';
    foreach ($arguments as $argument) {
        if (strpos($argument, $prefix) === 0) return substr($argument, strlen($prefix));
    }
    return $default;
}

function connectDatabase(string $database)
{
    if (!function_exists('sqlsrv_connect')) throw new RuntimeException('Extensao sqlsrv indisponivel.');
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

function applicationUser($db, string $registration): array
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

function emptyInput(array $launch): bool
{
    $input = $launch['camposEntrada'] ?? array();
    return !is_array($input) || count($input) === 0;
}

$arguments = array_slice($argv, 1);
$dryRun = in_array('--dry-run', $arguments, true);
$apply = in_array('--apply', $arguments, true);
$database = (string) argumentValue($arguments, 'database', 'Estrategia');
$confirmation = (string) argumentValue($arguments, 'confirm', '');

if ($dryRun === $apply) {
    fwrite(STDERR, "Uso: php scripts/homologar-jan-set-2026.php --database=Estrategia --dry-run\n");
    fwrite(STDERR, "  ou: php scripts/homologar-jan-set-2026.php --database=Estrategia --apply --confirm=HOMOLOGAR-124\n");
    exit(2);
}
if ($apply && $confirmation !== APPLY_CONFIRMATION) {
    throw new RuntimeException('Confirmacao de aplicacao ausente ou incorreta.');
}

$db = connectDatabase($database);
if ((string) $db->query('SELECT DB_NAME()')->fetchColumn() !== $database) {
    throw new RuntimeException('Conexao aberta em banco diferente do solicitado.');
}

$actor = applicationUser($db, HOMOLOGATION_ACTOR);
$launches = new LancamentosRepository($db);
$indicatorsRepository = new IndicadoresRepository($db);
$configurations = new ConfiguracoesRepository($db);
$homologations = new HomologacoesRepository($db);
$evidences = new EvidenciasRepository($db);
$audits = new AuditoriaRepository($db);
$snapshots = new LancamentosResultadosHomologadosRepository($db);
$calculator = new CalculoIndicadoresService();

$indicators = array();
foreach ($indicatorsRepository->all() as $indicator) $indicators[(string) $indicator['id']] = $indicator;
$rules = array();
foreach ($configurations->get('regrasIndicadores', array()) as $rule) {
    $rules[(string) ($rule['indicadorId'] ?? '')] = $rule;
}

$all = $launches->all();
$history = array();
foreach ($all as $launch) {
    $history[(string) $launch['indicadorId'] . ':' . (int) $launch['ano']][] = $launch;
}

$targets = array();
$alreadyApproved = array();
$empty = array();
$blocked = array();
$ignoredTracking = array();
$allowedStatuses = array(
    LancamentoStateMachine::IN_PROGRESS,
    LancamentoStateMachine::RECTIFIED,
);

foreach ($all as $launch) {
    if ((int) $launch['ano'] !== HOMOLOGATION_YEAR
        || (int) $launch['mes'] < 1
        || (int) $launch['mes'] > HOMOLOGATION_LAST_MONTH) continue;

    $indicatorId = (string) $launch['indicadorId'];
    if (!isset($indicators[$indicatorId])) {
        $blocked[] = array('id' => $launch['id'], 'motivo' => 'indicador_ausente');
        continue;
    }
    $indicator = $indicators[$indicatorId];
    if (!CompetenciaPeriodicidade::isExpected($indicator, $launch)) {
        $ignoredTracking[] = array('id' => $launch['id'], 'indicadorId' => $indicatorId, 'competencia' => $launch['competencia']);
        continue;
    }

    $status = LancamentoStateMachine::normalize($launch['status']);
    if ($status === LancamentoStateMachine::HOMOLOGATED) {
        $alreadyApproved[] = array('id' => $launch['id'], 'indicadorId' => $indicatorId, 'competencia' => $launch['competencia']);
        continue;
    }
    if ($status === LancamentoStateMachine::NOT_STARTED || emptyInput($launch)) {
        $empty[] = array('id' => $launch['id'], 'indicadorId' => $indicatorId, 'competencia' => $launch['competencia'], 'status' => $launch['status']);
        continue;
    }
    if (!in_array($status, $allowedStatuses, true)) {
        $blocked[] = array(
            'id' => $launch['id'], 'indicadorId' => $indicatorId,
            'competencia' => $launch['competencia'], 'status' => $launch['status'],
            'motivo' => 'status_nao_autorizado',
        );
        continue;
    }

    $rule = $rules[$indicatorId] ?? array();
    if (CompetenciaPeriodicidade::requiresEvidence($indicator, $rule, $launch)
        && !$evidences->hasCurrent($launch['id'])) {
        $blocked[] = array(
            'id' => $launch['id'], 'indicadorId' => $indicatorId,
            'competencia' => $launch['competencia'], 'motivo' => 'evidencia_ausente',
        );
        continue;
    }

    $validation = $calculator->validar(
        $indicator,
        $rule,
        $launch,
        $history[$indicatorId . ':' . (int) $launch['ano']] ?? array()
    );
    if (empty($validation['valido'])) {
        $blocked[] = array(
            'id' => $launch['id'], 'indicadorId' => $indicatorId,
            'competencia' => $launch['competencia'], 'motivo' => 'consistencia',
            'mensagem' => $validation['mensagem'] ?? '',
            'divergencias' => $validation['divergencias'] ?? array(),
        );
        continue;
    }

    GovernancaHomologacao::assertIndependentReviewer($launch, '', $actor, array());
    $targets[] = array('launch' => $launch, 'validation' => $validation);
}

$summary = array(
    'banco' => $database,
    'modo' => $dryRun ? 'dry-run' : 'apply',
    'ano' => HOMOLOGATION_YEAR,
    'mesInicial' => 1,
    'mesFinal' => HOMOLOGATION_LAST_MONTH,
    'administrador' => $actor['matricula'],
    'alvos' => count($targets),
    'jaHomologados' => count($alreadyApproved),
    'vaziosMantidosPendentes' => count($empty),
    'mesesAcompanhamentoIgnorados' => count($ignoredTracking),
    'bloqueados' => count($blocked),
    'detalhesVazios' => $empty,
    'detalhesBloqueados' => $blocked,
    'idsAlvo' => array_map(function ($target) { return (string) $target['launch']['id']; }, $targets),
);

if ($apply) {
    if (count($targets) !== EXPECTED_TARGETS
        || count($alreadyApproved) !== EXPECTED_ALREADY_APPROVED
        || count($empty) !== EXPECTED_EMPTY
        || count($blocked) !== 0) {
        throw new RuntimeException('Pre-condicoes divergiram do dry-run autorizado; nenhuma alteracao foi aplicada.');
    }

    $reason = 'Homologacao administrativa em lote autorizada para janeiro a setembro de 2026.';
    $db->beginTransaction();
    try {
        foreach ($targets as $target) {
            $candidate = $target['launch'];
            $before = $launches->findForUpdate($candidate['id']);
            if (!$before || $before['status'] !== $candidate['status']) {
                throw new RuntimeException('Lancamento mudou depois do dry-run: ' . (string) $candidate['id']);
            }

            if (!$launches->updateStatus($before['id'], $before['status'], LancamentoStateMachine::SUBMITTED)) {
                throw new RuntimeException('Falha no envio administrativo: ' . (string) $before['id']);
            }
            $submitted = $launches->find($before['id']);
            $homologations->recordSubmission(
                $before['id'],
                $before['status'],
                LancamentoStateMachine::SUBMITTED,
                $actor
            );
            $audits->append(array(
                'entidade' => 'lancamentos',
                'registroId' => $before['id'],
                'acao' => 'envio_para_homologacao',
                'descricao' => 'Envio administrativo em lote para homologacao, autorizado para janeiro a setembro de 2026.',
                'valorAnterior' => $before,
                'valorNovo' => $submitted,
                'usuario' => $actor['matricula'],
                'perfilUsuario' => GovernancaHomologacao::profileLabel($actor['perfil']),
            ));

            if (!$launches->updateStatus(
                $before['id'],
                LancamentoStateMachine::SUBMITTED,
                LancamentoStateMachine::HOMOLOGATED
            )) {
                throw new RuntimeException('Falha na homologacao administrativa: ' . (string) $before['id']);
            }
            $homologations->recordDecision(
                $before['id'],
                'homologacao_lancamento',
                LancamentoStateMachine::SUBMITTED,
                LancamentoStateMachine::HOMOLOGATED,
                $reason,
                array(
                    'matricula' => $actor['matricula'],
                    'perfil' => GovernancaHomologacao::profileLabel($actor['perfil']),
                )
            );
            if (!empty($target['validation']['cobertura'])) {
                $snapshots->save($calculator->snapshot($target['validation'], $before, $actor));
            }
            $approved = $launches->find($before['id']);
            $approved['observacaoDiretoria'] = $reason;
            $audits->append(array(
                'entidade' => 'homologacoes',
                'registroId' => $before['id'],
                'acao' => 'homologacao_lancamento',
                'descricao' => 'Decisao administrativa de homologacao em lote.',
                'valorAnterior' => $submitted,
                'valorNovo' => array('lancamento' => $approved, 'observacaoDiretoria' => $reason),
                'usuario' => $actor['matricula'],
                'perfilUsuario' => GovernancaHomologacao::profileLabel($actor['perfil']),
            ));
        }
        $db->commit();
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }

    $approvedCount = (int) $db->query(
        "SELECT COUNT(*) FROM dbo.lancamentos l INNER JOIN dbo.indicadores i ON i.id=l.indicador_id "
        . "WHERE l.ano=2026 AND l.mes BETWEEN 1 AND 9 AND l.status=N'Homologado' "
        . "AND (LOWER(LTRIM(RTRIM(i.periodicidade))) NOT LIKE N'trimestral%' OR l.mes IN(3,6,9))"
    )->fetchColumn();
    $summary['homologadosAposAplicacao'] = $approvedCount;
    $summary['aplicados'] = count($targets);
}

echo json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), PHP_EOL;
