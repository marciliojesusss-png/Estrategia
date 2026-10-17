<?php
declare(strict_types=1);

final class IniciativasAcompanhamentosRepository
{
    private $db;

    public function __construct($db) { $this->db = $db; }

    public function listAll(array $filters, array $user)
    {
        $sql = 'SELECT a.*,i.codigo,i.exige_evidencia,i.ativo FROM dbo.iniciativas_acompanhamentos a '
            . 'INNER JOIN dbo.iniciativas_estrategicas i ON i.id=a.iniciativa_id WHERE 1=1';
        $params = array();
        $map = array('ano'=>'a.ano','trimestre'=>'a.trimestre','pilar'=>'a.pilar_snapshot','unidade'=>'a.unidade_snapshot','diretoria'=>'a.diretoria_snapshot','statusIniciativa'=>'a.status_iniciativa','statusFluxo'=>'a.status_fluxo');
        foreach ($map as $key => $column) {
            $value = isset($filters[$key]) ? trim((string) $filters[$key]) : '';
            if ($value !== '' && $value !== 'Todos') {
                $placeholder = ':f_' . $key;
                $sql .= ' AND ' . $column . '=' . $placeholder;
                $params[$placeholder] = $key === 'ano' ? (int) $value : $value;
            }
        }
        $profile = isset($user['perfil']) ? $user['perfil'] : 'usuario_companhia';
        if ($profile === 'unidade_apuradora') {
            $sql .= ' AND UPPER(LTRIM(RTRIM(a.unidade_snapshot)))=UPPER(LTRIM(RTRIM(:scope_unit)))';
            $params[':scope_unit'] = isset($user['unidade_apuradora']) ? $user['unidade_apuradora'] : '';
        } elseif (in_array($profile, array('homologador','consultor_diretoria'), true)) {
            $sql .= ' AND UPPER(LTRIM(RTRIM(a.diretoria_snapshot)))=UPPER(LTRIM(RTRIM(:scope_board)))';
            $params[':scope_board'] = isset($user['diretoria_responsavel']) ? $user['diretoria_responsavel'] : '';
        } elseif ($profile !== 'administrador') {
            $sql .= ' AND 1=0';
        }
        $sql .= ' ORDER BY a.ano DESC,CASE a.trimestre WHEN N\'4TRI\' THEN 4 WHEN N\'3TRI\' THEN 3 WHEN N\'2TRI\' THEN 2 ELSE 1 END DESC,i.codigo';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return array_map(array($this, 'map'), $stmt->fetchAll());
    }

    public function queue(array $user)
    {
        return $this->listAll(array('statusFluxo' => 'ENVIADO_HOMOLOGACAO'), $user);
    }

    public function find($id)
    {
        return $this->findInternal($id, false);
    }

    public function findForUpdate($id)
    {
        return $this->findInternal($id, true);
    }

    private function findInternal($id, $lock)
    {
        $hint = $lock ? ' WITH (UPDLOCK,HOLDLOCK)' : '';
        $stmt = $this->db->prepare(
            'SELECT a.*,i.codigo,i.exige_evidencia,i.ativo FROM dbo.iniciativas_acompanhamentos a' . $hint
            . ' INNER JOIN dbo.iniciativas_estrategicas i ON i.id=a.iniciativa_id WHERE a.id=:id'
        );
        $stmt->execute(array(':id' => (string) $id));
        $row = $stmt->fetch();
        return $row ? $this->map($row) : null;
    }

    public function byInitiative($initiativeId)
    {
        $stmt = $this->db->prepare('SELECT a.*,i.codigo,i.exige_evidencia,i.ativo FROM dbo.iniciativas_acompanhamentos a INNER JOIN dbo.iniciativas_estrategicas i ON i.id=a.iniciativa_id WHERE a.iniciativa_id=:id ORDER BY a.data_referencia');
        $stmt->execute(array(':id' => (string) $initiativeId));
        return array_map(array($this, 'map'), $stmt->fetchAll());
    }

    public function exists($initiativeId, $competence)
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM dbo.iniciativas_acompanhamentos WITH (UPDLOCK,HOLDLOCK) WHERE iniciativa_id=:id AND competencia=:competencia');
        $stmt->execute(array(':id' => (string) $initiativeId, ':competencia' => (string) $competence));
        return (int) $stmt->fetchColumn() > 0;
    }

    public function createFromMaster(array $master, $year, $quarter, $actor)
    {
        $months = array('1TRI'=>3,'2TRI'=>6,'3TRI'=>9,'4TRI'=>12);
        if (!isset($months[$quarter])) throw new InvalidArgumentException('Trimestre inválido.');
        $month = $months[$quarter];
        $competence = sprintf('%04d-%02d', (int) $year, $month);
        $reference = date('Y-m-d', strtotime('last day of ' . $competence . '-01'));
        $id = uniqid('iniciativa-acomp-', true);
        $stmt = $this->db->prepare(
            'INSERT INTO dbo.iniciativas_acompanhamentos '
            . '(id,iniciativa_id,ano,trimestre,competencia,data_referencia,plano_snapshot,pilar_snapshot,titulo_snapshot,descricao_snapshot,objetivo_snapshot,unidade_snapshot,diretoria_snapshot,usuario_responsavel) '
            . 'VALUES (:id,:iniciativa,:ano,:trimestre,:competencia,:referencia,:plano,:pilar,:titulo,:descricao,:objetivo,:unidade,:diretoria,NULL)'
        );
        $stmt->execute(array(
            ':id'=>$id, ':iniciativa'=>$master['id'], ':ano'=>(int)$year, ':trimestre'=>$quarter, ':competencia'=>$competence, ':referencia'=>$reference,
            ':plano'=>$master['plano'], ':pilar'=>$master['pilar'], ':titulo'=>$master['tituloExecutivo'], ':descricao'=>$master['descricaoOficial'],
            ':objetivo'=>$master['objetivo'], ':unidade'=>$master['unidadeResponsavel'], ':diretoria'=>$master['diretoriaResponsavel'],
        ));
        return $this->find($id);
    }

    public function eligibleSnapshotsForUpdate($initiativeId)
    {
        $stmt = $this->db->prepare(
            "SELECT a.id FROM dbo.iniciativas_acompanhamentos a WITH (UPDLOCK,HOLDLOCK) "
            . "WHERE a.iniciativa_id=:id AND a.status_fluxo='NAO_INICIADO' AND a.status_iniciativa IS NULL "
            . "AND NULLIF(LTRIM(RTRIM(a.andamento_unidade)),'') IS NULL AND NULLIF(LTRIM(RTRIM(a.referencia_evidencia)),'') IS NULL "
            . "AND NULLIF(LTRIM(RTRIM(a.usuario_responsavel)),'') IS NULL "
            . "AND NOT EXISTS (SELECT 1 FROM dbo.iniciativas_acompanhamento_itens x WHERE x.acompanhamento_id=a.id) "
            . "AND NOT EXISTS (SELECT 1 FROM dbo.iniciativas_evidencias e WHERE e.acompanhamento_id=a.id) "
            . "AND NOT EXISTS (SELECT 1 FROM dbo.iniciativas_homologacoes h WHERE h.acompanhamento_id=a.id) "
            . "AND NOT EXISTS (SELECT 1 FROM dbo.auditoria u WHERE u.entidade='iniciativas_acompanhamentos' AND u.entidade_id=a.id "
            . "AND u.acao IN ('acompanhamento_salvo','acompanhamento_submetido','item_iniciativa_alterado','evidencia_iniciativa_anexada','evidencia_iniciativa_removida'))"
        );
        $stmt->execute(array(':id' => (string) $initiativeId));
        return array_map(function ($row) { return (string) $row['id']; }, $stmt->fetchAll());
    }

    public function updateSnapshot($id, array $master)
    {
        $stmt = $this->db->prepare(
            'UPDATE dbo.iniciativas_acompanhamentos SET plano_snapshot=:plano,pilar_snapshot=:pilar,titulo_snapshot=:titulo,'
            . 'descricao_snapshot=:descricao,objetivo_snapshot=:objetivo,unidade_snapshot=:unidade,diretoria_snapshot=:diretoria,updated_at=SYSUTCDATETIME() WHERE id=:id'
        );
        $stmt->execute(array(':plano'=>$master['plano'],':pilar'=>$master['pilar'],':titulo'=>$master['tituloExecutivo'],':descricao'=>$master['descricaoOficial'],':objetivo'=>$master['objetivo'],':unidade'=>$master['unidadeResponsavel'],':diretoria'=>$master['diretoriaResponsavel'],':id'=>(string)$id));
    }

    public function latestHomologatedStatus($initiativeId)
    {
        $stmt = $this->db->prepare("SELECT TOP 1 status_iniciativa FROM dbo.iniciativas_acompanhamentos WITH (UPDLOCK,HOLDLOCK) WHERE iniciativa_id=:id AND status_fluxo='HOMOLOGADO' ORDER BY data_referencia DESC,id DESC");
        $stmt->execute(array(':id'=>(string)$initiativeId));
        $value = $stmt->fetchColumn();
        return $value === false || $value === null ? '' : (string) $value;
    }

    public function previousHomologatedStatus($initiativeId, $referenceDate)
    {
        $stmt = $this->db->prepare("SELECT TOP 1 status_iniciativa FROM dbo.iniciativas_acompanhamentos WITH (UPDLOCK,HOLDLOCK) WHERE iniciativa_id=:id AND status_fluxo='HOMOLOGADO' AND data_referencia<:referencia ORDER BY data_referencia DESC,id DESC");
        $stmt->execute(array(':id'=>(string)$initiativeId,':referencia'=>(string)$referenceDate));
        $value=$stmt->fetchColumn();return$value===false||$value===null?'':(string)$value;
    }

    public function items($accompanimentId)
    {
        $stmt = $this->db->prepare('SELECT * FROM dbo.iniciativas_acompanhamento_itens WHERE acompanhamento_id=:id ORDER BY tipo,ordem,id');
        $stmt->execute(array(':id'=>(string)$accompanimentId));
        return $stmt->fetchAll();
    }

    public function replaceItems($accompanimentId, array $items)
    {
        $existingIds=array();foreach($items as$item)if(!empty($item['id']))$existingIds[]=(string)$item['id'];
        $deleteSql='DELETE FROM dbo.iniciativas_acompanhamento_itens WHERE acompanhamento_id=:id';$deleteParams=array(':id'=>(string)$accompanimentId);
        if($existingIds){$holders=array();foreach($existingIds as$index=>$itemId){$key=':keep_'.$index;$holders[]=$key;$deleteParams[$key]=$itemId;}$deleteSql.=' AND id NOT IN ('.implode(',',$holders).')';}
        $delete=$this->db->prepare($deleteSql);$delete->execute($deleteParams);
        $update=$this->db->prepare('UPDATE dbo.iniciativas_acompanhamento_itens SET tipo=:tipo,titulo=:titulo,descricao=:descricao,status=:status,ordem=:ordem,updated_at=SYSUTCDATETIME() WHERE id=:id AND acompanhamento_id=:acompanhamento');
        $insert = $this->db->prepare('INSERT INTO dbo.iniciativas_acompanhamento_itens (id,acompanhamento_id,tipo,titulo,descricao,status,ordem,destaque_ca) VALUES (:id,:acompanhamento,:tipo,:titulo,:descricao,:status,:ordem,0)');
        foreach ($items as $item) {
            $params=array(':id'=>!empty($item['id'])?(string)$item['id']:uniqid('iniciativa-item-',true),':acompanhamento'=>(string)$accompanimentId,':tipo'=>$item['tipo'],':titulo'=>$item['titulo'],':descricao'=>$item['descricao'],':status'=>$item['status'],':ordem'=>$item['ordem']);
            if(!empty($item['id'])){$update->execute($params);if($update->rowCount()!==1)throw new UnexpectedValueException('Item fora do acompanhamento autorizado.');}else$insert->execute($params);
        }
    }

    public function updateContent($id, $expectedStatus, array $data, $newStatus, $actor)
    {
        $stmt = $this->db->prepare(
            'UPDATE dbo.iniciativas_acompanhamentos SET status_iniciativa=:status_iniciativa,andamento_unidade=:andamento,'
            . 'referencia_evidencia=:referencia,status_fluxo=:novo_status,usuario_responsavel=:usuario,updated_at=SYSUTCDATETIME() '
            . 'WHERE id=:id AND status_fluxo=:status_esperado'
        );
        $stmt->execute(array(':status_iniciativa'=>$data['status_iniciativa'],':andamento'=>$data['andamento_unidade'],':referencia'=>$data['referencia_evidencia'],':novo_status'=>$newStatus,':usuario'=>$actor,':id'=>(string)$id,':status_esperado'=>$expectedStatus));
        return $stmt->rowCount() === 1;
    }

    public function updateWorkflow($id, $expectedStatus, $newStatus, $consolidationStatus = null)
    {
        $sql = 'UPDATE dbo.iniciativas_acompanhamentos SET status_fluxo=:novo,updated_at=SYSUTCDATETIME()';
        $params = array(':novo'=>$newStatus,':id'=>(string)$id,':esperado'=>$expectedStatus);
        if ($consolidationStatus !== null) { $sql .= ',status_consolidacao_ca=:consolidacao'; $params[':consolidacao']=$consolidationStatus; }
        $sql .= ' WHERE id=:id AND status_fluxo=:esperado';
        $stmt=$this->db->prepare($sql);$stmt->execute($params);return $stmt->rowCount()===1;
    }

    public function consolidate($id, $synthesis, array $highlightIds)
    {
        $stmt=$this->db->prepare("UPDATE dbo.iniciativas_acompanhamentos SET sintese_executiva_ca=:sintese,status_consolidacao_ca='CONSOLIDADA',updated_at=SYSUTCDATETIME() WHERE id=:id AND status_fluxo='HOMOLOGADO'");
        $stmt->execute(array(':sintese'=>$synthesis,':id'=>(string)$id));
        if($stmt->rowCount()!==1)return false;
        $clear=$this->db->prepare('UPDATE dbo.iniciativas_acompanhamento_itens SET destaque_ca=0,updated_at=SYSUTCDATETIME() WHERE acompanhamento_id=:id');
        $clear->execute(array(':id'=>(string)$id));
        if($highlightIds){
            $allowed=array();$params=array(':acompanhamento'=>(string)$id);
            foreach(array_values($highlightIds) as$index=>$itemId){$key=':item_'.$index;$allowed[]=$key;$params[$key]=(string)$itemId;}
            $mark=$this->db->prepare("UPDATE dbo.iniciativas_acompanhamento_itens SET destaque_ca=1,updated_at=SYSUTCDATETIME() WHERE acompanhamento_id=:acompanhamento AND tipo IN ('MARCO_ENTREGA','PROXIMO_PASSO') AND id IN (".implode(',',$allowed).')');
            $mark->execute($params);
        }
        return true;
    }

    public function map(array $row)
    {
        return array(
            'id'=>(string)$row['id'],'iniciativaId'=>(string)$row['iniciativa_id'],'codigo'=>isset($row['codigo'])?(string)$row['codigo']:'',
            'ano'=>(int)$row['ano'],'trimestre'=>(string)$row['trimestre'],'competencia'=>(string)$row['competencia'],'dataReferencia'=>substr((string)$row['data_referencia'],0,10),
            'planoSnapshot'=>(string)$row['plano_snapshot'],'pilarSnapshot'=>(string)$row['pilar_snapshot'],'tituloSnapshot'=>(string)$row['titulo_snapshot'],
            'descricaoSnapshot'=>(string)$row['descricao_snapshot'],'objetivoSnapshot'=>(string)$row['objetivo_snapshot'],'unidadeSnapshot'=>(string)$row['unidade_snapshot'],'diretoriaSnapshot'=>(string)$row['diretoria_snapshot'],
            'statusIniciativa'=>$row['status_iniciativa'],'andamentoUnidade'=>$row['andamento_unidade'],'referenciaEvidencia'=>$row['referencia_evidencia'],
            'sinteseExecutivaCa'=>$row['sintese_executiva_ca'],'statusConsolidacaoCa'=>(string)$row['status_consolidacao_ca'],'statusFluxo'=>(string)$row['status_fluxo'],
            'usuarioResponsavel'=>$row['usuario_responsavel'],'exigeEvidencia'=>isset($row['exige_evidencia'])?(bool)$row['exige_evidencia']:false,'iniciativaAtiva'=>isset($row['ativo'])?(bool)$row['ativo']:true,
            'createdAt'=>$row['created_at'],'updatedAt'=>$row['updated_at'],
            'unidade_snapshot'=>(string)$row['unidade_snapshot'],'diretoria_snapshot'=>(string)$row['diretoria_snapshot'],'usuario_responsavel'=>$row['usuario_responsavel'],
        );
    }
}
