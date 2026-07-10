<?php
declare(strict_types=1);

final class HomologacoesRepository
{
    private $db; private $driver;
    public function __construct(PDO $db){$this->db=$db;$this->driver=(string)$db->getAttribute(PDO::ATTR_DRIVER_NAME);}

    public function queue(array $filters,$page,$perPage)
    {
        $page=max(1,(int)$page);$perPage=max(1,min(100,(int)$perPage));list($where,$params)=$this->where($filters,true);
        $from=' FROM lancamentos l INNER JOIN indicadores i ON i.id=l.indicador_id';
        $c=$this->db->prepare('SELECT COUNT(*)'.$from.$where);$c->execute($params);$total=(int)$c->fetchColumn();
        $sql='SELECT l.*,i.nome AS indicador_nome'.$from.$where.' ORDER BY l.ano DESC,l.mes DESC,l.id ASC';
        $sql.=$this->driver==='sqlsrv'?' OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY':' LIMIT :limit OFFSET :offset';
        $s=$this->db->prepare($sql);foreach($params as$k=>$v)$s->bindValue($k,$v);$s->bindValue(':offset',($page-1)*$perPage,PDO::PARAM_INT);$s->bindValue(':limit',$perPage,PDO::PARAM_INT);$s->execute();
        return array('items'=>$s->fetchAll(),'pagination'=>array('page'=>$page,'perPage'=>$perPage,'total'=>$total,'pages'=>$total?(int)ceil($total/$perPage):0));
    }

    public function history(array $filters,$page=1,$perPage=25)
    {
        $page=max(1,(int)$page);$perPage=max(1,min(100,(int)$perPage));list($where,$params)=$this->where($filters,false);
        $from=' FROM homologacoes h INNER JOIN lancamentos l ON l.id=h.lancamento_id INNER JOIN indicadores i ON i.id=l.indicador_id';
        $c=$this->db->prepare('SELECT COUNT(*)'.$from.$where);$c->execute($params);$total=(int)$c->fetchColumn();
        $sql='SELECT h.*,l.indicador_id,l.competencia,l.unidade_apuradora,l.diretoria_responsavel,i.nome AS indicador_nome'.$from.$where.' ORDER BY h.data_acao DESC,h.id DESC';
        $sql.=$this->driver==='sqlsrv'?' OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY':' LIMIT :limit OFFSET :offset';$s=$this->db->prepare($sql);foreach($params as$k=>$v)$s->bindValue($k,$v);$s->bindValue(':offset',($page-1)*$perPage,PDO::PARAM_INT);$s->bindValue(':limit',$perPage,PDO::PARAM_INT);$s->execute();return array('items'=>$s->fetchAll(),'pagination'=>array('page'=>$page,'perPage'=>$perPage,'total'=>$total,'pages'=>$total?(int)ceil($total/$perPage):0));
    }

    public function recordDecision($launchId,$action,$before,$after,$reason,array$user)
    {
        $now=date('c');$s=$this->db->prepare('INSERT INTO homologacoes (id,lancamento_id,acao,status_anterior,status_novo,justificativa,usuario,perfil_usuario,data_acao,created_at) VALUES (:id,:lancamento,:acao,:anterior,:novo,:justificativa,:usuario,:perfil,:data,:created)');$s->execute(array(':id'=>uniqid('homologacao-',true),':lancamento'=>(string)$launchId,':acao'=>$action,':anterior'=>$before,':novo'=>$after,':justificativa'=>$reason,':usuario'=>$user['matricula'],':perfil'=>$user['perfil'],':data'=>$now,':created'=>$now));
    }

    public function all(array $filters=array()){return $this->history($filters,1,100)['items'];}

    private function where(array$f,$pending)
    {
        $a=$pending?'l':'h';$conditions=array();$p=array();if($pending)$conditions[]="l.status = :pending";$p[':pending']=$pending?'Enviado para homologacao':null;if(!$pending)unset($p[':pending']);
        $map=array('indicadorId'=>'l.indicador_id','unidade_apuradora'=>'l.unidade_apuradora','diretoria_responsavel'=>'l.diretoria_responsavel','status'=>$pending?'l.status':'h.status_novo');foreach($map as$k=>$col){$v=isset($f[$k])?$f[$k]:(isset($f[lcfirst(str_replace('_','',ucwords($k,'_')))])?$f[lcfirst(str_replace('_','',ucwords($k,'_')))]:null);if($v!==null&&$v!==''&&$v!=='Todos'){$conditions[]=$col.' = :f_'.count($p);$p[':f_'.count($p)]=$v;}}
        if(!empty($f['dataInicial'])){$conditions[]=($pending?'l.created_at':'h.data_acao').' >= :inicio';$p[':inicio']=$f['dataInicial'];}if(!empty($f['dataFinal'])){$conditions[]=($pending?'l.created_at':'h.data_acao').' <= :fim';$p[':fim']=$f['dataFinal'].'T23:59:59';}
        return array($conditions?' WHERE '.implode(' AND ',$conditions):'',$p);
    }
}
