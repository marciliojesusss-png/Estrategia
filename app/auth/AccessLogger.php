<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/Logger.php';

final class AccessLogger
{
    public static function record($event, array $user = array(), array $context = array())
    {
        $event = preg_replace('/[^a-z0-9_\-]/i', '', (string) $event);
        $agent = isset($_SERVER['HTTP_USER_AGENT']) ? (string) $_SERVER['HTTP_USER_AGENT'] : '';
        $agent = '[evento=' . $event . '] ' . substr($agent, 0, 1200);
        foreach (array('funcao', 'unidade', 'sg_unidade', 'no_unidade') as $field) {
            if (!empty($user[$field])) $agent .= ' [' . $field . '=' . self::auditValue($user[$field], 150) . ']';
        }
        if (!empty($context['recurso'])) $agent .= ' [recurso=' . self::auditValue($context['recurso'], 300) . ']';
        try {
            $stmt = Database::getConnection()->prepare(
                'INSERT INTO acessos_log (matricula, nome, perfil, sg_unidade, ip, user_agent, data_acesso) '
                . 'VALUES (:matricula, :nome, :perfil, :sg_unidade, :ip, :user_agent, :data_acesso)'
            );
            $stmt->execute(array(
                ':matricula' => isset($user['matricula']) ? $user['matricula'] : null,
                ':nome' => isset($user['nome']) ? $user['nome'] : null,
                ':perfil' => isset($user['perfil']) ? $user['perfil'] : null,
                ':sg_unidade' => isset($user['sg_unidade']) ? $user['sg_unidade'] : null,
                ':ip' => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : null,
                ':user_agent' => $agent,
                ':data_acesso' => date('Y-m-d H:i:s'),
            ));
        } catch (Exception $error) {
            Logger::error('Falha ao registrar evento de acesso.', array('evento' => $event, 'tipo' => get_class($error)));
        }
    }

    private static function auditValue($value, $limit)
    {
        $value = preg_replace('/[\r\n\[\]]/', ' ', (string) $value);
        return substr(trim($value), 0, $limit);
    }
}
