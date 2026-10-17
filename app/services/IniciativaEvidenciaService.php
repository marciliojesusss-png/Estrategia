<?php
declare(strict_types=1);

require_once __DIR__.'/EvidenciaStorage.php';
require_once __DIR__.'/IniciativaStateMachine.php';
require_once __DIR__.'/GovernancaHomologacao.php';
require_once __DIR__.'/../repositories/IniciativasEvidenciasRepository.php';
require_once __DIR__.'/../repositories/IniciativasAcompanhamentosRepository.php';
require_once __DIR__.'/../repositories/IniciativasHomologacoesRepository.php';
require_once __DIR__.'/../repositories/AuditoriaRepository.php';
require_once __DIR__.'/../repositories/ConfiguracoesRepository.php';

final class IniciativaEvidenciaService
{
    private $db;private $storage;private $evidence;private $records;private $homologations;private $audit;private $config;
    public function __construct($db,EvidenciaStorage$storage=null){$this->db=$db;$this->storage=$storage?:new EvidenciaStorage();$this->evidence=new IniciativasEvidenciasRepository($db);$this->records=new IniciativasAcompanhamentosRepository($db);$this->homologations=new IniciativasHomologacoesRepository($db);$this->audit=new AuditoriaRepository($db);$this->config=new ConfiguracoesRepository($db);}

    public function listForAccompaniment($id,array$user){$record=$this->authorizedRecord($id,$user,false);return array_map(array($this,'publicEvidence'),$this->evidence->byAccompaniment($record['id']));}

    public function attach($id,array$file,$description,array$user)
    {
        $record=$this->authorizedRecord($id,$user,true);$validation=$this->storage->validate($file);if(!$validation['valid'])throw new DomainException(implode(' ',$validation['errors']));$directory=UPLOAD_PATH.'/iniciativas/'.hash('sha256',(string)$id);$stored=$this->storage->storeIn($file,$validation,$directory);
        try{$this->db->beginTransaction();$locked=$this->records->findForUpdate($id);if(!$locked)throw new OutOfBoundsException('Acompanhamento não encontrado.');$this->assertWritable($locked,$user);$evidence=$this->evidence->create(array('acompanhamento_id'=>$id,'nome_arquivo'=>$validation['original'],'tipo_arquivo'=>$validation['mime'],'caminho_arquivo'=>$stored['path'],'descricao'=>trim((string)$description),'usuario'=>$user['matricula']));$this->auditAction($id,'evidencia_iniciativa_anexada',null,$this->publicEvidence($evidence),$user);$this->db->commit();return$this->publicEvidence($evidence);}catch(Throwable$error){if($this->db->inTransaction())$this->db->rollBack();$this->storage->remove($stored['path']);throw$error;}
    }

    public function remove($id,array$user)
    {
        $removal=null;$this->db->beginTransaction();try{$evidence=$this->evidence->findForUpdate($id);if(!$evidence)throw new OutOfBoundsException('Evidência não encontrada.');$record=$this->records->findForUpdate($evidence['acompanhamento_id']);if(!$record)throw new OutOfBoundsException('Acompanhamento não encontrado.');$this->assertWritable($record,$user);$removal=$this->storage->stageRemoval($evidence['caminho_arquivo']);if(!$this->evidence->delete($id))throw new LogicException('Evidência alterada por outra requisição.');$this->auditAction($record['id'],'evidencia_iniciativa_removida',$this->publicEvidence($evidence),null,$user);$this->db->commit();}catch(Throwable$error){if($this->db->inTransaction())$this->db->rollBack();if($removal!==null&&!$this->storage->restoreStaged($removal))Logger::error('Falha ao restaurar arquivo de iniciativa após rollback.',array('id'=>$id));throw$error;}if(!$this->storage->finalizeStaged($removal))Logger::error('Arquivo de iniciativa pendente de limpeza.',array('id'=>$id));return true;
    }

    public function download($id,array$user){$evidence=$this->evidence->find($id);if(!$evidence||!is_file($evidence['caminho_arquivo']))throw new OutOfBoundsException('Evidência não encontrada.');$this->authorizedRecord($evidence['acompanhamento_id'],$user,false);return$evidence;}

    private function authorizedRecord($id,array$user,$write){$record=$this->records->find($id);if(!$record)throw new OutOfBoundsException('Acompanhamento não encontrado.');if(!AccessPolicy::initiativeScopeAllows($user,$record))throw new UnexpectedValueException('Acompanhamento fora do escopo autorizado.');if($write)$this->assertWritable($record,$user);return$record;}
    private function assertWritable(array$record,array$user){if(!AccessPolicy::initiativeScopeAllows($user,$record))throw new UnexpectedValueException('Acompanhamento fora do escopo autorizado.');if(!in_array($user['perfil'],array('administrador','unidade_apuradora'),true))throw new UnexpectedValueException('Perfil sem permissão para alterar evidências.');if(!IniciativaStateMachine::editable($record['statusFluxo']))throw new LogicException('Evidências só podem ser alteradas em acompanhamento editável.');GovernancaHomologacao::assertInitiativeMutable($record,$this->config->get(GovernancaHomologacao::CLOSURES_KEY,array()),$this->homologations->exceptionalCycleActive($record['id']));}
    private function publicEvidence(array$row){return array('id'=>$row['id'],'acompanhamentoId'=>$row['acompanhamento_id'],'nomeArquivo'=>$row['nome_arquivo'],'tipoArquivo'=>$row['tipo_arquivo'],'descricao'=>$row['descricao'],'dataUpload'=>$row['data_upload'],'usuario'=>$row['usuario']);}
    private function auditAction($id,$action,$before,$after,array$user){$this->audit->append(array('entidade'=>'iniciativas_acompanhamentos','registroId'=>$id,'acao'=>$action,'valorAnterior'=>$before,'valorNovo'=>$after,'usuario'=>$user['matricula'],'perfilUsuario'=>GovernancaHomologacao::profileLabel($user['perfil'])));}
}
