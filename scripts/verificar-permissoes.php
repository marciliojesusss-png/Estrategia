<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/config/config.php';
require_once __DIR__ . '/../app/core/Logger.php';
require_once __DIR__ . '/../app/core/Session.php';

function verificar_diretorio($label, $path)
{
    if (!is_dir($path) && !@mkdir($path, 0750, true) && !is_dir($path)) {
        return $label . ': indisponivel';
    }

    $file = rtrim($path, '/\\') . DIRECTORY_SEPARATOR . '.preflight-' . getmypid() . '-' . uniqid('', true) . '.tmp';
    $written = @file_put_contents($file, 'ok') !== false;
    $read = $written && @file_get_contents($file) === 'ok';
    if (is_file($file)) {
        @unlink($file);
    }

    return $label . ': ' . ($written && $read ? 'gravavel' : 'nao gravavel');
}

function verificar_sessao()
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return 'sessao PHP: disponivel';
    }

    $previous = session_id();
    $id = 'preflight' . str_replace('.', '', uniqid('', true));
    @session_id($id);
    @session_start();
    $available = session_status() === PHP_SESSION_ACTIVE;
    if ($available) {
        $_SESSION['_preflight'] = 'ok';
        session_write_close();
    }
    if ($previous !== '') {
        @session_id($previous);
    }

    return 'sessao PHP: ' . ($available ? 'disponivel' : 'indisponivel');
}

$results = array(
    verificar_diretorio('storage/logs', LOG_PATH),
    verificar_diretorio('storage/temporarios', TEMP_PATH),
    verificar_diretorio('storage/backups', BACKUP_DIR),
    verificar_diretorio('uploads/evidencias', UPLOAD_PATH),
    verificar_sessao(),
);

Logger::info('[SESSION] Verificacao de permissoes executada.');

echo implode(PHP_EOL, $results) . PHP_EOL;
