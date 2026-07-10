<?php
declare(strict_types=1);

final class Response
{
    public static function json($data, $status = 200)
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        $encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($encoded === false) {
            http_response_code(500);
            $encoded = '{"sucesso":false,"mensagem":"Falha ao gerar resposta JSON.","erros":[]}';
        }
        echo $encoded;
    }

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
        header('Location: ' . $location, true, $status);
        exit;
    }
}
