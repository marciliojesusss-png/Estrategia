<?php
declare(strict_types=1);
require_once __DIR__.'/../services/ResumoExecutivoService.php';
final class DashboardController
{
 private $service;public function __construct(){$this->service=new ResumoExecutivoService();}
 public function index(){$user=Auth::requirePermission('dashboard','visualizar');$filters=$this->filters($_GET);$data=$this->service->resumo(Auth::scopeFilters($filters));$pageTitle='Dashboard';$breadcrumbs=array('Dashboard'=>'');$contentView=APP_ROOT.'/views/dashboard/index.php';require APP_ROOT.'/views/layouts/base.php';}
 public function filters(array$source){$out=array();$map=array('ano'=>'ano','mes'=>'mes','plano'=>'plano','pilar'=>'pilar','diretoria'=>'diretoria_responsavel','diretoria_responsavel'=>'diretoria_responsavel','unidade'=>'unidade_apuradora','unidade_apuradora'=>'unidade_apuradora','status'=>'status');foreach($map as$input=>$target)if(isset($source[$input])&&$source[$input]!==''&&$source[$input]!=='Todos')$out[$target]=trim((string)$source[$input]);return$out;}
}
