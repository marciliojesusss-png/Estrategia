<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
Auth::requirePermission('homologacoes', 'visualizar', true);

$repository = new HomologacoesRepository(Database::getConnection());

if (Request::method() !== 'GET') {
    Response::error('Método não permitido.', 405);
    return;
}

Response::json($repository->all(Auth::scopeFilters()));
