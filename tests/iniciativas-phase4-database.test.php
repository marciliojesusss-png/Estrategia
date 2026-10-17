<?php
declare(strict_types=1);

putenv('APP_ENV=local');
putenv('DB_CONNECTION=sqlsrv');
require_once __DIR__.'/../app/bootstrap.php';
require_once __DIR__.'/../app/core/Database.php';
require_once __DIR__.'/../app/auth/Auth.php';
require_once __DIR__.'/../app/auth/AccessPolicy.php';
require_once __DIR__.'/../app/services/IniciativaService.php';
require_once __DIR__.'/../app/services/IniciativaAcompanhamentoService.php';
require_once __DIR__.'/../app/services/IniciativaHomologacaoService.php';
require_once __DIR__.'/../app/services/IniciativaEvidenciaService.php';
require_once __DIR__.'/../app/repositories/IniciativasEvidenciasRepository.php';
require_once __DIR__.'/../app/repositories/ConfiguracoesRepository.php';

final class Phase4RollbackConnection
{
    private $pdo;
    public function __construct($pdo){$this->pdo=$pdo;}
    public function beginReal(){return$this->pdo->beginTransaction();}
    public function rollbackReal(){return$this->pdo->inTransaction()?$this->pdo->rollBack():true;}
    public function beginTransaction(){return true;}
    public function commit(){return true;}
    public function rollBack(){return true;}
    public function inTransaction(){return$this->pdo->inTransaction();}
    public function prepare($sql,$options=array()){return$this->pdo->prepare($sql,$options);}
    public function query($sql){return$this->pdo->query($sql);}
}

function p4_ok($condition,$message){if(!$condition)throw new RuntimeException('FALHA: '.$message);}
function p4_throws($class,$callback,$message){try{call_user_func($callback);}catch(Throwable$error){p4_ok($error instanceof$class,$message.' ('.get_class($error).')');return$error;}throw new RuntimeException('FALHA: '.$message.' (nenhuma exceção)');}
function p4_counts($db,array$tables){$result=array();foreach($tables as$table)$result[$table]=(int)$db->query('SELECT COUNT(*) FROM dbo.'.$table)->fetchColumn();return$result;}
function p4_input($year,$quarter,$suffix,$evidence=false){return array('plano'=>'Plano '.$suffix,'pilar'=>'Pilar '.$suffix,'tituloExecutivo'=>'Título '.$suffix,'descricaoOficial'=>'Descrição '.$suffix,'objetivo'=>'Objetivo '.$suffix,'unidadeResponsavel'=>'UNIDADE_A','diretoriaResponsavel'=>'DIRETORIA_A','anoInicio'=>$year,'trimestreInicio'=>$quarter,'previsaoConclusao'=>null,'exigeEvidencia'=>$evidence,'ativo'=>true);}
function p4_payload($status='EM_ANDAMENTO',$reference=''){return array('statusIniciativa'=>$status,'andamentoUnidade'=>'Andamento controlado','referenciaEvidencia'=>$reference,'itens'=>in_array($status,array('CONCLUIDA','CANCELADA'),true)?array():array(array('tipo'=>'PROXIMO_PASSO','titulo'=>'Próximo','descricao'=>'Próximo passo controlado','status'=>'ABERTO')));}
function p4_period_rows(array$rows,$year){return array_values(array_filter($rows,function($row)use($year){return$row['ano']===$year;}));}

$pdo=Database::getConnection();
$tables=array('indicadores','lancamentos','homologacoes','evidencias','auditoria','configuracoes','usuarios_acesso','iniciativas_estrategicas','iniciativas_acompanhamentos','iniciativas_acompanhamento_itens','iniciativas_homologacoes','iniciativas_evidencias');
$initiativeTables=array('iniciativas_estrategicas','iniciativas_acompanhamentos','iniciativas_acompanhamento_itens','iniciativas_homologacoes','iniciativas_evidencias');
$baseline=p4_counts($pdo,$tables);
p4_ok($pdo->query('SELECT DB_NAME()')->fetchColumn()==='Estrategia','banco atual deve ser Estrategia');
foreach($initiativeTables as$table){$exists=$pdo->prepare("SELECT COUNT(*) FROM sys.tables WHERE object_id=OBJECT_ID(:table)");$exists->execute(array(':table'=>'dbo.'.$table));p4_ok((int)$exists->fetchColumn()===1,'tabela '.$table.' deve existir');p4_ok($baseline[$table]===0,'tabela '.$table.' deve iniciar vazia');}
echo 'BASELINE '.json_encode($baseline,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).PHP_EOL;

$db=new Phase4RollbackConnection($pdo);$db->beginReal();
$admin=array('perfil'=>'administrador','matricula'=>'ADMIN_FASE4');
$unit=array('perfil'=>'unidade_apuradora','matricula'=>'UNIDADE_FASE4','unidade_apuradora'=>'UNIDADE_A');
$reviewer=array('perfil'=>'homologador','matricula'=>'HOMOLOGADOR_FASE4','diretoria_responsavel'=>'DIRETORIA_A');
$consultant=array('perfil'=>'consultor_diretoria','matricula'=>'CONSULTOR_FASE4','diretoria_responsavel'=>'DIRETORIA_A');
$outside=array('perfil'=>'unidade_apuradora','matricula'=>'OUTRO_FASE4','unidade_apuradora'=>'UNIDADE_B');
$initiatives=new IniciativaService($db);$tracking=new IniciativaAcompanhamentoService($db);$decisions=new IniciativaHomologacaoService($db);$evidenceService=new IniciativaEvidenciaService($db);
$masters=new IniciativasRepository($db);$records=new IniciativasAcompanhamentosRepository($db);$evidences=new IniciativasEvidenciasRepository($db);$configs=new ConfiguracoesRepository($db);

$physicalFolder=UPLOAD_PATH.'/iniciativas-phase4-database';$physicalFixture=$physicalFolder.'/evidencia.pdf';
try{
    // Cadastro, sequência anual, inativação e sete snapshots.
    $created=$initiatives->create(p4_input(2092,'1TRI','A'),$admin);$master=$created['iniciativa'];$rows=$created['acompanhamentos'];
    p4_ok($master['codigo']==='INI-2092-001','primeiro código anual');
    p4_ok(count($rows)===4,'1TRI deve criar quatro períodos');
    $second=$initiatives->create(p4_input(2092,'4TRI','SEGUNDO'),$admin);p4_ok($second['iniciativa']['codigo']==='INI-2092-002','sequência no mesmo ano');
    $newYear=$initiatives->create(p4_input(2093,'4TRI','NOVO_ANO'),$admin);p4_ok($newYear['iniciativa']['codigo']==='INI-2093-001','sequência reinicia no novo ano');
    p4_throws('UnexpectedValueException',function()use($initiatives,$master,$unit){$initiatives->masterDetail($master['id'],$unit);},'detalhe mestre deve ser exclusivo do administrador');
    $initiatives->setActive($master['id'],false,$admin);p4_ok(!$masters->find($master['id'])['ativo'],'inativação lógica');$initiatives->setActive($master['id'],true,$admin);p4_ok($masters->find($master['id'])['ativo'],'reativação lógica');

    $first=$rows[0];$tracking->saveDraft($first['id'],array('statusIniciativa'=>'NAO_INICIADA','andamentoUnidade'=>'Conteúdo A','referenciaEvidencia'=>'','itens'=>array()),$unit);
    $inputB=p4_input(2092,'1TRI','B');$inputB['unidadeResponsavel']='UNIDADE_B';$inputB['diretoriaResponsavel']='DIRETORIA_B';$inputB['justificativa']='Atualização controlada dos dados oficiais';$updated=$initiatives->update($master['id'],$inputB,$admin);
    p4_ok(count($updated['snapshotsAtualizados'])===3,'somente períodos futuros elegíveis devem atualizar');
    $afterRows=$records->byInitiative($master['id']);$historical=$afterRows[0];$future=$afterRows[1];
    $snapshotMap=array('planoSnapshot'=>'Plano ','pilarSnapshot'=>'Pilar ','tituloSnapshot'=>'Título ','descricaoSnapshot'=>'Descrição ','objetivoSnapshot'=>'Objetivo ','unidadeSnapshot'=>'UNIDADE_','diretoriaSnapshot'=>'DIRETORIA_');
    foreach($snapshotMap as$field=>$prefix){p4_ok(strpos($historical[$field],$prefix.'A')===0,$field.' histórico deve preservar A');p4_ok(strpos($future[$field],$prefix.'B')===0,$field.' futuro elegível deve receber B');}
    $onlyTitle=$inputB;$onlyTitle['tituloExecutivo']='Título sem justificativa';$onlyTitle['justificativa']='';p4_throws('DomainException',function()use($initiatives,$master,$onlyTitle,$admin){$initiatives->update($master['id'],$onlyTitle,$admin);},'título de snapshot exige justificativa');

    // Períodos, competências e datas de referência.
    $expected=array('1TRI'=>array(4,'03','2094-03-31'),'2TRI'=>array(3,'06','2095-06-30'),'3TRI'=>array(2,'09','2096-09-30'),'4TRI'=>array(1,'12','2097-12-31'));
    foreach($expected as$quarter=>$expect){$year=2094+array_search($quarter,array_keys($expected),true);$result=$initiatives->create(p4_input($year,$quarter,'PERIODO_'.$quarter),$admin);p4_ok(count($result['acompanhamentos'])===$expect[0],$quarter.' quantidade');$row=$result['acompanhamentos'][0];p4_ok($row['trimestre']===$quarter&&substr($row['competencia'],5,2)===$expect[1]&&$row['dataReferencia']===$expect[2],$quarter.' competência e referência');}

    // Todos os impedimentos da atualização prospectiva.
    $blockers=array('rascunho','status','andamento','referencia','item','evidencia','submissao','homologacao','reabertura','participacao','responsavel');$index=0;
    foreach($blockers as$blocker){$year=2040+$index++;$fixture=$initiatives->create(p4_input($year,'4TRI','BLOQUEIO_'.$blocker),$admin);$record=$fixture['acompanhamentos'][0];$id=$record['id'];
        if($blocker==='rascunho')$db->prepare("UPDATE dbo.iniciativas_acompanhamentos SET status_fluxo='EM_PREENCHIMENTO' WHERE id=:id")->execute(array(':id'=>$id));
        elseif($blocker==='status')$db->prepare("UPDATE dbo.iniciativas_acompanhamentos SET status_iniciativa='NAO_INICIADA' WHERE id=:id")->execute(array(':id'=>$id));
        elseif($blocker==='andamento')$db->prepare("UPDATE dbo.iniciativas_acompanhamentos SET andamento_unidade='x' WHERE id=:id")->execute(array(':id'=>$id));
        elseif($blocker==='referencia')$db->prepare("UPDATE dbo.iniciativas_acompanhamentos SET referencia_evidencia='protocolo x' WHERE id=:id")->execute(array(':id'=>$id));
        elseif($blocker==='item')$records->replaceItems($id,array(array('id'=>'','tipo'=>'MARCO_ENTREGA','titulo'=>'M','descricao'=>'Marco','status'=>'OK','ordem'=>0)));
        elseif($blocker==='evidencia')$evidences->create(array('acompanhamento_id'=>$id,'nome_arquivo'=>'teste.pdf','tipo_arquivo'=>'application/pdf','caminho_arquivo'=>UPLOAD_PATH.'/inexistente.pdf','descricao'=>'fixture','usuario'=>'TESTE'));
        elseif($blocker==='submissao')(new IniciativasHomologacoesRepository($db))->record($id,'submissao_iniciativa','NAO_INICIADO','ENVIADO_HOMOLOGACAO',null,array('matricula'=>'TESTE','perfil'=>'Unidade'));
        elseif($blocker==='homologacao')(new IniciativasHomologacoesRepository($db))->record($id,'homologacao_iniciativa','ENVIADO_HOMOLOGACAO','HOMOLOGADO',null,array('matricula'=>'TESTE','perfil'=>'Homologador'));
        elseif($blocker==='reabertura')$db->prepare("UPDATE dbo.iniciativas_acompanhamentos SET status_fluxo='REABERTO' WHERE id=:id")->execute(array(':id'=>$id));
        elseif($blocker==='participacao')(new AuditoriaRepository($db))->append(array('entidade'=>'iniciativas_acompanhamentos','registroId'=>$id,'acao'=>'acompanhamento_salvo','usuario'=>'TESTE','perfilUsuario'=>'Unidade'));
        elseif($blocker==='responsavel')$db->prepare("UPDATE dbo.iniciativas_acompanhamentos SET usuario_responsavel='TESTE' WHERE id=:id")->execute(array(':id'=>$id));
        p4_ok(!in_array($id,$records->eligibleSnapshotsForUpdate($fixture['iniciativa']['id']),true),'snapshot deve bloquear por '.$blocker);
    }

    // Itens dos três tipos, ordem, edição, remoção e IDs estáveis.
    $itemFixture=$initiatives->create(p4_input(2080,'4TRI','ITENS'),$admin);$itemId=$itemFixture['acompanhamentos'][0]['id'];
    $itemPayload=p4_payload();$itemPayload['itens']=array(array('tipo'=>'MARCO_ENTREGA','titulo'=>'Marco A','descricao'=>'Descrição A','status'=>'ABERTO'),array('tipo'=>'PROXIMO_PASSO','titulo'=>'Passo B','descricao'=>'Descrição B','status'=>'ABERTO'),array('tipo'=>'FRENTE_PROJETO','titulo'=>'Frente C','descricao'=>'Descrição C','status'=>'ATIVA'));
    $tracking->saveDraft($itemId,$itemPayload,$unit);$stored=$records->items($itemId);p4_ok(count($stored)===3,'três tipos de item persistidos');$ids=array();foreach($stored as$item)$ids[$item['tipo']]=$item['id'];
    $edit=array();foreach($stored as$item){$edit[]=array('id'=>$item['id'],'tipo'=>$item['tipo'],'titulo'=>$item['titulo'],'descricao'=>$item['tipo']==='PROXIMO_PASSO'?'Descrição B editada':$item['descricao'],'status'=>$item['status']);}$itemPayload['itens']=array_reverse($edit);$tracking->saveDraft($itemId,$itemPayload,$unit);$edited=$records->items($itemId);foreach($edited as$item)p4_ok($item['id']===$ids[$item['tipo']],'ID estável de '.$item['tipo']);p4_ok(count(array_filter($edited,function($item){return$item['tipo']==='FRENTE_PROJETO'&&$item['titulo']==='Frente C'&&$item['status']==='ATIVA';}))===1,'FRENTE_PROJETO completo');
    $itemPayload['itens']=array_values(array_filter($itemPayload['itens'],function($item){return$item['tipo']!=='MARCO_ENTREGA';}));$tracking->saveDraft($itemId,$itemPayload,$unit);p4_ok(count($records->items($itemId))===2,'remoção de item');

    // Submissão, evidência opcional/obrigatória, escopo e segregação histórica.
    $optional=$initiatives->create(p4_input(2081,'4TRI','OPCIONAL',false),$admin);$optionalId=$optional['acompanhamentos'][0]['id'];$submitted=$tracking->submit($optionalId,p4_payload('EM_ANDAMENTO',''),$unit);p4_ok($submitted['acompanhamento']['statusFluxo']==='ENVIADO_HOMOLOGACAO','evidência opcional sem referência');p4_throws('LogicException',function()use($tracking,$optionalId,$unit){$tracking->submit($optionalId,p4_payload('EM_ANDAMENTO',''),$unit);},'segunda submissão concorrente deve encontrar estado inválido');
    p4_throws('UnexpectedValueException',function()use($decisions,$optionalId,$unit){$changed=$unit;$changed['perfil']='consultor_diretoria';$changed['diretoria_responsavel']='DIRETORIA_A';$decisions->approve($optionalId,$changed);},'mudança de perfil não contorna segregação');
    $approved=$decisions->approve($optionalId,$reviewer);p4_ok($approved['statusFluxo']==='HOMOLOGADO','homologação válida');p4_throws('LogicException',function()use($decisions,$optionalId,$reviewer){$decisions->approve($optionalId,$reviewer);},'segunda homologação concorrente deve encontrar estado inválido');

    $requiredNone=$initiatives->create(p4_input(2082,'4TRI','OBRIGATORIA_SEM',true),$admin);p4_throws('DomainException',function()use($tracking,$requiredNone,$unit){$tracking->submit($requiredNone['acompanhamentos'][0]['id'],p4_payload('EM_ANDAMENTO',''),$unit);},'evidência obrigatória ausente bloqueia');
    $requiredReference=$initiatives->create(p4_input(2083,'4TRI','OBRIGATORIA_REF',true),$admin);$tracking->submit($requiredReference['acompanhamentos'][0]['id'],p4_payload('EM_ANDAMENTO','Protocolo corporativo 123'),$unit);
    $requiredFile=$initiatives->create(p4_input(2084,'4TRI','OBRIGATORIA_ARQ',true),$admin);$requiredFileId=$requiredFile['acompanhamentos'][0]['id'];$evidences->create(array('acompanhamento_id'=>$requiredFileId,'nome_arquivo'=>'evidencia.pdf','tipo_arquivo'=>'application/pdf','caminho_arquivo'=>UPLOAD_PATH.'/fixture-inexistente.pdf','descricao'=>'fixture transacional','usuario'=>$unit['matricula']));$tracking->submit($requiredFileId,p4_payload('EM_ANDAMENTO',''),$unit);
    $removeFixture=$initiatives->create(p4_input(2077,'4TRI','REMOCAO_EVIDENCIA'),$admin);$removeId=$removeFixture['acompanhamentos'][0]['id'];if(!is_dir($physicalFolder))mkdir($physicalFolder,0750,true);file_put_contents($physicalFixture,"%PDF-1.4\nfixture");$removable=$evidences->create(array('acompanhamento_id'=>$removeId,'nome_arquivo'=>'evidencia.pdf','tipo_arquivo'=>'application/pdf','caminho_arquivo'=>$physicalFixture,'descricao'=>'remoção controlada','usuario'=>$unit['matricula']));p4_throws('UnexpectedValueException',function()use($evidenceService,$removable,$outside){$evidenceService->remove($removable['id'],$outside);},'remoção fora do escopo bloqueia');$evidenceService->remove($removable['id'],$unit);p4_ok(!$evidences->find($removable['id'])&&!is_file($physicalFixture),'remoção autorizada mantém arquivo e SQL consistentes');
    $missingStatus=$initiatives->create(p4_input(2085,'4TRI','SEM_STATUS'),$admin);p4_throws('DomainException',function()use($tracking,$missingStatus,$unit){$payload=p4_payload();$payload['statusIniciativa']='';$tracking->submit($missingStatus['acompanhamentos'][0]['id'],$payload,$unit);},'status ausente bloqueia');
    $missingProgress=$initiatives->create(p4_input(2086,'4TRI','SEM_ANDAMENTO'),$admin);p4_throws('DomainException',function()use($tracking,$missingProgress,$unit){$payload=p4_payload();$payload['andamentoUnidade']='';$tracking->submit($missingProgress['acompanhamentos'][0]['id'],$payload,$unit);},'andamento ausente bloqueia');
    $missingNext=$initiatives->create(p4_input(2087,'4TRI','SEM_PASSO'),$admin);p4_throws('DomainException',function()use($tracking,$missingNext,$unit){$payload=p4_payload();$payload['itens']=array();$tracking->submit($missingNext['acompanhamentos'][0]['id'],$payload,$unit);},'próximo passo obrigatório bloqueia');
    $concluded=$initiatives->create(p4_input(2088,'4TRI','CONCLUIDA'),$admin);$tracking->submit($concluded['acompanhamentos'][0]['id'],p4_payload('CONCLUIDA',''),$unit);
    $invalid=$initiatives->create(p4_input(2089,'4TRI','INVALIDO'),$admin);p4_throws('DomainException',function()use($tracking,$invalid,$unit){$tracking->saveDraft($invalid['acompanhamentos'][0]['id'],p4_payload('INVALIDO',''),$unit);},'status inválido bloqueia');p4_throws('UnexpectedValueException',function()use($tracking,$invalid,$outside){$tracking->saveDraft($invalid['acompanhamentos'][0]['id'],p4_payload(),$outside);},'troca de ID fora do escopo bloqueia');

    // Devolução, consolidação, destaques, preservação e revisão após reabertura.
    $returnFixture=$initiatives->create(p4_input(2078,'4TRI','DEVOLUCAO'),$admin);$returnId=$returnFixture['acompanhamentos'][0]['id'];$tracking->submit($returnId,p4_payload(),$unit);p4_throws('DomainException',function()use($decisions,$returnId,$reviewer){$decisions->returnForAdjustment($returnId,'   ',$reviewer);},'devolução exige justificativa');p4_ok($decisions->returnForAdjustment($returnId,'Corrigir informação',$reviewer)['statusFluxo']==='DEVOLVIDO_AJUSTE','devolução válida');
    $consolidation=$initiatives->create(p4_input(2079,'4TRI','CONSOLIDACAO'),$admin);$consolidationId=$consolidation['acompanhamentos'][0]['id'];$payload=p4_payload();$payload['itens'][]=array('tipo'=>'MARCO_ENTREGA','titulo'=>'Marco destaque','descricao'=>'Entrega','status'=>'OK');$tracking->submit($consolidationId,$payload,$unit);$decisions->approve($consolidationId,$reviewer);$items=$records->items($consolidationId);$highlight='';foreach($items as$item)if($item['tipo']==='MARCO_ENTREGA')$highlight=$item['id'];$decisions->consolidate($consolidationId,'Síntese executiva preservada',array($highlight),$admin);$beforeReopen=$records->find($consolidationId);p4_ok($beforeReopen['statusConsolidacaoCa']==='CONSOLIDADA','primeira consolidação');$reopened=$decisions->reopen($consolidationId,'Ajuste solicitado',$consultant);p4_ok($reopened['statusConsolidacaoCa']==='REVISAO_NECESSARIA'&&$reopened['sinteseExecutivaCa']==='Síntese executiva preservada','reabertura preserva síntese e exige revisão');$tracking->submit($consolidationId,$payload,$unit);$rehomologated=$decisions->approve($consolidationId,$reviewer);p4_ok($rehomologated['statusConsolidacaoCa']==='REVISAO_NECESSARIA','nova homologação mantém revisão necessária');$highlight='';foreach($records->items($consolidationId)as$item)if($item['tipo']==='MARCO_ENTREGA')$highlight=$item['id'];$decisions->consolidate($consolidationId,'Síntese revisada',array($highlight),$admin);p4_ok($records->find($consolidationId)['statusConsolidacaoCa']==='CONSOLIDADA','nova consolidação encerra revisão');

    // Geração anual e bloqueio dos períodos posteriores.
    $annual=array();foreach(array('SEM_POSICAO'=>'','SUSPENSA'=>'SUSPENSA','CONCLUIDA'=>'CONCLUIDA','CANCELADA'=>'CANCELADA')as$name=>$status){$fixture=$initiatives->create(p4_input(2060,'4TRI','ANUAL_'.$name),$admin);$annual[$name]=$fixture['iniciativa'];if($status!==''){$id=$fixture['acompanhamentos'][0]['id'];$stmt=$db->prepare("UPDATE dbo.iniciativas_acompanhamentos SET status_fluxo='HOMOLOGADO',status_iniciativa=:status WHERE id=:id");$stmt->execute(array(':status'=>$status,':id'=>$id));}}
    $inactive=$initiatives->create(p4_input(2060,'4TRI','ANUAL_INATIVA'),$admin);$initiatives->setActive($inactive['iniciativa']['id'],false,$admin);$initiatives->generateYear(2061,$admin);p4_ok(count(p4_period_rows($records->byInitiative($annual['SEM_POSICAO']['id']),2061))===4,'sem posição gera');p4_ok(count(p4_period_rows($records->byInitiative($annual['SUSPENSA']['id']),2061))===4,'suspensa gera');p4_ok(count(p4_period_rows($records->byInitiative($annual['CONCLUIDA']['id']),2061))===0,'concluída não gera');p4_ok(count(p4_period_rows($records->byInitiative($annual['CANCELADA']['id']),2061))===0,'cancelada não gera');p4_ok(count(p4_period_rows($records->byInitiative($inactive['iniciativa']['id']),2061))===0,'inativa não gera');$initiatives->generateYear(2061,$admin);p4_ok(count(p4_period_rows($records->byInitiative($annual['SEM_POSICAO']['id']),2061))===4,'geração anual idempotente');p4_ok(count(p4_period_rows($records->byInitiative($master['id']),2061))===0,'não gera período anterior ao início da iniciativa');

    foreach(array('CONCLUIDA'=>true,'CANCELADA'=>true,'SUSPENSA'=>false)as$status=>$mustBlock){$year=2030+array_search($status,array_keys(array('CONCLUIDA'=>1,'CANCELADA'=>1,'SUSPENSA'=>1)),true);$fixture=$initiatives->create(p4_input($year,'1TRI','POSTERIOR_'.$status),$admin);$periods=$fixture['acompanhamentos'];$stmt=$db->prepare("UPDATE dbo.iniciativas_acompanhamentos SET status_fluxo='HOMOLOGADO',status_iniciativa=:status WHERE id=:id");$stmt->execute(array(':status'=>$status,':id'=>$periods[1]['id']));if($mustBlock)p4_throws('LogicException',function()use($tracking,$periods,$unit){$tracking->saveDraft($periods[2]['id'],p4_payload(),$unit);},'posição '.$status.' bloqueia período posterior');else p4_ok($tracking->saveDraft($periods[2]['id'],p4_payload(),$unit)['acompanhamento']['statusFluxo']==='EM_PREENCHIMENTO','suspensa não bloqueia período posterior');p4_ok(count($records->byInitiative($fixture['iniciativa']['id']))===4,'períodos futuros não são apagados');}

    // Fechamento e ciclo excepcional usando configuração transacional.
    $closed=$initiatives->create(p4_input(2026,'4TRI','FECHAMENTO'),$admin);$closedId=$closed['acompanhamentos'][0]['id'];$stmt=$db->prepare("UPDATE dbo.iniciativas_acompanhamentos SET status_fluxo='HOMOLOGADO',status_iniciativa='EM_ANDAMENTO' WHERE id=:id");$stmt->execute(array(':id'=>$closedId));$configs->setCouncilClosures(array(array('periodo'=>'4TRI/2026','competencias'=>array('2026-12'),'dataReuniao'=>'2026-10-20','dataFechamento'=>'2026-10-15','ativo'=>true)));p4_throws('UnexpectedValueException',function()use($decisions,$closedId,$consultant){$decisions->reopen($closedId,'Normal',$consultant);},'reabertura normal após fechamento bloqueia');$exceptional=$decisions->reopen($closedId,'Exceção administrativa justificada',$admin);p4_ok($exceptional['statusFluxo']==='REABERTO','reabertura excepcional');$tracking->saveDraft($closedId,p4_payload(),$unit);$tracking->submit($closedId,p4_payload(),$unit);$decisions->approve($closedId,$reviewer);p4_ok(!(new IniciativasHomologacoesRepository($db))->exceptionalCycleActive($closedId),'nova homologação encerra ciclo excepcional');

    // Auditoria e histórico essenciais.
    $actionRows=$db->query("SELECT DISTINCT acao FROM dbo.auditoria WHERE entidade IN ('iniciativas_estrategicas','iniciativas_acompanhamentos')")->fetchAll();$actions=array_map(function($row){return(string)$row['acao'];},$actionRows);echo 'AUDITORIA_FASE4 '.json_encode($actions,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).PHP_EOL;foreach(array('iniciativa_criada','iniciativa_alterada','iniciativa_inativada','iniciativa_reativada','acompanhamento_criado','acompanhamento_salvo','acompanhamento_submetido','acompanhamento_devolvido','acompanhamento_homologado','acompanhamento_reaberto','reabertura_excepcional_pos_fechamento_ca','sintese_ca_criada','sintese_ca_alterada','destaque_ca_alterado','evidencia_iniciativa_removida')as$action)p4_ok(in_array($action,$actions,true),'auditoria '.$action);

    // A restrição UNIQUE permanece como defesa final. Executado por último, antes do rollback real.
    $duplicate=array('codigo'=>$master['codigo'],'plano'=>'Plano duplicado','pilar'=>'Pilar duplicado','titulo_executivo'=>'Título duplicado','descricao_oficial'=>'Descrição duplicada','objetivo'=>'Objetivo duplicado','unidade_responsavel'=>'UNIDADE_A','diretoria_responsavel'=>'DIRETORIA_A','ano_inicio'=>2092,'trimestre_inicio'=>'4TRI','previsao_conclusao'=>null,'exige_evidencia'=>false,'ativo'=>true,'created_by'=>'TESTE');p4_throws('Throwable',function()use($masters,$duplicate){$masters->create($duplicate);},'UNIQUE deve rejeitar código duplicado');
}catch(Throwable$error){$db->rollbackReal();if(is_file($physicalFixture))unlink($physicalFixture);if(is_dir($physicalFolder))rmdir($physicalFolder);fwrite(STDERR,$error->getMessage().PHP_EOL);exit(1);}
$db->rollbackReal();
if(is_file($physicalFixture))unlink($physicalFixture);if(is_dir($physicalFolder))rmdir($physicalFolder);
$after=p4_counts($pdo,$tables);p4_ok($after===$baseline,'rollback deve restaurar todas as contagens do baseline');
echo 'FASE4_DB snapshots=7 cadastro=OK codigo=OK periodos=OK itens=3 evidencias=OK workflow=OK governanca=OK rollback=OK'.PHP_EOL;
