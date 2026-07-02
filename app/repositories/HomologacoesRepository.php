<?php
declare(strict_types=1);

final class HomologacoesRepository
{
    public function __construct(private PDO $db)
    {
    }

    public function all(): array
    {
        $rows = $this->db->query('SELECT * FROM homologacoes ORDER BY data_acao, id')->fetchAll();
        return array_map(static fn(array $row): array => [
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
        ], $rows);
    }
}
