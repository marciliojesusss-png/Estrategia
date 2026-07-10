<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/IndicadorService.php';

final class IndicadorApiController
{
    private $service;
    public function __construct() { $this->service = new IndicadorService(Database::getConnection()); }

    public function handle($id = null)
    {
        $method = Request::method();
        if ($method === 'GET') return $id === null ? $this->index() : $this->show($id);
        $user = Auth::requirePermission('indicadores', 'gerenciar', true);
        Auth::requireCsrf();
        try {
            if ($method === 'POST' && $id === null) Response::success($this->service->create(Request::json(), $user), 'Indicador cadastrado.', 201);
            elseif (in_array($method, array('PUT', 'PATCH'), true) && $id !== null) Response::success($this->service->update($id, Request::json(), $user), 'Indicador atualizado.');
            elseif ($method === 'DELETE' && $id !== null) Response::success($this->service->deactivateInsteadOfDelete($id, $user), 'Indicador inativado.');
            elseif ($method === 'POST' && $id !== null) $this->status($id, $user);
            else Response::error('Metodo nao permitido.', 405);
        } catch (DomainException $error) {
            $errors = json_decode($error->getMessage(), true); Response::error('Verifique os campos informados.', 422, is_array($errors) ? $errors : array());
        } catch (LogicException $error) { Response::error($error->getMessage(), 409); }
        catch (OutOfBoundsException $error) { Response::error($error->getMessage(), 404); }
    }

    private function index()
    {
        Auth::requirePermission('indicadores', 'visualizar', true);
        $filters = Auth::scopeFilters(array_filter($_GET, static function ($value) { return $value !== null && $value !== ''; }));
        $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
        $perPage = isset($_GET['perPage']) ? (int) $_GET['perPage'] : 25;
        Response::success($this->service->listItems($filters, $page, $perPage), 'Indicadores consultados.');
    }

    private function show($id)
    {
        $user = Auth::requirePermission('indicadores', 'visualizar', true);
        $item = $this->service->find($id);
        if (!$item) return Response::error('Indicador nao encontrado.', 404);
        if ($user['perfil'] !== 'administrador' && $user['perfil'] !== 'usuario_companhia') Auth::authorizeRecord($item, true);
        Response::success($item, 'Indicador consultado.');
    }

    private function status($id, array $user)
    {
        $input = Request::json();
        if (!isset($input['ativo'])) return Response::error('Informe o status ativo.', 422, array('ativo' => 'Campo obrigatorio.'));
        $active = filter_var($input['ativo'], FILTER_VALIDATE_BOOLEAN);
        Response::success($this->service->setActive($id, $active, $user), $active ? 'Indicador ativado.' : 'Indicador inativado.');
    }
}
