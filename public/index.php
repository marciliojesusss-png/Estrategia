<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';
require_once __DIR__ . '/../app/core/Router.php';
require_once __DIR__ . '/../app/core/Database.php';
require_once __DIR__ . '/../app/auth/Auth.php';

$router = new Router();
$legacyPage = function ($file) {
    return function () use ($file) { require __DIR__ . '/' . $file; };
};
$legacyApi = function ($file) {
    return function () use ($file) { require __DIR__ . '/../api/' . $file; };
};

$router->get('/', function () { Response::redirect(Auth::homeForProfile(Auth::authenticate()['perfil'])); });
$router->get('/dashboard', $legacyPage('resumo-executivo.php'));
$router->get('/resumo-executivo', $legacyPage('resumo-executivo.php'));
$router->get('/visao-trimestral', $legacyPage('visao-trimestral.php'));
$router->get('/indicadores', $legacyPage('indicadores.php'));
$router->get('/lancamentos', $legacyPage('lancamentos.php'));
$router->get('/homologacoes', $legacyPage('homologacao.php'));
$router->get('/relatorios', $legacyPage('relatorios.php'));
$router->get('/administracao', $legacyPage('administracao.php'));
$router->get('/logout', function () { Session::destroy(); Response::redirect('/'); });

foreach (array('database', 'configuracoes', 'homologacoes', 'indicadores', 'lancamentos', 'relatorios', 'resumo-executivo', 'solicitacoes-reabertura', 'usuarios-acesso', 'visao-trimestral') as $api) {
    $router->any('/api/' . $api, $legacyApi($api . '.php'));
}

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
