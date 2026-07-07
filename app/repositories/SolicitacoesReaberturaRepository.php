<?php
declare(strict_types=1);

final class SolicitacoesReaberturaRepository
{
    public function __construct(private PDO $db)
    {
        $this->ensureSchema();
    }

    public function all(array $filters = []): array
    {
        $sql = 'SELECT s.* FROM solicitacoes_reabertura s';
        $params = [];
        $joins = [];
        $conditions = ['1=1'];
        if (($filters['status'] ?? '') !== '' && ($filters['status'] ?? '') !== 'Todos') {
            $conditions[] = 's.status_solicitacao = :status';
            $params[':status'] = $filters['status'];
        }
        if (($filters['lancamentoId'] ?? '') !== '') {
            $conditions[] = 's.lancamento_id = :lancamento_id';
            $params[':lancamento_id'] = (string) $filters['lancamentoId'];
        }
        if (($filters['unidade_apuradora'] ?? '') !== '' || ($filters['unidadeApuradora'] ?? '') !== '') {
            $joins[] = 'INNER JOIN lancamentos l_unidade ON l_unidade.id = s.lancamento_id';
            $conditions[] = 'l_unidade.unidade_apuradora = :unidade_apuradora';
            $params[':unidade_apuradora'] = $filters['unidade_apuradora'] ?? $filters['unidadeApuradora'];
        } elseif (($filters['diretoria_responsavel'] ?? '') !== '' || ($filters['diretoriaResponsavel'] ?? '') !== '') {
            $joins[] = 'INNER JOIN lancamentos l_diretoria ON l_diretoria.id = s.lancamento_id';
            $conditions[] = 'l_diretoria.diretoria_responsavel = :diretoria_responsavel';
            $params[':diretoria_responsavel'] = $filters['diretoria_responsavel'] ?? $filters['diretoriaResponsavel'];
        }
        if ($joins) {
            $sql .= ' ' . implode(' ', $joins);
        }
        $sql .= ' WHERE ' . implode(' AND ', $conditions);
        $sql .= ' ORDER BY s.data_solicitacao DESC, s.id DESC';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'map'], $stmt->fetchAll());
    }

    public function replaceAll(array $items): void
    {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare(
                'INSERT OR REPLACE INTO solicitacoes_reabertura (
                    id, lancamento_id, indicador_id, competencia, solicitante_usuario,
                    solicitante_perfil, solicitante_unidade, tipo_ajuste, justificativa,
                    observacao_complementar, status_solicitacao, administrador_responsavel,
                    decisao_administrador, justificativa_decisao, data_solicitacao,
                    data_decisao, created_at, updated_at
                 ) VALUES (
                    :id, :lancamento_id, :indicador_id, :competencia, :solicitante_usuario,
                    :solicitante_perfil, :solicitante_unidade, :tipo_ajuste, :justificativa,
                    :observacao_complementar, :status_solicitacao, :administrador_responsavel,
                    :decisao_administrador, :justificativa_decisao, :data_solicitacao,
                    :data_decisao, :created_at, :updated_at
                 )'
            );
            $now = date('c');
            foreach ($items as $item) {
                $stmt->execute([
                    ':id' => (string) ($item['id'] ?? uniqid('sol-reab-', true)),
                    ':lancamento_id' => (string) ($item['lancamentoId'] ?? ''),
                    ':indicador_id' => (string) ($item['indicadorId'] ?? ''),
                    ':competencia' => $item['competencia'] ?? null,
                    ':solicitante_usuario' => $item['solicitanteUsuario'] ?? null,
                    ':solicitante_perfil' => $item['solicitantePerfil'] ?? null,
                    ':solicitante_unidade' => $item['solicitanteUnidade'] ?? null,
                    ':tipo_ajuste' => $item['tipoAjuste'] ?? null,
                    ':justificativa' => $item['justificativa'] ?? '',
                    ':observacao_complementar' => $item['observacaoComplementar'] ?? null,
                    ':status_solicitacao' => $item['statusSolicitacao'] ?? 'Pendente',
                    ':administrador_responsavel' => $item['administradorResponsavel'] ?? null,
                    ':decisao_administrador' => $item['decisaoAdministrador'] ?? null,
                    ':justificativa_decisao' => $item['justificativaDecisao'] ?? null,
                    ':data_solicitacao' => $item['dataSolicitacao'] ?? $now,
                    ':data_decisao' => $item['dataDecisao'] ?? null,
                    ':created_at' => $item['createdAt'] ?? $now,
                    ':updated_at' => $item['updatedAt'] ?? $now,
                ]);
            }
            $this->db->commit();
        } catch (Throwable $error) {
            $this->db->rollBack();
            throw $error;
        }
    }

    private function ensureSchema(): void
    {
        $this->db->exec(
            "CREATE TABLE IF NOT EXISTS solicitacoes_reabertura (
                id TEXT PRIMARY KEY,
                lancamento_id TEXT NOT NULL,
                indicador_id TEXT,
                competencia TEXT,
                solicitante_usuario TEXT,
                solicitante_perfil TEXT,
                solicitante_unidade TEXT,
                tipo_ajuste TEXT,
                justificativa TEXT NOT NULL,
                observacao_complementar TEXT,
                status_solicitacao TEXT NOT NULL,
                administrador_responsavel TEXT,
                decisao_administrador TEXT,
                justificativa_decisao TEXT,
                data_solicitacao TEXT,
                data_decisao TEXT,
                created_at TEXT,
                updated_at TEXT
            )"
        );
        $this->db->exec(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_solicitacoes_reabertura_pendente
             ON solicitacoes_reabertura(lancamento_id)
             WHERE status_solicitacao = 'Pendente'"
        );
    }

    private function map(array $row): array
    {
        return [
            'id' => $row['id'],
            'lancamentoId' => is_numeric($row['lancamento_id']) ? (int) $row['lancamento_id'] : $row['lancamento_id'],
            'indicadorId' => is_numeric($row['indicador_id']) ? (int) $row['indicador_id'] : $row['indicador_id'],
            'competencia' => $row['competencia'],
            'solicitanteUsuario' => $row['solicitante_usuario'],
            'solicitantePerfil' => $row['solicitante_perfil'],
            'solicitanteUnidade' => $row['solicitante_unidade'],
            'tipoAjuste' => $row['tipo_ajuste'],
            'justificativa' => $row['justificativa'],
            'observacaoComplementar' => $row['observacao_complementar'],
            'statusSolicitacao' => $row['status_solicitacao'],
            'administradorResponsavel' => $row['administrador_responsavel'],
            'decisaoAdministrador' => $row['decisao_administrador'],
            'justificativaDecisao' => $row['justificativa_decisao'],
            'dataSolicitacao' => $row['data_solicitacao'],
            'dataDecisao' => $row['data_decisao'],
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'],
        ];
    }
}
