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
        $raw = file_get_contents('php://input') ?: '';
        if ($raw === '') {
            return $_POST ?: [];
        }
        $json = json_decode($raw, true);
        return is_array($json) ? $json : [];
    }

    public static function json()
    {
        return self::input();
    }
}
