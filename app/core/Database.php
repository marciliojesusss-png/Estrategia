<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/Logger.php';
require_once __DIR__ . '/database/SqlsrvConnectionAdapter.php';

final class Database
{
    private static $connection = null;

    public static function getConnection()
    {
        if (self::$connection !== null) {
            return self::$connection;
        }

        if (DB_DRIVER === 'sqlsrv') {
            self::$connection = self::connectSqlsrvNative();
            return self::$connection;
        }

        if (DB_DRIVER !== 'sqlite') {
            throw new RuntimeException('DB_DRIVER_INCOMPATIVEL: configure DB_DRIVER=sqlsrv ou DB_DRIVER=sqlite.');
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

    private static function connectSqlsrvNative()
    {
        if (SQLSERVER_HOST === '' || SQLSERVER_DATABASE === '') {
            Logger::error('[DATABASE] Configuracao SQL Server incompleta.', array(
                'host' => SQLSERVER_HOST !== '' ? 'configurado' : 'ausente',
                'database' => SQLSERVER_DATABASE !== '' ? 'configurado' : 'ausente',
                'auth_mode' => DB_AUTH_MODE,
            ));
            throw new RuntimeException('SQLSERVER_CONFIG_INCOMPLETA: informe db_host e db_database em app/config/servidor.local.php ou no ambiente do IIS.');
        }
        if (DB_AUTH_MODE === 'sql' && (SQLSERVER_USER === '' || SQLSERVER_PASSWORD === '')) {
            Logger::error('[DATABASE] Credenciais SQL Server ausentes para autenticacao SQL.', array(
                'usuario' => SQLSERVER_USER !== '' ? 'configurado' : 'ausente',
                'senha' => SQLSERVER_PASSWORD !== '' ? 'configurada' : 'ausente',
            ));
            throw new RuntimeException('SQLSERVER_CREDENCIAIS_AUSENTES: informe db_username e db_password em app/config/servidor.local.php ou no ambiente do IIS.');
        }
        if (!function_exists('sqlsrv_connect')) {
            Logger::error('[DATABASE] Extensao sqlsrv indisponivel.', array('driver' => DB_DRIVER));
            throw new RuntimeException('SQLSRV_INDISPONIVEL: extensao sqlsrv nao esta instalada no PHP.');
        }

        $server = SQLSERVER_HOST . (SQLSERVER_PORT !== '' ? ',' . SQLSERVER_PORT : '');
        $options = array(
            'Database' => SQLSERVER_DATABASE,
        );

        if (SQLSERVER_USER !== '' || DB_AUTH_MODE === 'sql') {
            $options['UID'] = SQLSERVER_USER;
            $options['PWD'] = SQLSERVER_PASSWORD;
        }
        if (SQLSERVER_ENCRYPT !== '') {
            $options['Encrypt'] = SQLSERVER_ENCRYPT;
        }
        if (SQLSERVER_TRUST_SERVER_CERTIFICATE !== '') {
            $options['TrustServerCertificate'] = SQLSERVER_TRUST_SERVER_CERTIFICATE;
        }

        $connection = sqlsrv_connect($server, $options);
        if ($connection === false) {
            Logger::error('[DATABASE] Falha ao conectar via sqlsrv nativo.', array(
                'servidor' => SQLSERVER_HOST !== '' ? 'configurado' : 'nao configurado',
                'banco' => SQLSERVER_DATABASE !== '' ? 'configurado' : 'nao configurado',
                'auth_mode' => DB_AUTH_MODE,
            ));
            throw new RuntimeException('SQLSRV_CONEXAO_FALHOU: ' . SqlsrvConnectionAdapter::lastError());
        }

        return new SqlsrvConnectionAdapter($connection);
    }
}
