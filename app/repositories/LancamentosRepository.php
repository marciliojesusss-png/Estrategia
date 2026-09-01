<?php
declare(strict_types=1);

final class LancamentosRepository
{
    private $db;
    private $driver;

    public function __construct($db)
    {
        $this->db = $db;
        $this->driver = (string) $db->getAttribute(PDO::ATTR_DRIVER_NAME);
    }

    public function all(array $filters = array())
    {
        $sql = 'SELECT * FROM lancamentos WHERE 1=1';
        $params = array();
        $map = array('indicadorId'=>'indicador_id','ano'=>'ano','mes'=>'mes','status'=>'status','unidade_apuradora'=>'unidade_apuradora','diretoria_responsavel'=>'diretoria_responsavel');
        foreach ($map as $key => $column) {
            $value = isset($filters[$key]) ? $filters[$key] : (isset($filters[$column]) ? $filters[$column] : '');
            if ($value !== '' && $value !== 'Todos') {
                $sql .= ' AND ' . $column . ' = :' . $column;
                $params[':' . $column] = $value;
            }
        }
        $sql .= ' ORDER BY ano DESC, mes DESC, indicador_id, id';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return array_map(array($this, 'map'), $stmt->fetchAll());
    }

    public function find($id)
    {
        $stmt = $this->db->prepare('SELECT * FROM lancamentos WHERE id=:id');
        $stmt->execute(array(':id'=>(string)$id));
        $row = $stmt->fetch();
        return $row ? $this->map($row) : null;
    }

    public function existsForPeriod($indicatorId, $competence, $ignoreId = null)
    {
        $sql = 'SELECT COUNT(*) FROM lancamentos WHERE indicador_id=:indicador AND competencia=:competencia';
        $params = array(':indicador'=>(string)$indicatorId, ':competencia'=>$competence);
        if ($ignoreId !== null) {
            $sql .= ' AND id<>:id';
            $params[':id'] = (string)$ignoreId;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return (int)$stmt->fetchColumn() > 0;
    }

    public function create(array $data)
    {
        $id = uniqid('lancamento-', true);
        $now = date('c');
        $stmt = $this->db->prepare('INSERT INTO lancamentos (id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,dados_entrada_json,resultado_calculado,resultado_oficial,meta_referencia,percentual_atingido,situacao,status,observacao_unidade,referencia_evidencia,evidencia_id,usuario_responsavel,created_at,updated_at) VALUES (:id,:indicador_id,:competencia,:ano,:mes,:trimestre,:plano,:pilar,:unidade_apuradora,:diretoria_responsavel,:dados,:resultado_calculado,:resultado_oficial,:meta,:percentual,:situacao,:status,:observacao,:referencia_evidencia,:evidencia,:usuario,:created,:updated)');
        $params = $this->params($data);
        $params[':id'] = $id;
        $params[':created'] = $now;
        $params[':updated'] = $now;
        $stmt->execute($params);
        return $this->find($id);
    }

    public function update($id, array $data)
    {
        $stmt = $this->db->prepare('UPDATE lancamentos SET indicador_id=:indicador_id,competencia=:competencia,ano=:ano,mes=:mes,trimestre=:trimestre,plano=:plano,pilar=:pilar,unidade_apuradora=:unidade_apuradora,diretoria_responsavel=:diretoria_responsavel,dados_entrada_json=:dados,resultado_calculado=:resultado_calculado,resultado_oficial=:resultado_oficial,meta_referencia=:meta,percentual_atingido=:percentual,situacao=:situacao,status=:status,observacao_unidade=:observacao,referencia_evidencia=:referencia_evidencia,usuario_responsavel=:usuario,updated_at=:updated WHERE id=:id');
        $params = $this->params($data);
        unset($params[':evidencia']);
        $params[':id'] = (string)$id;
        $params[':updated'] = date('c');
        $stmt->execute($params);
        return $this->find($id);
    }

    public function updateStatus($id, $expected, $newStatus)
    {
        $stmt = $this->db->prepare('UPDATE lancamentos SET status=:novo,updated_at=:data WHERE id=:id AND status=:esperado');
        $stmt->execute(array(':novo'=>$newStatus,':data'=>date('c'),':id'=>(string)$id,':esperado'=>$expected));
        return $stmt->rowCount() === 1;
    }

    /** Compatibilidade legado: aponta para o anexo mais recente, sem ser fonte da lista. */
    public function setEvidence($id, $evidenceId)
    {
        $stmt = $this->db->prepare('UPDATE lancamentos SET evidencia_id=:evidencia,updated_at=:data WHERE id=:id');
        $stmt->execute(array(':evidencia'=>$evidenceId,':data'=>date('c'),':id'=>(string)$id));
    }

    public function deleteDraft($id, $status)
    {
        $stmt = $this->db->prepare('DELETE FROM lancamentos WHERE id=:id AND status=:status');
        $stmt->execute(array(':id'=>(string)$id,':status'=>$status));
        return $stmt->rowCount() === 1;
    }

    public function replaceAll(array $items)
    {
        $update = $this->db->prepare('UPDATE lancamentos SET indicador_id=:indicador_id,competencia=:competencia,ano=:ano,mes=:mes,trimestre=:trimestre,plano=:plano,pilar=:pilar,unidade_apuradora=:unidade_apuradora,diretoria_responsavel=:diretoria_responsavel,dados_entrada_json=:dados,resultado_calculado=:resultado_calculado,resultado_oficial=:resultado_oficial,meta_referencia=:meta,percentual_atingido=:percentual,situacao=:situacao,status=:status,observacao_unidade=:observacao,referencia_evidencia=:referencia_evidencia,usuario_responsavel=:usuario,created_at=:created,updated_at=:updated WHERE id=:id');
        $insert = $this->db->prepare('INSERT INTO lancamentos (id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,dados_entrada_json,resultado_calculado,resultado_oficial,meta_referencia,percentual_atingido,situacao,status,observacao_unidade,referencia_evidencia,evidencia_id,usuario_responsavel,created_at,updated_at) VALUES (:id,:indicador_id,:competencia,:ano,:mes,:trimestre,:plano,:pilar,:unidade_apuradora,:diretoria_responsavel,:dados,:resultado_calculado,:resultado_oficial,:meta,:percentual,:situacao,:status,:observacao,:referencia_evidencia,:evidencia,:usuario,:created,:updated)');
        $this->db->beginTransaction();
        try {
            foreach ($items as $item) {
                $params = $this->snapshotParams($item);
                $updateParams = $params;
                unset($updateParams[':evidencia']);
                $update->execute($updateParams);
                if ($update->rowCount() === 0) {
                    $exists = $this->db->prepare('SELECT COUNT(*) FROM lancamentos WHERE id=:id');
                    $exists->execute(array(':id'=>$params[':id']));
                    if ((int)$exists->fetchColumn() === 0) $insert->execute($params);
                }
            }
            $this->db->commit();
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    private function snapshotParams(array $data)
    {
        $now = date('c');
        $year = isset($data['ano']) ? (int)$data['ano'] : 0;
        $month = isset($data['mes']) ? (int)$data['mes'] : 0;
        $competence = isset($data['competencia']) ? $data['competencia'] : ($year && $month ? sprintf('%04d-%02d',$year,$month) : '');
        return array(
            ':id'=>(string)(isset($data['id'])?$data['id']:uniqid('lancamento-',true)),
            ':indicador_id'=>(string)(isset($data['indicadorId'])?$data['indicadorId']:(isset($data['indicador_id'])?$data['indicador_id']:'')),
            ':competencia'=>$competence, ':ano'=>$year, ':mes'=>$month,
            ':trimestre'=>isset($data['trimestre'])?$data['trimestre']:null,
            ':plano'=>isset($data['plano'])?$data['plano']:null,
            ':pilar'=>isset($data['pilar'])?$data['pilar']:null,
            ':unidade_apuradora'=>isset($data['unidadeApuradora'])?$data['unidadeApuradora']:(isset($data['unidade_apuradora'])?$data['unidade_apuradora']:null),
            ':diretoria_responsavel'=>isset($data['diretoriaResponsavel'])?$data['diretoriaResponsavel']:(isset($data['diretoria_responsavel'])?$data['diretoria_responsavel']:null),
            ':dados'=>json_encode(isset($data['camposEntrada'])?$data['camposEntrada']:(isset($data['dados_entrada'])?$data['dados_entrada']:array()),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
            ':resultado_calculado'=>isset($data['resultadoMensal'])?$data['resultadoMensal']:(isset($data['resultado_calculado'])?$data['resultado_calculado']:null),
            ':resultado_oficial'=>isset($data['resultadoOficialAnual'])?$data['resultadoOficialAnual']:(isset($data['resultado_oficial'])?$data['resultado_oficial']:null),
            ':meta'=>isset($data['metaReferencia'])?$data['metaReferencia']:(isset($data['metaMensal'])?$data['metaMensal']:null),
            ':percentual'=>isset($data['percentualAtingido'])?$data['percentualAtingido']:null,
            ':situacao'=>isset($data['situacaoCalculada'])?$data['situacaoCalculada']:(isset($data['situacao'])?$data['situacao']:null),
            ':status'=>isset($data['status'])?$data['status']:'Não iniciado',
            ':observacao'=>isset($data['observacaoArea'])?$data['observacaoArea']:(isset($data['observacao_unidade'])?$data['observacao_unidade']:null),
            ':referencia_evidencia'=>isset($data['referenciaEvidencia'])?$data['referenciaEvidencia']:(isset($data['referencia_evidencia'])?$data['referencia_evidencia']:null),
            ':evidencia'=>isset($data['evidenciaId'])?$data['evidenciaId']:null,
            ':usuario'=>isset($data['usuarioResponsavel'])?$data['usuarioResponsavel']:(isset($data['preenchidoPor'])?$data['preenchidoPor']:null),
            ':created'=>isset($data['createdAt'])?$data['createdAt']:(isset($data['dataPreenchimento'])?$data['dataPreenchimento']:$now),
            ':updated'=>isset($data['updatedAt'])?$data['updatedAt']:$now,
        );
    }

    private function params(array $data)
    {
        return array(
            ':indicador_id'=>(string)$data['indicador_id'], ':competencia'=>$data['competencia'],
            ':ano'=>(int)$data['ano'], ':mes'=>(int)$data['mes'], ':trimestre'=>$data['trimestre'],
            ':plano'=>$data['plano'], ':pilar'=>$data['pilar'], ':unidade_apuradora'=>$data['unidade_apuradora'],
            ':diretoria_responsavel'=>$data['diretoria_responsavel'],
            ':dados'=>json_encode($data['dados_entrada'],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
            ':resultado_calculado'=>$data['resultado_calculado'], ':resultado_oficial'=>$data['resultado_oficial'],
            ':meta'=>$data['meta_referencia'], ':percentual'=>$data['percentual_atingido'], ':situacao'=>$data['situacao'],
            ':status'=>$data['status'], ':observacao'=>$data['observacao_unidade'],
            ':referencia_evidencia'=>isset($data['referencia_evidencia'])?$data['referencia_evidencia']:null,
            ':evidencia'=>null, ':usuario'=>$data['usuario_responsavel'],
        );
    }

    public function map(array $row)
    {
        $inputs = json_decode((string)$row['dados_entrada_json'], true);
        return array(
            'id'=>$row['id'], 'indicadorId'=>$row['indicador_id'], 'competencia'=>$row['competencia'],
            'ano'=>(int)$row['ano'], 'mes'=>(int)$row['mes'], 'trimestre'=>$row['trimestre'],
            'plano'=>$row['plano'], 'pilar'=>$row['pilar'], 'unidadeApuradora'=>$row['unidade_apuradora'],
            'diretoriaResponsavel'=>$row['diretoria_responsavel'], 'camposEntrada'=>is_array($inputs)?$inputs:array(),
            'resultadoMensal'=>$row['resultado_calculado'], 'resultadoOficialAnual'=>$row['resultado_oficial'],
            'metaReferencia'=>$row['meta_referencia'], 'percentualAtingido'=>$row['percentual_atingido'],
            'situacaoCalculada'=>$row['situacao'], 'status'=>$row['status'], 'observacaoArea'=>$row['observacao_unidade'],
            'referenciaEvidencia'=>isset($row['referencia_evidencia'])?$row['referencia_evidencia']:'',
            'evidenciaId'=>$row['evidencia_id'], 'usuarioResponsavel'=>$row['usuario_responsavel'],
            'createdAt'=>$row['created_at'], 'updatedAt'=>$row['updated_at'],
        );
    }
}
