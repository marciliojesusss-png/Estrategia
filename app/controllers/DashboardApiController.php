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
        $user = Auth::requirePermission('dashboard', 'visualizar', true);
        $requestedFilters = $this->filters($_GET);
        $requestedGeneralView = $action === 'dados' && $this->isGeneralView($_GET);
        $generalView = $requestedGeneralView && AccessPolicy::allowsGeneralDashboard($user);
        $institutionalView = Auth::normalizeProfile($user['perfil']) === 'usuario_companhia';
        $filters = $generalView || $institutionalView
            ? $requestedFilters
            : Auth::scopeFiltersForUser($user, $requestedFilters);
        if ($action === 'dados') {
            $filters['ativo'] = true;
            $data = $institutionalView
                ? $this->dadosService->dadosInstitucionais($filters)
                : $this->dadosService->dados($filters);
            $data['escopoVisualizacao'] = $generalView || $institutionalView ? 'geral' : 'proprio';
            return Response::success($data, 'Dados centrais do Resumo Executivo consultados.');
        }
        if ($institutionalView) $filters['status'] = 'Homologado';
        if ($action === 'resumo') {
            $summary = $this->service->resumo($filters);
            if ($institutionalView) {
                $summary['atualizacoesRecentes'] = array();
                $summary['acessoInstitucional'] = true;
            }
            return Response::success($summary, 'Resumo consultado.');
        }
        if ($action === 'graficos') return Response::success($this->service->graficos($filters), 'Graficos consultados.');
        Response::error('Recurso nao encontrado.', 404);
    }

    private function isGeneralView(array $source)
    {
        return isset($source['escopo']) && strtolower(trim((string) $source['escopo'])) === 'geral';
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
