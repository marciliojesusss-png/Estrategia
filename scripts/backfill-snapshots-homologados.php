<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/core/Database.php';
require_once __DIR__ . '/../app/repositories/LancamentosRepository.php';
require_once __DIR__ . '/../app/repositories/IndicadoresRepository.php';
require_once __DIR__ . '/../app/repositories/ConfiguracoesRepository.php';
require_once __DIR__ . '/../app/repositories/LancamentosResultadosHomologadosRepository.php';
require_once __DIR__ . '/../app/services/CalculoIndicadoresService.php';

$arguments=array_slice($argv,1);$dryRun=in_array('--dry-run',$arguments,true);$apply=in_array('--apply',$arguments,true);
if($dryRun===$apply){fwrite(STDERR,"Uso: php scripts/backfill-snapshots-homologados.php --dry-run|--apply\n");exit(2);}
$db=Database::getConnection();if((string)$db->query('SELECT DB_NAME()')->fetchColumn()!=='Estrategia')throw new RuntimeException('Banco invalido.');
$launchRepo=new LancamentosRepository($db);$indicatorRepo=new IndicadoresRepository($db);$configRepo=new ConfiguracoesRepository($db);
$snapshotRepo=new LancamentosResultadosHomologadosRepository($db);$calculator=new CalculoIndicadoresService();
$indicators=array();foreach($indicatorRepo->all()as$i)$indicators[(string)$i['id']]=$i;
$rules=array();foreach($configRepo->get('regrasIndicadores',array())as$r)$rules[(string)($r['indicadorId']??'')]=$r;
$all=$launchRepo->all();$history=array();foreach($all as$l)$history[(string)$l['indicadorId'].':'.(int)$l['ano']][]=$l;
$targets=array();$skipped=array();
foreach($all as$l){if((string)$l['status']!=='Homologado')continue;$id=(string)$l['indicadorId'];if(!isset($indicators[$id]))continue;
    $version=max(1,(int)$l['versaoAtual']);if($snapshotRepo->exists($l['id'],$version))continue;
    $v=$calculator->validar($indicators[$id],$rules[$id]??array(),$l,$history[$id.':'.(int)$l['ano']]??array());
    if(empty($v['cobertura'])){$skipped[]=array('id'=>$l['id'],'indicadorId'=>$id,'motivo'=>'sem_calculador_backend');continue;}
    if(empty($v['valido'])){$skipped[]=array('id'=>$l['id'],'indicadorId'=>$id,'motivo'=>'divergente','divergencias'=>$v['divergencias']);continue;}
    $targets[]=array('launch'=>$l,'validation'=>$v);
}
if($apply&&$targets){$db->beginTransaction();try{foreach($targets as$t)$snapshotRepo->save($calculator->snapshot($t['validation'],$t['launch'],array('matricula'=>'MIGRACAO-20261108')));$db->commit();}catch(Throwable$e){if($db->inTransaction())$db->rollBack();throw$e;}}
$listed=array_map(function($t){return array('id'=>$t['launch']['id'],'indicadorId'=>$t['launch']['indicadorId'],'competencia'=>$t['launch']['competencia'],'versao'=>$t['launch']['versaoAtual']);},$targets);
echo json_encode(array('modo'=>$dryRun?'dry-run':'apply','total'=>count($targets),'alvos'=>$listed,'ignorados'=>count($skipped),'detalhesIgnorados'=>$skipped),JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),PHP_EOL;
