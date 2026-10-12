<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/LancamentoService.php';
require_once __DIR__ . '/../services/EvidenciaService.php';

final class LancamentoApiController
{
    private $service;

    public function __construct()
    {
        $this->service = new LancamentoService(Database::getConnection());
    }

    public function handle($id = null, $action = null)
    {
        $method = Request::method();
        try {
            if ($method === 'GET') {
                $user = Auth::requirePermission('lancamentos', 'visualizar', true);
                if ($id !== null && $action === 'reabertura') {
                    return Response::success($this->service->reopenPolicy($id, $user));
                }
                if ($id !== null) return Response::success($this->service->find($id, $user));
                return Response::success($this->service->all(Auth::scopeFilters($_GET)));
            }

            if ($method === 'POST' && $action === 'reabrir') {
                $user = Auth::requirePermission('reaberturas', 'reabrir', true);
                Auth::requireCsrf();
                $payload = Request::json();
                return Response::success(
                    $this->service->reopen($id, isset($payload['justificativa']) ? $payload['justificativa'] : '', $user),
                    'Lançamento reaberto para edição com sucesso.'
                );
            }

            $user = Auth::requirePermission('lancamentos', 'gerenciar', true);
            Auth::requireCsrf();
            if ($method === 'POST' && $id === null) {
                return Response::success($this->service->create(Request::json(), $user), 'Rascunho criado.', 201);
            }
            if (in_array($method, array('PUT', 'PATCH'), true) && $id !== null) {
                $payload = Request::json();
                return Response::success(
                    $this->service->update($id, $payload, $user, isset($payload['justificativaRetificacao']) ? $payload['justificativaRetificacao'] : ''),
                    'Lancamento atualizado.'
                );
            }
            if ($method === 'DELETE' && $id !== null) {
                return Response::success($this->service->deleteDraft($id, $user), 'Rascunho excluido.');
            }
            if ($method === 'POST' && $action === 'submeter') {
                return Response::success($this->service->submit($id, $user), 'Lançamento enviado para homologação com sucesso.');
            }
            Response::error('Metodo ou acao nao permitida.', 405);
        } catch (DomainException $error) {
            $details = json_decode($error->getMessage(), true);
            Response::error(is_array($details) ? 'Dados invalidos.' : $error->getMessage(), 422, is_array($details) ? $details : array());
        } catch (LogicException $error) {
            Response::error($error->getMessage(), 409);
        } catch (OutOfBoundsException $error) {
            Response::error($error->getMessage(), 404);
        } catch (UnexpectedValueException $error) {
            Response::error($error->getMessage(), 403);
        }
    }
}
