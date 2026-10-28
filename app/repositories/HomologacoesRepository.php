<?php
declare(strict_types=1);

final class HomologacoesRepository
{
    private $db;
    public function __construct($db){$this->db=$db;}

    public function queue(array $filters,$page,$perPage)
    {
        $page=max(1,(int)$page);$perPage=max(1,min(100,(int)$perPage));list($where,$params)=$this->where($filters,true);
        $from=' FROM lancamentos l INNER JOIN indicadores i ON i.id=l.indicador_id';
        $c=$this->db->prepare('SELECT COUNT(*)'.$from.$where);$c->execute($params);$total=(int)$c->fetchColumn();
        $sql='SELECT l.*,i.nome AS indicador_nome'.$from.$where.' ORDER BY l.ano DESC,l.mes DESC,l.id ASC';
        $sql.=' OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY';
        $s=$this->db->prepare($sql);foreach($params as$k=>$v)$s->bindValue($k,$v);$s->bindValue(':offset',($page-1)*$perPage,PDO::PARAM_INT);$s->bindValue(':limit',$perPage,PDO::PARAM_INT);$s->execute();
        return array('items'=>$s->fetchAll(),'pagination'=>array('page'=>$page,'perPage'=>$perPage,'total'=>$total,'pages'=>$total?(int)ceil($total/$perPage):0));
    }

    public function history(array $filters,$page=1,$perPage=25)
    {
        $page=max(1,(int)$page);$perPage=max(1,min(100,(int)$perPage));list($where,$params)=$this->where($filters,false);
        $from=' FROM homologacoes h INNER JOIN lancamentos l ON l.id=h.lancamento_id INNER JOIN indicadores i ON i.id=l.indicador_id';
        $c=$this->db->prepare('SELECT COUNT(*)'.$from.$where);$c->execute($params);$total=(int)$c->fetchColumn();
        $sql='SELECT h.*,l.indicador_id,l.competencia,l.unidade_apuradora,l.diretoria_responsavel,i.nome AS indicador_nome'.$from.$where.' ORDER BY h.data_acao DESC,h.id DESC';
        $sql.=' OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY';$s=$this->db->prepare($sql);foreach($params as$k=>$v)$s->bindValue($k,$v);$s->bindValue(':offset',($page-1)*$perPage,PDO::PARAM_INT);$s->bindValue(':limit',$perPage,PDO::PARAM_INT);$s->execute();return array('items'=>$s->fetchAll(),'pagination'=>array('page'=>$page,'perPage'=>$perPage,'total'=>$total,'pages'=>$total?(int)ceil($total/$perPage):0));
    }

    public function recordDecision($launchId,$action,$before,$after,$reason,array$user)
    {
        $now=date('c');$s=$this->db->prepare('INSERT INTO homologacoes (id,lancamento_id,acao,status_anterior,status_novo,justificativa,usuario,perfil_usuario,data_acao,created_at) VALUES (:id,:lancamento,:acao,:anterior,:novo,:justificativa,:usuario,:perfil,:data,:created)');$s->execute(array(':id'=>uniqid('homologacao-',true),':lancamento'=>(string)$launchId,':acao'=>$action,':anterior'=>$before,':novo'=>$after,':justificativa'=>$reason,':usuario'=>$user['matricula'],':perfil'=>$user['perfil'],':data'=>$now,':created'=>$now));
    }

    public function recordSubmission($launchId, $before, $after, array $user)
    {
        $now = date('c');
        $stmt = $this->db->prepare('INSERT INTO homologacoes (id,lancamento_id,acao,status_anterior,status_novo,justificativa,usuario,perfil_usuario,data_acao,created_at) VALUES (:id,:lancamento,:acao,:anterior,:novo,:justificativa,:usuario,:perfil,:data,:created)');
        $stmt->execute(array(
            ':id' => uniqid('homologacao-', true), ':lancamento' => (string) $launchId,
            ':acao' => 'submissao_lancamento', ':anterior' => $before, ':novo' => $after,
            ':justificativa' => null, ':usuario' => $user['matricula'], ':perfil' => $user['perfil'],
            ':data' => $now, ':created' => $now,
        ));
    }

    public function latestSubmissionUser($launchId)
    {
        $stmt = $this->db->prepare(
            "SELECT TOP 1 usuario FROM homologacoes "
            . "WHERE lancamento_id=:lancamento AND acao='submissao_lancamento' "
            . 'ORDER BY data_acao DESC, created_at DESC, id DESC'
        );
        $stmt->execute(array(':lancamento' => (string) $launchId));
        $value = $stmt->fetchColumn();
        return $value === false || $value === null ? '' : (string) $value;
    }

    public function productionParticipantUsers($launchId, array $actions)
    {
        $params = array(':lancamento' => (string) $launchId);
        $placeholders = array();
        foreach (array_values($actions) as $index => $action) {
            $placeholder = ':acao_' . $index;
            $placeholders[] = $placeholder;
            $params[$placeholder] = (string) $action;
        }
        if (!$placeholders) return array();
        $stmt = $this->db->prepare(
            'SELECT DISTINCT usuario FROM auditoria '
            . "WHERE entidade='lancamentos' AND entidade_id=:lancamento AND acao IN (" . implode(',', $placeholders) . ')'
        );
        $stmt->execute($params);
        $users = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $submission = $this->db->prepare(
            "SELECT DISTINCT usuario FROM homologacoes WHERE lancamento_id=:lancamento AND acao='submissao_lancamento'"
        );
        $submission->execute(array(':lancamento' => (string) $launchId));
        return array_values(array_unique(array_filter(array_merge($users, $submission->fetchAll(PDO::FETCH_COLUMN)), function ($value) {
            return trim((string) $value) !== '';
        })));
    }

    public function exceptionalReopenCycleActive($launchId)
    {
        $stmt = $this->db->prepare(
            "SELECT TOP 1 acao FROM homologacoes WHERE lancamento_id=:lancamento "
            . "AND acao IN ('reabertura_excepcional_pos_fechamento_ca','lancamento_reaberto','homologacao_lancamento') "
            . 'ORDER BY data_acao DESC, created_at DESC, id DESC'
        );
        $stmt->execute(array(':lancamento' => (string) $launchId));
        return $stmt->fetchColumn() === 'reabertura_excepcional_pos_fechamento_ca';
    }

    public function reopenCycleActive($launchId)
    {
        $stmt = $this->db->prepare(
            "SELECT TOP 1 acao FROM homologacoes WHERE lancamento_id=:lancamento "
            . "AND acao IN ('reabertura_excepcional_pos_fechamento_ca','lancamento_reaberto','homologacao_lancamento') "
            . 'ORDER BY data_acao DESC, created_at DESC, id DESC'
        );
        $stmt->execute(array(':lancamento' => (string) $launchId));
        return in_array($stmt->fetchColumn(), array('reabertura_excepcional_pos_fechamento_ca', 'lancamento_reaberto'), true);
    }

    public function all(array $filters=array()){return $this->history($filters,1,100)['items'];}

    public function latestApprovalMetadata(array $launchIds)
    {
        $launchIds = array_values(array_unique(array_filter(array_map('strval', $launchIds), function ($id) {
            return trim($id) !== '';
        })));
        if (!$launchIds) return array();

        $params = array();
        $placeholders = array();
        foreach ($launchIds as $index => $launchId) {
            $placeholder = ':launch_' . $index;
            $placeholders[] = $placeholder;
            $params[$placeholder] = $launchId;
        }

        $sql = "WITH aprovacoes AS ("
            . " SELECT h.id,h.lancamento_id,h.usuario,h.perfil_usuario,h.data_acao,"
            . " ROW_NUMBER() OVER (PARTITION BY h.lancamento_id ORDER BY "
            . " TRY_CONVERT(datetimeoffset(7),h.data_acao,127) DESC,"
            . " TRY_CONVERT(datetimeoffset(7),h.created_at,127) DESC,h.id DESC) AS ordem"
            . " FROM homologacoes h WHERE h.acao=N'homologacao_lancamento'"
            . " AND h.status_novo=N'Homologado' AND h.lancamento_id IN (" . implode(',', $placeholders) . ")"
            . ") SELECT id,lancamento_id,usuario,perfil_usuario,data_acao FROM aprovacoes WHERE ordem=1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $result = array();
        foreach ($stmt->fetchAll() as $row) {
            $result[(string) $row['lancamento_id']] = array(
                'id' => (string) $row['id'],
                'usuario' => isset($row['usuario']) ? (string) $row['usuario'] : '',
                'perfil' => isset($row['perfil_usuario']) ? (string) $row['perfil_usuario'] : '',
                'data' => isset($row['data_acao']) ? (string) $row['data_acao'] : '',
            );
        }
        return $result;
    }

    public function latestSubmissionMetadata(array $launchIds)
    {
        $launchIds = array_values(array_unique(array_filter(array_map('strval', $launchIds), function ($id) {
            return trim($id) !== '';
        })));
        if (!$launchIds) return array();

        $params = array();
        $placeholders = array();
        foreach ($launchIds as $index => $launchId) {
            $placeholder = ':submission_' . $index;
            $placeholders[] = $placeholder;
            $params[$placeholder] = $launchId;
        }
        $sql = "WITH submissoes AS ("
            . " SELECT h.id,h.lancamento_id,h.usuario,h.perfil_usuario,h.data_acao,"
            . " ROW_NUMBER() OVER (PARTITION BY h.lancamento_id ORDER BY "
            . " TRY_CONVERT(datetimeoffset(7),h.data_acao,127) DESC,"
            . " TRY_CONVERT(datetimeoffset(7),h.created_at,127) DESC,h.id DESC) AS ordem"
            . " FROM homologacoes h WHERE h.acao=N'submissao_lancamento'"
            . " AND h.lancamento_id IN (" . implode(',', $placeholders) . ")"
            . ") SELECT id,lancamento_id,usuario,perfil_usuario,data_acao FROM submissoes WHERE ordem=1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $result = array();
        foreach ($stmt->fetchAll() as $row) {
            $result[(string) $row['lancamento_id']] = array(
                'id' => (string) $row['id'],
                'usuario' => isset($row['usuario']) ? (string) $row['usuario'] : '',
                'perfil' => isset($row['perfil_usuario']) ? (string) $row['perfil_usuario'] : '',
                'data' => isset($row['data_acao']) ? (string) $row['data_acao'] : '',
            );
        }
        return $result;
    }

    public function replaceAll(array $items)
    {
        $update=$this->db->prepare('UPDATE homologacoes SET lancamento_id=:lancamento,acao=:acao,status_anterior=:anterior,status_novo=:novo,justificativa=:justificativa,usuario=:usuario,perfil_usuario=:perfil,data_acao=:data,created_at=:created WHERE id=:id');
        $insert=$this->db->prepare('INSERT INTO homologacoes (id,lancamento_id,acao,status_anterior,status_novo,justificativa,usuario,perfil_usuario,data_acao,created_at) VALUES (:id,:lancamento,:acao,:anterior,:novo,:justificativa,:usuario,:perfil,:data,:created)');
        $this->db->beginTransaction();
        try{foreach($items as$item){$now=date('c');$p=array(':id'=>(string)(isset($item['id'])?$item['id']:uniqid('homologacao-',true)),':lancamento'=>(string)(isset($item['lancamentoId'])?$item['lancamentoId']:(isset($item['lancamento_id'])?$item['lancamento_id']:'')),':acao'=>isset($item['acao'])?$item['acao']:'registro',':anterior'=>isset($item['statusAnterior'])?$item['statusAnterior']:(isset($item['status_anterior'])?$item['status_anterior']:null),':novo'=>isset($item['statusNovo'])?$item['statusNovo']:(isset($item['status_novo'])?$item['status_novo']:null),':justificativa'=>isset($item['justificativa'])?$item['justificativa']:null,':usuario'=>isset($item['usuario'])?$item['usuario']:null,':perfil'=>isset($item['perfilUsuario'])?$item['perfilUsuario']:(isset($item['perfil_usuario'])?$item['perfil_usuario']:null),':data'=>isset($item['dataAcao'])?$item['dataAcao']:(isset($item['data_acao'])?$item['data_acao']:$now),':created'=>isset($item['createdAt'])?$item['createdAt']:$now);$update->execute($p);if($update->rowCount()===0){$exists=$this->db->prepare('SELECT COUNT(*) FROM homologacoes WHERE id=:id');$exists->execute(array(':id'=>$p[':id']));if((int)$exists->fetchColumn()===0)$insert->execute($p);}}$this->db->commit();}catch(Throwable$error){if($this->db->inTransaction())$this->db->rollBack();throw$error;}
    }

    private function where(array$f,$pending)
    {
        $a=$pending?'l':'h';$conditions=array();$p=array();if($pending){$conditions[]="(l.status = :pending OR l.status = :pending_accented)";$p[':pending']='Enviado para homologacao';$p[':pending_accented']='Enviado para homologação';}
        $map=array('indicadorId'=>'l.indicador_id','unidade_apuradora'=>'l.unidade_apuradora','diretoria_responsavel'=>'l.diretoria_responsavel','status'=>$pending?'l.status':'h.status_novo');foreach($map as$k=>$col){$v=isset($f[$k])?$f[$k]:(isset($f[lcfirst(str_replace('_','',ucwords($k,'_')))])?$f[lcfirst(str_replace('_','',ucwords($k,'_')))]:null);if($v!==null&&$v!==''&&$v!=='Todos'){$conditions[]=$col.' = :f_'.count($p);$p[':f_'.count($p)]=$v;}}
        if(!empty($f['dataInicial'])){$conditions[]=($pending?'l.created_at':'h.data_acao').' >= :inicio';$p[':inicio']=$f['dataInicial'];}if(!empty($f['dataFinal'])){$conditions[]=($pending?'l.created_at':'h.data_acao').' <= :fim';$p[':fim']=$f['dataFinal'].'T23:59:59';}
        return array($conditions?' WHERE '.implode(' AND ',$conditions):'',$p);
    }
}


