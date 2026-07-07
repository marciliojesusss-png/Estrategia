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
            'database' => DB_PATH,
        ]);
        return;
    }

    if (($_GET['all'] ?? '') !== '') {
        Response::json($service->all(Auth::scopeFilters()));
        return;
    }

    $collection = (string) ($_GET['collection'] ?? '');
    if ($collection === '') {
        Response::error('Informe a coleção desejada.', 400);
        return;
    }

    $value = $service->collection($collection, Auth::scopeFilters(api_filters($_GET)));
    if ($value === null) {
        Response::error("Coleção {$collection} não encontrada.", 404);
        return;
    }
    Response::json($value);
    return;
}

if ($method === 'POST') {
    Auth::requireApiProfiles(['unidade_apuradora', 'administrador']);
    $payload = Request::json();
    $key = (string) ($payload['key'] ?? '');
    $value = $payload['value'] ?? null;

    if ($key === '' || !is_array($value)) {
        Response::error('Payload inválido. Envie key e value.', 400);
        return;
    }

    try {
        $service->saveCollection($key, $value);
        Response::json(['ok' => true, 'persisted' => true, 'key' => $key]);
    } catch (InvalidArgumentException) {
        Response::json(['ok' => true, 'persisted' => false, 'key' => $key]);
    }
    return;
}

Response::error('Método não permitido.', 405);
