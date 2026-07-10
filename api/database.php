<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$service = new BaseDadosService();
$method = Request::method();

if ($method === 'GET') {
    if (($_GET['ping'] ?? '') !== '') {
        Response::json([
            'ok' => true,
            'mode' => 'php_sqlite_local',
            'database' => DB_CONNECTION,
        ]);
        return;
    }

    if (($_GET['all'] ?? '') !== '') {
        Auth::requirePermission('administracao', 'gerenciar', true);
        Response::json($service->all(Auth::scopeFilters()));
        return;
    }

    $collection = (string) ($_GET['collection'] ?? '');
    if ($collection === '') {
        Response::error('Informe a coleção desejada.', 400);
        return;
    }

    $user = Auth::requireAnyAuthenticated();
    if ($collection === 'historico') Auth::requirePermission('auditoria', 'visualizar', true);
    if ($collection === 'usuarios') Auth::requirePermission('administracao', 'gerenciar', true);
    if ($collection === 'indicadores') Auth::requirePermission('indicadores', 'visualizar', true);
    if ($collection === 'lancamentos') Auth::requirePermission('lancamentos', 'visualizar', true);
    if ($collection === 'homologacoes') Auth::requirePermission('homologacoes', 'visualizar', true);

    $value = $service->collection($collection, Auth::scopeFilters(api_filters($_GET)));
    if ($value === null) {
        Response::error("Coleção {$collection} não encontrada.", 404);
        return;
    }
    Response::json($value);
    return;
}

if ($method === 'POST') {
    $user = Auth::requireAnyAuthenticated();
    $payload = Request::json();
    $key = (string) ($payload['key'] ?? '');
    $value = $payload['value'] ?? null;

    if ($key === '' || !is_array($value)) {
        Response::error('Payload inválido. Envie key e value.', 400);
        return;
    }

    if ($key === 'lancamentos') Auth::requirePermission('lancamentos', 'gerenciar', true);
    elseif ($key === 'homologacoes') Auth::requirePermission('homologacoes', 'decidir', true);
    else {
        AccessLogger::record('acao_negada', $user, array('recurso' => 'database/' . $key));
        Response::error('Colecao sem gravacao direta autorizada.', 403);
        return;
    }

    try {
        $service->saveCollection($key, $value, $user);
        Response::json(['ok' => true, 'persisted' => true, 'key' => $key]);
    } catch (InvalidArgumentException $error) {
        Response::error($error->getMessage(), 400);
    }
    return;
}

Response::error('Método não permitido.', 405);
