<?php
declare(strict_types=1);

require_once __DIR__ . '/Logger.php';
require_once __DIR__ . '/Response.php';

final class ErrorHandler
{
    public static function register()
    {
        set_error_handler(array(__CLASS__, 'handleError'));
        set_exception_handler(array(__CLASS__, 'handleException'));
        register_shutdown_function(array(__CLASS__, 'handleShutdown'));
    }

    public static function handleError($severity, $message, $file, $line)
    {
        if (!(error_reporting() & $severity)) {
            return false;
        }
        throw new ErrorException($message, 0, $severity, $file, $line);
    }

    public static function handleException($error)
    {
        Logger::error($error->getMessage(), array(
            'tipo' => get_class($error),
            'arquivo' => $error->getFile(),
            'linha' => $error->getLine(),
        ));
        if (self::expectsJson()) {
            Response::error('Erro interno ao processar a solicitacao.', 500);
            return;
        }
        self::renderError(500);
    }

    public static function handleShutdown()
    {
        $error = error_get_last();
        if ($error !== null && in_array($error['type'], array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR), true)) {
            Logger::error($error['message'], array('arquivo' => $error['file'], 'linha' => $error['line']));
        }
    }

    public static function renderError($status)
    {
        $allowed = array(403, 404, 500);
        $status = in_array((int) $status, $allowed, true) ? (int) $status : 500;
        $path = APP_ROOT . '/views/erros/' . $status . '.php';
        http_response_code($status);
        header('Content-Type: text/html; charset=utf-8');
        if (is_file($path)) {
            require $path;
            return;
        }
        echo '<h1>Não foi possível concluir a solicitação.</h1>';
    }

    private static function expectsJson()
    {
        $uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '';
        $accept = isset($_SERVER['HTTP_ACCEPT']) ? $_SERVER['HTTP_ACCEPT'] : '';
        return strpos($uri, '/api/') !== false || strpos($accept, 'application/json') !== false;
    }
}
