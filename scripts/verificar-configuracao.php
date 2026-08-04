<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/config/config.php';

function status_configurado($value)
{
    return trim((string) $value) !== '' ? 'configurado' : 'nao configurado';
}

echo 'Ambiente: ' . APP_ENV . PHP_EOL;
echo 'Caminho-base: ' . (APP_BASE_PATH === '' ? '/' : APP_BASE_PATH) . PHP_EOL;
echo 'Driver: ' . DB_DRIVER . PHP_EOL;
echo 'Servidor SQL: ' . status_configurado(SQLSERVER_HOST) . PHP_EOL;
echo 'Banco: ' . status_configurado(SQLSERVER_DATABASE) . PHP_EOL;
echo 'Autenticacao: ' . AUTH_PROVIDER . PHP_EOL;
