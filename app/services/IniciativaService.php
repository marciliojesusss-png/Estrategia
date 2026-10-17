<?php
declare(strict_types=1);

require_once __DIR__.'/../repositories/IniciativasRepository.php';
require_once __DIR__.'/../repositories/IniciativasAcompanhamentosRepository.php';
require_once __DIR__.'/../repositories/IniciativasHomologacoesRepository.php';
require_once __DIR__.'/../repositories/AuditoriaRepository.php';
require_once __DIR__.'/../repositories/ConfiguracoesRepository.php';
require_once __DIR__.'/GovernancaHomologacao.php';

final class IniciativaService
{
    private $db;private $initiatives;private $accompaniments;private $audit;private $config;
    public function __construct($db){$this->db=$db;$this->initiatives=new IniciativasRepository($db);$this->accompaniments=new IniciativasAcompanhamentosRepository($db);$this->audit=new AuditoriaRepository($db);$this->config=new ConfiguracoesRepository($db);}

    public function listAll(array$filters,array$user){return$this->accompaniments->listAll($filters,$user);}

    public function masterDetail($id,array$user)
    {
        $this->assertAdministrator($user);
        $master=$this->initiatives->find($id);if(!$master)throw new OutOfBoundsException('Iniciativa não encontrada.');
        $scope=array('unidade_responsavel'=>$master['unidadeResponsavel'],'diretoria_responsavel'=>$master['diretoriaResponsavel']);
        if(!AccessPolicy::initiativeScopeAllows($user,$scope))throw new UnexpectedValueException('Iniciativa fora do escopo autorizado.');
        return array('iniciativa'=>$master,'acompanhamentos'=>$this->accompaniments->byInitiative($id));
    }

    public function create(array$input,array$actor)
    {
        $this->assertAdministrator($actor);$data=$this->validate($input,null);$this->db->beginTransaction();
        try{
            $data['codigo']=$this->initiatives->nextCodeForYearForUpdate($data['ano_inicio']);$data['created_by']=$actor['matricula'];
            $master=$this->initiatives->create($data);$created=array();$quarters=array('1TRI','2TRI','3TRI','4TRI');$start=array_search($master['trimestreInicio'],$quarters,true);
            for($index=$start;$index<count($quarters);$index++){$record=$this->accompaniments->createFromMaster($master,$master['anoInicio'],$quarters[$index],$actor['matricula']);$created[]=$record;$this->audit($record['id'],'acompanhamento_criado',null,$record,$actor);}
            $this->audit($master['id'],'iniciativa_criada',null,$master,$actor,'iniciativas_estrategicas');$this->db->commit();return array('iniciativa'=>$master,'acompanhamentos'=>$created);
        }catch(Throwable$error){if($this->db->inTransaction())$this->db->rollBack();if(strpos($error->getMessage(),'2601')!==false||strpos($error->getMessage(),'2627')!==false)throw new LogicException('Não foi possível reservar o código da iniciativa. Tente novamente.');throw$error;}
    }

    public function update($id,array$input,array$actor)
    {
        $this->assertAdministrator($actor);$this->db->beginTransaction();
        try{
            $before=$this->initiatives->findForUpdate($id);if(!$before)throw new OutOfBoundsException('Iniciativa não encontrada.');
            $data=$this->validate($input,$before);$sensitive=array('plano'=>'plano','pilar'=>'pilar','titulo_executivo'=>'tituloExecutivo','descricao_oficial'=>'descricaoOficial','objetivo'=>'objetivo','unidade_responsavel'=>'unidadeResponsavel','diretoria_responsavel'=>'diretoriaResponsavel');$changedSensitive=array();
            foreach($sensitive as$key=>$mapped)if($data[$key]!==$before[$mapped])$changedSensitive[]=$key;
            $reason=trim(isset($input['justificativa'])?(string)$input['justificativa']:'');if($changedSensitive&&$reason==='')throw new DomainException('Justificativa obrigatória para alteração de campos sensíveis.');
            $after=$this->initiatives->update($id,$data);$eligible=$this->accompaniments->eligibleSnapshotsForUpdate($id);$updatedSnapshots=array();$closures=$this->config->get(GovernancaHomologacao::CLOSURES_KEY,array());
            foreach($eligible as$accompanimentId){$record=$this->accompaniments->findForUpdate($accompanimentId);$policy=GovernancaHomologacao::initiativeMutationPolicy($record,$closures,false);if(empty($policy['permitida']))continue;$this->accompaniments->updateSnapshot($accompanimentId,$after);$updatedSnapshots[]=$accompanimentId;}
            $this->audit($id,'iniciativa_alterada',$before,array('iniciativa'=>$after,'justificativa'=>$reason,'camposSensiveis'=>$changedSensitive,'snapshotsAtualizados'=>$updatedSnapshots),$actor,'iniciativas_estrategicas');$this->db->commit();return array('iniciativa'=>$after,'snapshotsAtualizados'=>$updatedSnapshots);
        }catch(Throwable$error){if($this->db->inTransaction())$this->db->rollBack();throw$error;}
    }

    public function setActive($id,$active,array$actor)
    {
        $this->assertAdministrator($actor);$this->db->beginTransaction();try{$before=$this->initiatives->findForUpdate($id);if(!$before)throw new OutOfBoundsException('Iniciativa não encontrada.');$after=$this->initiatives->setActive($id,$active);$this->audit($id,$active?'iniciativa_reativada':'iniciativa_inativada',$before,$after,$actor,'iniciativas_estrategicas');$this->db->commit();return$after;}catch(Throwable$error){if($this->db->inTransaction())$this->db->rollBack();throw$error;}
    }

    public function generateYear($year,array$actor)
    {
        $this->assertAdministrator($actor);$year=(int)$year;if($year<1900||$year>9999)throw new DomainException('Ano inválido para geração.');$this->db->beginTransaction();
        try{$created=array();$skipped=array();foreach($this->initiatives->activeForGenerationForUpdate()as$master){if($year<$master['anoInicio'])continue;$last=$this->accompaniments->latestHomologatedStatus($master['id']);if(in_array($last,array('CONCLUIDA','CANCELADA'),true)){$skipped[]=$master['codigo'];continue;}foreach(array('1TRI','2TRI','3TRI','4TRI')as$quarter){$competence=sprintf('%04d-%02d',$year,array('1TRI'=>3,'2TRI'=>6,'3TRI'=>9,'4TRI'=>12)[$quarter]);if($this->accompaniments->exists($master['id'],$competence))continue;$record=$this->accompaniments->createFromMaster($master,$year,$quarter,$actor['matricula']);$created[]=$record;$this->audit($record['id'],'acompanhamento_criado',null,$record,$actor);}}$this->db->commit();return array('criados'=>$created,'ignoradasEncerradas'=>$skipped,'quantidade'=>count($created));}catch(Throwable$error){if($this->db->inTransaction())$this->db->rollBack();throw$error;}
    }

    private function validate(array$input,$before)
    {
        $value=function($camel,$snake,$fallback='')use($input,$before){if(array_key_exists($camel,$input))return$input[$camel];if(array_key_exists($snake,$input))return$input[$snake];if($before&&array_key_exists($camel,$before))return$before[$camel];return$fallback;};
        $data=array('plano'=>trim((string)$value('plano','plano')),'pilar'=>trim((string)$value('pilar','pilar')),'titulo_executivo'=>trim((string)$value('tituloExecutivo','titulo_executivo')),'descricao_oficial'=>trim((string)$value('descricaoOficial','descricao_oficial')),'objetivo'=>trim((string)$value('objetivo','objetivo')),'unidade_responsavel'=>trim((string)$value('unidadeResponsavel','unidade_responsavel')),'diretoria_responsavel'=>trim((string)$value('diretoriaResponsavel','diretoria_responsavel')),'ano_inicio'=>(int)$value('anoInicio','ano_inicio',$before?$before['anoInicio']:0),'trimestre_inicio'=>trim((string)$value('trimestreInicio','trimestre_inicio',$before?$before['trimestreInicio']:'')),'previsao_conclusao'=>trim((string)$value('previsaoConclusao','previsao_conclusao')),'exige_evidencia'=>$this->boolValue($value('exigeEvidencia','exige_evidencia',false)),'ativo'=>$this->boolValue($value('ativo','ativo',true)));
        foreach(array('plano','pilar','titulo_executivo','descricao_oficial','objetivo','unidade_responsavel','diretoria_responsavel')as$key)if($data[$key]==='')throw new DomainException('Preencha todos os campos obrigatórios da iniciativa.');
        if($data['ano_inicio']<1900||$data['ano_inicio']>9999)throw new DomainException('Ano de início inválido.');if(!in_array($data['trimestre_inicio'],array('1TRI','2TRI','3TRI','4TRI'),true))throw new DomainException('Trimestre de início inválido.');
        if($data['previsao_conclusao']==='')$data['previsao_conclusao']=null;elseif(!$this->validDate($data['previsao_conclusao']))throw new DomainException('Previsão de conclusão inválida.');return$data;
    }

    private function validDate($value){$date=DateTime::createFromFormat('!Y-m-d',(string)$value);return$date&&$date->format('Y-m-d')===(string)$value;}
    private function boolValue($value){return is_bool($value)?$value:filter_var($value,FILTER_VALIDATE_BOOLEAN);}
    private function assertAdministrator(array$actor){if(($actor['perfil']??'')!=='administrador')throw new UnexpectedValueException('Apenas Administradores podem administrar iniciativas.');}
    private function audit($id,$action,$before,$after,array$actor,$entity='iniciativas_acompanhamentos'){$this->audit->append(array('entidade'=>$entity,'registroId'=>$id,'acao'=>$action,'valorAnterior'=>$before,'valorNovo'=>$after,'usuario'=>$actor['matricula'],'perfilUsuario'=>GovernancaHomologacao::profileLabel($actor['perfil'])));}
}
