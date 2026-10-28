<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/RelatorioConsolidadoService.php';
require_once __DIR__ . '/../services/RelatorioIndicadorService.php';
require_once __DIR__ . '/../services/RelatorioGovernancaService.php';

final class RelatorioApiController
{
    private $service;
    private $indicatorService;
    private $governanceService;

    public function __construct()
    {
        $this->service = new RelatorioConsolidadoService(Database::getConnection());
        $this->indicatorService = new RelatorioIndicadorService(Database::getConnection());
        $this->governanceService = new RelatorioGovernancaService(Database::getConnection());
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

    public function indicador($id)
    {
        $user = Auth::requirePermission('relatorios', 'visualizar', true);
        header('Cache-Control: private, no-store, max-age=0');
        header('Pragma: no-cache');
        try {
            return Response::success($this->indicatorService->gerar($id, $_GET, $user), 'Relatorio detalhado consultado.');
        } catch (OutOfBoundsException $error) {
            return Response::error($error->getMessage(), 404);
        } catch (UnexpectedValueException $error) {
            return Response::error($error->getMessage(), 403);
        } catch (InvalidArgumentException $error) {
            return Response::error($error->getMessage(), 400);
        }
    }

    public function governanca()
    {
        $user = Auth::requirePermission('relatorios', 'visualizar', true);
        header('Cache-Control: private, no-store, max-age=0');
        header('Pragma: no-cache');
        try {
            $filters = $_GET;
            unset($filters['route']);
            return Response::success($this->governanceService->gerar($filters, $user), 'Relatorio de governanca consultado.');
        } catch (UnexpectedValueException $error) {
            return Response::error($error->getMessage(), 403);
        } catch (InvalidArgumentException $error) {
            return Response::error($error->getMessage(), 400);
        }
    }
}
