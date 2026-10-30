<?php
declare(strict_types=1);

require_once __DIR__.'/../services/IniciativaEvidenciaService.php';

final class IniciativaEvidenciaController
{
    private $service;public function __construct(){$this->service=new IniciativaEvidenciaService(Database::getConnection());}
    public function listApi($id){try{$user=Auth::requirePermission('iniciativas','visualizar',true);Response::success($this->service->listForAccompaniment($id,$user));}catch(Throwable$error){$this->failure($error);}}
    public function uploadApi($id){try{$user=Auth::requirePermission('iniciativas','gerenciar',true);Auth::requireCsrf();if(!isset($_FILES['evidencia']))throw new DomainException('Selecione um arquivo.');Response::success($this->service->attach($id,$_FILES['evidencia'],isset($_POST['descricao'])?$_POST['descricao']:'',$user),'Evidência anexada.',201);}catch(Throwable$error){$this->failure($error);}}
    public function removeApi($id){try{$user=Auth::requirePermission('iniciativas','gerenciar',true);Auth::requireCsrf();$this->service->remove($id,$user);Response::success(array('id'=>$id),'Evidência removida.');}catch(Throwable$error){$this->failure($error);}}
    public function download($id){$user=Auth::requirePagePermission('iniciativas','visualizar');try{$evidence=$this->service->download($id,$user);header('Content-Type: '.($evidence['tipo_arquivo']?:'application/octet-stream'));header('Content-Disposition: attachment; filename="'.str_replace('"','',basename($evidence['nome_arquivo'])).'"');header('X-Content-Type-Options: nosniff');readfile($evidence['caminho_arquivo']);}catch(Throwable$error){if($error instanceof UnexpectedValueException||$error instanceof OutOfBoundsException){http_response_code($error instanceof UnexpectedValueException?403:404);echo e($error->getMessage());return;}ErrorHandler::handleException($error);}}
    private function failure(Throwable$error){if($error instanceof HttpException)return Response::error($error->getMessage(),$error->status(),$error->errors());if($error instanceof DomainException)return Response::error($error->getMessage(),422);if($error instanceof LogicException)return Response::error($error->getMessage(),409);if($error instanceof OutOfBoundsException)return Response::error($error->getMessage(),404);if($error instanceof UnexpectedValueException)return Response::error($error->getMessage(),403);Logger::error('Falha em evidência de iniciativa.',array('tipo'=>get_class($error)));return Response::error('Falha ao concluir a operação de evidência.',500);}
}
