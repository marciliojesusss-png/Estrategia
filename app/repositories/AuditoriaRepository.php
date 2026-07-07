<?php
declare(strict_types=1);

final class AuditoriaRepository
{
    public function __construct(private PDO $db)
    {
    }

    public function all(): array
    {
        $rows = $this->db->query('SELECT * FROM auditoria ORDER BY data_acao, id')->fetchAll();
        return array_map(static fn(array $row): array => [
            'id' => $row['id'],
            'entidade' => $row['entidade'],
            'registroId' => $row['entidade_id'],
            'acao' => $row['acao'],
            'descricao' => $row['descricao'],
            'valorAnterior' => self::decode($row['dados_anteriores_json']),
            'valorNovo' => self::decode($row['dados_novos_json']),
            'usuario' => $row['usuario'],
            'perfilUsuario' => $row['perfil_usuario'],
            'dataHora' => $row['data_acao'],
        ], $rows);
    }

    public function replaceAll(array $items): void
    {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare(
                'INSERT OR REPLACE INTO auditoria (
                    id, entidade, entidade_id, acao, descricao, dados_anteriores_json,
                    dados_novos_json, usuario, perfil_usuario, data_acao, created_at
                 ) VALUES (
                    :id, :entidade, :entidade_id, :acao, :descricao, :dados_anteriores_json,
                    :dados_novos_json, :usuario, :perfil_usuario, :data_acao, :created_at
                 )'
            );
            $now = date('c');
            foreach ($items as $item) {
                $stmt->execute([
                    ':id' => (string) ($item['id'] ?? uniqid('auditoria-', true)),
                    ':entidade' => $item['entidade'] ?? null,
                    ':entidade_id' => (string) ($item['registroId'] ?? $item['entidadeId'] ?? ''),
                    ':acao' => $item['acao'] ?? null,
                    ':descricao' => $item['descricao'] ?? null,
                    ':dados_anteriores_json' => self::encode($item['valorAnterior'] ?? null),
                    ':dados_novos_json' => self::encode($item['valorNovo'] ?? null),
                    ':usuario' => $item['usuario'] ?? null,
                    ':perfil_usuario' => $item['perfilUsuario'] ?? null,
                    ':data_acao' => $item['dataHora'] ?? $now,
                    ':created_at' => $now,
                ]);
            }
            $this->db->commit();
        } catch (Throwable $error) {
            $this->db->rollBack();
            throw $error;
        }
    }

    private static function decode(?string $value): mixed
    {
        if ($value === null || $value === '') {
            return null;
        }
        $decoded = json_decode($value, true);
        return json_last_error() === JSON_ERROR_NONE ? $decoded : $value;
    }

    private static function encode(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
