<?php
declare(strict_types=1);
final class RetificacoesRepository
{
    private $db;public function __construct(PDO $db){$this->db=$db;}
    public function create($launchId,array $before,array $after,$reason,array $user){$id=uniqid('retificacao-',true);$now=date('c');$s=$this->db->prepare('INSERT INTO retificacoes (id,lancamento_id,versao_anterior_json,versao_nova_json,justificativa,usuario,data_retificacao,created_at) VALUES (:id,:lancamento,:anterior,:nova,:justificativa,:usuario,:data,:created)');$s->execute(array(':id'=>$id,':lancamento'=>(string)$launchId,':anterior'=>json_encode($before,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),':nova'=>json_encode($after,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),':justificativa'=>$reason,':usuario'=>$user['matricula'],':data'=>$now,':created'=>$now));return $id;}
}
