<?php
declare(strict_types=1);

require_once __DIR__.'/../services/IniciativaService.php';
require_once __DIR__.'/../services/IniciativaAcompanhamentoService.php';
require_once __DIR__.'/../services/IniciativaHomologacaoService.php';

final class IniciativasApiController
{
    private $initiatives;private $accompaniments;private $homologations;
    public function __construct(){$db=Database::getConnection();$this->initiatives=new IniciativaService($db);$this->accompaniments=new IniciativaAcompanhamentoService($db);$this->homologations=new IniciativaHomologacaoService($db);}

    public function listInitiatives(){try{$user=Auth::requirePermission('iniciativas','visualizar',true);Response::success($this->initiatives->listAll($_GET,$user));}catch(Throwable$error){$this->failure($error);}}
    public function createInitiative(){try{$user=Auth::requirePermission('iniciativas','administrar',true);Auth::requireCsrf();Response::success($this->initiatives->create(Request::json(),$user),'Iniciativa criada com acompanhamentos trimestrais.',201);}catch(Throwable$error){$this->failure($error);}}
    public function initiativeDetail($id){try{$user=Auth::requirePermission('iniciativas','administrar',true);Response::success($this->initiatives->masterDetail($id,$user));}catch(Throwable$error){$this->failure($error);}}
    public function updateInitiative($id){try{$user=Auth::requirePermission('iniciativas','administrar',true);Auth::requireCsrf();Response::success($this->initiatives->update($id,Request::json(),$user),'Cadastro da iniciativa atualizado.');}catch(Throwable$error){$this->failure($error);}}
    public function toggleInitiative($id){try{$user=Auth::requirePermission('iniciativas','administrar',true);Auth::requireCsrf();$payload=Request::json();Response::success($this->initiatives->setActive($id,!empty($payload['ativo']),$user),'Situação da iniciativa atualizada.');}catch(Throwable$error){$this->failure($error);}}
    public function generateYear(){try{$user=Auth::requirePermission('iniciativas','administrar',true);Auth::requireCsrf();$payload=Request::json();Response::success($this->initiatives->generateYear(isset($payload['ano'])?$payload['ano']:0,$user),'Geração anual concluída.');}catch(Throwable$error){$this->failure($error);}}

    public function accompanimentDetail($id){try{$user=Auth::requirePermission('iniciativas','visualizar',true);Response::success($this->accompaniments->detail($id,$user));}catch(Throwable$error){$this->failure($error);}}
    public function saveDraft($id){try{$user=Auth::requirePermission('iniciativas','gerenciar',true);Auth::requireCsrf();Response::success($this->accompaniments->saveDraft($id,Request::json(),$user),'Rascunho salvo.');}catch(Throwable$error){$this->failure($error);}}
    public function submit($id){try{$user=Auth::requirePermission('iniciativas','gerenciar',true);Auth::requireCsrf();Response::success($this->accompaniments->submit($id,Request::json(),$user),'Acompanhamento enviado para homologação.');}catch(Throwable$error){$this->failure($error);}}

    public function queue(){try{$user=Auth::requirePermission('iniciativas','decidir',true);Response::success($this->homologations->queue($user));}catch(Throwable$error){$this->failure($error);}}
    public function homologationDetail($id){try{$user=Auth::requirePermission('iniciativas','decidir',true);Response::success($this->homologations->detail($id,$user));}catch(Throwable$error){$this->failure($error);}}
    public function homologationAction($id,$action){try{$user=Auth::requirePermission('iniciativas','decidir',true);Auth::requireCsrf();$payload=Request::json();if($action==='homologar')$result=$this->homologations->approve($id,$user);elseif($action==='devolver')$result=$this->homologations->returnForAdjustment($id,isset($payload['justificativa'])?$payload['justificativa']:'',$user);elseif($action==='reabrir')$result=$this->homologations->reopen($id,isset($payload['justificativa'])?$payload['justificativa']:'',$user);else return Response::error('Ação não permitida.',405);Response::success($result,'Ação de homologação concluída.');}catch(Throwable$error){$this->failure($error);}}
    public function consolidate($id){try{$user=Auth::requirePermission('iniciativas','consolidar',true);Auth::requireCsrf();$payload=Request::json();Response::success($this->homologations->consolidate($id,isset($payload['sintese'])?$payload['sintese']:'',isset($payload['destaques'])&&is_array($payload['destaques'])?$payload['destaques']:array(),$user),'Consolidação para o CA salva.');}catch(Throwable$error){$this->failure($error);}}

    private function failure(Throwable$error){if($error instanceof HttpException)return Response::error($error->getMessage(),$error->status(),$error->errors());if($error instanceof DomainException)return Response::error($error->getMessage(),422);if($error instanceof LogicException)return Response::error($error->getMessage(),409);if($error instanceof OutOfBoundsException)return Response::error($error->getMessage(),404);if($error instanceof UnexpectedValueException)return Response::error($error->getMessage(),403);Logger::error('Falha no módulo de iniciativas.',array('tipo'=>get_class($error),'mensagem'=>$error->getMessage()));return Response::error('Falha ao concluir a operação de iniciativas.',500);}
}
