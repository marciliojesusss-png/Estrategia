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
    public function all(){return$this->db->query('SELECT chave,valor_json,updated_at FROM configuracoes ORDER BY chave')->fetchAll();}
    public function set($key,$value){$json=json_encode($value,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);$exists=$this->db->prepare('SELECT COUNT(*) FROM configuracoes WHERE chave=:chave');$exists->execute(array(':chave'=>$key));if((int)$exists->fetchColumn()===0)throw new OutOfBoundsException('Configuracao inexistente.');$s=$this->db->prepare('UPDATE configuracoes SET valor_json=:valor,updated_at=:data WHERE chave=:chave');$s->execute(array(':valor'=>$json,':data'=>date('c'),':chave'=>$key));}
}
