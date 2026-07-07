<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$repository = new LancamentosRepository(Database::getConnection());

if (Request::method() === 'GET') {
    Response::json($repository->all(Auth::scopeFilters(api_filters($_GET))));
    return;
}

if (in_array(Request::method(), ['POST', 'PUT'], true)) {
    Auth::requireApiProfiles(['unidade_apuradora', 'administrador']);
    $payload = Request::json();
    $items = array_is_list($payload) ? $payload : ($payload['lancamentos'] ?? []);
    if (!is_array($items)) {
        Response::error('Envie uma lista de lançamentos.', 400);
        return;
    }
    $repository->replaceAll($items);
    Response::json(['ok' => true, 'persisted' => true, 'total' => count($items)]);
    return;
}

Response::error('Método não permitido.', 405);
