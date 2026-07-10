<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';

final class Session
{
    public static function start()
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            self::enforceTimeout();
            return;
        }
        $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (isset($_SERVER['SERVER_PORT']) && (string) $_SERVER['SERVER_PORT'] === '443');
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.cookie_httponly', '1');
        ini_set('session.cookie_secure', $secure ? '1' : '0');
        if (PHP_VERSION_ID >= 70300) {
            ini_set('session.cookie_samesite', 'Lax');
            session_set_cookie_params(array(
                'lifetime' => 0, 'path' => '/', 'domain' => '',
                'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax',
            ));
        } else {
            session_set_cookie_params(0, '/; samesite=Lax', '', $secure, true);
        }
        session_start();
        self::enforceTimeout();
    }

    public static function regenerate()
    {
        self::start();
        session_regenerate_id(true);
    }

    public static function destroy()
    {
        self::start();
        $_SESSION = array();
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        session_destroy();
    }

    public static function consumeExpired()
    {
        self::start();
        $expired = !empty($_SESSION['_expired']);
        unset($_SESSION['_expired']);
        return $expired;
    }

    private static function enforceTimeout()
    {
        $now = time();
        if (isset($_SESSION['_last_activity']) && $now - (int) $_SESSION['_last_activity'] > SESSION_IDLE_TIMEOUT) {
            $_SESSION = array();
            session_regenerate_id(true);
            $_SESSION['_expired'] = true;
        }
        $_SESSION['_last_activity'] = $now;
    }
}
