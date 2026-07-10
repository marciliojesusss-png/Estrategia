<?php
declare(strict_types=1);
require_once __DIR__.'/../services/EvidenciaService.php';
final class EvidenciaController
{
 private $service;public function __construct(){$this->service=new EvidenciaService(Database::getConnection());}
 public function upload($id){$u=Auth::requirePermission('lancamentos','gerenciar');Auth::requireCsrf();try{if(!isset($_FILES['evidencia']))throw new DomainException('Selecione um arquivo.');$this->service->attach($id,$_FILES['evidencia'],isset($_POST['descricao'])?$_POST['descricao']:'',$u);$_SESSION['_flash']='Evidencia anexada.';}catch(Exception$e){$_SESSION['_flash']=$e->getMessage();}Response::redirect('/lancamentos/'.$id);}
 public function download($id){$u=Auth::requirePermission('lancamentos','visualizar');try{$e=$this->service->download($id,$u);header('Content-Type: '.$e['tipo_arquivo']);header('Content-Disposition: attachment; filename="'.str_replace('"','',basename($e['nome_arquivo'])).'"');header('X-Content-Type-Options: nosniff');readfile($e['caminho_arquivo']);}catch(Exception$x){ErrorHandler::renderError($x instanceof UnexpectedValueException?403:404);}}
 public function remove($id){$u=Auth::requirePermission('lancamentos','gerenciar');Auth::requireCsrf();try{$e=(new EvidenciasRepository(Database::getConnection()))->find($id);$this->service->remove($id,$u);$_SESSION['_flash']='Evidencia removida.';Response::redirect('/lancamentos/'.$e['lancamento_id']);}catch(Exception$x){ErrorHandler::renderError(404);}}
}
