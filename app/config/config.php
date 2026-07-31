<?php
declare(strict_types=1);

require_once __DIR__ . '/Dotenv.php';

define('APP_ROOT', dirname(__DIR__, 2));
Dotenv::load(APP_ROOT . '/.env');
define('APP_ENV', getenv('APP_ENV') ?: 'production');
define('APP_DEBUG', filter_var(getenv('APP_DEBUG') ?: 'false', FILTER_VALIDATE_BOOLEAN));
define('APP_KEY', getenv('APP_KEY') ?: '');
define('APP_URL', rtrim(getenv('APP_URL') ?: '', '/'));
define('CI_ENV', getenv('CI_ENV') ?: APP_ENV);
$timezone = getenv('APP_TIMEZONE') ?: 'America/Sao_Paulo';
define('APP_TIMEZONE', in_array($timezone, timezone_identifiers_list(), true) ? $timezone : 'America/Sao_Paulo');

// Determina APP_BASE_PATH com comportamento diferente para desenvolvimento
// - Se a variável de ambiente APP_BASE_PATH estiver definida (mesmo vazia), respeita-a
// - Caso contrário, em produção usa '/estrategia', em outros ambientes usa raiz ('')
$envBase = getenv('APP_BASE_PATH');
if ($envBase !== false) {
	$base = '/' . trim((string) $envBase, '/');
	// se o env foi definido como '/', considere raiz vazia
	$base = $base === '/' ? '' : $base;
} else {
	$base = (APP_ENV === 'production') ? '/estrategia' : '';
}
define('APP_BASE_PATH', $base);
$dbSubdriver = getenv('DB_PDO_SUBDRIVER');
define('DB_PDO_SUBDRIVER', $dbSubdriver ?: '');
define('DB_CONNECTION', getenv('DB_CONNECTION') ?: (DB_PDO_SUBDRIVER ?: (APP_ENV === 'production' ? 'sqlsrv' : 'sqlite')));
define('DB_PATH', APP_ROOT . '/database/indicadores.sqlite');
define('SCHEMA_PATH', APP_ROOT . '/database/schema.sql');
define('STORAGE_PATH', APP_ROOT . '/storage');
define('LOG_PATH', STORAGE_PATH . '/logs');
define('BACKUP_DIR', STORAGE_PATH . '/backups');
define('TEMP_PATH', STORAGE_PATH . '/temporarios');
define('UPLOAD_PATH', APP_ROOT . '/uploads/evidencias');
define('LDAP_PATH', getenv('LDAP_PATH') ?: dirname(APP_ROOT) . '/acessoldap/LDAP.php');
define('LDAP_SERVER', getenv('LDAP_SERVER') ?: '');
define('LDAP_TREE', getenv('LDAP_TREE') ?: '');
define('LDAP_PORT', (int) (getenv('LDAP_PORT') ?: 389));
define('LDAP_USERNAME', getenv('LDAP_USERNAME') ?: '');
define('LDAP_PASSWORD', getenv('LDAP_PASSWORD') ?: '');
define('SQLSERVER_HOST', getenv('SQLSERVER_HOST') ?: (getenv('DB_HOST') ?: 'DF7436SR439'));
define('SQLSERVER_DATABASE', getenv('SQLSERVER_DATABASE') ?: (getenv('DB_DATABASE') ?: 'DB5319_IndicadoresEstrategicos'));
define('SQLSERVER_PORT', getenv('SQLSERVER_PORT') ?: '');
define('SQLSERVER_USER', getenv('SQLSERVER_USER') ?: (getenv('DB_USERNAME') ?: ''));
define('SQLSERVER_PASSWORD', getenv('SQLSERVER_PASSWORD') ?: (getenv('DB_PASSWORD') ?: ''));
define('SQLSERVER_ENCRYPT', getenv('SQLSERVER_ENCRYPT') ?: 'yes');
define('SQLSERVER_TRUST_SERVER_CERTIFICATE', getenv('SQLSERVER_TRUST_SERVER_CERTIFICATE') ?: 'no');
define('SESSION_IDLE_TIMEOUT', (int) (getenv('SESSION_IDLE_TIMEOUT') ?: 1800));
define('LOG_MAX_BYTES', (int) (getenv('LOG_MAX_BYTES') ?: 5242880));
define('UPLOAD_MAX_BYTES', (int) (getenv('UPLOAD_MAX_BYTES') ?: 10485760));
define('UPLOAD_ALLOWED_EXTENSIONS', getenv('UPLOAD_ALLOWED_EXTENSIONS') ?: 'pdf,jpg,jpeg,png,xls,xlsx,doc,docx');
define('API_MAX_PAYLOAD_BYTES', (int) (getenv('API_MAX_PAYLOAD_BYTES') ?: 1048576));

date_default_timezone_set(APP_TIMEZONE);
