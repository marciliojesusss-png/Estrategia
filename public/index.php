<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';
require_once __DIR__ . '/../app/core/Router.php';
require_once __DIR__ . '/../app/core/Database.php';
require_once __DIR__ . '/../app/auth/Auth.php';
require_once __DIR__ . '/../app/controllers/IndicadorController.php';
require_once __DIR__ . '/../app/controllers/IndicadorApiController.php';
require_once __DIR__ . '/../app/controllers/LancamentoApiController.php';
require_once __DIR__ . '/../app/controllers/LancamentoController.php';
require_once __DIR__ . '/../app/controllers/EvidenciaController.php';
require_once __DIR__ . '/../app/controllers/HomologacaoController.php';
require_once __DIR__ . '/../app/controllers/HomologacaoApiController.php';
require_once __DIR__ . '/../app/controllers/DashboardController.php';
require_once __DIR__ . '/../app/controllers/DashboardApiController.php';
require_once __DIR__ . '/../app/controllers/AdministracaoController.php';
require_once __DIR__ . '/../app/controllers/AdministracaoApiController.php';

$router = new Router();
$legacyPage = function ($file) {
    return function () use ($file) { require __DIR__ . '/' . $file; };
};
$legacyApi = function ($file) {
    return function () use ($file) { require __DIR__ . '/../api/' . $file; };
};

$router->get('/', function () { Response::redirect(Auth::homeForProfile(Auth::authenticate()['perfil'])); });
$dashboard=new DashboardController();
$router->get('/dashboard',array($dashboard,'index'));
$router->get('/resumo-executivo',array($dashboard,'index'));
$router->get('/visao-trimestral', $legacyPage('visao-trimestral.php'));
$indicadores = new IndicadorController();
$router->get('/indicadores', array($indicadores, 'index'));
$router->get('/indicadores/novo', array($indicadores, 'create'));
$router->post('/indicadores/novo', function () use ($indicadores) { $indicadores->store(); });
$router->get('/indicadores/exportar', array($indicadores, 'export'));
$router->get('/indicadores/{id}', array($indicadores, 'show'));
$router->get('/indicadores/{id}/editar', array($indicadores, 'edit'));
$router->post('/indicadores/{id}/editar', array($indicadores, 'store'));
$router->post('/indicadores/{id}/status', array($indicadores, 'status'));
$lancamentos = new LancamentoController();$evidencias = new EvidenciaController();
$router->get('/lancamentos',array($lancamentos,'index'));
$router->get('/lancamentos/novo',array($lancamentos,'create'));
$router->post('/lancamentos/novo',function()use($lancamentos){$lancamentos->save();});
$router->get('/lancamentos/{id}',array($lancamentos,'show'));
$router->get('/lancamentos/{id}/editar',array($lancamentos,'edit'));
$router->post('/lancamentos/{id}/editar',array($lancamentos,'save'));
$router->post('/lancamentos/{id}/submeter',array($lancamentos,'submit'));
$router->post('/lancamentos/{id}/excluir',array($lancamentos,'delete'));
$router->post('/lancamentos/{id}/evidencias',array($evidencias,'upload'));
$router->get('/evidencias/{id}/download',array($evidencias,'download'));
$router->post('/evidencias/{id}/remover',array($evidencias,'remove'));
$homologacoes=new HomologacaoController();
$router->get('/homologacoes',array($homologacoes,'index'));
$router->get('/homologacoes/{id}',array($homologacoes,'show'));
$router->post('/homologacoes/{id}/{action}',array($homologacoes,'decide'));
$router->get('/relatorios', $legacyPage('relatorios.php'));
$administracao=new AdministracaoController();
$router->get('/administracao',array($administracao,'index'));
$router->post('/administracao/usuarios',function()use($administracao){$administracao->saveUser();});
$router->post('/administracao/usuarios/{id}',array($administracao,'saveUser'));
$router->post('/administracao/configuracoes/{key}',array($administracao,'saveConfig'));
$router->get('/auditoria',array($administracao,'audit'));
$router->any('/logout', $legacyPage('logout.php'));

foreach (array('database', 'configuracoes', 'homologacoes', 'indicadores', 'lancamentos', 'relatorios', 'resumo-executivo', 'solicitacoes-reabertura', 'usuarios-acesso', 'visao-trimestral') as $api) {
    $router->any('/api/' . $api, $legacyApi($api . '.php'));
}
$indicatorApi = new IndicadorApiController();
$router->any('/api/indicadores/{id}', array($indicatorApi, 'handle'));
$launchApi = new LancamentoApiController();
$router->any('/api/lancamentos/{id}', array($launchApi, 'handle'));
$router->post('/api/lancamentos/{id}/{action}', array($launchApi, 'handle'));
$homologacaoApi=new HomologacaoApiController();
$router->any('/api/homologacoes/{id}',array($homologacaoApi,'handle'));
$router->post('/api/homologacoes/{id}/{action}',array($homologacaoApi,'handle'));
$dashboardApi=new DashboardApiController();
$router->get('/api/dashboard/{action}',array($dashboardApi,'handle'));
$adminApi=new AdministracaoApiController();
$router->any('/api/administracao/{resource}',array($adminApi,'handle'));
$router->any('/api/administracao/{resource}/{id}',array($adminApi,'handle'));

$router->get('/saude', function () {
    Response::success(array('aplicacao' => 'disponivel', 'php' => PHP_VERSION), 'Aplicacao disponivel.');
});
$router->get('/saude/banco', function () {
    Auth::requireApiProfiles(array('administrador'));
    try {
        Database::getConnection()->query('SELECT 1');
        Response::success(array('banco' => 'disponivel'), 'Conexao validada.');
    } catch (Exception $error) {
        Logger::error('Teste controlado de banco falhou.', array('tipo' => get_class($error)));
        Response::error('Banco de dados indisponivel.', 503);
    }
});

$fallback = isset($_GET['rota']) ? (string) $_GET['rota'] : '';
$uri = $fallback !== '' ? $fallback : parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/', PHP_URL_PATH);
$router->dispatch(Request::method(), $uri);
