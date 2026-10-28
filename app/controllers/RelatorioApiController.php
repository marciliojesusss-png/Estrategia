<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/RelatorioConsolidadoService.php';

final class RelatorioApiController
{
    private $service;

    public function __construct()
    {
        $this->service = new RelatorioConsolidadoService(Database::getConnection());
    }

    public function consolidado()
    {
        $user = Auth::requirePermission('relatorios', 'visualizar', true);
        header('Cache-Control: private, no-store, max-age=0');
        header('Pragma: no-cache');
        try {
            return Response::success($this->service->gerar($_GET, $user), 'Relatorio consolidado consultado.');
        } catch (DomainException $error) {
            return Response::error($error->getMessage(), 403);
        } catch (InvalidArgumentException $error) {
            return Response::error($error->getMessage(), 400);
        }
    }
}
