<?php

declare(strict_types=1);

$root = dirname(__DIR__);
$failures = array();

function check($condition, $message)
{
    global $failures;
    if (!$condition) {
        $failures[] = $message;
    }
}

function contents($path)
{
    $value = file_get_contents($path);
    return $value === false ? '' : $value;
}

$webConfig = contents($root . '/public/web.config');
$rootWebConfig = contents($root . '/web.config');
$uploadConfig = contents($root . '/uploads/web.config');
$config = contents($root . '/app/config/config.php');
$helpers = contents($root . '/app/helpers/helpers.php');
$routerScript = contents($root . '/public/router.php');
$indexSource = contents($root . '/public/index.php');
$databaseSource = contents($root . '/app/core/Database.php');
$authSource = contents($root . '/app/auth/Auth.php');

foreach (array('X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy') as $header) {
    check(strpos($webConfig, $header) !== false, 'Cabecalho ausente: ' . $header);
}
foreach (array('storage', 'uploads', 'database', 'app') as $segment) {
    check(strpos($webConfig, 'segment="' . $segment . '"') !== false, 'Segmento nao oculto: ' . $segment);
}
check(file_exists($root . '/index.php'), 'Index alternativo da raiz ausente.');
check(strpos(contents($root . '/index.php'), "require __DIR__ . '/public/index.php';") !== false, 'Index alternativo nao encaminha para public/index.php.');
check(strpos(contents($root . '/index.php'), "APP_PUBLIC_URL_PREFIX") !== false, 'Index alternativo nao informa prefixo publico dos assets.');
foreach (array('storage', 'uploads', 'database', 'app', '.env') as $segment) {
    check(strpos($rootWebConfig, 'segment="' . $segment . '"') !== false, 'Segmento nao oculto no web.config raiz: ' . $segment);
}
check(strpos($rootWebConfig, '<rewrite>') === false && strpos($webConfig, '<rewrite>') === false, 'web.config nao deve depender de URL Rewrite.');
check(strpos($rootWebConfig, 'rota=') === false && strpos($webConfig, 'rota=') === false, 'Parametro legado rota ainda aparece no web.config.');
check(strpos($uploadConfig, 'fileExtension=".php" allowed="false"') !== false, 'Upload permite PHP.');
check(strpos($uploadConfig, 'fileExtension=".phtml" allowed="false"') !== false, 'Upload permite PHTML.');
check(strpos($config, "getenv('APP_DEBUG') ?: 'false'") !== false, 'Debug nao possui padrao seguro.');
check(strpos($config, 'Dotenv') === false, 'Carregador .env ainda esta ativo.');
check(!file_exists($root . '/app/config/Dotenv.php'), 'Arquivo Dotenv.php nao deve existir.');
check(strpos($config, "APP_ENV === 'production' ? 'sqlsrv' : 'sqlite'") !== false, 'SQL Server nativo nao e o driver padrao de producao.');
check(strpos($config, "config_normalize_db_driver") !== false, 'DB_CONNECTION nao normaliza drivers legados para SQL Server nativo.');
check(strpos($config, "pdo_sqlsrv") !== false, 'Compatibilidade de leitura para configuracao legada pdo_sqlsrv ausente.');
check(strpos($config, "define('SQLSERVER_ENCRYPT', 'no');") !== false, 'Criptografia SQL Server deve permanecer desabilitada.');
check(strpos($config, "define('SQLSERVER_TRUST_SERVER_CERTIFICATE', '');") !== false, 'TrustServerCertificate nao deve ser configurado quando a criptografia estiver desabilitada.');
check(strpos($helpers, 'htmlspecialchars') !== false, 'Helper de escape HTML ausente.');
check(strpos($routerScript, 'return false') !== false, 'Router local nao libera assets estaticos.');
check(strpos($routerScript, 'realpath') !== false, 'Router local nao restringe arquivos ao public.');
check(strpos($routerScript, "getenv('APP_BASE_PATH')") !== false, 'Router local nao considera o caminho-base.');
check(strpos($routerScript, '$path = substr($path, strlen($basePath));') !== false, 'Router local nao remove o caminho-base dos assets.');
check(strpos($routerScript, '$hasBasePathPrefix') !== false, 'Router local nao identifica assets com caminho-base.');
check(strpos($routerScript, "header('Content-Type: '") !== false, 'Router local nao define MIME dos assets com caminho-base.');
check(strpos($routerScript, 'readfile($file)') !== false, 'Router local nao entrega assets com caminho-base.');
check(strpos($routerScript, 'pathinfo($file, PATHINFO_EXTENSION)) === \'php\'') !== false, 'Router local nao deve servir arquivos PHP como asset estatico.');
check(strpos($databaseSource, 'connect' . 'Pdo' . 'Sqlsrv') === false, 'Conexao SQL Server nao deve manter caminho PDO.');
check(strpos($databaseSource, "sqlsrv:Server=") === false, 'Conexao SQL Server nao deve montar DSN PDO.');
check(strpos($databaseSource, 'sqlsrv_connect') !== false, 'Conexao SQL Server nativa deve usar sqlsrv_connect.');
check(strpos($authSource, "app_url('login')") !== false, 'Rotas locais nao autenticadas devem ir para route=login.');
check(strpos($indexSource, "\$_GET['route']") !== false, 'Front controller deve ler a rota por $_GET[route].');
check(strpos($indexSource, "REQUEST_URI") === false, 'Front controller nao deve identificar rota por REQUEST_URI.');
check(strpos($indexSource, "\$_GET['rota']") === false, 'Parametro legado rota nao deve ser lido pelo front controller.');
check(strpos($indexSource, "\$route = 'dashboard';") !== false, 'Rota padrao dashboard ausente.');
check(strpos($indexSource, "\$router->get('/login'") !== false, 'Rota login por parametro ausente.');
check(strpos($indexSource, "\$router->post('/login'") !== false, 'POST login por parametro ausente.');

foreach (array('database', 'storage', 'uploads', 'app', '.env', 'composer.json') as $privatePath) {
    check(!file_exists($root . '/public/' . $privatePath), 'Recurso interno exposto no public/: ' . $privatePath);
}
check(count(glob($root . '/*.html')) === 0, 'Ainda existem paginas HTML na raiz do projeto.');
foreach (array($root . '/assets/js', $root . '/public/assets/js') as $javascriptPath) {
    foreach (glob($javascriptPath . '/*.js') as $javascriptFile) {
        check(strpos(contents($javascriptFile), '.html') === false, 'Rota HTML legada em ' . substr($javascriptFile, strlen($root) + 1));
    }
}

$phpFiles = array();
$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root . '/app'));
foreach ($iterator as $file) {
    if ($file->isFile() && strtolower($file->getExtension()) === 'php') {
        $phpFiles[] = $file->getPathname();
    }
}

$incompatible = array(
    '/\bfn\s*\(/' => 'arrow function',
    '/\?->/' => 'nullsafe operator',
    '/\breadonly\s+(?:class|[A-Za-z_$])/' => 'readonly',
    '/\benum\s+[A-Za-z_]/' => 'enum',
    '/\bstr_(?:contains|starts_with|ends_with)\s*\(/' => 'funcao PHP 8',
    '/\barray_is_list\s*\(/' => 'funcao PHP 8.1'
);
foreach ($phpFiles as $file) {
    $source = contents($file);
    foreach ($incompatible as $pattern => $feature) {
        check(!preg_match($pattern, $source), $feature . ' incompativel em ' . substr($file, strlen($root) + 1));
    }
}

if ($failures) {
    fwrite(STDERR, implode(PHP_EOL, $failures) . PHP_EOL);
    exit(1);
}

echo 'Testes de seguranca e publicacao OK' . PHP_EOL;
