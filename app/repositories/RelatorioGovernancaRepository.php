<?php
declare(strict_types=1);

final class RelatorioGovernancaRepository
{
    const SOURCE_LIMIT = 2000;

    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function options()
    {
        $indicators = $this->db->query(
            'SELECT id,numero,nome,unidade_apuradora,diretoria_responsavel '
            . 'FROM dbo.indicadores WHERE ativo=1 ORDER BY numero,id'
        )->fetchAll();
        $launchValues = $this->db->query(
            'SELECT DISTINCT ano,status FROM dbo.lancamentos ORDER BY ano,status'
        )->fetchAll();
        return array('indicadores' => $indicators, 'lancamentos' => $launchValues);
    }

    public function currentPositions(array $filters)
    {
        list($where, $params) = $this->launchWhere($filters, 'l');
        $sql = "SELECT TOP " . self::SOURCE_LIMIT . " l.id,l.indicador_id,i.numero,i.nome AS indicador_nome,l.competencia,l.ano,l.mes,"
            . "l.unidade_apuradora,l.diretoria_responsavel,i.unidade_medida,l.versao_atual,l.status,"
            . "l.meta_referencia,l.resultado_calculado,l.resultado_oficial,l.percentual_atingido,l.situacao,"
            . "l.usuario_responsavel,l.evidencia_id,ha.usuario AS homologador,ha.perfil_usuario AS perfil_homologador,"
            . "ha.data_acao AS data_homologacao,CASE WHEN l.status=N'Homologado' AND ha.id IS NOT NULL AND EXISTS("
            . "SELECT 1 FROM dbo.auditoria av WHERE av.entidade_id=l.id AND av.acao=N'homologacao_lancamento' AND ("
            . "TRY_CONVERT(int,JSON_VALUE(av.dados_novos_json,'$.lancamento.versaoAtual'))=l.versao_atual OR "
            . "TRY_CONVERT(int,JSON_VALUE(av.dados_novos_json,'$.versaoAtual'))=l.versao_atual OR "
            . "(l.versao_atual=1 AND JSON_VALUE(av.dados_novos_json,'$.lancamento.versaoAtual') IS NULL AND JSON_VALUE(av.dados_novos_json,'$.versaoAtual') IS NULL)"
            . ") AND av.data_acao=ha.data_acao) THEN 1 ELSE 0 END AS homologacao_transacional "
            . "FROM dbo.lancamentos l INNER JOIN dbo.indicadores i ON i.id=l.indicador_id "
            . "OUTER APPLY(SELECT TOP 1 h.id,h.usuario,h.perfil_usuario,h.data_acao FROM dbo.homologacoes h "
            . "WHERE h.lancamento_id=l.id AND h.acao=N'homologacao_lancamento' AND h.status_novo=N'Homologado' "
            . "ORDER BY TRY_CONVERT(datetimeoffset(7),h.data_acao,127) DESC,h.id DESC) ha "
            . $where . ' ORDER BY i.numero,l.ano,l.mes,l.id';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function auditEvents(array $filters)
    {
        return $this->sourceQuery(
            $filters,
            "SELECT TOP " . self::SOURCE_LIMIT . " a.id,l.id AS lancamento_id,l.indicador_id,i.numero,i.nome AS indicador_nome,"
            . "l.competencia,l.unidade_apuradora,l.diretoria_responsavel,a.acao,a.descricao,a.usuario,a.perfil_usuario,"
            . "a.data_acao,a.dados_anteriores_json,a.dados_novos_json "
            . "FROM dbo.auditoria a INNER JOIN dbo.lancamentos l ON (a.entidade_id=l.id OR "
            . "JSON_VALUE(a.dados_anteriores_json,'$.lancamento.id')=l.id OR JSON_VALUE(a.dados_novos_json,'$.lancamento.id')=l.id OR "
            . "JSON_VALUE(a.dados_anteriores_json,'$.lancamentoId')=l.id OR JSON_VALUE(a.dados_novos_json,'$.lancamentoId')=l.id) "
            . "INNER JOIN dbo.indicadores i ON i.id=l.indicador_id {{WHERE}} "
            . "ORDER BY TRY_CONVERT(datetimeoffset(7),a.data_acao,127),a.id",
            'l'
        );
    }

    public function homologationEvents(array $filters)
    {
        return $this->sourceQuery(
            $filters,
            "SELECT TOP " . self::SOURCE_LIMIT . " h.id,h.lancamento_id,l.indicador_id,i.numero,i.nome AS indicador_nome,"
            . "l.competencia,l.unidade_apuradora,l.diretoria_responsavel,h.acao,h.status_anterior,h.status_novo,"
            . "h.justificativa,h.usuario,h.perfil_usuario,h.data_acao "
            . "FROM dbo.homologacoes h INNER JOIN dbo.lancamentos l ON l.id=h.lancamento_id "
            . "INNER JOIN dbo.indicadores i ON i.id=l.indicador_id {{WHERE}} AND h.acao<>N'registro' "
            . "ORDER BY TRY_CONVERT(datetimeoffset(7),h.data_acao,127),h.id",
            'l'
        );
    }

    public function retificationEvents(array $filters)
    {
        return $this->sourceQuery(
            $filters,
            "SELECT TOP " . self::SOURCE_LIMIT . " r.id,r.lancamento_id,l.indicador_id,i.numero,i.nome AS indicador_nome,"
            . "l.competencia,l.unidade_apuradora,l.diretoria_responsavel,r.versao_anterior,r.versao_nova,"
            . "r.justificativa,r.usuario,r.data_retificacao,r.versao_anterior_json,r.versao_nova_json "
            . "FROM dbo.retificacoes r INNER JOIN dbo.lancamentos l ON l.id=r.lancamento_id "
            . "INNER JOIN dbo.indicadores i ON i.id=l.indicador_id {{WHERE}} "
            . "ORDER BY TRY_CONVERT(datetimeoffset(7),r.data_retificacao,127),r.id",
            'l'
        );
    }

    public function reopeningEvents(array $filters)
    {
        return $this->sourceQuery(
            $filters,
            "SELECT TOP " . self::SOURCE_LIMIT . " s.id,s.lancamento_id,l.indicador_id,i.numero,i.nome AS indicador_nome,"
            . "l.competencia,l.unidade_apuradora,l.diretoria_responsavel,s.solicitante_usuario,s.solicitante_perfil,"
            . "s.tipo_ajuste,s.justificativa,s.observacao_complementar,s.status_solicitacao,s.administrador_responsavel,"
            . "s.decisao_administrador,s.justificativa_decisao,s.data_solicitacao,s.data_decisao "
            . "FROM dbo.solicitacoes_reabertura s INNER JOIN dbo.lancamentos l ON l.id=s.lancamento_id "
            . "INNER JOIN dbo.indicadores i ON i.id=l.indicador_id {{WHERE}} "
            . "ORDER BY TRY_CONVERT(datetimeoffset(7),s.data_solicitacao,127),s.id",
            'l'
        );
    }

    public function evidenceEvents(array $filters)
    {
        return $this->sourceQuery(
            $filters,
            "SELECT TOP " . self::SOURCE_LIMIT . " e.id,e.lancamento_id,l.indicador_id,i.numero,i.nome AS indicador_nome,"
            . "l.competencia,l.unidade_apuradora,l.diretoria_responsavel,e.versao_lancamento,e.nome_arquivo,"
            . "e.tipo_arquivo,e.descricao,e.data_upload,e.usuario,CASE WHEN e.versao_lancamento=l.versao_atual THEN 1 ELSE 0 END AS versao_vigente "
            . "FROM dbo.evidencias e INNER JOIN dbo.lancamentos l ON l.id=e.lancamento_id "
            . "INNER JOIN dbo.indicadores i ON i.id=l.indicador_id {{WHERE}} "
            . "ORDER BY TRY_CONVERT(datetimeoffset(7),e.data_upload,127),e.id",
            'l'
        );
    }

    public function documentaryEvents(array $filters)
    {
        return $this->sourceQuery(
            $filters,
            "SELECT TOP " . self::SOURCE_LIMIT . " d.id,d.lancamento_id,l.indicador_id,i.numero,i.nome AS indicador_nome,"
            . "l.competencia,l.unidade_apuradora,l.diretoria_responsavel,d.versao_lancamento,d.tipo_observacao,"
            . "d.observacao,d.fonte_documental,d.paginas_documento,d.documento_referencia,d.origem_registro,d.criado_em,"
            . "d.substitui_observacao_id,CASE WHEN sucessora.id IS NULL THEN 1 ELSE 0 END AS vigente "
            . "FROM dbo.lancamentos_observacoes_documentais d INNER JOIN dbo.lancamentos l ON l.id=d.lancamento_id "
            . "INNER JOIN dbo.indicadores i ON i.id=l.indicador_id "
            . "LEFT JOIN dbo.lancamentos_observacoes_documentais sucessora ON sucessora.substitui_observacao_id=d.id {{WHERE}} "
            . "ORDER BY d.criado_em,d.id",
            'l'
        );
    }

    public function userNames(array $users)
    {
        $users = array_values(array_unique(array_filter(array_map('strval', $users), function ($value) {
            return trim($value) !== '';
        })));
        if (!$users) return array();
        $params = array();
        $marks = array();
        foreach ($users as $index => $user) {
            $key = ':user_' . $index;
            $marks[] = $key;
            $params[$key] = $user;
        }
        $stmt = $this->db->prepare('SELECT matricula,nome FROM dbo.usuarios_acesso WHERE matricula IN (' . implode(',', $marks) . ')');
        $stmt->execute($params);
        $result = array();
        foreach ($stmt->fetchAll() as $row) $result[(string) $row['matricula']] = (string) $row['nome'];
        return $result;
    }

    private function sourceQuery(array $filters, $template, $alias)
    {
        list($where, $params) = $this->launchWhere($filters, $alias);
        $sql = str_replace('{{WHERE}}', $where, $template);
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    private function launchWhere(array $filters, $alias)
    {
        $conditions = array($alias . '.ano=:report_year');
        $params = array(':report_year' => (int) $filters['ano']);
        if ($filters['indicador'] !== '') {
            $conditions[] = $alias . '.indicador_id=:report_indicator';
            $params[':report_indicator'] = (string) $filters['indicador'];
        }
        if ($filters['competencia'] !== '') {
            $conditions[] = $alias . '.competencia=:report_competence';
            $params[':report_competence'] = (string) $filters['competencia'];
        }
        if ($filters['trimestre'] !== '') {
            $quarter = (int) $filters['trimestre'];
            $conditions[] = $alias . '.mes BETWEEN :report_month_start AND :report_month_end';
            $params[':report_month_start'] = (($quarter - 1) * 3) + 1;
            $params[':report_month_end'] = $quarter * 3;
        }
        if ($filters['unidade'] !== '') {
            $conditions[] = $alias . '.unidade_apuradora=:report_unit';
            $params[':report_unit'] = (string) $filters['unidade'];
        }
        if ($filters['diretoria'] !== '') {
            $conditions[] = $alias . '.diretoria_responsavel=:report_board';
            $params[':report_board'] = (string) $filters['diretoria'];
        }
        return array(' WHERE ' . implode(' AND ', $conditions), $params);
    }
}
