<?php
declare(strict_types=1);

final class IniciativasEvidenciasRepository
{
    private $db;public function __construct($db){$this->db=$db;}
    public function find($id){$s=$this->db->prepare('SELECT * FROM dbo.iniciativas_evidencias WHERE id=:id');$s->execute(array(':id'=>(string)$id));$r=$s->fetch();return$r?:null;}
    public function findForUpdate($id){$s=$this->db->prepare('SELECT * FROM dbo.iniciativas_evidencias WITH (UPDLOCK,HOLDLOCK) WHERE id=:id');$s->execute(array(':id'=>(string)$id));$r=$s->fetch();return$r?:null;}
    public function byAccompaniment($id){$s=$this->db->prepare('SELECT * FROM dbo.iniciativas_evidencias WHERE acompanhamento_id=:id ORDER BY data_upload,id');$s->execute(array(':id'=>(string)$id));return$s->fetchAll();}
    public function countByAccompaniment($id){$s=$this->db->prepare('SELECT COUNT(*) FROM dbo.iniciativas_evidencias WHERE acompanhamento_id=:id');$s->execute(array(':id'=>(string)$id));return(int)$s->fetchColumn();}
    public function create(array$d){$id=uniqid('iniciativa-evid-',true);$s=$this->db->prepare('INSERT INTO dbo.iniciativas_evidencias (id,acompanhamento_id,nome_arquivo,tipo_arquivo,caminho_arquivo,descricao,usuario) VALUES (:id,:acompanhamento,:nome,:tipo,:caminho,:descricao,:usuario)');$s->execute(array(':id'=>$id,':acompanhamento'=>$d['acompanhamento_id'],':nome'=>$d['nome_arquivo'],':tipo'=>$d['tipo_arquivo'],':caminho'=>$d['caminho_arquivo'],':descricao'=>$d['descricao'],':usuario'=>$d['usuario']));return$this->find($id);}
    public function delete($id){$s=$this->db->prepare('DELETE FROM dbo.iniciativas_evidencias WHERE id=:id');$s->execute(array(':id'=>(string)$id));return$s->rowCount()===1;}
}
