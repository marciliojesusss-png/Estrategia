<?php
declare(strict_types=1);

final class UsuariosRepository
{
    public function __construct(private PDO $db)
    {
    }

    public function all(): array
    {
        $rows = $this->db->query('SELECT * FROM usuarios_validacao WHERE ativo = 1 ORDER BY nome')->fetchAll();
        return array_map(static fn(array $row): array => [
            'id' => $row['id'],
            'nome' => $row['nome'],
            'email' => $row['id'],
            'perfil' => $row['perfil'],
            'unidadeApuradora' => $row['unidade'],
            'diretoriaResponsavel' => $row['diretoria'],
            'permissoes' => self::decode($row['permissoes_json']),
            'ativo' => (bool) ($row['ativo'] ?? 1),
        ], $rows);
    }

    private static function decode(?string $value): mixed
    {
        if (!$value) {
            return [];
        }
        $decoded = json_decode($value, true);
        return json_last_error() === JSON_ERROR_NONE ? $decoded : [];
    }
}
