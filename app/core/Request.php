<?php
declare(strict_types=1);

final class Request
{
    public static function method()
    {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    public static function input()
    {
        if (!empty($_POST)) return $_POST;
        return self::json();
    }

    public static function json()
    {
        require_once __DIR__ . '/HttpException.php';
        $length=isset($_SERVER['CONTENT_LENGTH'])?(int)$_SERVER['CONTENT_LENGTH']:0;
        if($length>API_MAX_PAYLOAD_BYTES)throw new HttpException('Payload excede o limite permitido.',413);
        $type=isset($_SERVER['CONTENT_TYPE'])?strtolower(trim(explode(';',$_SERVER['CONTENT_TYPE'])[0])):'';
        $raw=file_get_contents('php://input');$raw=$raw===false?'':$raw;
        if($raw===''||trim($raw)==='')return array();
        if($type!=='application/json'&&substr($type,-5)!=='+json')throw new HttpException('Content-Type deve ser application/json.',415);
        $json=json_decode($raw,true);
        if(json_last_error()!==JSON_ERROR_NONE||!is_array($json))throw new HttpException('JSON invalido.',400,array('json'=>json_last_error_msg()));
        return$json;
    }

    public static function queryInt($key,$default,$min=1,$max=100){$value=isset($_GET[$key])?(int)$_GET[$key]:(int)$default;return max($min,min($max,$value));}
}
