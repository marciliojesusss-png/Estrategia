<?php
declare(strict_types=1);

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

set_exception_handler(static function (Throwable $error): void {
    Response::error($error->getMessage(), 500);
});

function api_filters(array $source): array
{
    return array_filter($source, static fn($value): bool => $value !== null && $value !== '');
}

Auth::requireAnyAuthenticated();
