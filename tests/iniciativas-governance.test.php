<?php
declare(strict_types=1);

require_once __DIR__.'/../app/services/IniciativaStateMachine.php';
require_once __DIR__.'/../app/services/GovernancaHomologacao.php';
require_once __DIR__.'/../app/auth/Auth.php';
require_once __DIR__.'/../app/auth/AccessPolicy.php';

function initiative_ok($condition,$message){if(!$condition){fwrite(STDERR,'FALHA: '.$message.PHP_EOL);exit(1);}}
function initiative_throws($class,$callback,$message){try{call_user_func($callback);}catch(Throwable$error){initiative_ok($error instanceof$class,$message.' (exceção incorreta)');return;}initiative_ok(false,$message.' (nenhuma exceção)');}

$valid=array(
    array('NAO_INICIADO','EM_PREENCHIMENTO'),array('NAO_INICIADO','ENVIADO_HOMOLOGACAO'),
    array('EM_PREENCHIMENTO','ENVIADO_HOMOLOGACAO'),array('ENVIADO_HOMOLOGACAO','HOMOLOGADO'),
    array('ENVIADO_HOMOLOGACAO','DEVOLVIDO_AJUSTE'),array('DEVOLVIDO_AJUSTE','ENVIADO_HOMOLOGACAO'),
    array('HOMOLOGADO','REABERTO'),array('REABERTO','ENVIADO_HOMOLOGACAO'),
);
foreach($valid as$transition)initiative_ok(IniciativaStateMachine::canTransition($transition[0],$transition[1]),'transição válida deve ser aceita: '.implode(' -> ',$transition));
initiative_ok(!IniciativaStateMachine::canTransition('HOMOLOGADO','EM_PREENCHIMENTO'),'homologado não pode voltar diretamente para preenchimento');
initiative_throws('LogicException',function(){IniciativaStateMachine::assertTransition('HOMOLOGADO','EM_PREENCHIMENTO');},'transição inválida deve lançar erro');
initiative_ok(IniciativaStateMachine::draftStatus('DEVOLVIDO_AJUSTE',true)==='DEVOLVIDO_AJUSTE','salvar devolvido deve preservar estado');
initiative_ok(IniciativaStateMachine::draftStatus('REABERTO',true)==='REABERTO','salvar reaberto deve preservar estado');

$unit=array('perfil'=>'unidade_apuradora','matricula'=>'U1','unidade_apuradora'=>'SUCOL');
$reviewer=array('perfil'=>'homologador','matricula'=>'H1','diretoria_responsavel'=>'DICOT');
$consultant=array('perfil'=>'consultor_diretoria','matricula'=>'C1','diretoria_responsavel'=>'DICOT');
$admin=array('perfil'=>'administrador','matricula'=>'A1');
$company=array('perfil'=>'usuario_companhia','matricula'=>'X1');
$record=array('id'=>'a1','competencia'=>'2026-09','unidade_snapshot'=>'SUCOL','diretoria_snapshot'=>'DICOT','usuario_responsavel'=>'U1');
initiative_ok(AccessPolicy::allows('administrador','iniciativas','administrar'),'administrador administra iniciativas');
initiative_ok(AccessPolicy::allows('unidade_apuradora','iniciativas','gerenciar'),'unidade preenche iniciativas');
initiative_ok(AccessPolicy::allows('consultor_diretoria','iniciativas','decidir'),'consultor decide iniciativas');
initiative_ok(!AccessPolicy::allows('usuario_companhia','iniciativas','visualizar'),'usuário companhia não acessa iniciativas');
initiative_ok(AccessPolicy::initiativeScopeAllows($unit,$record),'unidade deve acessar seu snapshot');
initiative_ok(!AccessPolicy::initiativeScopeAllows(array_merge($unit,array('unidade_apuradora'=>'OUTRA')),$record),'unidade fora do escopo deve ser bloqueada');
initiative_ok(AccessPolicy::initiativeScopeAllows($reviewer,$record),'homologador deve acessar sua diretoria');
initiative_ok(!AccessPolicy::initiativeScopeAllows(array_merge($reviewer,array('diretoria_responsavel'=>'OUTRA')),$record),'homologador fora da diretoria deve ser bloqueado');
initiative_ok(!AccessPolicy::initiativeScopeAllows($company,$record),'usuário companhia deve ser bloqueado no backend');

$closures=GovernancaHomologacao::validateClosures(array(array('periodo'=>'3TRI/2026','competencias'=>array('2026-09'),'dataReuniao'=>'2026-10-20','dataFechamento'=>'2026-10-15','ativo'=>true)));
initiative_ok(GovernancaHomologacao::initiativeMutationPolicy($record,$closures,false,'2026-10-14')['permitida'],'antes do fechamento deve permitir mutação');
initiative_ok(!GovernancaHomologacao::initiativeMutationPolicy($record,$closures,false,'2026-10-15')['permitida'],'na data do fechamento deve bloquear');
initiative_ok(!GovernancaHomologacao::initiativeMutationPolicy($record,$closures,false,'2026-10-16')['permitida'],'após fechamento deve bloquear');
initiative_ok(GovernancaHomologacao::initiativeMutationPolicy($record,$closures,true,'2026-10-15')['permitida'],'ciclo excepcional deve permitir correção');
initiative_ok(GovernancaHomologacao::initiativeReopenPolicy($record,$consultant,array(),'2026-10-16')['permitida'],'iniciativa sem fechamento configurado deve permitir reabertura da diretoria');
initiative_ok(!GovernancaHomologacao::initiativeReopenPolicy($record,$consultant,$closures,'2026-10-15')['permitida'],'diretoria deve bloquear reabertura após fechamento');
$exception=GovernancaHomologacao::initiativeReopenPolicy($record,$admin,$closures,'2026-10-15');
initiative_ok($exception['permitida']&&!empty($exception['excepcional']),'administrador deve reabrir excepcionalmente após fechamento');
initiative_ok(GovernancaHomologacao::exceptionalCycleActiveFromActions(array('reabertura_excepcional_pos_fechamento_ca')),'reabertura excepcional abre ciclo');
initiative_ok(!GovernancaHomologacao::exceptionalCycleActiveFromActions(array('homologacao_iniciativa','reabertura_excepcional_pos_fechamento_ca')),'nova homologação encerra ciclo');
initiative_throws('UnexpectedValueException',function()use($record,$reviewer){GovernancaHomologacao::assertIndependentInitiativeReviewer($record,'',$reviewer,array('H1'));},'participante histórico não pode homologar');
GovernancaHomologacao::assertIndependentInitiativeReviewer($record,'',$consultant,array('U1'));
initiative_ok(!in_array('acompanhamento_homologado',GovernancaHomologacao::initiativeProductionActions(),true),'homologação não conta como participação produtiva');
initiative_ok(in_array('evidencia_iniciativa_anexada',GovernancaHomologacao::initiativeProductionActions(),true),'anexo deve contar como participação produtiva');
initiative_ok(!in_array('IMPORTACAO_HISTORICA_INICIATIVA',GovernancaHomologacao::initiativeProductionActions(),true),'importação histórica de iniciativa não é participação produtiva');
initiative_ok(!in_array('IMPORTACAO_HISTORICA_ACOMPANHAMENTO',GovernancaHomologacao::initiativeProductionActions(),true),'importação histórica de acompanhamento não é participação produtiva');

echo 'Máquina de estados, permissões, segregação e governança de iniciativas OK'.PHP_EOL;
