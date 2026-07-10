<?php
declare(strict_types=1);

final class DashboardRepository
{
    private $db;
    public function __construct(PDO $db){$this->db=$db;}

    public function indicators(array $filters)
    {
        $sql='SELECT * FROM indicadores WHERE 1=1';$p=array();
        foreach(array('plano','pilar','unidade_apuradora','diretoria_responsavel')as$column){if(isset($filters[$column])&&$filters[$column]!==''&&$filters[$column]!=='Todos'){$sql.=' AND '.$column.' = :'.$column;$p[':'.$column]=$filters[$column];}}
        $sql.=' ORDER BY plano,pilar,numero,id';$s=$this->db->prepare($sql);$s->execute($p);return$s->fetchAll();
    }

    public function launches(array $filters)
    {
        $sql='SELECT l.* FROM lancamentos l INNER JOIN indicadores i ON i.id=l.indicador_id WHERE 1=1';$p=array();
        foreach(array('plano'=>'i.plano','pilar'=>'i.pilar','unidade_apuradora'=>'l.unidade_apuradora','diretoria_responsavel'=>'l.diretoria_responsavel','ano'=>'l.ano','mes'=>'l.mes','status'=>'l.status')as$key=>$column){if(isset($filters[$key])&&$filters[$key]!==''&&$filters[$key]!=='Todos'){$sql.=' AND '.$column.' = :'.$key;$p[':'.$key]=$filters[$key];}}
        $sql.=' ORDER BY l.ano,l.mes,l.indicador_id,l.id';$s=$this->db->prepare($sql);$s->execute($p);return$s->fetchAll();
    }

    public function homologationCounts(array $filters)
    {
        $sql='SELECT h.status_novo AS status,COUNT(*) AS total FROM homologacoes h INNER JOIN lancamentos l ON l.id=h.lancamento_id INNER JOIN indicadores i ON i.id=l.indicador_id WHERE h.acao IN (:aprovacao,:rejeicao)';$p=array(':aprovacao'=>'homologacao_lancamento',':rejeicao'=>'devolucao_lancamento');
        foreach(array('plano'=>'i.plano','pilar'=>'i.pilar','unidade_apuradora'=>'l.unidade_apuradora','diretoria_responsavel'=>'l.diretoria_responsavel')as$key=>$column){if(isset($filters[$key])&&$filters[$key]!==''&&$filters[$key]!=='Todos'){$sql.=' AND '.$column.' = :'.$key;$p[':'.$key]=$filters[$key];}}
        if(!empty($filters['ano'])){$sql.=' AND l.ano=:ano';$p[':ano']=(int)$filters['ano'];}if(!empty($filters['mes'])&&$filters['mes']!=='Todos'){$sql.=' AND l.mes=:mes';$p[':mes']=(int)$filters['mes'];}
        $sql.=' GROUP BY h.status_novo';$s=$this->db->prepare($sql);$s->execute($p);$out=array();foreach($s->fetchAll()as$r)$out[$r['status']]=(int)$r['total'];return$out;
    }

    public function recent(array $filters,$limit=10)
    {
        $items=$this->launches($filters);usort($items,function($a,$b){return strcmp((string)$b['updated_at'],(string)$a['updated_at']);});return array_slice($items,0,max(1,min(25,(int)$limit)));
    }
}
