<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/config/config.php';
require_once __DIR__ . '/../scripts/diagnostico-servidor-lib.php';

header('Content-Type: text/plain; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

function diagnostico_iis_server_values()
{
    $path = APP_ROOT . '/app/config/servidor.local.php';
    if (!is_file($path) || !is_readable($path)) {
        return array();
    }
    $values = require $path;
    return is_array($values) ? $values : array();
}

$values = diagnostico_iis_server_values();
$enabled = !empty($values['diagnostico_web_habilitado']);
$expectedKey = isset($values['diagnostico_web_chave']) ? trim((string) $values['diagnostico_web_chave']) : '';

if (!$enabled || $expectedKey === '') {
    http_response_code(404);
    echo 'Diagnostico web desabilitado.' . PHP_EOL;
    exit;
}

$providedKey = isset($_GET['chave']) ? trim((string) $_GET['chave']) : '';
if ($providedKey === '' && isset($_GET['key'])) {
    $providedKey = trim((string) $_GET['key']);
}
if ($providedKey === '' && isset($_SERVER['HTTP_X_DIAGNOSTICO_CHAVE'])) {
    $providedKey = trim((string) $_SERVER['HTTP_X_DIAGNOSTICO_CHAVE']);
}

if ($providedKey === '' || !hash_equals($expectedKey, $providedKey)) {
    http_response_code(403);
    echo 'Chave do diagnostico invalida.' . PHP_EOL;
    exit;
}

$resultado = diagnostico_servidor_run(array('web' => true));
echo $resultado['report'];
