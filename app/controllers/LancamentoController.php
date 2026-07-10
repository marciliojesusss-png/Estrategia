<?php
declare(strict_types=1);
require_once __DIR__.'/../services/LancamentoService.php';
final class LancamentoController
{
 private $service;public function __construct(){$this->service=new LancamentoService(Database::getConnection());}
 public function index(){$u=Auth::requirePermission('lancamentos','visualizar');$items=$this->service->all(Auth::scopeFilters($_GET));$this->render('index',array('items'=>$items,'canManage'=>AccessPolicy::allows($u['perfil'],'lancamentos','gerenciar')));}
 public function show($id){$u=Auth::requirePermission('lancamentos','visualizar');try{$item=$this->service->find($id,$u);$this->render('show',array('item'=>$item,'canManage'=>AccessPolicy::allows($u['perfil'],'lancamentos','gerenciar')));}catch(Exception$e){ErrorHandler::renderError($e instanceof UnexpectedValueException?403:404);}}
 public function create(){Auth::requirePermission('lancamentos','gerenciar');$this->render('form',array('item'=>array(),'errors'=>array()));}
 public function edit($id){$u=Auth::requirePermission('lancamentos','gerenciar');try{$this->render('form',array('item'=>$this->service->find($id,$u),'errors'=>array()));}catch(Exception$e){ErrorHandler::renderError(404);}}
 public function save($id=null){$u=Auth::requirePermission('lancamentos','gerenciar');Auth::requireCsrf();try{$x=$id===null?$this->service->create($_POST,$u):$this->service->update($id,$_POST,$u,isset($_POST['justificativaRetificacao'])?$_POST['justificativaRetificacao']:'');$_SESSION['_flash']='Lancamento salvo.';Response::redirect('/lancamentos/'.rawurlencode($x['id']));}catch(Exception$e){$errors=$e instanceof DomainException?json_decode($e->getMessage(),true):array('geral'=>$e->getMessage());$this->render('form',array('item'=>array_merge($_POST,array('id'=>$id)),'errors'=>is_array($errors)?$errors:array('geral'=>$e->getMessage())));}}
 public function submit($id){$u=Auth::requirePermission('lancamentos','gerenciar');Auth::requireCsrf();try{$this->service->submit($id,$u);$_SESSION['_flash']='Lancamento submetido.';Response::redirect('/lancamentos/'.$id);}catch(Exception$e){$_SESSION['_flash']=$e->getMessage();Response::redirect('/lancamentos/'.$id);}}
 public function delete($id){$u=Auth::requirePermission('lancamentos','gerenciar');Auth::requireCsrf();try{$this->service->deleteDraft($id,$u);$_SESSION['_flash']='Rascunho excluido.';Response::redirect('/lancamentos');}catch(Exception$e){$_SESSION['_flash']=$e->getMessage();Response::redirect('/lancamentos/'.$id);}}
 private function render($v,array$d){extract($d,EXTR_SKIP);$pageTitle='Lancamentos';$breadcrumbs=array('Dashboard'=>'/dashboard','Lancamentos'=>'/lancamentos');$contentView=APP_ROOT.'/views/lancamentos/'.$v.'.php';require APP_ROOT.'/views/layouts/base.php';}
}
