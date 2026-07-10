<?php
declare(strict_types=1);

final class AuditoriaRepository
{
    private $db;
    public function __construct(PDO $db) { $this->db = $db; }

    public function all(): array
    {
        $rows = $this->db->query('SELECT * FROM auditoria ORDER BY data_acao, id')->fetchAll();
        return array_map(static function (array $row) { return [
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
        ]; }, $rows);
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

    public function append(array $item)
    {
        $stmt = $this->db->prepare(
            'INSERT INTO auditoria (id, entidade, entidade_id, acao, descricao, dados_anteriores_json, dados_novos_json, usuario, perfil_usuario, data_acao, created_at) '
            . 'VALUES (:id, :entidade, :entidade_id, :acao, :descricao, :anterior, :novo, :usuario, :perfil, :data_acao, :created_at)'
        );
        $now = date('c');
        $stmt->execute(array(
            ':id' => uniqid('auditoria-', true), ':entidade' => isset($item['entidade']) ? $item['entidade'] : 'indicadores',
            ':entidade_id' => (string) $item['registroId'], ':acao' => $item['acao'],
            ':descricao' => isset($item['descricao']) ? $item['descricao'] : null,
            ':anterior' => self::encode(isset($item['valorAnterior']) ? $item['valorAnterior'] : null),
            ':novo' => self::encode(isset($item['valorNovo']) ? $item['valorNovo'] : null),
            ':usuario' => isset($item['usuario']) ? $item['usuario'] : null,
            ':perfil' => isset($item['perfilUsuario']) ? $item['perfilUsuario'] : null,
            ':data_acao' => $now, ':created_at' => $now,
        ));
    }

    private static function decode($value)
    {
        if ($value === null || $value === '') {
            return null;
        }
        $decoded = json_decode($value, true);
        return json_last_error() === JSON_ERROR_NONE ? $decoded : $value;
    }

    private static function encode($value)
    {
        if ($value === null) {
            return null;
        }
        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
