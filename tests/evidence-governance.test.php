<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/services/GovernancaHomologacao.php';

function evidence_governance_ok($condition, $message)
{
    if (!$condition) {
        fwrite(STDERR, 'FALHA: ' . $message . PHP_EOL);
        exit(1);
    }
}

function evidence_governance_throws($class, $callback, $message)
{
    try {
        call_user_func($callback);
    } catch (Throwable $error) {
        evidence_governance_ok($error instanceof $class, $message . ' (excecao incorreta)');
        return $error;
    }
    evidence_governance_ok(false, $message . ' (nenhuma excecao)');
}

$launch = array(
    'id' => 'lancamento-evidencia-1',
    'competencia' => '2026-09',
    'status' => 'Reaberto',
);
$closures = GovernancaHomologacao::validateClosures(array(array(
    'id' => 'ca-3tri-2026',
    'periodo' => '3TRI/2026',
    'competencias' => array('2026-07', '2026-08', '2026-09'),
    'dataReuniao' => '2026-10-22',
    'dataFechamento' => '2026-10-15',
    'ativo' => true,
)));

// Anexar e remover compartilham a mesma politica: antes permite; no fechamento bloqueia.
evidence_governance_ok(
    GovernancaHomologacao::assertLaunchMutable($launch, $closures, false, '2026-10-14')['permitida'],
    'anexar evidencia deve ser permitido antes do fechamento'
);
evidence_governance_ok(
    GovernancaHomologacao::assertLaunchMutable($launch, $closures, false, '2026-10-14')['permitida'],
    'remover evidencia deve ser permitido antes do fechamento'
);
$closedAttachError = evidence_governance_throws('DomainException', function () use ($launch, $closures) {
    GovernancaHomologacao::assertLaunchMutable($launch, $closures, false, '2026-10-15');
}, 'anexar evidencia deve ser bloqueado na data do fechamento');
evidence_governance_throws('DomainException', function () use ($launch, $closures) {
    GovernancaHomologacao::assertLaunchMutable($launch, $closures, false, '2026-10-15');
}, 'remover evidencia deve ser bloqueado na data do fechamento');
evidence_governance_ok(
    strpos($closedAttachError->getMessage(), '15/10/2026') !== false,
    'mensagem do bloqueio deve preservar a data de fechamento'
);

// A reabertura excepcional libera o ciclo; uma nova homologacao volta a protege-lo.
evidence_governance_ok(
    GovernancaHomologacao::assertLaunchMutable($launch, $closures, true, '2026-10-15')['permitida'],
    'reabertura excepcional deve permitir anexar evidencia'
);
evidence_governance_ok(
    GovernancaHomologacao::assertLaunchMutable($launch, $closures, true, '2026-10-15')['permitida'],
    'reabertura excepcional deve permitir remover evidencia'
);
evidence_governance_throws('DomainException', function () use ($launch, $closures) {
    GovernancaHomologacao::assertLaunchMutable($launch, $closures, false, '2026-10-16');
}, 'nova homologacao deve encerrar a excecao e proteger as evidencias novamente');

// Confirma a ligacao dos dois comandos de evidencia e o tratamento dos endpoints diretos.
$evidenceService = file_get_contents(__DIR__ . '/../app/services/EvidenciaService.php');
$evidenceController = file_get_contents(__DIR__ . '/../app/controllers/EvidenciaController.php');
$databaseApi = file_get_contents(__DIR__ . '/../api/database.php');

evidence_governance_ok(
    substr_count($evidenceService, 'authorizedLaunch($launchId, $user, true)') === 1
        && substr_count($evidenceService, "authorizedLaunch(\$evidence['lancamento_id'], \$user, true)") === 1,
    'attach e remove devem exigir autorizacao editavel no backend'
);
evidence_governance_ok(
    strpos($evidenceService, 'GovernancaHomologacao::assertLaunchMutable(') !== false
        && strpos($evidenceService, 'exceptionalReopenCycleActive(') !== false
        && strpos($evidenceService, 'GovernancaHomologacao::CLOSURES_KEY') !== false,
    'servico de evidencias deve reutilizar a governanca central e o ciclo excepcional persistido'
);

$uploadApiStart = strpos($evidenceController, 'public function uploadApi');
$removeApiStart = strpos($evidenceController, 'public function removeApi');
$uploadApi = substr($evidenceController, $uploadApiStart, $removeApiStart - $uploadApiStart);
$removePageStart = strpos($evidenceController, 'public function upload(', $removeApiStart);
$removeApi = substr($evidenceController, $removeApiStart, $removePageStart - $removeApiStart);
evidence_governance_ok(
    strpos($uploadApi, '$this->service->attach(') !== false
        && strpos($uploadApi, 'catch (DomainException $error)') !== false
        && strpos($uploadApi, 'Response::error($error->getMessage(), 422)') !== false,
    'endpoint direto de upload deve usar o servico protegido e preservar HTTP 422'
);
evidence_governance_ok(
    strpos($removeApi, '$this->service->remove(') !== false
        && strpos($removeApi, 'catch (DomainException $error)') !== false
        && strpos($removeApi, 'Response::error($error->getMessage(), 422)') !== false,
    'endpoint direto de remocao deve usar o servico protegido e preservar HTTP 422'
);
evidence_governance_ok(
    substr_count($evidenceController, 'catch (DomainException $error)') === 3
        && strpos($evidenceController, "\$_SESSION['_flash'] = \$error->getMessage();") !== false,
    'rota HTML legada de remocao deve preservar a mensagem de fechamento'
);

$launchActionStart = strpos($databaseApi, "if (\$key === 'lancamento_acao')");
$launchActionEnd = strpos($databaseApi, "if (\$key === ''", $launchActionStart);
$launchActionApi = substr($databaseApi, $launchActionStart, $launchActionEnd - $launchActionStart);
$domainCatch = strpos($launchActionApi, 'catch (DomainException $error)');
$logicCatch = strpos($launchActionApi, 'catch (LogicException $error)');
evidence_governance_ok(
    $domainCatch !== false && $logicCatch !== false && $domainCatch < $logicCatch
        && strpos($launchActionApi, 'Response::error($error->getMessage(), 422)') !== false,
    'lancamento_acao deve preservar DomainException com HTTP 422 antes do tratamento generico'
);

echo 'Governanca de evidencias no fechamento CA OK' . PHP_EOL;
