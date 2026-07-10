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
$uploadConfig = contents($root . '/uploads/web.config');
$config = contents($root . '/app/config/config.php');
$helpers = contents($root . '/app/helpers/helpers.php');

foreach (array('X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy') as $header) {
    check(strpos($webConfig, $header) !== false, 'Cabecalho ausente: ' . $header);
}
foreach (array('storage', 'uploads', 'database', 'app') as $segment) {
    check(strpos($webConfig, 'segment="' . $segment . '"') !== false, 'Segmento nao oculto: ' . $segment);
}
check(strpos($uploadConfig, 'fileExtension=".php" allowed="false"') !== false, 'Upload permite PHP.');
check(strpos($uploadConfig, 'fileExtension=".phtml" allowed="false"') !== false, 'Upload permite PHTML.');
check(strpos($config, "getenv('APP_DEBUG') ?: 'false'") !== false, 'Debug nao possui padrao seguro.');
check(strpos($config, "APP_ENV === 'production' ? 'sqlsrv' : 'sqlite'") !== false, 'SQL Server nao e o driver padrao de producao.');
check(strpos($helpers, 'htmlspecialchars') !== false, 'Helper de escape HTML ausente.');

foreach (array('database', 'storage', 'uploads', 'app', '.env', 'composer.json') as $privatePath) {
    check(!file_exists($root . '/public/' . $privatePath), 'Recurso interno exposto no public/: ' . $privatePath);
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
