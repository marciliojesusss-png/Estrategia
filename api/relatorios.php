<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$user = Auth::requireApiProfiles(['unidade_apuradora', 'homologador', 'administrador']);
$service = new ExportacaoJsonService();
Response::json($service->exportarBaseCompleta(
    Auth::scopeFilters(api_filters($_GET)),
    (string) ($user['perfil'] ?? '') === 'administrador'
));
