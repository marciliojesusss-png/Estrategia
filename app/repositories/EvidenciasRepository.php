<?php
declare(strict_types=1);
final class EvidenciasRepository
{
    private $db; public function __construct(PDO $db){$this->db=$db;}
    public function find($id){$s=$this->db->prepare('SELECT * FROM evidencias WHERE id=:id');$s->execute(array(':id'=>(string)$id));$r=$s->fetch();return $r?:null;}
    public function byLaunch($id){$s=$this->db->prepare('SELECT * FROM evidencias WHERE lancamento_id=:id ORDER BY data_upload,id');$s->execute(array(':id'=>(string)$id));return $s->fetchAll();}
    public function create(array $d){$id=uniqid('evidencia-',true);$now=date('c');$s=$this->db->prepare('INSERT INTO evidencias (id,lancamento_id,nome_arquivo,tipo_arquivo,caminho_arquivo,descricao,data_upload,usuario,created_at) VALUES (:id,:lancamento,:nome,:tipo,:caminho,:descricao,:data,:usuario,:created)');$s->execute(array(':id'=>$id,':lancamento'=>$d['lancamento_id'],':nome'=>$d['nome_arquivo'],':tipo'=>$d['tipo_arquivo'],':caminho'=>$d['caminho_arquivo'],':descricao'=>$d['descricao'],':data'=>$now,':usuario'=>$d['usuario'],':created'=>$now));return $this->find($id);}
    public function delete($id){$s=$this->db->prepare('DELETE FROM evidencias WHERE id=:id');$s->execute(array(':id'=>(string)$id));return $s->rowCount()===1;}
}
