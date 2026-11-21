<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/AdministracaoService.php';
require_once __DIR__ . '/../repositories/AuditoriaConsultaRepository.php';

final class AdministracaoApiController
{
    private $service;
    private $query;

    public function __construct()
    {
        $db = Database::getConnection();
        $this->service = new AdministracaoService($db);
        $this->query = new AuditoriaConsultaRepository($db);
    }

    public function handle($resource = 'usuarios', $id = null)
    {
        $auditReadResource = in_array($resource, array('auditoria', 'acessos'), true);
        $actor = Auth::requirePermission(
            $auditReadResource ? 'auditoria' : 'administracao',
            $auditReadResource ? 'visualizar' : 'gerenciar',
            true
        );

        try {
            if (Request::method() === 'GET') {
                if ($resource === 'usuarios') return Response::success($this->service->users($_GET, $_GET['page'] ?? 1, $_GET['perPage'] ?? 25));
                if ($resource === 'cobertura-acessos') return Response::success($this->service->accessCoverage());
                if ($resource === 'validacao') return Response::success($this->service->validationUsers());
                if ($resource === 'configuracoes') return Response::success($this->service->configurations());
                if ($resource === 'auditoria') return Response::success($this->query->audit($_GET, $_GET['page'] ?? 1, $_GET['perPage'] ?? 25));
                if ($resource === 'acessos') return Response::success($this->query->accesses($_GET, $_GET['page'] ?? 1, $_GET['perPage'] ?? 25));
            }

            Auth::requireCsrf();
            $payload = Request::json();

            if ($resource === 'usuarios' && in_array(Request::method(), array('POST', 'PUT', 'PATCH'), true)) {
                return Response::success(
                    $this->service->saveUser($id, $payload, $actor, !empty($payload['confirmarProprioAcesso'])),
                    $id ? 'Usuario atualizado.' : 'Usuario criado.',
                    $id ? 200 : 201
                );
            }
            if ($resource === 'metas' && Request::method() === 'POST') {
                return Response::success(
                    $this->service->saveMeta(
                        isset($payload['meta']) && is_array($payload['meta']) ? $payload['meta'] : array(),
                        isset($payload['lancamentos']) && is_array($payload['lancamentos']) ? $payload['lancamentos'] : array(),
                        $actor
                    ),
                    'Meta atualizada e propagada.'
                );
            }
            if ($resource === 'configuracoes' && $id === GovernancaHomologacao::CLOSURES_KEY && in_array(Request::method(), array('POST', 'PUT', 'PATCH'), true)) {
                return Response::success(
                    $this->service->saveCouncilClosures(isset($payload['valor']) && is_array($payload['valor']) ? $payload['valor'] : array(), $actor),
                    'Fechamento para o Conselho de Administração atualizado.'
                );
            }
            if ($resource === 'configuracoes' && in_array(Request::method(), array('PUT', 'PATCH'), true)) {
                $this->service->saveConfiguration((string) $id, $payload['valor'] ?? null, $actor);
                return Response::success(array(), 'Configuracao atualizada.');
            }

            Response::error('Metodo ou recurso nao permitido.', 405);
        } catch (DomainException $error) {
            Response::error($error->getMessage(), 422);
        } catch (LogicException $error) {
            Response::error($error->getMessage(), 409);
        } catch (OutOfBoundsException $error) {
            Response::error($error->getMessage(), 404);
        } catch (Throwable $error) {
            Logger::error('[ADMINISTRACAO] Falha inesperada na operacao.', array(
                'recurso' => (string) $resource,
                'registro' => $id === null ? '' : (string) $id,
                'tipo' => get_class($error),
                'mensagem_tecnica' => $error->getMessage(),
            ));
            Response::error('Falha ao concluir a operacao administrativa.', 500);
        }
    }
}
