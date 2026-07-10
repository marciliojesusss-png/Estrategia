<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';
require_once __DIR__ . '/../app/core/Database.php';
require_once __DIR__ . '/../app/core/Request.php';
require_once __DIR__ . '/../app/core/Response.php';
require_once __DIR__ . '/../app/auth/Auth.php';
require_once __DIR__ . '/../app/services/BaseDadosService.php';
require_once __DIR__ . '/../app/services/ResumoExecutivoService.php';
require_once __DIR__ . '/../app/services/ExportacaoJsonService.php';
require_once __DIR__ . '/../app/repositories/IndicadoresRepository.php';
require_once __DIR__ . '/../app/repositories/LancamentosRepository.php';
require_once __DIR__ . '/../app/repositories/HomologacoesRepository.php';
require_once __DIR__ . '/../app/repositories/AuditoriaRepository.php';
require_once __DIR__ . '/../app/repositories/SolicitacoesReaberturaRepository.php';

if (defined('API_LEGACY_ALIAS')) {
    header('Deprecation: true');
    header('Sunset: Thu, 31 Dec 2026 23:59:59 GMT');
    header('Link: </api/documentacao>; rel="deprecation"');
}
header('Vary: Cookie, Accept');

function api_filters(array $source)
{
    return array_filter($source, static function ($value) { return $value !== null && $value !== ''; });
}

Auth::requireAnyAuthenticated();

if (in_array(Request::method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
    Auth::requireCsrf();
}
