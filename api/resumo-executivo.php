<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$service = new ResumoExecutivoService();
Response::json($service->resumo(api_filters($_GET)));
