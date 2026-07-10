<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';

final class Database
{
    private static $connection = null;

    public static function getConnection()
    {
        if (self::$connection !== null) {
            return self::$connection;
        }

        if (in_array(strtolower((string) DB_CONNECTION), ['sqlserver', 'sqlsrv'], true)) {
            self::$connection = self::connectSqlServer();
            return self::$connection;
        }

        self::$connection = self::connectSqlite();
        return self::$connection;
    }

    private static function connectSqlite()
    {
        if (!file_exists(DB_PATH)) {
            if (!file_exists(SCHEMA_PATH)) {
                throw new RuntimeException('Banco SQLite não encontrado e schema.sql indisponível.');
            }
            $pdo = new PDO('sqlite:' . DB_PATH);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $pdo->exec('PRAGMA foreign_keys = ON');
            $pdo->exec((string) file_get_contents(SCHEMA_PATH));
            return $pdo;
        }

        $pdo = new PDO('sqlite:' . DB_PATH);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $pdo->exec('PRAGMA foreign_keys = ON');

        return $pdo;
    }

    private static function connectSqlServer()
    {
        if (!in_array('sqlsrv', PDO::getAvailableDrivers(), true)) {
            throw new RuntimeException('Driver PDO sqlsrv nao esta instalado no PHP.');
        }

        $server = SQLSERVER_HOST . (SQLSERVER_PORT !== '' ? ',' . SQLSERVER_PORT : '');
        $dsn = sprintf(
            'sqlsrv:Server=%s;Database=%s;Encrypt=%s;TrustServerCertificate=%s;CharacterSet=UTF-8',
            $server,
            SQLSERVER_DATABASE,
            SQLSERVER_ENCRYPT,
            SQLSERVER_TRUST_SERVER_CERTIFICATE
        );

        $pdo = SQLSERVER_USER !== ''
            ? new PDO($dsn, SQLSERVER_USER, SQLSERVER_PASSWORD)
            : new PDO($dsn);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);

        return $pdo;
    }
}
