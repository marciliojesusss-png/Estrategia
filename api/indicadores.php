<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$repository = new IndicadoresRepository(Database::getConnection());
$id = (string) ($_GET['id'] ?? $_GET['indicadorId'] ?? '');

if ($id !== '') {
    $indicator = $repository->find($id);
    if (!$indicator) {
        Response::error('Indicador não encontrado.', 404);
        return;
    }
    Response::json($indicator);
    return;
}

Response::json($repository->all(api_filters($_GET)));
