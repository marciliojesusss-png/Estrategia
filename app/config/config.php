<?php
declare(strict_types=1);

define('APP_ROOT', dirname(__DIR__, 2));

function config_has_env(array $names)
{
    foreach ($names as $name) {
        if (getenv($name) !== false) {
            return true;
        }
    }
    return false;
}

function config_set_env_group(array $names, $value)
{
    if (config_has_env($names) || is_array($value) || is_object($value)) {
        return;
    }
    $value = is_bool($value) ? ($value ? 'true' : 'false') : (string) $value;
    foreach ($names as $name) {
        putenv($name . '=' . $value);
        $_ENV[$name] = $value;
        if (!isset($_SERVER[$name])) {
            $_SERVER[$name] = $value;
        }
    }
}

function config_normalize_db_driver($driver)
{
    $driver = strtolower(trim((string) $driver));
    if ($driver === 'sqlserver' || $driver === 'pdo_sqlsrv') {
        return 'sqlsrv';
    }
    return $driver;
}

function config_apply_server_file($path)
{
    if (!is_file($path) || !is_readable($path)) {
        return;
    }
    $values = require $path;
    if (!is_array($values)) {
        return;
    }

    $mapping = array(
        'app_env' => array('APP_ENV'),
        'app_base_path' => array('APP_BASE_PATH'),
        'db_host' => array('SQLSERVER_HOST', 'DB_HOST'),
        'db_database' => array('SQLSERVER_DATABASE', 'DB_DATABASE'),
        'db_auth_mode' => array('DB_AUTH_MODE'),
        'db_username' => array('SQLSERVER_USER', 'DB_USERNAME'),
        'db_password' => array('SQLSERVER_PASSWORD', 'DB_PASSWORD'),
        'auth_provider' => array('AUTH_PROVIDER'),
        'ldap_legacy_path' => array('LDAP_LEGACY_PATH'),
        'diagnostico_php_version' => array('DIAGNOSTICO_PHP_VERSION'),
    );

    foreach ($mapping as $key => $names) {
        if (array_key_exists($key, $values)) {
            config_set_env_group($names, $values[$key]);
        }
    }

    if (array_key_exists('db_driver', $values) && !config_has_env(array('DB_DRIVER', 'DB_CONNECTION'))) {
        $driver = config_normalize_db_driver($values['db_driver']);
        if ($driver !== '') {
            config_set_env_group(array('DB_DRIVER'), $driver);
            config_set_env_group(array('DB_CONNECTION'), $driver === 'sqlsrv' ? 'sqlsrv' : $driver);
        }
    }

    if (array_key_exists('db_connection', $values) && !config_has_env(array('DB_CONNECTION'))) {
        $connection = config_normalize_db_driver($values['db_connection']);
        if ($connection !== '') {
            config_set_env_group(array('DB_CONNECTION'), $connection);
        }
    }
}

config_apply_server_file(APP_ROOT . '/app/config/servidor.local.php');
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
$dbConnectionValue = getenv('DB_CONNECTION');
$dbDriverValue = getenv('DB_DRIVER');
$dbConnection = $dbConnectionValue === false ? false : config_normalize_db_driver($dbConnectionValue);
$dbDriver = $dbDriverValue === false ? false : config_normalize_db_driver($dbDriverValue);
if ($dbDriver === false || $dbDriver === '') {
    if ($dbConnection === 'sqlsrv') {
        $dbDriver = 'sqlsrv';
    } elseif ($dbConnection !== false && $dbConnection !== '') {
        $dbDriver = $dbConnection;
    } else {
        $dbDriver = APP_ENV === 'production' ? 'sqlsrv' : 'sqlite';
    }
}
define('DB_DRIVER', strtolower((string) $dbDriver));
if ($dbConnection === false || $dbConnection === '') {
    $dbConnection = DB_DRIVER === 'sqlsrv' ? 'sqlsrv' : DB_DRIVER;
}
define('DB_CONNECTION', strtolower((string) $dbConnection));
define('DB_PATH', APP_ROOT . '/database/indicadores.sqlite');
define('SCHEMA_PATH', APP_ROOT . '/database/schema.sql');
define('STORAGE_PATH', APP_ROOT . '/storage');
define('LOG_PATH', STORAGE_PATH . '/logs');
define('BACKUP_DIR', STORAGE_PATH . '/backups');
define('TEMP_PATH', STORAGE_PATH . '/temporarios');
define('UPLOAD_PATH', APP_ROOT . '/uploads/evidencias');
define('LDAP_URI', getenv('LDAP_URI') ?: (getenv('LDAP_SERVER') ?: ''));
define('LDAP_BASE_DN', getenv('LDAP_BASE_DN') ?: (getenv('LDAP_TREE') ?: ''));
define('LDAP_BIND_DN', getenv('LDAP_BIND_DN') ?: (getenv('LDAP_USERNAME') ?: ''));
define('LDAP_BIND_PASSWORD', getenv('LDAP_BIND_PASSWORD') ?: (getenv('LDAP_PASSWORD') ?: ''));
define('LDAP_USER_FILTER', getenv('LDAP_USER_FILTER') ?: '(sAMAccountName={matricula})');
define('LDAP_ATTR_MATRICULA', getenv('LDAP_ATTR_MATRICULA') ?: 'sAMAccountName');
define('LDAP_ATTR_NOME', getenv('LDAP_ATTR_NOME') ?: 'displayName');
define('LDAP_ATTR_FUNCAO', getenv('LDAP_ATTR_FUNCAO') ?: 'title');
define('LDAP_ATTR_UNIDADE', getenv('LDAP_ATTR_UNIDADE') ?: 'department');
define('LDAP_ATTR_SG_UNIDADE', getenv('LDAP_ATTR_SG_UNIDADE') ?: 'departmentNumber');
define('LDAP_ATTR_NO_UNIDADE', getenv('LDAP_ATTR_NO_UNIDADE') ?: 'department');
define('LDAP_STARTTLS', filter_var(getenv('LDAP_STARTTLS') ?: 'true', FILTER_VALIDATE_BOOLEAN));
define('LDAP_REQUIRE_TLS', filter_var(getenv('LDAP_REQUIRE_TLS') ?: (APP_ENV === 'production' ? 'true' : 'false'), FILTER_VALIDATE_BOOLEAN));
define('AUTH_PROVIDER', getenv('AUTH_PROVIDER') ?: 'legacy_file');
define('LDAP_LEGACY_PATH', getenv('LDAP_LEGACY_PATH') ?: dirname(APP_ROOT) . '/acessoldap/LDAP.php');
define('SQLSERVER_HOST', getenv('SQLSERVER_HOST') ?: (getenv('DB_HOST') ?: ''));
define('SQLSERVER_DATABASE', getenv('SQLSERVER_DATABASE') ?: (getenv('DB_DATABASE') ?: ''));
define('SQLSERVER_PORT', getenv('SQLSERVER_PORT') ?: '');
define('SQLSERVER_USER', getenv('SQLSERVER_USER') ?: (getenv('DB_USERNAME') ?: ''));
define('SQLSERVER_PASSWORD', getenv('SQLSERVER_PASSWORD') ?: (getenv('DB_PASSWORD') ?: ''));
define('DB_AUTH_MODE', getenv('DB_AUTH_MODE') ?: (SQLSERVER_USER !== '' ? 'sql' : 'integrated'));
define('SQLSERVER_ENCRYPT', 'no');
define('SQLSERVER_TRUST_SERVER_CERTIFICATE', '');
define('SESSION_IDLE_TIMEOUT', (int) (getenv('SESSION_IDLE_TIMEOUT') ?: 1800));
define('LOG_MAX_BYTES', (int) (getenv('LOG_MAX_BYTES') ?: 5242880));
define('UPLOAD_MAX_BYTES', (int) (getenv('UPLOAD_MAX_BYTES') ?: 10485760));
define('UPLOAD_ALLOWED_EXTENSIONS', getenv('UPLOAD_ALLOWED_EXTENSIONS') ?: 'pdf,jpg,jpeg,png,xls,xlsx,doc,docx');
define('API_MAX_PAYLOAD_BYTES', (int) (getenv('API_MAX_PAYLOAD_BYTES') ?: 1048576));
define('DIAGNOSTICO_PHP_VERSION', getenv('DIAGNOSTICO_PHP_VERSION') ?: '');

date_default_timezone_set(APP_TIMEZONE);
