<?php
declare(strict_types=1);

$scenario = isset($argv[1]) ? (string) $argv[1] : '';
$environment = isset($argv[2]) ? (string) $argv[2] : 'production';
$debug = isset($argv[3]) ? (string) $argv[3] : 'false';

putenv('APP_ENV=' . $environment);
putenv('APP_DEBUG=' . $debug);
putenv('APP_BASE_PATH=');

$_SERVER['HTTP_X_REQUEST_ID'] = 'req-' . preg_replace('/[^a-z0-9_-]/i', '-', $scenario) . '-' . $environment;
$_SERVER['HTTP_ACCEPT'] = 'text/html';
$_SERVER['REQUEST_URI'] = '/estrategia/index.php?route=dashboard';
$_SERVER['SCRIPT_NAME'] = '/estrategia/index.php';
$_GET['route'] = 'dashboard';

if ($scenario === 'exception_api' || $scenario === 'fatal_api' || $scenario === 'router_404') {
    $_SERVER['HTTP_ACCEPT'] = 'application/json';
    $_SERVER['REQUEST_URI'] = '/estrategia/index.php?route=api/teste';
    $_GET['route'] = 'api/teste';
} elseif ($scenario === 'exception_api_physical') {
    $_SERVER['HTTP_ACCEPT'] = '*/*';
    $_SERVER['REQUEST_URI'] = '/estrategia/public/api/teste.php';
    $_SERVER['SCRIPT_NAME'] = '/estrategia/public/api/teste.php';
    unset($_GET['route']);
}

require_once __DIR__ . '/../../app/bootstrap.php';

register_shutdown_function(function () {
    fwrite(STDERR, 'TEST_HTTP_STATUS=' . (int) http_response_code() . PHP_EOL);
});

$secret = 'SQLSERVER INTERNO C:\\caminho\\secreto.php tabela_interna';

if ($scenario === 'config') {
    echo json_encode(array(
        'display_errors' => ini_get('display_errors'),
        'display_startup_errors' => ini_get('display_startup_errors'),
        'error_reporting' => error_reporting(),
        'log_errors' => ini_get('log_errors'),
        'request_id_1' => Response::requestId(),
        'request_id_2' => Response::requestId(),
    ));
    return;
}

if ($scenario === 'warning') {
    trigger_error('warning controlado e nao fatal', E_USER_WARNING);
    echo 'WARNING_CONTINUOU';
    return;
}

if ($scenario === 'fatal' || $scenario === 'fatal_api') {
    restore_error_handler();
    trigger_error($secret, E_USER_ERROR);
    return;
}

if ($scenario === 'router_404') {
    require_once __DIR__ . '/../../app/core/Router.php';
    $router = new Router();
    $router->dispatch('GET', '/api/recurso-inexistente');
    return;
}

throw new RuntimeException($secret);

