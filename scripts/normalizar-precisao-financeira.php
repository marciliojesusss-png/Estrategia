<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/core/Database.php';
require_once __DIR__ . '/../app/repositories/LancamentosRepository.php';
require_once __DIR__ . '/../app/repositories/IndicadoresRepository.php';
require_once __DIR__ . '/../app/repositories/ConfiguracoesRepository.php';
require_once __DIR__ . '/../app/repositories/AuditoriaRepository.php';
require_once __DIR__ . '/../app/repositories/LancamentosResultadosHomologadosRepository.php';
require_once __DIR__ . '/../app/services/CalculoIndicadoresService.php';

$args=array_slice($argv,1);$dry=in_array('--dry-run',$args,true);$apply=in_array('--apply',$args,true);
if($dry===$apply){fwrite(STDERR,"Uso: php scripts/normalizar-precisao-financeira.php --dry-run|--apply\n");exit(2);}
$db=Database::getConnection();if((string)$db->query('SELECT DB_NAME()')->fetchColumn()!=='Estrategia')throw new RuntimeException('Banco invalido.');
$expectedIds=array('73','74','75','76','77','78','79','80','81','193','194','195','196','197','198','199','200','201');
$launchRepo=new LancamentosRepository($db);$indicatorRepo=new IndicadoresRepository($db);$configRepo=new ConfiguracoesRepository($db);
$auditRepo=new AuditoriaRepository($db);$snapshotRepo=new LancamentosResultadosHomologadosRepository($db);$calculator=new CalculoIndicadoresService();
$indicators=array();foreach($indicatorRepo->all()as$i)$indicators[(string)$i['id']]=$i;$rules=array();foreach($configRepo->get('regrasIndicadores',array())as$r)$rules[(string)($r['indicadorId']??'')]=$r;
$all=$launchRepo->all();$history=array();foreach($all as$l)$history[(string)$l['indicadorId'].':'.(int)$l['ano']][]=$l;$targets=array();
foreach($all as$l){$id=(string)$l['indicadorId'];if(!in_array((string)$l['id'],$expectedIds,true))continue;if(!in_array($id,array('7','17'),true)||(string)$l['status']==='Não iniciado')throw new RuntimeException('Escopo inesperado no lancamento '.$l['id']);
    $p=$calculator->calcular($indicators[$id],$rules[$id]??array(),$l,$history[$id.':'.(int)$l['ano']]??array());if($p===null)continue;$targets[]=array('launch'=>$l,'projection'=>$p);}
sort($expectedIds);$targetIds=array_map(function($t){return(string)$t['launch']['id'];},$targets);sort($targetIds);
if($targetIds!==$expectedIds)throw new RuntimeException('A lista de 18 alvos mudou; operacao cancelada.');
if($apply){$db->beginTransaction();try{foreach($targets as$t){$before=$launchRepo->findForUpdate($t['launch']['id']);$after=$launchRepo->updateDerivedFields($t['launch']['id'],$t['projection']);
        $auditRepo->append(array('entidade'=>'lancamentos','registroId'=>$t['launch']['id'],'acao'=>'normalizacao_precisao_financeira','descricao'=>'Normalizacao decimal sem notacao cientifica.','valorAnterior'=>$before,'valorNovo'=>$after,'usuario'=>'MIGRACAO-20261108','perfilUsuario'=>'Sistema'));
        $version=max(1,(int)$t['launch']['versaoAtual']);if($snapshotRepo->exists($t['launch']['id'],$version)){$v=$calculator->validar($indicators[(string)$t['launch']['indicadorId']],$rules[(string)$t['launch']['indicadorId']]??array(),$after,$history[(string)$t['launch']['indicadorId'].':'.(int)$t['launch']['ano']]??array());$v['projecao']=$t['projection'];$snapshotRepo->updateValues($calculator->snapshot($v,$after,array('matricula'=>'MIGRACAO-20261108')));}}
        $db->commit();}catch(Throwable$e){if($db->inTransaction())$db->rollBack();throw$e;}}
echo json_encode(array('modo'=>$dry?'dry-run':'apply','total'=>count($targets),'ids'=>array_map(function($t){return$t['launch']['id'];},$targets)),JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE),PHP_EOL;
