<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/core/Database.php';
require_once __DIR__ . '/../app/repositories/LancamentosRepository.php';
require_once __DIR__ . '/../app/repositories/IndicadoresRepository.php';
require_once __DIR__ . '/../app/repositories/ConfiguracoesRepository.php';
require_once __DIR__ . '/../app/repositories/AuditoriaRepository.php';
require_once __DIR__ . '/../app/services/CalculoIndicadoresService.php';

$arguments = array_slice($argv, 1);
$dryRun = in_array('--dry-run', $arguments, true);
$apply = in_array('--apply', $arguments, true);
$scope = null;
$indicatorFilter = array();
foreach ($arguments as $argument) if (strpos($argument, '--scope=') === 0) $scope = substr($argument, 8);
foreach ($arguments as $argument) if (strpos($argument, '--indicators=') === 0) {
    $indicatorFilter = array_values(array_filter(array_map('trim', explode(',', substr($argument, 13))), 'strlen'));
}
if ($dryRun === $apply || !in_array($scope, array('preventive','historical'), true)) {
    fwrite(STDERR, "Uso: php scripts/regularizar-consistencia-lancamentos.php --scope=preventive|historical --dry-run|--apply\n");
    exit(2);
}

$db = Database::getConnection();
if ((string)$db->query('SELECT DB_NAME()')->fetchColumn() !== 'Estrategia') {
    throw new RuntimeException('Regularizacao permitida somente no banco Estrategia.');
}
$launchesRepository = new LancamentosRepository($db);
$indicatorsRepository = new IndicadoresRepository($db);
$configurationsRepository = new ConfiguracoesRepository($db);
$auditRepository = new AuditoriaRepository($db);
$calculator = new CalculoIndicadoresService();

$indicators=array();foreach($indicatorsRepository->all() as $item)$indicators[(string)$item['id']]=$item;
$rules=array();foreach($configurationsRepository->get('regrasIndicadores',array()) as $item)$rules[(string)($item['indicadorId']??'')]=$item;
$all=$launchesRepository->all();$history=array();
foreach($all as $item)$history[(string)$item['indicadorId'].':'.(int)$item['ano']][]=$item;
$preventiveStatuses=array('Em preenchimento','Retificado','Enviado para homologacao','Enviado para homologação','Devolvido para ajuste','Reaberto');
$targets=array();
foreach($all as $launch){
    $inScope=$scope==='historical'?(string)$launch['status']==='Homologado':in_array((string)$launch['status'],$preventiveStatuses,true);
    if(!$inScope)continue;$id=(string)$launch['indicadorId'];if(!isset($indicators[$id]))continue;
    if($indicatorFilter&&!in_array($id,$indicatorFilter,true))continue;
    $validation=$calculator->validar($indicators[$id],$rules[$id]??array(),$launch,$history[$id.':'.(int)$launch['ano']]??array());
    if(empty($validation['cobertura'])||!empty($validation['valido'])||empty($validation['projecao']))continue;
    $targets[]=array('id'=>(string)$launch['id'],'indicadorId'=>$id,'competencia'=>$launch['competencia'],'status'=>$launch['status'],
        'divergencias'=>$validation['divergencias'],'projecao'=>$validation['projecao']);
}

if($apply&&$targets){
    $db->beginTransaction();
    try{
        foreach($targets as $target){
            $before=$launchesRepository->findForUpdate($target['id']);
            if(!$before)throw new RuntimeException('Lancamento desapareceu durante a regularizacao: '.$target['id']);
            $after=$launchesRepository->updateDerivedFields($target['id'],$target['projecao']);
            $auditRepository->append(array('entidade'=>'lancamentos','registroId'=>$target['id'],'acao'=>'regularizacao_consistencia_calculo',
                'descricao'=>'Regularizacao dos campos derivados para unificar Lancamentos e Relatorios.',
                'valorAnterior'=>$before,'valorNovo'=>array('lancamento'=>$after,'versaoFormula'=>CalculoIndicadoresService::FORMULA_VERSION,'divergencias'=>$target['divergencias']),
                'usuario'=>'MIGRACAO-20261108','perfilUsuario'=>'Sistema'));
        }
        $db->commit();
    }catch(Throwable $error){if($db->inTransaction())$db->rollBack();throw$error;}
}

echo json_encode(array('modo'=>$dryRun?'dry-run':'apply','escopo'=>$scope,'versaoFormula'=>CalculoIndicadoresService::FORMULA_VERSION,
    'indicadores'=>$indicatorFilter,'total'=>count($targets),'alvos'=>$targets),JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),PHP_EOL;
