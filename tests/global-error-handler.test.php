<?php
declare(strict_types=1);

$root = dirname(__DIR__);
$harness = __DIR__ . '/fixtures/global-error-handler-harness.php';
$secretTerms = array('SQLSERVER INTERNO', 'caminho\\secreto.php', 'tabela_interna', 'RuntimeException', 'Stack trace');

function global_error_ok($condition, $message)
{
    if (!$condition) {
        fwrite(STDERR, 'FALHA: ' . $message . PHP_EOL);
        exit(1);
    }
}

function global_error_run($harness, $scenario, $environment, $debug)
{
    $command = escapeshellarg(PHP_BINARY)
        . ' ' . escapeshellarg($harness)
        . ' ' . escapeshellarg($scenario)
        . ' ' . escapeshellarg($environment)
        . ' ' . escapeshellarg($debug);
    $descriptors = array(
        0 => array('pipe', 'r'),
        1 => array('pipe', 'w'),
        2 => array('pipe', 'w'),
    );
    $process = proc_open($command, $descriptors, $pipes);
    global_error_ok(is_resource($process), 'nao foi possivel iniciar o processo isolado');
    fclose($pipes[0]);
    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $exitCode = proc_close($process);
    preg_match('/TEST_HTTP_STATUS=(\d+)/', $stderr, $statusMatch);
    return array(
        'stdout' => $stdout,
        'stderr' => $stderr,
        'exit' => $exitCode,
        'status' => isset($statusMatch[1]) ? (int) $statusMatch[1] : 0,
    );
}

function global_error_has_no_secret($body, array $terms, $context)
{
    foreach ($terms as $term) {
        global_error_ok(strpos($body, $term) === false, $context . ' expos termo tecnico: ' . $term);
    }
}

$productionConfig = global_error_run($harness, 'config', 'production', 'false');
$productionValues = json_decode(trim($productionConfig['stdout']), true);
global_error_ok(is_array($productionValues), 'configuracao de producao nao retornou JSON valido');
global_error_ok((string) $productionValues['display_errors'] === '0', 'display_errors deve estar desativado em producao');
global_error_ok((string) $productionValues['display_startup_errors'] === '0', 'display_startup_errors deve estar desativado em producao');
global_error_ok((int) $productionValues['error_reporting'] === E_ALL, 'error_reporting deve usar E_ALL');
global_error_ok((string) $productionValues['log_errors'] === '1', 'log_errors deve estar ativo');
global_error_ok($productionValues['request_id_1'] === $productionValues['request_id_2'], 'request ID deve ser estavel na requisicao');

$productionDebugConfig = global_error_run($harness, 'config', 'production', 'true');
$productionDebugValues = json_decode(trim($productionDebugConfig['stdout']), true);
global_error_ok((string) $productionDebugValues['display_errors'] === '0', 'APP_DEBUG nao pode expor erros em producao');

$developmentSafeConfig = global_error_run($harness, 'config', 'development', 'false');
$developmentSafeValues = json_decode(trim($developmentSafeConfig['stdout']), true);
global_error_ok((string) $developmentSafeValues['display_errors'] === '0', 'desenvolvimento sem APP_DEBUG deve permanecer seguro');

$developmentDebugConfig = global_error_run($harness, 'config', 'development', 'true');
$developmentDebugValues = json_decode(trim($developmentDebugConfig['stdout']), true);
global_error_ok((string) $developmentDebugValues['display_errors'] === '1', 'desenvolvimento com APP_DEBUG deve habilitar detalhes');

$html = global_error_run($harness, 'exception_html', 'production', 'false');
global_error_ok($html['exit'] !== 0, 'exception nao tratada deve falhar em automacao CLI');
global_error_ok($html['status'] === 500, 'exception HTML deve retornar 500');
global_error_ok(strpos($html['stdout'], 'Erro 500') !== false, 'exception HTML deve renderizar pagina institucional');
global_error_ok(strpos($html['stdout'], 'req-exception_html-production') !== false, 'pagina HTML deve correlacionar request ID');
global_error_has_no_secret($html['stdout'], $secretTerms, 'exception HTML de producao');

$api = global_error_run($harness, 'exception_api', 'production', 'false');
$apiBody = json_decode(trim($api['stdout']), true);
global_error_ok($api['exit'] !== 0, 'exception API nao tratada deve falhar em automacao CLI');
global_error_ok($api['status'] === 500, 'exception API deve retornar 500');
global_error_ok(is_array($apiBody), 'exception API deve retornar JSON');
global_error_ok(isset($apiBody['sucesso']) && $apiBody['sucesso'] === false, 'exception API deve manter contrato de erro');
global_error_ok($apiBody['requestId'] === 'req-exception_api-production', 'API deve correlacionar request ID');
global_error_has_no_secret($api['stdout'], $secretTerms, 'exception API de producao');

$physicalApi = global_error_run($harness, 'exception_api_physical', 'production', 'false');
global_error_ok($physicalApi['status'] === 500, 'alias fisico de API deve retornar 500');
global_error_ok(is_array(json_decode(trim($physicalApi['stdout']), true)), 'alias fisico de API deve retornar JSON');
global_error_has_no_secret($physicalApi['stdout'], $secretTerms, 'alias fisico de API');

$debug = global_error_run($harness, 'exception_html', 'development', 'true');
global_error_ok($debug['status'] === 500, 'exception HTML em debug deve retornar 500');
global_error_ok(strpos($debug['stdout'], 'SQLSERVER INTERNO') !== false, 'debug local deve exibir detalhe controlado');

$fatal = global_error_run($harness, 'fatal', 'production', 'false');
global_error_ok($fatal['status'] === 500, 'fatal de producao deve retornar 500');
global_error_ok(strpos($fatal['stdout'], 'Erro 500') !== false, 'fatal deve retornar pagina institucional');
global_error_has_no_secret($fatal['stdout'], $secretTerms, 'fatal de producao');

$fatalApi = global_error_run($harness, 'fatal_api', 'production', 'false');
$fatalApiBody = json_decode(trim($fatalApi['stdout']), true);
global_error_ok($fatalApi['status'] === 500, 'fatal de API deve retornar 500');
global_error_ok(is_array($fatalApiBody), 'fatal de API deve retornar JSON, nao HTML');
global_error_ok($fatalApiBody['requestId'] === 'req-fatal_api-production', 'fatal de API deve correlacionar request ID');
global_error_has_no_secret($fatalApi['stdout'], $secretTerms, 'fatal de API');

$warning = global_error_run($harness, 'warning', 'production', 'false');
global_error_ok($warning['exit'] === 0, 'warning nao fatal deve preservar sucesso do processo');
global_error_ok(strpos($warning['stdout'], 'WARNING_CONTINUOU') !== false, 'warning nao fatal nao pode interromper o fluxo');
global_error_ok($warning['status'] !== 500, 'warning nao fatal nao pode virar resposta 500');

$notFound = global_error_run($harness, 'router_404', 'production', 'false');
$notFoundBody = json_decode(trim($notFound['stdout']), true);
global_error_ok($notFound['status'] === 404, 'rota inexistente de API deve retornar 404');
global_error_ok(is_array($notFoundBody) && $notFoundBody['sucesso'] === false, '404 de API deve retornar JSON controlado');

$logContents = '';
foreach (glob($root . '/storage/logs/aplicacao*.log') as $logFile) {
    $logContents .= (string) file_get_contents($logFile);
}
global_error_ok(strpos($logContents, 'req-exception_api-production') !== false, 'log deve conter o mesmo request ID da resposta');
global_error_ok(strpos($logContents, 'SQLSERVER INTERNO') !== false, 'detalhe tecnico deve permanecer no log controlado');

$responseSource = file_get_contents($root . '/app/core/Response.php');
global_error_ok(strpos($responseSource, "header('X-Request-Id: ' . self::requestId())") !== false, 'Response deve enviar X-Request-Id');

echo 'Testes do tratamento global de erros OK' . PHP_EOL;

