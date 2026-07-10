<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';

final class Logger
{
    public static function error($message, array $context = array())
    {
        self::write('ERROR', $message, $context);
    }

    public static function info($message, array $context = array())
    {
        self::write('INFO', $message, $context);
    }

    private static function write($level, $message, array $context)
    {
        self::ensureDirectory();
        $file = LOG_PATH . '/aplicacao.log';
        if (is_file($file) && filesize($file) >= LOG_MAX_BYTES) {
            @rename($file, LOG_PATH . '/aplicacao-' . date('Ymd-His') . '.log');
        }
        $safe = self::sanitize($context);
        $line = sprintf("[%s] %s %s %s\n", date('c'), $level, self::cleanMessage($message), json_encode($safe));
        error_log($line, 3, $file);
    }

    private static function ensureDirectory()
    {
        if (!is_dir(LOG_PATH) && !@mkdir(LOG_PATH, 0750, true) && !is_dir(LOG_PATH)) {
            throw new RuntimeException('Diretorio de logs indisponivel.');
        }
    }

    private static function sanitize(array $context)
    {
        $blocked = array('password', 'senha', 'token', 'secret', 'authorization', 'cookie', 'dsn');
        $safe = array();
        foreach ($context as $key => $value) {
            if (in_array(strtolower((string) $key), $blocked, true)) {
                $safe[$key] = '[PROTEGIDO]';
            } elseif (is_scalar($value) || $value === null) {
                $safe[$key] = $value;
            } else {
                $safe[$key] = '[DADO_COMPLEXO]';
            }
        }
        return $safe;
    }

    private static function cleanMessage($message)
    {
        return str_replace(array("\r", "\n"), ' ', (string) $message);
    }
}
