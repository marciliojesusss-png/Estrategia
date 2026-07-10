<?php
declare(strict_types=1);

final class ConfiguracoesRepository
{
    private $db;
    public function __construct(PDO $db) { $this->db = $db; }

    public function get($chave, $default = array())
    {
        $stmt = $this->db->prepare('SELECT valor_json FROM configuracoes WHERE chave = :chave');
        $stmt->execute([':chave' => $chave]);
        $value = $stmt->fetchColumn();
        if ($value === false || $value === null || $value === '') {
            return $default;
        }
        $decoded = json_decode((string) $value, true);
        return $decoded === null && json_last_error() !== JSON_ERROR_NONE ? $default : $decoded;
    }
}
