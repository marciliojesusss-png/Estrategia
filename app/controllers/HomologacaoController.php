<?php
declare(strict_types=1);
require_once __DIR__.'/../services/HomologacaoService.php';
final class HomologacaoController
{
 private $service;public function __construct(){$this->service=new HomologacaoService(Database::getConnection());}
 public function index(){$u=Auth::requirePermission('homologacoes','visualizar');$f=Auth::scopeFilters($_GET);$queue=$this->service->queue($f,isset($_GET['page'])?$_GET['page']:1,25);$history=$this->service->history($f,1,25);$this->render('index',array('queue'=>$queue,'history'=>$history,'canDecide'=>AccessPolicy::allows($u['perfil'],'homologacoes','decidir')));}
 public function show($id){$u=Auth::requirePermission('homologacoes','visualizar');try{$detail=$this->service->detail($id,$u);$this->render('show',array('detail'=>$detail,'canDecide'=>AccessPolicy::allows($u['perfil'],'homologacoes','decidir')));}catch(Exception$e){ErrorHandler::renderError($e instanceof UnexpectedValueException?403:404);}}
 public function decide($id,$action){$u=Auth::requirePermission('homologacoes','decidir');Auth::requireCsrf();try{if($action==='aprovar')$this->service->approve($id,$u);elseif($action==='rejeitar')$this->service->reject($id,isset($_POST['justificativa'])?$_POST['justificativa']:'',$u);else throw new DomainException('Acao invalida.');$_SESSION['_flash']=$action==='aprovar'?'Lancamento aprovado.':'Lancamento rejeitado.';}catch(Exception$e){$_SESSION['_flash']=$e->getMessage();}Response::redirect('/homologacoes/'.$id);}
 private function render($v,array$d){extract($d);$pageTitle='Homologacoes';$breadcrumbs=array('Dashboard'=>'/dashboard','Homologacoes'=>'/homologacoes');$contentView=APP_ROOT.'/views/homologacoes/'.$v.'.php';require APP_ROOT.'/views/layouts/base.php';}
}
