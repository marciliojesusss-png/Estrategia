<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$base = new BaseDadosService();
Response::json([
    'indicadores' => $base->collection('indicadores', api_filters($_GET)),
    'lancamentos' => $base->collection('lancamentos', api_filters($_GET)),
    'metas' => $base->collection('metas'),
    'regrasIndicadores' => $base->collection('regrasIndicadores'),
]);
