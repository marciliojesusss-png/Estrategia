<?php
declare(strict_types=1);
require_once __DIR__.'/../services/AdministracaoService.php';require_once __DIR__.'/../repositories/AuditoriaConsultaRepository.php';
final class AdministracaoController
{
 private $service,$query;public function __construct(){$db=Database::getConnection();$this->service=new AdministracaoService($db);$this->query=new AuditoriaConsultaRepository($db);}
 public function index(){$actor=Auth::requirePermission('administracao','gerenciar');$users=$this->service->users($_GET,isset($_GET['page'])?$_GET['page']:1,25);$configs=$this->service->configurations();$validation=$this->service->validationUsers();$this->render('index',compact('users','configs','validation','actor'));}
 public function audit(){$actor=Auth::requirePermission('auditoria','visualizar');$audit=$this->query->audit($_GET,isset($_GET['page'])?$_GET['page']:1,25);$accesses=$this->query->accesses($_GET,isset($_GET['page'])?$_GET['page']:1,25);$this->render('audit',compact('audit','accesses'));}
 public function saveUser($id=null){$actor=Auth::requirePermission('administracao','gerenciar');Auth::requireCsrf();try{$this->service->saveUser($id,$_POST,$actor,!empty($_POST['confirmarProprioAcesso']));$_SESSION['_flash']='Usuario salvo.';}catch(Exception$e){$_SESSION['_flash']=$e->getMessage();}Response::redirect('/administracao');}
 public function saveConfig($key){$actor=Auth::requirePermission('administracao','gerenciar');Auth::requireCsrf();try{$raw=isset($_POST['valor'])?$_POST['valor']:'';$decoded=json_decode($raw,true);$value=json_last_error()===JSON_ERROR_NONE?$decoded:$raw;$this->service->saveConfiguration($key,$value,$actor);$_SESSION['_flash']='Configuracao salva.';}catch(Exception$e){$_SESSION['_flash']=$e->getMessage();}Response::redirect('/administracao');}
 private function render($v,array$d){extract($d,EXTR_SKIP);$pageTitle='Administracao';$breadcrumbs=array('Dashboard'=>'/dashboard','Administracao'=>'/administracao');$contentView=APP_ROOT.'/views/administracao/'.$v.'.php';require APP_ROOT.'/views/layouts/base.php';}
}
