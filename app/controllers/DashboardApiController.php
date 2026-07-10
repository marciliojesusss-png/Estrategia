<?php
declare(strict_types=1);
require_once __DIR__.'/DashboardController.php';
final class DashboardApiController
{
 private $service,$filters;public function __construct(){$this->service=new ResumoExecutivoService();$this->filters=new DashboardController();}
 public function handle($action='resumo'){Auth::requirePermission('dashboard','visualizar',true);$f=Auth::scopeFilters($this->filters->filters($_GET));if($action==='resumo')return Response::success($this->service->resumo($f),'Resumo consultado.');if($action==='graficos')return Response::success($this->service->graficos($f),'Graficos consultados.');Response::error('Recurso nao encontrado.',404);}
}
