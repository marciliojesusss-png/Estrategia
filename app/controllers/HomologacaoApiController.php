<?php
declare(strict_types=1);
require_once __DIR__.'/../services/HomologacaoService.php';
final class HomologacaoApiController
{
 private $service;public function __construct(){$this->service=new HomologacaoService(Database::getConnection());}
 public function handle($id=null,$action=null){try{$m=Request::method();if($m==='GET'){$u=Auth::requirePermission('homologacoes','visualizar',true);if($id!==null)return Response::success($this->service->detail($id,$u));$f=Auth::scopeFilters($_GET);$mode=isset($_GET['modo'])?$_GET['modo']:'fila';$r=$mode==='historico'?$this->service->history($f,isset($_GET['page'])?$_GET['page']:1,isset($_GET['perPage'])?$_GET['perPage']:25):$this->service->queue($f,isset($_GET['page'])?$_GET['page']:1,isset($_GET['perPage'])?$_GET['perPage']:25);return Response::success($r);} $u=Auth::requirePermission('homologacoes','decidir',true);Auth::requireCsrf();$p=Request::json();if($m==='POST'&&$action==='aprovar')return Response::success($this->service->approve($id,$u),'Lancamento aprovado.');if($m==='POST'&&$action==='rejeitar')return Response::success($this->service->reject($id,isset($p['justificativa'])?$p['justificativa']:'',$u),'Lancamento rejeitado.');Response::error('Metodo ou acao nao permitida.',405);}catch(DomainException$e){Response::error($e->getMessage(),422);}catch(LogicException$e){Response::error($e->getMessage(),409);}catch(OutOfBoundsException$e){Response::error($e->getMessage(),404);}catch(UnexpectedValueException$e){Response::error($e->getMessage(),403);}}
}
