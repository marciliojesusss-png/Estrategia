<?php
//declare(strict_types=1);
define('APP_PUBLIC_URL_PREFIX', '/public');

// (erro) ini_set('display_errors', 1);
ini_set('display_errors', '1');
error_reporting(E_ALL||E_STRICT||E_DEPRECATED||E_PARSE||E_WARNING||E_ERROR);

set_error_handler(function($severity, $message, $filename, $lineno) {
    // Se o erro foi silenciado com @, respeita e não para o código
    if (!(error_reporting() & $severity)) {
        return false;
    }
    // Transforma qualquer aviso/erro em uma exceção interrupiva
    throw new ErrorException($message, 0, $severity, $filename, $lineno);
});

require __DIR__ . '/public/index.php';
