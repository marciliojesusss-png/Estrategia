<?php
declare(strict_types=1);

require_once __DIR__ . '/Logger.php';
require_once __DIR__ . '/Response.php';
require_once __DIR__ . '/HttpException.php';

final class ErrorHandler
{
    private static $registered = false;
    private static $debug = false;
    private static $handling = false;
    private static $responseSent = false;

    public static function register($debug = false)
    {
        if (self::$registered) {
            return;
        }
        self::$registered = true;
        self::$debug = (bool) $debug;

        // Mantem a resposta em memoria ate o fim da requisicao. Em uma falha
        // global, o conteudo parcial pode ser descartado antes do erro seguro.
        ob_start();
        set_error_handler(array(__CLASS__, 'handleError'));
        set_exception_handler(array(__CLASS__, 'handleException'));
        register_shutdown_function(array(__CLASS__, 'handleShutdown'));
    }

    public static function handleError($severity, $message, $file, $line)
    {
        if (!(error_reporting() & $severity)) {
            return false;
        }

        if (in_array($severity, array(E_USER_ERROR, E_RECOVERABLE_ERROR), true)) {
            throw new ErrorException($message, 0, $severity, $file, $line);
        }

        // Politica conservadora: warnings, notices e deprecations legados nao
        // passam a interromper o fluxo. Em producao sao registrados e suprimidos;
        // com debug local, o tratamento nativo do PHP permanece visivel.
        if (self::$debug) {
            return false;
        }
        self::logTechnical('Erro PHP nao fatal: ' . $message, array(
            'severidade' => $severity,
            'arquivo' => $file,
            'linha' => $line,
        ));
        return true;
    }

    public static function handleException($error)
    {
        if ($error instanceof HttpException && $error->status() < 500) {
            self::clearOutputBuffers();
            if (self::isApiRequest()) {
                Response::error($error->getMessage(), $error->status(), $error->errors());
            } elseif (in_array($error->status(), array(403, 404), true)) {
                self::renderError($error->status());
            } else {
                if (!headers_sent()) {
                    http_response_code($error->status());
                    header('Content-Type: text/plain; charset=utf-8');
                }
                echo $error->getMessage();
            }
            self::terminateCliWithFailure();
            return;
        }

        if (self::$handling) {
            self::emergencyResponse();
            self::terminateCliWithFailure();
            return;
        }
        self::$handling = true;
        $requestId = Response::requestId();
        $details = self::exceptionDetails($error);
        $details['request_id'] = $requestId;
        self::logTechnical('Excecao inesperada: ' . $error->getMessage(), $details);
        self::clearOutputBuffers();
        self::$responseSent = true;
        self::sendUnexpectedResponse($requestId, $details);
        self::$handling = false;
        self::terminateCliWithFailure();
    }

    public static function handleShutdown()
    {
        if (self::$responseSent) {
            return;
        }
        $error = error_get_last();
        $fatalTypes = array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR, E_RECOVERABLE_ERROR);
        if ($error === null || !in_array($error['type'], $fatalTypes, true)) {
            return;
        }

        $requestId = Response::requestId();
        $details = array(
            'request_id' => $requestId,
            'tipo' => 'fatal_php',
            'severidade' => $error['type'],
            'mensagem_tecnica' => $error['message'],
            'arquivo' => $error['file'],
            'linha' => $error['line'],
        );
        self::logTechnical('Erro fatal PHP: ' . $error['message'], $details);
        self::clearOutputBuffers();
        self::$responseSent = true;
        self::sendUnexpectedResponse($requestId, $details);
    }

    public static function renderError($status, $requestId = null, array $debugDetails = array())
    {
        $allowed = array(403, 404, 500);
        $status = in_array((int) $status, $allowed, true) ? (int) $status : 500;
        $path = APP_ROOT . '/views/erros/' . $status . '.php';
        if ($requestId === null && $status === 500) {
            $requestId = Response::requestId();
        }
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: text/html; charset=utf-8');
            if ($requestId !== null) {
                header('X-Request-Id: ' . $requestId);
            }
        }
        if (is_file($path)) {
            require $path;
            return;
        }
        echo '<h1>Nao foi possivel concluir a solicitacao.</h1>';
    }

    public static function isApiRequest($routePath = null)
    {
        if ($routePath !== null && strpos('/' . trim((string) $routePath, '/'), '/api/') === 0) {
            return true;
        }
        if (defined('API_LEGACY_ALIAS') && API_LEGACY_ALIAS) {
            return true;
        }
        $route = isset($_GET['route']) ? trim((string) $_GET['route'], '/') : '';
        if (strpos('/' . $route, '/api/') === 0) {
            return true;
        }
        foreach (array('REQUEST_URI', 'SCRIPT_NAME', 'PHP_SELF') as $key) {
            $value = isset($_SERVER[$key]) ? (string) $_SERVER[$key] : '';
            $path = (string) parse_url($value, PHP_URL_PATH);
            if (preg_match('#(?:^|/)(?:public/)?api(?:/|$)#i', $path)) {
                return true;
            }
        }
        $accept = isset($_SERVER['HTTP_ACCEPT']) ? $_SERVER['HTTP_ACCEPT'] : '';
        return stripos($accept, 'application/json') !== false;
    }

    private static function sendUnexpectedResponse($requestId, array $details)
    {
        $message = 'Ocorreu um erro inesperado. Tente novamente ou informe o codigo da requisicao ao suporte.';
        $debugDetails = self::$debug ? $details : array();
        if (self::isApiRequest()) {
            if (!headers_sent()) {
                Response::error($message, 500, $debugDetails, $requestId);
                return;
            }
            echo json_encode(array(
                'sucesso' => false,
                'mensagem' => $message,
                'erros' => $debugDetails,
                'requestId' => $requestId,
            ), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            return;
        }
        self::renderError(500, $requestId, $debugDetails);
    }

    private static function exceptionDetails($error)
    {
        return array(
            'tipo' => get_class($error),
            'mensagem_tecnica' => $error->getMessage(),
            'arquivo' => $error->getFile(),
            'linha' => $error->getLine(),
            'stack' => $error->getTraceAsString(),
        );
    }

    private static function clearOutputBuffers()
    {
        while (ob_get_level() > 0) {
            if (!@ob_end_clean()) {
                break;
            }
        }
    }

    private static function emergencyResponse()
    {
        self::$responseSent = true;
        self::clearOutputBuffers();
        $message = 'Ocorreu um erro inesperado.';
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: text/plain; charset=utf-8');
        }
        echo $message;
    }

    private static function logTechnical($message, array $context)
    {
        try {
            Logger::error($message, $context);
        } catch (Throwable $ignored) {
            error_log(str_replace(array("\r", "\n"), ' ', (string) $message));
        }
    }

    private static function terminateCliWithFailure()
    {
        if (PHP_SAPI === 'cli') {
            exit(1);
        }
    }
}
