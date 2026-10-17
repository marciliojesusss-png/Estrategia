<?php
declare(strict_types=1);

require_once __DIR__.'/IniciativaStateMachine.php';
require_once __DIR__.'/GovernancaHomologacao.php';
require_once __DIR__.'/../repositories/IniciativasAcompanhamentosRepository.php';
require_once __DIR__.'/../repositories/IniciativasHomologacoesRepository.php';
require_once __DIR__.'/../repositories/IniciativasEvidenciasRepository.php';
require_once __DIR__.'/../repositories/AuditoriaRepository.php';
require_once __DIR__.'/../repositories/ConfiguracoesRepository.php';

final class IniciativaAcompanhamentoService
{
    private $db;private $repo;private $homologations;private $evidence;private $audit;private $config;
    public function __construct($db){$this->db=$db;$this->repo=new IniciativasAcompanhamentosRepository($db);$this->homologations=new IniciativasHomologacoesRepository($db);$this->evidence=new IniciativasEvidenciasRepository($db);$this->audit=new AuditoriaRepository($db);$this->config=new ConfiguracoesRepository($db);}

    public function detail($id,array$user)
    {
        $record=$this->repo->find($id);if(!$record)throw new OutOfBoundsException('Acompanhamento não encontrado.');$this->assertScope($record,$user);
        $evidence=array_map(array($this,'publicEvidence'),$this->evidence->byAccompaniment($id));$history=$this->homologations->history($id);
        $policy=GovernancaHomologacao::initiativeMutationPolicy($record,$this->config->get(GovernancaHomologacao::CLOSURES_KEY,array()),$this->homologations->exceptionalCycleActive($id));
        return array('acompanhamento'=>$record,'itens'=>$this->repo->items($id),'evidencias'=>$evidence,'historico'=>$history,'politicaMutacao'=>$policy,'podeEditar'=>$this->canEdit($record,$user)&&IniciativaStateMachine::editable($record['statusFluxo'])&&!empty($policy['permitida']));
    }

    public function saveDraft($id,array$input,array$user)
    {
        $this->db->beginTransaction();try{$before=$this->repo->findForUpdate($id);if(!$before)throw new OutOfBoundsException('Acompanhamento não encontrado.');$this->assertWritable($before,$user);$data=$this->normalize($input,true);$items=$this->normalizeItems(isset($input['itens'])&&is_array($input['itens'])?$input['itens']:array());$has=$data['status_iniciativa']!==null||$data['andamento_unidade']!==''||$data['referencia_evidencia']!==''||count($items)>0;$next=IniciativaStateMachine::draftStatus($before['statusFluxo'],$has);$beforeItems=$this->repo->items($id);if(!$this->repo->updateContent($id,$before['statusFluxo'],$data,$next,$user['matricula']))throw new LogicException('Acompanhamento alterado por outra requisição.');$this->repo->replaceItems($id,$items);$after=$this->repo->find($id);$afterItems=$this->repo->items($id);$this->audit($id,'acompanhamento_salvo',array('acompanhamento'=>$before,'itens'=>$beforeItems),array('acompanhamento'=>$after,'itens'=>$afterItems),$user);if(json_encode($beforeItems)!==json_encode($afterItems))$this->audit($id,'item_iniciativa_alterado',$beforeItems,$afterItems,$user);$this->db->commit();return$this->detail($id,$user);}catch(Throwable$error){if($this->db->inTransaction())$this->db->rollBack();throw$error;}
    }

    public function submit($id,array$input,array$user)
    {
        $this->db->beginTransaction();try{$before=$this->repo->findForUpdate($id);if(!$before)throw new OutOfBoundsException('Acompanhamento não encontrado.');$this->assertWritable($before,$user);IniciativaStateMachine::assertTransition($before['statusFluxo'],IniciativaStateMachine::SUBMITTED);$data=$this->normalize($input,false);$items=$this->normalizeItems(isset($input['itens'])&&is_array($input['itens'])?$input['itens']:array());$this->validateSubmission($before,$data,$items);$beforeItems=$this->repo->items($id);if(!$this->repo->updateContent($id,$before['statusFluxo'],$data,IniciativaStateMachine::SUBMITTED,$user['matricula']))throw new LogicException('Acompanhamento alterado por outra requisição.');$this->repo->replaceItems($id,$items);$this->homologations->record($id,'submissao_iniciativa',$before['statusFluxo'],IniciativaStateMachine::SUBMITTED,null,array('matricula'=>$user['matricula'],'perfil'=>GovernancaHomologacao::profileLabel($user['perfil'])));$after=$this->repo->find($id);$this->audit($id,'acompanhamento_submetido',array('acompanhamento'=>$before,'itens'=>$beforeItems),array('acompanhamento'=>$after,'itens'=>$this->repo->items($id)),$user);$this->db->commit();return$this->detail($id,$user);}catch(Throwable$error){if($this->db->inTransaction())$this->db->rollBack();throw$error;}
    }

    private function assertWritable(array$record,array$user)
    {
        $this->assertScope($record,$user);if(!$this->canEdit($record,$user))throw new UnexpectedValueException('Perfil sem permissão para preencher este acompanhamento.');if(!IniciativaStateMachine::editable($record['statusFluxo']))throw new LogicException('Acompanhamento não está disponível para edição.');
        if(!$record['iniciativaAtiva']&&$record['statusFluxo']===IniciativaStateMachine::NOT_STARTED)throw new LogicException('Iniciativa inativa não permite iniciar novo preenchimento.');$previous=$this->repo->previousHomologatedStatus($record['iniciativaId'],$record['dataReferencia']);if(in_array($previous,array('CONCLUIDA','CANCELADA'),true)&&in_array($record['statusFluxo'],array(IniciativaStateMachine::NOT_STARTED,IniciativaStateMachine::IN_PROGRESS),true))throw new LogicException('Período bloqueado por posição homologada concluída ou cancelada.');GovernancaHomologacao::assertInitiativeMutable($record,$this->config->get(GovernancaHomologacao::CLOSURES_KEY,array()),$this->homologations->exceptionalCycleActive($record['id']));
    }

    private function validateSubmission(array$record,array$data,array$items)
    {
        if($data['status_iniciativa']===null)throw new DomainException('Informe o status da iniciativa.');if($data['andamento_unidade']==='')throw new DomainException('Informe o andamento da Unidade antes do envio.');
        if(!in_array($data['status_iniciativa'],array('CONCLUIDA','CANCELADA'),true)){$next=0;foreach($items as$item)if($item['tipo']==='PROXIMO_PASSO')$next++;if($next===0)throw new DomainException('Informe ao menos um próximo passo.');}
        if($record['exigeEvidencia']&&$data['referencia_evidencia']===''&&$this->evidence->countByAccompaniment($record['id'])===0)throw new DomainException('Informe uma referência documental ou anexe uma evidência.');
    }

    private function normalize(array$input,$draft)
    {
        $status=trim(isset($input['statusIniciativa'])?(string)$input['statusIniciativa']:(isset($input['status_iniciativa'])?(string)$input['status_iniciativa']:''));if($status==='')$status=null;if($status!==null&&!in_array($status,array('NAO_INICIADA','EM_ANDAMENTO','CONCLUIDA','SUSPENSA','CANCELADA'),true))throw new DomainException('Status da iniciativa inválido.');return array('status_iniciativa'=>$status,'andamento_unidade'=>trim(isset($input['andamentoUnidade'])?(string)$input['andamentoUnidade']:(isset($input['andamento_unidade'])?(string)$input['andamento_unidade']:'')),'referencia_evidencia'=>trim(isset($input['referenciaEvidencia'])?(string)$input['referenciaEvidencia']:(isset($input['referencia_evidencia'])?(string)$input['referencia_evidencia']:'')));
    }

    private function normalizeItems(array$items)
    {
        $result=array();$types=array('MARCO_ENTREGA','PROXIMO_PASSO','FRENTE_PROJETO');foreach($items as$index=>$item){if(!is_array($item))throw new DomainException('Item de acompanhamento inválido.');$type=trim(isset($item['tipo'])?(string)$item['tipo']:'');$description=trim(isset($item['descricao'])?(string)$item['descricao']:'');if(!in_array($type,$types,true))throw new DomainException('Tipo de item inválido.');if($description==='')throw new DomainException('A descrição de cada item é obrigatória.');$result[]=array('id'=>isset($item['id'])?trim((string)$item['id']):'','tipo'=>$type,'titulo'=>trim(isset($item['titulo'])?(string)$item['titulo']:'')?:null,'descricao'=>$description,'status'=>trim(isset($item['status'])?(string)$item['status']:'')?:null,'ordem'=>$index);}return$result;
    }

    private function assertScope(array$record,array$user){if(!AccessPolicy::initiativeScopeAllows($user,$record))throw new UnexpectedValueException('Acompanhamento fora do escopo autorizado.');}
    private function canEdit(array$record,array$user){return in_array($user['perfil'],array('administrador','unidade_apuradora'),true);}
    private function publicEvidence(array$row){return array('id'=>$row['id'],'acompanhamentoId'=>$row['acompanhamento_id'],'nomeArquivo'=>$row['nome_arquivo'],'tipoArquivo'=>$row['tipo_arquivo'],'descricao'=>$row['descricao'],'dataUpload'=>$row['data_upload'],'usuario'=>$row['usuario']);}
    private function audit($id,$action,$before,$after,array$user){$this->audit->append(array('entidade'=>'iniciativas_acompanhamentos','registroId'=>$id,'acao'=>$action,'valorAnterior'=>$before,'valorNovo'=>$after,'usuario'=>$user['matricula'],'perfilUsuario'=>GovernancaHomologacao::profileLabel($user['perfil'])));}
}
