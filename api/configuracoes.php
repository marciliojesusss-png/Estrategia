<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$service = new BaseDadosService();
Response::json([
    'planos' => $service->collection('planos'),
    'pilares' => $service->collection('pilares'),
    'unidades' => $service->collection('unidades'),
    'diretorias' => $service->collection('diretorias'),
    'metas' => $service->collection('metas'),
    'regrasIndicadores' => $service->collection('regrasIndicadores'),
]);
