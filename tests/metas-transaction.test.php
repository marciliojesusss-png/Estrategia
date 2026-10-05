<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/services/AdministracaoService.php';

function check_meta($condition, $message)
{
    if (!$condition) {
        fwrite(STDERR, 'FALHA: ' . $message . PHP_EOL);
        exit(1);
    }
}

final class MetaFakeDb
{
    public $committed = false;
    public $rolledBack = false;
    private $active = false;
    private $snapshot;
    private $restore;
    public function __construct(callable $snapshot, callable $restore) { $this->snapshot = $snapshot; $this->restore = $restore; }
    public function beginTransaction() { $this->active = true; ($this->snapshot)(); }
    public function commit() { $this->committed = true; $this->active = false; }
    public function rollBack() { ($this->restore)(); $this->rolledBack = true; $this->active = false; }
    public function inTransaction() { return $this->active; }
}

final class MetaFakeConfig
{
    public $metas;
    public $before;
    public function __construct(array $metas) { $this->metas = $metas; }
    public function getForUpdate($key, $default) { return $key === 'metas' ? $this->metas : $default; }
    public function set($key, $value) { if ($key !== 'metas') throw new RuntimeException('chave'); $this->metas = $value; }
}

final class MetaFakeLaunches
{
    public $items;
    public $before;
    public function __construct(array $items) { $this->items = $items; }
    public function findByMetaScopeForUpdate($indicatorId, $year, $month) {
        return array_values(array_filter($this->items, static function ($item) use ($indicatorId, $year, $month) {
            return (string) $item['indicadorId'] === (string) $indicatorId && (int) $item['ano'] === (int) $year && (int) $item['mes'] === (int) $month;
        }));
    }
    public function updateMetaDerivatives($id, $meta, $percentage, $situation) {
        foreach ($this->items as $index => $item) if ((string) $item['id'] === (string) $id) {
            $this->items[$index]['metaReferencia'] = $meta;
            $this->items[$index]['percentualAtingido'] = $percentage;
            $this->items[$index]['situacaoCalculada'] = $situation;
            return $this->items[$index];
        }
        throw new RuntimeException('lancamento ausente');
    }
}

final class MetaFakeAudit
{
    public $entries = array();
    public $failOnPropagation = false;
    public function append(array $entry) {
        if ($this->failOnPropagation && $entry['acao'] === 'meta_propagada_lancamento') throw new RuntimeException('falha de auditoria simulada');
        $this->entries[] = $entry;
    }
}

function metaServiceWithFakes(MetaFakeDb $db, MetaFakeConfig $config, MetaFakeLaunches $launches, MetaFakeAudit $audit)
{
    $reflection = new ReflectionClass('AdministracaoService');
    $service = $reflection->newInstanceWithoutConstructor();
    foreach (array('db'=>$db, 'config'=>$config, 'lancamentos'=>$launches, 'audit'=>$audit) as $name => $value) {
        $property = $reflection->getProperty($name);
        $property->setAccessible(true);
        $property->setValue($service, $value);
    }
    return $service;
}

$initialMetas = array(
    array('id'=>1, 'indicadorId'=>7, 'ano'=>2026, 'mes'=>1, 'nomeMes'=>'Janeiro', 'metaMensal'=>100),
    array('id'=>2, 'indicadorId'=>7, 'ano'=>2026, 'mes'=>2, 'nomeMes'=>'Fevereiro', 'metaMensal'=>120),
    array('id'=>3, 'indicadorId'=>5, 'ano'=>2026, 'mes'=>1, 'nomeMes'=>'Janeiro', 'metaMensal'=>1000),
);
$homologated = array(
    'id'=>'L-1', 'indicadorId'=>7, 'ano'=>2026, 'mes'=>1, 'status'=>'Homologado',
    'resultadoMensal'=>105, 'camposEntrada'=>array('lucroLiquidoRecorrenteCompetencia'=>105),
    'referenciaEvidencia'=>'DOC-1', 'evidenciaId'=>'ARQ-1', 'usuarioResponsavel'=>'U-1',
    'metaReferencia'=>100, 'percentualAtingido'=>1.05, 'situacaoCalculada'=>'Atingido'
);
$config = new MetaFakeConfig($initialMetas);
$launches = new MetaFakeLaunches(array($homologated));
$audit = new MetaFakeAudit();
$snapshots = array();
$db = new MetaFakeDb(
    function () use (&$snapshots, $config, $launches) { $snapshots = array($config->metas, $launches->items); },
    function () use (&$snapshots, $config, $launches) { $config->metas = $snapshots[0]; $launches->items = $snapshots[1]; }
);
$service = metaServiceWithFakes($db, $config, $launches, $audit);
$result = $service->saveMeta(
    array('id'=>1, 'indicadorId'=>7, 'ano'=>2026, 'mes'=>1, 'nomeMes'=>'Janeiro', 'metaMensal'=>110),
    array(array('id'=>'L-1', 'metaReferencia'=>110, 'percentualAtingido'=>105/110, 'situacao'=>'Abaixo da meta')),
    array('matricula'=>'C118119', 'perfil'=>'administrador')
);

check_meta($db->committed && !$db->rolledBack, 'a operação válida deve confirmar a transação');
check_meta($config->metas[0]['metaMensal'] === 110.0, 'a meta editada deve ser persistida');
check_meta($config->metas[1]['metaMensal'] === 120, 'outra competência deve ser preservada');
check_meta($config->metas[2]['metaMensal'] === 1000, 'outro indicador deve ser preservado');
$saved = $result['lancamentos'][0];
check_meta($saved['status'] === 'Homologado', 'o homologado deve permanecer homologado');
check_meta($saved['resultadoMensal'] === 105, 'o realizado deve ser preservado');
check_meta($saved['camposEntrada'] === $homologated['camposEntrada'], 'dados de entrada devem ser preservados');
check_meta($saved['referenciaEvidencia'] === 'DOC-1' && $saved['evidenciaId'] === 'ARQ-1', 'evidências devem ser preservadas');
check_meta($saved['metaReferencia'] === 110.0, 'a referência deve ser atualizada');
check_meta(abs($saved['percentualAtingido'] - (105/110)) < 0.0000001, 'o percentual deve ser atualizado');
check_meta($saved['situacaoCalculada'] === 'Abaixo da meta', 'a situação deve ser atualizada');
check_meta($audit->entries[0]['acao'] === 'meta_alterada', 'a auditoria deve registrar antes/depois da meta');
check_meta($audit->entries[1]['acao'] === 'meta_propagada_lancamento', 'a auditoria deve registrar a propagação');
check_meta($audit->entries[1]['valorAnterior']['status'] === 'Homologado' && $audit->entries[1]['valorNovo']['status'] === 'Homologado', 'a auditoria deve demonstrar preservação do status');

$rollbackConfig = new MetaFakeConfig($initialMetas);
$rollbackLaunches = new MetaFakeLaunches(array($homologated));
$rollbackAudit = new MetaFakeAudit();
$rollbackAudit->failOnPropagation = true;
$rollbackSnapshots = array();
$rollbackDb = new MetaFakeDb(
    function () use (&$rollbackSnapshots, $rollbackConfig, $rollbackLaunches) { $rollbackSnapshots = array($rollbackConfig->metas, $rollbackLaunches->items); },
    function () use (&$rollbackSnapshots, $rollbackConfig, $rollbackLaunches) { $rollbackConfig->metas = $rollbackSnapshots[0]; $rollbackLaunches->items = $rollbackSnapshots[1]; }
);
$rollbackService = metaServiceWithFakes($rollbackDb, $rollbackConfig, $rollbackLaunches, $rollbackAudit);
$failed = false;
try {
    $rollbackService->saveMeta(
        array('id'=>1, 'indicadorId'=>7, 'ano'=>2026, 'mes'=>1, 'metaMensal'=>110),
        array(array('id'=>'L-1', 'metaReferencia'=>110, 'percentualAtingido'=>105/110, 'situacao'=>'Abaixo da meta')),
        array('matricula'=>'C118119', 'perfil'=>'administrador')
    );
} catch (RuntimeException $error) { $failed = true; }
check_meta($failed && $rollbackDb->rolledBack && !$rollbackDb->committed, 'a falha deve executar rollback');
check_meta($rollbackConfig->metas === $initialMetas, 'rollback não pode deixar a meta parcialmente alterada');
check_meta($rollbackLaunches->items[0] === $homologated, 'rollback não pode deixar lançamento parcialmente alterado');

$controller = file_get_contents(__DIR__ . '/../app/controllers/AdministracaoApiController.php');
check_meta(strpos($controller, "resource==='metas'") !== false, 'deve existir endpoint administrativo específico de metas');
check_meta(strpos($controller, 'Auth::requireCsrf()') !== false, 'o endpoint deve exigir CSRF');

echo 'Gestão transacional de metas, auditoria e rollback OK' . PHP_EOL;
