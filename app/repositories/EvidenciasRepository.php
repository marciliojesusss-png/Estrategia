<?php
declare(strict_types=1);
final class EvidenciasRepository
{
    private $db; public function __construct($db){$this->db=$db;}
    public function find($id){$s=$this->db->prepare('SELECT * FROM evidencias WHERE id=:id');$s->execute(array(':id'=>(string)$id));$r=$s->fetch();return $r?:null;}
    /** Evidencias validas para a versao corrente do lancamento. */
    public function byLaunch($id){$s=$this->db->prepare('SELECT e.* FROM evidencias e INNER JOIN lancamentos l ON l.id=e.lancamento_id WHERE e.lancamento_id=:id AND e.versao_lancamento=l.versao_atual ORDER BY e.data_upload,e.id');$s->execute(array(':id'=>(string)$id));return $s->fetchAll();}
    public function historicalByLaunch($id){$s=$this->db->prepare('SELECT e.* FROM evidencias e INNER JOIN lancamentos l ON l.id=e.lancamento_id WHERE e.lancamento_id=:id AND e.versao_lancamento<l.versao_atual ORDER BY e.versao_lancamento DESC,e.data_upload,e.id');$s->execute(array(':id'=>(string)$id));return $s->fetchAll();}
    public function allByLaunch($id){$s=$this->db->prepare('SELECT * FROM evidencias WHERE lancamento_id=:id ORDER BY versao_lancamento,data_upload,id');$s->execute(array(':id'=>(string)$id));return $s->fetchAll();}
    public function hasCurrent($id){$s=$this->db->prepare('SELECT COUNT(*) FROM evidencias e INNER JOIN lancamentos l ON l.id=e.lancamento_id WHERE e.lancamento_id=:id AND e.versao_lancamento=l.versao_atual');$s->execute(array(':id'=>(string)$id));return (int)$s->fetchColumn()>0;}
    public function create(array $d){$id=uniqid('evidencia-',true);$now=date('c');$s=$this->db->prepare('INSERT INTO evidencias (id,lancamento_id,versao_lancamento,nome_arquivo,tipo_arquivo,caminho_arquivo,descricao,data_upload,usuario,created_at) VALUES (:id,:lancamento,:versao,:nome,:tipo,:caminho,:descricao,:data,:usuario,:created)');$s->execute(array(':id'=>$id,':lancamento'=>$d['lancamento_id'],':versao'=>(int)$d['versao_lancamento'],':nome'=>$d['nome_arquivo'],':tipo'=>$d['tipo_arquivo'],':caminho'=>$d['caminho_arquivo'],':descricao'=>$d['descricao'],':data'=>$now,':usuario'=>$d['usuario'],':created'=>$now));return $this->find($id);}
    public function delete($id){$s=$this->db->prepare('DELETE FROM evidencias WHERE id=:id');$s->execute(array(':id'=>(string)$id));return $s->rowCount()===1;}
}


