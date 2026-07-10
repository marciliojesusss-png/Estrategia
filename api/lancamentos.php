<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$repository = new LancamentosRepository(Database::getConnection());

if (Request::method() === 'GET') {
    Auth::requirePermission('lancamentos', 'visualizar', true);
    Response::json($repository->all(Auth::scopeFilters(api_filters($_GET))));
    return;
}

if (in_array(Request::method(), ['POST', 'PUT'], true)) {
    $user = Auth::requirePermission('lancamentos', 'gerenciar', true);
    $payload = Request::json();
    $keys = array_keys($payload);
    $isList = count($payload) === 0 || $keys === range(0, count($payload) - 1);
    $items = $isList ? $payload : ($payload['lancamentos'] ?? []);
    if (!is_array($items)) {
        Response::error('Envie uma lista de lançamentos.', 400);
        return;
    }
    (new BaseDadosService())->saveCollection('lancamentos', $items, $user);
    Response::json(['ok' => true, 'persisted' => true, 'total' => count($items)]);
    return;
}

Response::error('Método não permitido.', 405);
