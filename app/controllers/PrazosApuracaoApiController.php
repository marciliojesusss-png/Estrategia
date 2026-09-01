<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/PrazosApuracaoService.php';

final class PrazosApuracaoApiController
{
    private $service;

    public function __construct()
    {
        $this->service = new PrazosApuracaoService(Database::getConnection());
    }

    public function handle($id = null)
    {
        $method = Request::method();
        try {
            if ($method === 'GET') {
                Auth::requireAnyAuthenticated();
                return Response::success($id === null ? $this->service->all() : $this->service->find($id));
            }

            $actor = Auth::requirePermission('administracao', 'gerenciar', true);
            Auth::requireCsrf();
            $payload = Request::json();
            if ($method === 'POST' && $id === null) {
                return Response::success($this->service->create($payload, $actor), 'Prazo salvo com sucesso.', 201);
            }
            if (in_array($method, array('PUT', 'PATCH'), true) && $id !== null) {
                return Response::success($this->service->update($id, $payload, $actor), 'Prazo salvo com sucesso.');
            }
            return Response::error('Metodo nao permitido.', 405);
        } catch (DomainException $error) {
            return Response::error($error->getMessage(), 422);
        } catch (LogicException $error) {
            return Response::error($error->getMessage(), 409);
        } catch (OutOfBoundsException $error) {
            return Response::error($error->getMessage(), 404);
        }
    }
}
