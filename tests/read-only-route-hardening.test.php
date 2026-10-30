<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/core/Response.php';
require_once __DIR__ . '/../app/core/Router.php';

function readonly_route_ok($condition, $message)
{
    if (!$condition) throw new RuntimeException('FALHA: ' . $message);
}

$paths = array(
    '/api/configuracoes',
    '/api/relatorios',
    '/api/resumo-executivo',
    '/api/visao-trimestral',
);

foreach ($paths as $path) {
    $router = new Router();
    $calls = 0;
    $router->get($path, function () use (&$calls) {
        $calls++;
        Response::json(array('leitura' => true), 200);
    });

    http_response_code(200);
    ob_start();
    $router->dispatch('GET', $path);
    $body = ob_get_clean();
    readonly_route_ok(http_response_code() === 200, $path . ' GET nao retornou 200');
    readonly_route_ok($calls === 1, $path . ' GET nao chegou ao handler de leitura');
    readonly_route_ok(strpos($body, '"leitura":true') !== false, $path . ' GET alterou o payload do handler');

    foreach (array('POST', 'PUT', 'PATCH', 'DELETE') as $method) {
        http_response_code(200);
        ob_start();
        $router->dispatch($method, $path);
        $body = ob_get_clean();
        readonly_route_ok(http_response_code() === 405, $path . ' ' . $method . ' nao retornou 405');
        readonly_route_ok($calls === 1, $path . ' ' . $method . ' chegou indevidamente ao handler');
        readonly_route_ok(strpos($body, 'Metodo nao permitido.') !== false, $path . ' ' . $method . ' perdeu resposta padrao');
    }
}

echo 'GET preservado e POST/PUT/PATCH/DELETE bloqueados nas quatro rotas.' . PHP_EOL;
