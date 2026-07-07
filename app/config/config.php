<?php
declare(strict_types=1);

define('APP_ROOT', dirname(__DIR__, 2));
define('APP_ENV', getenv('APP_ENV') ?: 'production');
define('DB_CONNECTION', getenv('DB_CONNECTION') ?: 'sqlite');
define('DB_PATH', APP_ROOT . '/database/indicadores.sqlite');
define('SCHEMA_PATH', APP_ROOT . '/database/schema.sql');
define('BACKUP_DIR', APP_ROOT . '/database/backups');
define('LDAP_PATH', getenv('LDAP_PATH') ?: dirname(APP_ROOT) . '/acessoldap/LDAP.php');
define('SQLSERVER_HOST', getenv('SQLSERVER_HOST') ?: 'localhost');
define('SQLSERVER_DATABASE', getenv('SQLSERVER_DATABASE') ?: 'Estrategia');
define('SQLSERVER_ENCRYPT', getenv('SQLSERVER_ENCRYPT') ?: 'no');
define('SQLSERVER_TRUST_SERVER_CERTIFICATE', getenv('SQLSERVER_TRUST_SERVER_CERTIFICATE') ?: 'yes');

date_default_timezone_set('America/Sao_Paulo');
