<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/core/Database.php';
require_once __DIR__ . '/../app/core/Logger.php';

function preflight_line($section, $label, $status, $detail = '')
{
    $text = '[' . $section . '] ' . $label . ': ' . $status . ($detail !== '' ? ' - ' . $detail : '');
    echo $text . PHP_EOL;
    return $status === 'ok' || $status === 'aviso';
}

function dir_writable_check($path)
{
    if (!is_dir($path) && !@mkdir($path, 0750, true) && !is_dir($path)) {
        return false;
    }
    $file = rtrim($path, '/\\') . DIRECTORY_SEPARATOR . '.preflight-' . getmypid() . '-' . uniqid('', true) . '.tmp';
    $ok = @file_put_contents($file, 'ok') !== false;
    if (is_file($file)) {
        @unlink($file);
    }
    return $ok;
}

function preflight_table_exists($db, $driver, $table)
{
    if ($driver === 'sqlsrv') {
        $stmt = $db->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = :table");
        $stmt->execute(array(':table' => $table));
        return (int) $stmt->fetchColumn() > 0;
    }
    $stmt = $db->prepare("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = :table");
    $stmt->execute(array(':table' => $table));
    return (int) $stmt->fetchColumn() > 0;
}

$ok = true;

Logger::info('[BOOT] Preflight do servidor iniciado.');

$ok = preflight_line('BOOT', 'PHP_VERSION', version_compare(PHP_VERSION, '7.1.19', '>=') ? 'ok' : 'falha', PHP_VERSION) && $ok;
$ini = php_ini_loaded_file();
$ok = preflight_line('BOOT', 'php.ini carregado', $ini ? 'ok' : 'aviso', $ini ?: 'nao informado') && $ok;

$ok = preflight_line('BOOT', 'extensao sqlsrv', extension_loaded('sqlsrv') ? 'ok' : 'aviso') && $ok;
$ok = preflight_line('BOOT', 'extensao pdo_sqlsrv', in_array('sqlsrv', PDO::getAvailableDrivers(), true) ? 'ok' : 'aviso') && $ok;
$ok = preflight_line('BOOT', 'extensao ldap', extension_loaded('ldap') ? 'ok' : 'aviso') && $ok;
preflight_line('BOOT', 'drivers PDO disponiveis', 'ok', implode(',', PDO::getAvailableDrivers()));

$ok = preflight_line('CONFIG', 'configuracao carregada', defined('APP_ROOT') && defined('DB_DRIVER') && defined('AUTH_PROVIDER') ? 'ok' : 'falha') && $ok;
preflight_line('CONFIG', 'APP_BASE_PATH', APP_BASE_PATH === '/estrategia' ? 'ok' : 'aviso', APP_BASE_PATH === '' ? '/' : APP_BASE_PATH);
preflight_line('CONFIG', 'DB_DRIVER', 'ok', DB_DRIVER);
preflight_line('AUTH', 'AUTH_PROVIDER', 'ok', AUTH_PROVIDER);
if (AUTH_PROVIDER === 'legacy_file') {
    $legacyOk = LDAP_LEGACY_PATH !== '' && is_file(LDAP_LEGACY_PATH) && is_readable(LDAP_LEGACY_PATH);
    $ok = preflight_line('AUTH', 'arquivo LDAP legado existente', $legacyOk ? 'ok' : 'falha', LDAP_LEGACY_PATH !== '' ? 'configurado' : 'nao configurado') && $ok;
}

foreach (array(
    'storage/logs' => LOG_PATH,
    'storage/temporarios' => TEMP_PATH,
    'storage/backups' => BACKUP_DIR,
    'uploads/evidencias' => UPLOAD_PATH,
) as $label => $path) {
    $ok = preflight_line('UPLOAD', $label . ' gravavel', dir_writable_check($path) ? 'ok' : 'falha') && $ok;
}

try {
    $db = Database::getConnection();
    $driver = (string) $db->getAttribute(PDO::ATTR_DRIVER_NAME);
    $ok = preflight_line('DATABASE', 'conexao SQL', 'ok', 'driver=' . $driver) && $ok;

    $select = (int) $db->query('SELECT 1')->fetchColumn();
    $ok = preflight_line('DATABASE', 'SELECT 1', $select === 1 ? 'ok' : 'falha') && $ok;

    foreach (array('indicadores', 'lancamentos', 'usuarios_acesso', 'acessos_log') as $table) {
        $exists = preflight_table_exists($db, $driver, $table);
        $ok = preflight_line('DATABASE', 'tabela ' . $table, $exists ? 'ok' : 'falha') && $ok;
    }
} catch (Exception $error) {
    Logger::error('[DATABASE] Preflight de banco falhou.', array('tipo' => get_class($error)));
    $ok = preflight_line('DATABASE', 'conexao SQL', 'falha', $error->getMessage()) && $ok;
}

Logger::info('[BOOT] Preflight do servidor finalizado.', array('status' => $ok ? 'ok' : 'falha'));
exit($ok ? 0 : 1);
