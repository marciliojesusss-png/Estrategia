<?php
declare(strict_types=1);

final class HomologacoesRepository
{
    private $db;
    public function __construct(PDO $db) { $this->db = $db; }

    public function all(array $filters = []): array
    {
        $sql = 'SELECT h.* FROM homologacoes h';
        $params = [];
        $conditions = [];
        if (($filters['unidade_apuradora'] ?? '') !== '' || ($filters['unidadeApuradora'] ?? '') !== '') {
            $sql .= ' INNER JOIN lancamentos l_unidade ON l_unidade.id = h.lancamento_id';
            $conditions[] = 'l_unidade.unidade_apuradora = :unidade_apuradora';
            $params[':unidade_apuradora'] = $filters['unidade_apuradora'] ?? $filters['unidadeApuradora'];
        } elseif (($filters['diretoria_responsavel'] ?? '') !== '' || ($filters['diretoriaResponsavel'] ?? '') !== '') {
            $sql .= ' INNER JOIN lancamentos l_diretoria ON l_diretoria.id = h.lancamento_id';
            $conditions[] = 'l_diretoria.diretoria_responsavel = :diretoria_responsavel';
            $params[':diretoria_responsavel'] = $filters['diretoria_responsavel'] ?? $filters['diretoriaResponsavel'];
        }
        if ($conditions) {
            $sql .= ' WHERE ' . implode(' AND ', $conditions);
        }
        $sql .= ' ORDER BY h.data_acao, h.id';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        return array_map(static function (array $row) { return [
            'id' => $row['id'],
            'lancamentoId' => is_numeric($row['lancamento_id']) ? (int) $row['lancamento_id'] : $row['lancamento_id'],
            'acao' => $row['acao'],
            'statusAnterior' => $row['status_anterior'],
            'status' => $row['status_novo'],
            'statusNovo' => $row['status_novo'],
            'justificativa' => $row['justificativa'],
            'usuario' => $row['usuario'],
            'perfilUsuario' => $row['perfil_usuario'],
            'dataAcao' => $row['data_acao'],
        ]; }, $rows);
    }

    public function replaceAll(array $items): void
    {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare(
                'INSERT OR REPLACE INTO homologacoes (
                    id, lancamento_id, acao, status_anterior, status_novo,
                    justificativa, usuario, perfil_usuario, data_acao, created_at
                 ) VALUES (
                    :id, :lancamento_id, :acao, :status_anterior, :status_novo,
                    :justificativa, :usuario, :perfil_usuario, :data_acao, :created_at
                 )'
            );
            $now = date('c');
            foreach ($items as $item) {
                if (!is_array($item)) {
                    continue;
                }
                $status = (string) ($item['statusNovo'] ?? $item['status'] ?? '');
                $stmt->execute([
                    ':id' => (string) ($item['id'] ?? uniqid('homologacao-', true)),
                    ':lancamento_id' => (string) ($item['lancamentoId'] ?? $item['lancamento_id'] ?? ''),
                    ':acao' => (string) ($item['acao'] ?? $this->actionForStatus($status)),
                    ':status_anterior' => $item['statusAnterior'] ?? null,
                    ':status_novo' => $status,
                    ':justificativa' => $item['justificativa'] ?? $item['observacaoDiretoria'] ?? null,
                    ':usuario' => $item['usuario'] ?? $item['homologadoPor'] ?? $item['devolvidoPor'] ?? $item['reabertoPor'] ?? null,
                    ':perfil_usuario' => $item['perfilUsuario'] ?? null,
                    ':data_acao' => $item['dataAcao'] ?? $item['dataHomologacao'] ?? $item['dataDevolucao'] ?? $item['dataReabertura'] ?? $now,
                    ':created_at' => $item['created_at'] ?? $now,
                ]);
            }
            $this->db->commit();
        } catch (Throwable $error) {
            $this->db->rollBack();
            throw $error;
        }
    }

    private function actionForStatus($status)
    {
        if ($status === 'Homologado') return 'homologacao_lancamento';
        if ($status === 'Devolvido para ajuste') return 'devolucao_lancamento';
        if ($status === 'Reaberto') return 'reabertura_lancamento';
        return 'atualizacao_homologacao';
    }
}
