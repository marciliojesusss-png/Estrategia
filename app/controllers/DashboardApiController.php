<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/ResumoExecutivoService.php';
require_once __DIR__ . '/../services/ResumoExecutivoDadosService.php';

final class DashboardApiController
{
    private $service;
    private $dadosService;

    public function __construct()
    {
        $db = Database::getConnection();
        $this->service = new ResumoExecutivoService($db);
        $this->dadosService = new ResumoExecutivoDadosService($db);
    }

    public function handle($action = 'resumo')
    {
        Auth::requirePermission('dashboard', 'visualizar', true);
        $filters = Auth::scopeFilters($this->filters($_GET));
        if ($action === 'dados') return Response::success($this->dadosService->dados($filters), 'Dados centrais do Resumo Executivo consultados.');
        if ($action === 'resumo') return Response::success($this->service->resumo($filters), 'Resumo consultado.');
        if ($action === 'graficos') return Response::success($this->service->graficos($filters), 'Graficos consultados.');
        Response::error('Recurso nao encontrado.', 404);
    }

    private function filters(array $source)
    {
        $result = array();
        $map = array('ano'=>'ano','mes'=>'mes','plano'=>'plano','pilar'=>'pilar','diretoria'=>'diretoria_responsavel','diretoria_responsavel'=>'diretoria_responsavel','unidade'=>'unidade_apuradora','unidade_apuradora'=>'unidade_apuradora','status'=>'status');
        foreach ($map as $input => $target) {
            if (isset($source[$input]) && $source[$input] !== '' && $source[$input] !== 'Todos') $result[$target] = trim((string) $source[$input]);
        }
        return $result;
    }
}
