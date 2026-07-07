<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$base = new BaseDadosService();
$filters = Auth::scopeFilters(api_filters($_GET));
Response::json([
    'indicadores' => $base->collection('indicadores', $filters),
    'lancamentos' => $base->collection('lancamentos', $filters),
    'metas' => $base->collection('metas'),
    'regrasIndicadores' => $base->collection('regrasIndicadores'),
]);
