<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/IndicadorService.php';

final class IndicadorController
{
    private $service;
    public function __construct() { $this->service = new IndicadorService(Database::getConnection()); }

    public function index()
    {
        Auth::requirePermission('indicadores', 'visualizar');
        $filters = Auth::scopeFilters($_GET);
        $result = $this->service->listItems($filters, isset($_GET['page']) ? $_GET['page'] : 1, isset($_GET['perPage']) ? $_GET['perPage'] : 25);
        $this->render('index', array('result' => $result, 'filters' => $filters, 'canManage' => AccessPolicy::allows(Auth::authenticate()['perfil'], 'indicadores', 'gerenciar')));
    }

    public function show($id)
    {
        $user = Auth::requirePermission('indicadores', 'visualizar');
        $item = $this->service->find($id);
        if (!$item) return ErrorHandler::renderError(404);
        if ($user['perfil'] !== 'administrador' && $user['perfil'] !== 'usuario_companhia') Auth::authorizeRecord($item, false);
        $this->render('show', array('item' => $item, 'canManage' => AccessPolicy::allows($user['perfil'], 'indicadores', 'gerenciar')));
    }

    public function create() { Auth::requirePermission('indicadores', 'gerenciar'); $this->form(null, array()); }
    public function edit($id) { Auth::requirePermission('indicadores', 'gerenciar'); $item = $this->service->find($id); if (!$item) return ErrorHandler::renderError(404); $this->form($item, array()); }

    public function store($id = null)
    {
        $user = Auth::requirePermission('indicadores', 'gerenciar'); Auth::requireCsrf();
        try {
            $item = $id === null ? $this->service->create($_POST, $user) : $this->service->update($id, $_POST, $user);
            $_SESSION['_flash'] = $id === null ? 'Indicador cadastrado.' : 'Indicador atualizado.';
            Response::redirect('/indicadores/' . rawurlencode((string) $item['id']));
        } catch (DomainException $error) {
            $errors = json_decode($error->getMessage(), true); $this->form(array_merge($_POST, array('id' => $id)), is_array($errors) ? $errors : array());
        } catch (LogicException $error) { $this->form(array_merge($_POST, array('id' => $id)), array('numero' => $error->getMessage())); }
    }

    public function status($id)
    {
        $user = Auth::requirePermission('indicadores', 'gerenciar'); Auth::requireCsrf();
        $active = isset($_POST['ativo']) && $_POST['ativo'] === '1';
        try { $this->service->setActive($id, $active, $user); $_SESSION['_flash'] = $active ? 'Indicador ativado.' : 'Indicador inativado.'; Response::redirect('/indicadores/' . rawurlencode((string) $id)); }
        catch (OutOfBoundsException $error) { ErrorHandler::renderError(404); }
    }

    public function export()
    {
        Auth::requirePermission('indicadores', 'visualizar');
        $filters = Auth::scopeFilters($_GET);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="indicadores.csv"');
        $output = fopen('php://output', 'w');
        fwrite($output, "\xEF\xBB\xBF");
        fputcsv($output, array('Numero', 'Nome', 'Plano', 'Pilar', 'Unidade apuradora', 'Diretoria responsavel', 'Ativo'), ';');
        $page = 1;
        do {
            $result = $this->service->listItems($filters, $page, 100);
            foreach ($result['items'] as $item) fputcsv($output, array($item['numero'], $item['nome'], $item['plano'], $item['pilar'], $item['unidadeApuradora'], $item['diretoriaResponsavel'], $item['ativo'] ? 'Sim' : 'Nao'), ';');
            $page++;
        } while ($page <= $result['pagination']['pages']);
        fclose($output);
    }

    private function form($item, array $errors) { $this->render('form', array('item' => $item, 'errors' => $errors)); }
    private function render($view, array $data)
    {
        extract($data, EXTR_SKIP); $pageTitle = 'Indicadores'; $breadcrumbs = array('Dashboard' => '/dashboard', 'Indicadores' => '/indicadores');
        $contentView = APP_ROOT . '/views/indicadores/' . $view . '.php'; require APP_ROOT . '/views/layouts/base.php';
    }
}
