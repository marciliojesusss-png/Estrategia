<?php
declare(strict_types=1);

final class Response
{
    public static function json($data, $status = 200)
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store, private');
        header('X-Request-Id: '.self::requestId());
        $encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($encoded === false) {
            http_response_code(500);
            $encoded = '{"sucesso":false,"mensagem":"Falha ao gerar resposta JSON.","erros":[]}';
        }
        echo $encoded;
    }

    private static function requestId(){if(!empty($_SERVER['HTTP_X_REQUEST_ID'])&&preg_match('/^[a-zA-Z0-9._-]{1,100}$/',$_SERVER['HTTP_X_REQUEST_ID']))return$_SERVER['HTTP_X_REQUEST_ID'];return bin2hex(random_bytes(12));}

    public static function error($message, $status = 400, array $errors = array())
    {
        self::json(array(
            'sucesso' => false,
            'mensagem' => $message,
            'erros' => $errors,
        ), $status);
    }

    public static function success($data = array(), $message = 'Operacao realizada com sucesso.', $status = 200)
    {
        self::json(array(
            'sucesso' => true,
            'mensagem' => $message,
            'dados' => $data,
        ), $status);
    }

    public static function html($content, $status = 200)
    {
        http_response_code($status);
        header('Content-Type: text/html; charset=utf-8');
        echo $content;
    }

    public static function redirect($location, $status = 302)
    {
        if (defined('APP_BASE_PATH') && strpos($location, '/') === 0 && strpos($location, '//') !== 0 && strpos($location, APP_BASE_PATH . '/') !== 0) {
            $location = APP_BASE_PATH . $location;
        }
        header('Location: ' . $location, true, $status);
        exit;
    }
}
