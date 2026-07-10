<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
Auth::requirePermission('dashboard', 'visualizar', true);

$service = new ResumoExecutivoService();
Response::json($service->resumo(Auth::scopeFilters(api_filters($_GET))));
