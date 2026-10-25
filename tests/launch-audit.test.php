<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/auth/Auth.php';
require_once __DIR__ . '/../app/services/BaseDadosService.php';

final class FakeAuditDb
{
    public $active = false;
    public $commits = 0;
    public function beginTransaction() { $this->active = true; }
    public function inTransaction() { return $this->active; }
    public function commit() { $this->active = false; $this->commits++; }
    public function rollBack() { $this->active = false; }
}

final class FakeLaunches
{
    public $before;
    public $saved;
    public function __construct() {
        $this->before = array('id' => 'L1', 'indicadorId' => '1', 'competencia' => '2026-09',
            'status' => 'Nao iniciado', 'createdAt' => '2026-09-01T08:00:00-03:00');
    }
    public function find($id) { return $this->saved ?: $this->before; }
    public function findForUpdate($id) { return $this->find($id); }
    public function replaceAll(array $items) { $this->saved = $items[0]; }
}

final class FakeEvents
{
    public $rows = array();
    public function append(array $row) { $this->rows[] = $row; }
    public function recordSubmission($id, $before, $after, array $user) {
        $this->rows[] = compact('id', 'before', 'after', 'user');
    }
    public function exceptionalReopenCycleActive($id) { return false; }
    public function reopenCycleActive($id) { return true; }
}

foreach (array('Reaberto', 'Retificado', 'Homologado') as $protectedStatus) {
    $db = new FakeAuditDb();
    $launches = new FakeLaunches();
    $launches->before['status'] = $protectedStatus;
    $service = launchAuditService($db, $launches, new FakeEvents(), new FakeEvents());
    try {
        $service->saveLaunchAction(array($launches->before), 'L1', 'draft', array('perfil'=>'administrador','matricula'=>'C123456'));
        fwrite(STDERR, "Endpoint legado aceitou estado protegido {$protectedStatus}.\n");
        exit(1);
    } catch (InvalidArgumentException $expected) {
        if (strpos($expected->getMessage(), 'PATCH /api/lancamentos/{id}') === false) {
            fwrite(STDERR, "Erro estrutural inesperado para {$protectedStatus}.\n");
            exit(1);
        }
    }
    if ($launches->saved !== null || $db->commits !== 0) {
        fwrite(STDERR, "Endpoint legado persistiu estado protegido {$protectedStatus}.\n");
        exit(1);
    }
}

final class FakeLaunchConfig
{
    public function get($key, $default = null) { return $default; }
}

function launchAuditService($db, $launches, $approvals, $audit)
{
    $reflection = new ReflectionClass(BaseDadosService::class);
    $service = $reflection->newInstanceWithoutConstructor();
    foreach (array('db' => $db, 'lancamentos' => $launches, 'homologacoes' => $approvals, 'auditoria' => $audit, 'configuracoes' => new FakeLaunchConfig()) as $name => $value) {
        $property = $reflection->getProperty($name);
        $property->setAccessible(true);
        $property->setValue($service, $value);
    }
    return $service;
}

foreach (array('draft', 'send') as $action) {
    $db = new FakeAuditDb();
    $launches = new FakeLaunches();
    $approvals = new FakeEvents();
    $audit = new FakeEvents();
    $service = launchAuditService($db, $launches, $approvals, $audit);
    $user = array('perfil' => 'administrador', 'matricula' => 'C123456');
    $client = array('id' => 'L1', 'indicadorId' => '1', 'competencia' => '2026-09',
        'status' => 'Homologado', 'usuarioResponsavel' => 'MATRICULA_FALSA',
        'createdAt' => 'DATA_FALSA', 'updatedAt' => 'DATA_FALSA');
    $result = $service->saveLaunchAction(array($client), 'L1', $action, $user);
    if ($db->commits !== 1 || $db->active || count($audit->rows) !== 1
        || $result['usuarioResponsavel'] !== 'C123456'
        || $result['createdAt'] !== $launches->before['createdAt']
        || isset($result['updatedAt'])
        || $audit->rows[0]['usuario'] !== 'C123456'
        || $audit->rows[0]['acao'] !== ($action === 'send' ? 'envio_para_homologacao' : 'salvar_rascunho_lancamento')
        || count($approvals->rows) !== ($action === 'send' ? 1 : 0)) {
        fwrite(STDERR, "Falha na auditoria da acao {$action}.\n");
        exit(1);
    }
}

echo "Auditoria de preenchimento e envio: identidade e transacao verificadas.\n";
