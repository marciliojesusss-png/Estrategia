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

        if (DB_DRIVER !== 'sqlsrv') {
            throw new RuntimeException('DB_DRIVER_INCOMPATIVEL: esta aplicacao aceita somente SQL Server com driver sqlsrv.');
        }

        self::$connection = self::connectSqlsrvNative();
        return self::$connection;
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
            'CharacterSet' => 'UTF-8',
        );

        if (SQLSERVER_USER !== '' || DB_AUTH_MODE === 'sql') {
            $options['UID'] = SQLSERVER_USER;
            $options['PWD'] = SQLSERVER_PASSWORD;
        }
        if (SQLSERVER_ENCRYPT !== '') {
            $options['Encrypt'] = filter_var(
                SQLSERVER_ENCRYPT,
                FILTER_VALIDATE_BOOLEAN,
                FILTER_NULL_ON_FAILURE
            ) ?? false;
        }
        if (SQLSERVER_TRUST_SERVER_CERTIFICATE !== '') {
            $options['TrustServerCertificate'] = filter_var(
                SQLSERVER_TRUST_SERVER_CERTIFICATE,
                FILTER_VALIDATE_BOOLEAN,
                FILTER_NULL_ON_FAILURE
            ) ?? false;
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
