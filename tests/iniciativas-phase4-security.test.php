<?php
declare(strict_types=1);

require_once __DIR__.'/../app/bootstrap.php';
require_once __DIR__.'/../app/auth/Auth.php';
require_once __DIR__.'/../app/auth/AccessPolicy.php';
require_once __DIR__.'/../app/services/IniciativaStateMachine.php';
require_once __DIR__.'/../app/services/GovernancaHomologacao.php';
require_once __DIR__.'/../app/services/EvidenciaStorage.php';

function p4s_ok($condition,$message){if(!$condition){fwrite(STDERR,'FALHA: '.$message.PHP_EOL);exit(1);}}
function p4s_throws($class,$callback,$message){try{call_user_func($callback);}catch(Throwable$error){p4s_ok($error instanceof$class,$message.' (exceção incorreta)');return;}p4s_ok(false,$message.' (nenhuma exceção)');}
function p4s_read($path){return file_get_contents(__DIR__.'/../'.$path);}

// Perfis, escopos e bloqueio integral de usuario_companhia.
$record=array('id'=>'registro','unidade_snapshot'=>'UNIDADE_A','diretoria_snapshot'=>'DIRETORIA_A','competencia'=>'2026-12','usuario_responsavel'=>'UNIDADE_X');
$profiles=array(
    'administrador'=>array('perfil'=>'administrador','matricula'=>'ADMIN'),
    'unidade'=>array('perfil'=>'unidade_apuradora','matricula'=>'U1','unidade_apuradora'=>'UNIDADE_A'),
    'homologador'=>array('perfil'=>'homologador','matricula'=>'H1','diretoria_responsavel'=>'DIRETORIA_A'),
    'consultor'=>array('perfil'=>'consultor_diretoria','matricula'=>'C1','diretoria_responsavel'=>'DIRETORIA_A'),
    'companhia'=>array('perfil'=>'usuario_companhia','matricula'=>'X1'),
);
p4s_ok(AccessPolicy::initiativeScopeAllows($profiles['administrador'],$record),'administrador global');
p4s_ok(AccessPolicy::initiativeScopeAllows($profiles['unidade'],$record),'unidade no próprio escopo');
p4s_ok(AccessPolicy::initiativeScopeAllows($profiles['homologador'],$record),'homologador na diretoria');
p4s_ok(AccessPolicy::initiativeScopeAllows($profiles['consultor'],$record),'consultor na diretoria');
p4s_ok(!AccessPolicy::initiativeScopeAllows($profiles['companhia'],$record),'usuario_companhia bloqueado');
p4s_ok(!AccessPolicy::initiativeScopeAllows(array_merge($profiles['unidade'],array('unidade_apuradora'=>'UNIDADE_B')),$record),'unidade fora do escopo');
p4s_ok(!AccessPolicy::initiativeScopeAllows(array_merge($profiles['homologador'],array('diretoria_responsavel'=>'DIRETORIA_B')),$record),'diretoria fora do escopo');
p4s_ok(!AccessPolicy::allows('usuario_companhia','iniciativas','visualizar'),'usuario_companhia sem permissão de módulo');
p4s_ok(!AccessPolicy::allows('consultor_diretoria','iniciativas','gerenciar'),'consultor não preenche como Unidade');
p4s_ok(AccessPolicy::allows('consultor_diretoria','iniciativas','decidir'),'consultor decide na diretoria');

// Máquina de estados, fechamento e segregação histórica.
$valid=array(array('NAO_INICIADO','EM_PREENCHIMENTO'),array('NAO_INICIADO','ENVIADO_HOMOLOGACAO'),array('EM_PREENCHIMENTO','ENVIADO_HOMOLOGACAO'),array('ENVIADO_HOMOLOGACAO','HOMOLOGADO'),array('ENVIADO_HOMOLOGACAO','DEVOLVIDO_AJUSTE'),array('DEVOLVIDO_AJUSTE','ENVIADO_HOMOLOGACAO'),array('HOMOLOGADO','REABERTO'),array('REABERTO','ENVIADO_HOMOLOGACAO'));
foreach($valid as$transition)p4s_ok(IniciativaStateMachine::canTransition($transition[0],$transition[1]),'transição '.implode(' -> ',$transition));
p4s_ok(!IniciativaStateMachine::canTransition('HOMOLOGADO','EM_PREENCHIMENTO'),'transição direta inválida');
p4s_ok(IniciativaStateMachine::draftStatus('DEVOLVIDO_AJUSTE',true)==='DEVOLVIDO_AJUSTE','rascunho devolvido preservado');
p4s_ok(IniciativaStateMachine::draftStatus('REABERTO',true)==='REABERTO','rascunho reaberto preservado');
$closures=GovernancaHomologacao::validateClosures(array(array('periodo'=>'4TRI/2026','competencias'=>array('2026-12'),'dataReuniao'=>'2026-10-20','dataFechamento'=>'2026-10-15','ativo'=>true)));
p4s_ok(GovernancaHomologacao::initiativeMutationPolicy($record,$closures,false,'2026-10-14')['permitida'],'antes do fechamento');
p4s_ok(!GovernancaHomologacao::initiativeMutationPolicy($record,$closures,false,'2026-10-15')['permitida'],'na data do fechamento');
p4s_ok(!GovernancaHomologacao::initiativeMutationPolicy($record,$closures,false,'2026-10-16')['permitida'],'depois do fechamento');
p4s_ok(GovernancaHomologacao::initiativeMutationPolicy($record,$closures,true,'2026-10-16')['permitida'],'ciclo excepcional');
p4s_ok(GovernancaHomologacao::initiativeMutationPolicy($record,array(),false,'2026-10-16')['permitida'],'ausência de fechamento não quebra');
p4s_ok(!GovernancaHomologacao::initiativeReopenPolicy($record,$profiles['homologador'],$closures,'2026-10-15')['permitida'],'reabertura normal fechada');
$exceptional=GovernancaHomologacao::initiativeReopenPolicy($record,$profiles['administrador'],$closures,'2026-10-15');p4s_ok($exceptional['permitida']&&!empty($exceptional['excepcional']),'reabertura excepcional administrativa');
foreach(array('acompanhamento_salvo','acompanhamento_submetido','item_iniciativa_alterado','evidencia_iniciativa_anexada','evidencia_iniciativa_removida')as$action)p4s_ok(in_array($action,GovernancaHomologacao::initiativeProductionActions(),true),'ação produtiva '.$action);
foreach(array('iniciativa_criada','iniciativa_alterada','sintese_ca_criada','destaque_ca_alterado','acompanhamento_homologado')as$action)p4s_ok(!in_array($action,GovernancaHomologacao::initiativeProductionActions(),true),'ação não produtiva '.$action);
p4s_throws('UnexpectedValueException',function()use($record,$profiles){GovernancaHomologacao::assertIndependentInitiativeReviewer($record,'',$profiles['consultor'],array('CORPCAIXA\\C1'));},'mudança de perfil não apaga participação');

// EvidenciaStorage: regras antigas preservadas e remoção compensável.
$storageSource=p4s_read('app/services/EvidenciaStorage.php');
p4s_ok(strpos($storageSource,'public function store(array $f,array $v){return $this->storeIn($f,$v,UPLOAD_PATH);}')!==false,'store legado continua na raiz UPLOAD_PATH');
p4s_ok(strpos($storageSource,"'pdf'=>array('application/pdf')")!==false&&strpos($storageSource,"'xlsx'=>array('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/zip')")!==false,'MIME legado preservado');
$storage=new EvidenciaStorage();$folder=UPLOAD_PATH.'/iniciativas-phase4-storage';if(!is_dir($folder))mkdir($folder,0750,true);$path=$folder.'/fixture.txt';file_put_contents($path,'fixture');$pdf=tempnam(sys_get_temp_dir(),'fase4-pdf-');$spoof=tempnam(sys_get_temp_dir(),'fase4-spoof-');file_put_contents($pdf,"%PDF-1.4\n%fixture\n");file_put_contents($spoof,'conteudo de texto');
try{$valid=$storage->validate(array('error'=>UPLOAD_ERR_OK,'name'=>'documento.pdf','size'=>filesize($pdf),'tmp_name'=>$pdf));p4s_ok($valid['valid']&&$valid['extension']==='pdf','PDF permitido por extensão e MIME');$invalidExtension=$storage->validate(array('error'=>UPLOAD_ERR_OK,'name'=>'programa.exe','size'=>filesize($spoof),'tmp_name'=>$spoof));p4s_ok(!$invalidExtension['valid'],'extensão não permitida deve bloquear');$invalidMime=$storage->validate(array('error'=>UPLOAD_ERR_OK,'name'=>'falso.pdf','size'=>filesize($spoof),'tmp_name'=>$spoof));p4s_ok(!$invalidMime['valid'],'MIME incompatível deve bloquear');$tooLarge=$storage->validate(array('error'=>UPLOAD_ERR_OK,'name'=>'grande.pdf','size'=>UPLOAD_MAX_BYTES+1,'tmp_name'=>$pdf));p4s_ok(!$tooLarge['valid'],'limite de tamanho deve bloquear');$staged=$storage->stageRemoval($path);p4s_ok(!is_file($path)&&is_file($staged['staged']),'remoção deve ser preparada por rename');p4s_ok($storage->restoreStaged($staged)&&is_file($path),'rollback físico deve restaurar arquivo');$staged=$storage->stageRemoval($path);p4s_ok($storage->finalizeStaged($staged)&&!is_file($staged['staged']),'commit físico deve finalizar remoção');p4s_throws('RuntimeException',function()use($storage){$storage->stageRemoval(UPLOAD_PATH.'-fora/arquivo.pdf');},'prefixo semelhante não pode escapar de UPLOAD_PATH');p4s_throws('RuntimeException',function()use($storage){$storage->stageRemoval(UPLOAD_PATH.'/iniciativas/../../arquivo.pdf');},'travessia de diretório deve ser rejeitada');}finally{if(is_file($path))unlink($path);if(is_dir($folder))rmdir($folder);if(is_file($pdf))unlink($pdf);if(is_file($spoof))unlink($spoof);}

// Revisão estática de CSRF, IDOR, SQL parametrizado, download e compatibilidade.
$controller=p4s_read('app/controllers/IniciativasApiController.php');$evidenceController=p4s_read('app/controllers/IniciativaEvidenciaController.php');$trackingService=p4s_read('app/services/IniciativaAcompanhamentoService.php');$masterService=p4s_read('app/services/IniciativaService.php');$evidenceService=p4s_read('app/services/IniciativaEvidenciaService.php');$routes=p4s_read('public/index.php');
p4s_ok(substr_count($controller,'Auth::requireCsrf()')===8&&substr_count($evidenceController,'Auth::requireCsrf()')===2,'dez mutações protegidas por CSRF');
p4s_ok(strpos($masterService,'$this->assertAdministrator($user);')!==false&&strpos($trackingService,'AccessPolicy::initiativeScopeAllows')!==false&&strpos($evidenceService,'AccessPolicy::initiativeScopeAllows')!==false,'IDOR bloqueado por autorização persistida');
p4s_ok(strpos($controller,"requirePermission('iniciativas','administrar',true)")!==false,'detalhe mestre restrito a administrador');
p4s_ok(strpos($routes,'$router->post(\'/api/iniciativas')!==false&&strpos($routes,'$router->put(\'/api/iniciativas')===false&&strpos($routes,'$router->delete(\'/api/iniciativas')===false,'mutações compatíveis com POST/IIS');
p4s_ok(strpos($evidenceController,'readfile($evidence[\'caminho_arquivo\'])')!==false&&strpos($evidenceService,'authorizedRecord(')!==false,'download mediado pelo backend');
foreach(array('app/repositories/IniciativasRepository.php','app/repositories/IniciativasAcompanhamentosRepository.php','app/repositories/IniciativasHomologacoesRepository.php','app/repositories/IniciativasEvidenciasRepository.php')as$file){$source=p4s_read($file);p4s_ok(strpos($source,'->prepare(')!==false,'queries preparadas em '.$file);p4s_ok(!preg_match('/WHERE[^\r\n]*\.\s*\$(id|user|reason|filter|input)/i',$source),'sem concatenação direta de entrada em '.$file);}
p4s_ok(strpos(p4s_read('app/repositories/IniciativasRepository.php'),'WITH (UPDLOCK,HOLDLOCK)')!==false&&strpos(p4s_read('app/repositories/IniciativasAcompanhamentosRepository.php'),'status_fluxo=:esperado')!==false,'concorrência protegida por lock e estado esperado');

$newPhp=array('app/controllers/IniciativaEvidenciaController.php','app/controllers/IniciativasApiController.php','app/repositories/IniciativasAcompanhamentosRepository.php','app/repositories/IniciativasEvidenciasRepository.php','app/repositories/IniciativasHomologacoesRepository.php','app/repositories/IniciativasRepository.php','app/services/IniciativaAcompanhamentoService.php','app/services/IniciativaEvidenciaService.php','app/services/IniciativaHomologacaoService.php','app/services/IniciativaService.php','app/services/IniciativaStateMachine.php');
$forbiddenSyntax=array('/\bmatch\s*\(/','/\bfn\s*\(/','/\?->/','/\#\[/','/\benum\s+/','/\?\?=/','/function\s+\w+\s*\([^)]*\b(public|private|protected|readonly)\s+/');$forbiddenFunctions=array('str_contains','str_starts_with','str_ends_with','array_key_first','array_key_last','is_countable');
foreach($newPhp as$file){$source=p4s_read($file);foreach($forbiddenSyntax as$pattern)p4s_ok(!preg_match($pattern,$source),'sintaxe pós-7.1 em '.$file);foreach($forbiddenFunctions as$function)p4s_ok(strpos($source,$function.'(')===false,'função pós-7.1 em '.$file);}

echo 'FASE4_SECURITY perfis=5 csrf=10 idor=OK sql=parametrizado storage=compensavel php71=OK'.PHP_EOL;
