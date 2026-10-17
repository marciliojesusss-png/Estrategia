<?php
declare(strict_types=1);

final class IniciativasHomologacoesRepository
{
    private $db;
    public function __construct($db){$this->db=$db;}

    public function record($accompanimentId,$action,$before,$after,$reason,array$user)
    {
        $stmt=$this->db->prepare('INSERT INTO dbo.iniciativas_homologacoes (id,acompanhamento_id,acao,status_anterior,status_novo,justificativa,usuario,perfil_usuario) VALUES (:id,:acompanhamento,:acao,:anterior,:novo,:justificativa,:usuario,:perfil)');
        $stmt->execute(array(':id'=>uniqid('iniciativa-hom-',true),':acompanhamento'=>(string)$accompanimentId,':acao'=>$action,':anterior'=>$before,':novo'=>$after,':justificativa'=>$reason,':usuario'=>$user['matricula'],':perfil'=>$user['perfil']));
    }

    public function history($accompanimentId)
    {
        $stmt=$this->db->prepare('SELECT id,acao,status_anterior,status_novo,justificativa,usuario,perfil_usuario,data_acao FROM dbo.iniciativas_homologacoes WHERE acompanhamento_id=:id ORDER BY data_acao,id');
        $stmt->execute(array(':id'=>(string)$accompanimentId));return$stmt->fetchAll();
    }

    public function latestSubmissionUser($accompanimentId)
    {
        $stmt=$this->db->prepare("SELECT TOP 1 usuario FROM dbo.iniciativas_homologacoes WHERE acompanhamento_id=:id AND acao='submissao_iniciativa' ORDER BY data_acao DESC,created_at DESC,id DESC");
        $stmt->execute(array(':id'=>(string)$accompanimentId));$value=$stmt->fetchColumn();return$value===false||$value===null?'':(string)$value;
    }

    public function participantUsers($accompanimentId,array$actions)
    {
        $params=array(':id'=>(string)$accompanimentId);$holders=array();
        foreach(array_values($actions)as$index=>$action){$key=':acao_'.$index;$holders[]=$key;$params[$key]=(string)$action;}
        $users=array();
        if($holders){$stmt=$this->db->prepare("SELECT DISTINCT usuario FROM dbo.auditoria WHERE entidade='iniciativas_acompanhamentos' AND entidade_id=:id AND acao IN (".implode(',',$holders).')');$stmt->execute($params);foreach($stmt->fetchAll()as$row)$users[]=$row['usuario'];}
        $submission=$this->db->prepare("SELECT DISTINCT usuario FROM dbo.iniciativas_homologacoes WHERE acompanhamento_id=:id AND acao='submissao_iniciativa'");
        $submission->execute(array(':id'=>(string)$accompanimentId));foreach($submission->fetchAll()as$row)$users[]=$row['usuario'];
        return array_values(array_unique(array_filter($users,function($value){return trim((string)$value)!=='';})));
    }

    public function exceptionalCycleActive($accompanimentId)
    {
        $stmt=$this->db->prepare("SELECT TOP 1 acao FROM dbo.iniciativas_homologacoes WHERE acompanhamento_id=:id AND acao IN ('reabertura_excepcional_pos_fechamento_ca','iniciativa_reaberta','homologacao_iniciativa') ORDER BY data_acao DESC,created_at DESC,id DESC");
        $stmt->execute(array(':id'=>(string)$accompanimentId));return$stmt->fetchColumn()==='reabertura_excepcional_pos_fechamento_ca';
    }
}
