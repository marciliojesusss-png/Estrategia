<?php
declare(strict_types=1);

require_once __DIR__.'/../services/HomologacaoService.php';

final class HomologacaoApiController
{
    private $service;

    public function __construct()
    {
        $this->service=new HomologacaoService(Database::getConnection());
    }

    public function handle($id=null,$action=null)
    {
        try {
            $method=Request::method();
            if($method==='GET') {
                $user=Auth::requirePermission('homologacoes','visualizar',true);
                if($id!==null) return Response::success($this->service->detail($id,$user));
                $filters=Auth::scopeFilters($_GET);
                $mode=isset($_GET['modo'])?$_GET['modo']:'fila';
                $result=$mode==='historico'
                    ?$this->service->history($filters,isset($_GET['page'])?$_GET['page']:1,isset($_GET['perPage'])?$_GET['perPage']:25)
                    :$this->service->queue($filters,isset($_GET['page'])?$_GET['page']:1,isset($_GET['perPage'])?$_GET['perPage']:25);
                return Response::success($result);
            }

            $user=Auth::requirePermission('homologacoes','decidir',true);
            Auth::requireCsrf();
            $payload=Request::json();
            if($method==='POST'&&$action==='aprovar') {
                $observation=isset($payload['observacaoDiretoria'])
                    ?$payload['observacaoDiretoria']
                    :(isset($payload['observacao_diretoria'])?$payload['observacao_diretoria']:'');
                return Response::success($this->service->approve($id,$user,$observation),'Lançamento homologado com sucesso.');
            }
            if($method==='POST'&&$action==='rejeitar') {
                return Response::success($this->service->reject($id,isset($payload['justificativa'])?$payload['justificativa']:'',$user),'Lançamento devolvido para ajuste com sucesso.');
            }
            Response::error('Metodo ou acao nao permitida.',405);
        } catch(DomainException $error) {
            Response::error($error->getMessage(),422);
        } catch(LogicException $error) {
            Response::error($error->getMessage(),409);
        } catch(OutOfBoundsException $error) {
            Response::error($error->getMessage(),404);
        } catch(UnexpectedValueException $error) {
            Response::error($error->getMessage(),403);
        } catch(Throwable $error) {
            Logger::error('Falha ao decidir homologacao.',array('tipo'=>get_class($error)));
            Response::error('Não foi possível processar a decisão de homologação.',500);
        }
    }
}
