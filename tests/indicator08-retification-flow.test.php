<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/auth/Auth.php';
require_once __DIR__ . '/../app/services/LancamentoService.php';

final class Indicator08FlowDb {
    public $active = false;
    public $commits = 0;
    public function beginTransaction(){ $this->active = true; }
    public function inTransaction(){ return $this->active; }
    public function commit(){ $this->active = false; $this->commits++; }
    public function rollBack(){ $this->active = false; }
}
final class Indicator08FlowRepo {
    public $row;
    public $updatedIds = array();
    public function __construct(){
        $this->row = array(
            'id'=>85, 'indicadorId'=>8, 'competencia'=>'2026-01', 'ano'=>2026, 'mes'=>1,
            'trimestre'=>'1TRI/2026', 'plano'=>'PN', 'pilar'=>'Crescimento sustentavel',
            'unidadeApuradora'=>'SUCOL', 'diretoriaResponsavel'=>'DICOT',
            'status'=>'Em preenchimento', 'versaoAtual'=>2,
            'camposEntrada'=>array(
                'arrecadacaoCanaisEletronicosMes'=>624392611.64,
                'arrecadacaoTotalProdutosLoteriasMes'=>2030288935.15,
            ),
            'metaReferencia'=>0.2805, 'resultadoMensal'=>null,
            'resultadoOficialAnual'=>null, 'percentualAtingido'=>null,
            'situacaoCalculada'=>'Sem dados',
        );
    }
    public function find($id){ return (string)$id === '85' ? $this->row : null; }
    public function existsForPeriod($indicator,$competence,$ignore=null){ return false; }
    public function all(array $filters=array()){ return array($this->row); }
    public function update($id,array $data){
        $this->updatedIds[] = (int)$id;
        $this->row = array_merge($this->row, array(
            'status'=>$data['status'],
            'metaReferencia'=>$data['meta_referencia'],
            'resultadoMensal'=>$data['resultado_calculado'],
            'resultadoOficialAnual'=>$data['resultado_oficial'],
            'percentualAtingido'=>$data['percentual_atingido'],
            'situacaoCalculada'=>$data['situacao'],
            'camposEntrada'=>$data['dados_entrada'],
        ));
        return $this->row;
    }
    public function updateStatus($id,$expected,$status){
        if ((string)$id !== '85' || $this->row['status'] !== $expected) return false;
        $this->row['status'] = $status;
        return true;
    }
}
final class Indicator08FlowIndicators {
    public function find($id){
        return array('id'=>8,'ativo'=>true,'periodicidade'=>'Mensal','tipoCalculo'=>'razao_canais_digitais');
    }
}
final class Indicator08FlowConfig {
    public function get($key,$default=null){ return $default; }
}
final class Indicator08FlowEvents {
    public function exceptionalReopenCycleActive($id){ return false; }
    public function reopenCycleActive($id){ return (string)$id === '85'; }
}
final class Indicator08FlowRetifications {
    public $rows = array();
    public function existsForVersionTransition($id,$before,$after){ return false; }
    public function create($id,array $before,array $after,$reason,array $user,$previousVersion,$newVersion){
        $this->rows[] = compact('id','before','after','reason','user','previousVersion','newVersion');
        return 'retificacao-teste';
    }
}
final class Indicator08FlowAudit {
    public $rows = array();
    public function append(array $row){ $this->rows[] = $row; }
}
final class Indicator08FlowValidator {
    public function validate(array $input){
        return array('valid'=>true,'errors'=>array(),'data'=>array(
            'indicador_id'=>'8','competencia'=>'2026-01','ano'=>2026,'mes'=>1,'trimestre'=>'1TRI/2026',
            'plano'=>'PN','pilar'=>'Crescimento sustentavel','unidade_apuradora'=>'SUCOL',
            'diretoria_responsavel'=>'DICOT','dados_entrada'=>$input['camposEntrada'],
            'resultado_calculado'=>null,'resultado_oficial'=>null,'meta_referencia'=>'0.2805',
            'percentual_atingido'=>null,'situacao'=>'Sem dados','observacao_unidade'=>'',
            'referencia_evidencia'=>'',
        ));
    }
}

$db = new Indicator08FlowDb();
$repo = new Indicator08FlowRepo();
$retifications = new Indicator08FlowRetifications();
$audit = new Indicator08FlowAudit();
$reflection = new ReflectionClass(LancamentoService::class);
$service = $reflection->newInstanceWithoutConstructor();
$dependencies = array(
    'db'=>$db, 'repo'=>$repo, 'ind'=>new Indicator08FlowIndicators(),
    'config'=>new Indicator08FlowConfig(), 'ret'=>$retifications,
    'audit'=>$audit, 'homologacoes'=>new Indicator08FlowEvents(),
    'validator'=>new Indicator08FlowValidator(),
);
foreach ($dependencies as $name=>$value) {
    $property = $reflection->getProperty($name);
    $property->setAccessible(true);
    $property->setValue($service,$value);
}

$result = $service->update(85,array('camposEntrada'=>$repo->row['camposEntrada']),array(
    'perfil'=>'administrador','matricula'=>'C118119'
),'Correcao dos componentes oficiais');

if ($db->commits !== 1 || $result['status'] !== 'Retificado' || $repo->updatedIds !== array(85)) exit(1);
if (count($retifications->rows) !== 1 || $retifications->rows[0]['previousVersion'] !== 1
    || $retifications->rows[0]['newVersion'] !== 2) exit(1);
if (count($audit->rows) !== 1 || $audit->rows[0]['acao'] !== 'lancamento_alterado') exit(1);
if (abs($result['metaReferencia'] - 0.2770) > 1e-15) exit(1);
if (abs($result['resultadoOficialAnual'] - 0.3075387945183621) > 1e-14) exit(1);
if (abs($result['percentualAtingido'] - 1.110248355661957) > 1e-14) exit(1);
if ($result['situacaoCalculada'] !== 'Atingido') exit(1);

echo "Indicador 08: ciclo pendente recuperado por PATCH transacional, sem tocar em 86/87.\n";
