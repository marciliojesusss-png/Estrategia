<?php
declare(strict_types=1);

ob_start();
putenv('APP_ENV=local');
putenv('DB_CONNECTION=sqlite');
require_once __DIR__ . '/../app/bootstrap.php';
require_once __DIR__ . '/../app/core/Router.php';
require_once __DIR__ . '/../app/core/Session.php';
require_once __DIR__ . '/../app/core/Csrf.php';
require_once __DIR__ . '/../app/core/Database.php';
require_once __DIR__ . '/../app/core/Logger.php';

function assert_foundation($condition, $message)
{
    if (!$condition) {
        fwrite(STDERR, "FALHA: " . $message . PHP_EOL);
        exit(1);
    }
}

Session::start();
$token = Csrf::token();
assert_foundation(strlen($token) === 64, 'token CSRF deve ter 64 caracteres hexadecimais');
assert_foundation(Csrf::validate($token), 'token CSRF valido deve ser aceito');
assert_foundation(!Csrf::validate('invalido'), 'token CSRF invalido deve ser recusado');

$router = new Router();
$called = false;
$router->get('/teste', function () use (&$called) { $called = true; });
$router->dispatch('GET', '/teste/');
assert_foundation($called, 'roteador deve normalizar barra final');

$pdo = Database::getConnection();
assert_foundation((int) $pdo->query('SELECT 1')->fetchColumn() === 1, 'conexao PDO local deve executar SELECT 1');

foreach (array(403, 404, 500) as $status) {
    assert_foundation(is_file(APP_ROOT . '/views/erros/' . $status . '.php'), 'pagina de erro ' . $status . ' deve existir');
}
assert_foundation(is_file(APP_ROOT . '/public/web.config'), 'web.config publico deve existir');
Logger::info('Teste automatizado da fundacao.');
assert_foundation(is_file(LOG_PATH . '/aplicacao.log'), 'logger deve gravar fora da raiz publica');

ob_end_clean();
echo "Testes da fundacao tecnica OK" . PHP_EOL;
