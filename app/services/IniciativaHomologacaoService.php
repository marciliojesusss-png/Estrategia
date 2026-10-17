<?php
declare(strict_types=1);

require_once __DIR__.'/IniciativaStateMachine.php';
require_once __DIR__.'/IniciativaAcompanhamentoService.php';
require_once __DIR__.'/GovernancaHomologacao.php';
require_once __DIR__.'/../repositories/IniciativasAcompanhamentosRepository.php';
require_once __DIR__.'/../repositories/IniciativasHomologacoesRepository.php';
require_once __DIR__.'/../repositories/AuditoriaRepository.php';
require_once __DIR__.'/../repositories/ConfiguracoesRepository.php';

final class IniciativaHomologacaoService
{
    private $db;private $records;private $homologations;private $audit;private $config;
    public function __construct($db){$this->db=$db;$this->records=new IniciativasAcompanhamentosRepository($db);$this->homologations=new IniciativasHomologacoesRepository($db);$this->audit=new AuditoriaRepository($db);$this->config=new ConfiguracoesRepository($db);}

    public function queue(array$user){$this->assertReviewerProfile($user);return$this->records->queue($user);}
    public function detail($id,array$user){$this->assertReviewerProfile($user);return(new IniciativaAcompanhamentoService($this->db))->detail($id,$user);}
    public function approve($id,array$user){return$this->decide($id,IniciativaStateMachine::HOMOLOGATED,'homologacao_iniciativa','',$user);}
    public function returnForAdjustment($id,$reason,array$user){$reason=trim((string)$reason);if($reason==='')throw new DomainException('Justificativa obrigatória para devolução.');return$this->decide($id,IniciativaStateMachine::RETURNED,'devolucao_iniciativa',$reason,$user);}

    private function decide($id,$target,$action,$reason,array$user)
    {
        $this->assertReviewerProfile($user);$this->db->beginTransaction();try{$before=$this->records->findForUpdate($id);if(!$before)throw new OutOfBoundsException('Acompanhamento não encontrado.');$this->assertScope($before,$user);IniciativaStateMachine::assertTransition($before['statusFluxo'],$target);$exceptional=$this->homologations->exceptionalCycleActive($id);GovernancaHomologacao::assertInitiativeMutable($before,$this->config->get(GovernancaHomologacao::CLOSURES_KEY,array()),$exceptional);GovernancaHomologacao::assertIndependentInitiativeReviewer($before,$this->homologations->latestSubmissionUser($id),$user,$this->homologations->participantUsers($id,GovernancaHomologacao::initiativeProductionActions()));if(!$this->records->updateWorkflow($id,$before['statusFluxo'],$target))throw new LogicException('Decisão processada por outra requisição.');$decisionUser=array('matricula'=>$user['matricula'],'perfil'=>GovernancaHomologacao::profileLabel($user['perfil']));$this->homologations->record($id,$action,$before['statusFluxo'],$target,$reason,$decisionUser);$after=$this->records->find($id);$this->auditAction($id,$target===IniciativaStateMachine::HOMOLOGATED?'acompanhamento_homologado':'acompanhamento_devolvido',$before,array('acompanhamento'=>$after,'justificativa'=>$reason),$user);$this->db->commit();return$after;}catch(Throwable$error){if($this->db->inTransaction())$this->db->rollBack();throw$error;}
    }

    public function reopen($id,$reason,array$user)
    {
        $this->assertReviewerProfile($user);$reason=trim((string)$reason);if($reason==='')throw new DomainException('Justificativa obrigatória para reabertura.');$this->db->beginTransaction();try{$before=$this->records->findForUpdate($id);if(!$before)throw new OutOfBoundsException('Acompanhamento não encontrado.');$this->assertScope($before,$user);IniciativaStateMachine::assertTransition($before['statusFluxo'],IniciativaStateMachine::REOPENED);$policy=GovernancaHomologacao::initiativeReopenPolicy($before,$user,$this->config->get(GovernancaHomologacao::CLOSURES_KEY,array()));if(empty($policy['permitida']))throw new UnexpectedValueException($policy['mensagem']);$consolidation=$before['statusConsolidacaoCa']==='CONSOLIDADA'?'REVISAO_NECESSARIA':$before['statusConsolidacaoCa'];if(!$this->records->updateWorkflow($id,$before['statusFluxo'],IniciativaStateMachine::REOPENED,$consolidation))throw new LogicException('Reabertura processada por outra requisição.');$action=!empty($policy['excepcional'])?'reabertura_excepcional_pos_fechamento_ca':'iniciativa_reaberta';$decisionUser=array('matricula'=>$user['matricula'],'perfil'=>GovernancaHomologacao::profileLabel($user['perfil']));$this->homologations->record($id,$action,$before['statusFluxo'],IniciativaStateMachine::REOPENED,$reason,$decisionUser);$after=$this->records->find($id);$this->auditAction($id,!empty($policy['excepcional'])?'reabertura_excepcional_pos_fechamento_ca':'acompanhamento_reaberto',$before,array('acompanhamento'=>$after,'justificativa'=>$reason,'politica'=>$policy),$user);$this->db->commit();return$after;}catch(Throwable$error){if($this->db->inTransaction())$this->db->rollBack();throw$error;}
    }

    public function consolidate($id,$synthesis,array$highlightIds,array$user)
    {
        if(($user['perfil']??'')!=='administrador')throw new UnexpectedValueException('Apenas Administradores podem consolidar para o CA.');$synthesis=trim((string)$synthesis);if($synthesis==='')throw new DomainException('Informe a síntese executiva para o CA.');$highlightIds=array_values(array_unique(array_map('strval',$highlightIds)));$this->db->beginTransaction();try{$before=$this->records->findForUpdate($id);if(!$before)throw new OutOfBoundsException('Acompanhamento não encontrado.');if($before['statusFluxo']!==IniciativaStateMachine::HOMOLOGATED)throw new LogicException('Somente acompanhamento homologado pode ser consolidado.');$beforeItems=$this->records->items($id);$allowed=array();foreach($beforeItems as$item)if(in_array($item['tipo'],array('MARCO_ENTREGA','PROXIMO_PASSO'),true))$allowed[]=(string)$item['id'];foreach($highlightIds as$itemId)if(!in_array($itemId,$allowed,true))throw new DomainException('Item de destaque inválido para este acompanhamento.');if(!$this->records->consolidate($id,$synthesis,$highlightIds))throw new LogicException('Acompanhamento deixou de estar disponível para consolidação.');$after=$this->records->find($id);$afterItems=$this->records->items($id);$action=trim((string)$before['sinteseExecutivaCa'])===''?'sintese_ca_criada':'sintese_ca_alterada';$this->auditAction($id,$action,array('acompanhamento'=>$before,'itens'=>$beforeItems),array('acompanhamento'=>$after,'itens'=>$afterItems),$user);if($this->highlights($beforeItems)!==$this->highlights($afterItems))$this->auditAction($id,'destaque_ca_alterado',$this->highlights($beforeItems),$this->highlights($afterItems),$user);$this->db->commit();return$after;}catch(Throwable$error){if($this->db->inTransaction())$this->db->rollBack();throw$error;}
    }

    private function highlights(array$items){$ids=array();foreach($items as$item)if(!empty($item['destaque_ca']))$ids[]=(string)$item['id'];sort($ids);return$ids;}
    private function assertReviewerProfile(array$user){if(!in_array($user['perfil']??'',array('administrador','homologador','consultor_diretoria'),true))throw new UnexpectedValueException('Perfil sem permissão para homologar iniciativas.');}
    private function assertScope(array$record,array$user){if(!AccessPolicy::initiativeScopeAllows($user,$record))throw new UnexpectedValueException('Acompanhamento fora da diretoria autorizada.');}
    private function auditAction($id,$action,$before,$after,array$user){$this->audit->append(array('entidade'=>'iniciativas_acompanhamentos','registroId'=>$id,'acao'=>$action,'valorAnterior'=>$before,'valorNovo'=>$after,'usuario'=>$user['matricula'],'perfilUsuario'=>GovernancaHomologacao::profileLabel($user['perfil'])));}
}
