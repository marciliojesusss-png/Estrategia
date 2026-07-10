<?php
declare(strict_types=1);

define('APP_ROOT', dirname(__DIR__, 2));
define('APP_ENV', getenv('APP_ENV') ?: 'production');
define('APP_DEBUG', filter_var(getenv('APP_DEBUG') ?: 'false', FILTER_VALIDATE_BOOLEAN));
define('APP_URL', rtrim(getenv('APP_URL') ?: '', '/'));
define('DB_CONNECTION', getenv('DB_CONNECTION') ?: (APP_ENV === 'production' ? 'sqlsrv' : 'sqlite'));
define('DB_PATH', APP_ROOT . '/database/indicadores.sqlite');
define('SCHEMA_PATH', APP_ROOT . '/database/schema.sql');
define('STORAGE_PATH', APP_ROOT . '/storage');
define('LOG_PATH', STORAGE_PATH . '/logs');
define('BACKUP_DIR', STORAGE_PATH . '/backups');
define('TEMP_PATH', STORAGE_PATH . '/temporarios');
define('UPLOAD_PATH', APP_ROOT . '/uploads/evidencias');
define('LDAP_PATH', getenv('LDAP_PATH') ?: dirname(APP_ROOT) . '/acessoldap/LDAP.php');
define('SQLSERVER_HOST', getenv('SQLSERVER_HOST') ?: 'DF7436SR439');
define('SQLSERVER_DATABASE', getenv('SQLSERVER_DATABASE') ?: 'DB5319_IndicadoresEstrategicos');
define('SQLSERVER_PORT', getenv('SQLSERVER_PORT') ?: '');
define('SQLSERVER_USER', getenv('SQLSERVER_USER') ?: '');
define('SQLSERVER_PASSWORD', getenv('SQLSERVER_PASSWORD') ?: '');
define('SQLSERVER_ENCRYPT', getenv('SQLSERVER_ENCRYPT') ?: 'yes');
define('SQLSERVER_TRUST_SERVER_CERTIFICATE', getenv('SQLSERVER_TRUST_SERVER_CERTIFICATE') ?: 'no');
define('SESSION_IDLE_TIMEOUT', (int) (getenv('SESSION_IDLE_TIMEOUT') ?: 1800));
define('LOG_MAX_BYTES', (int) (getenv('LOG_MAX_BYTES') ?: 5242880));
define('UPLOAD_MAX_BYTES', (int) (getenv('UPLOAD_MAX_BYTES') ?: 10485760));
define('UPLOAD_ALLOWED_EXTENSIONS', getenv('UPLOAD_ALLOWED_EXTENSIONS') ?: 'pdf,jpg,jpeg,png,xls,xlsx,doc,docx');
define('API_MAX_PAYLOAD_BYTES', (int) (getenv('API_MAX_PAYLOAD_BYTES') ?: 1048576));

date_default_timezone_set('America/Sao_Paulo');
