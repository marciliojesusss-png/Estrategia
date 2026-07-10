<?php
declare(strict_types=1);

require_once __DIR__ . '/Session.php';

final class Csrf
{
    public static function token()
    {
        Session::start();
        if (empty($_SESSION['_csrf_token']) || !is_string($_SESSION['_csrf_token'])) {
            $_SESSION['_csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['_csrf_token'];
    }

    public static function validate($token)
    {
        Session::start();
        return is_string($token) && $token !== '' && !empty($_SESSION['_csrf_token'])
            && hash_equals($_SESSION['_csrf_token'], $token);
    }
}
