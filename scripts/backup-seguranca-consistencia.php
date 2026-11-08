<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/core/Database.php';

if (function_exists('sqlsrv_configure')) sqlsrv_configure('WarningsReturnAsErrors', 0);
$db = Database::getConnection();
$database = (string) $db->query('SELECT DB_NAME()')->fetchColumn();
if ($database !== 'Estrategia') throw new RuntimeException('Backup permitido somente no banco Estrategia.');

$name = 'Estrategia_ANTES_CONSISTENCIA_RELATORIOS_' . date('Ymd_His') . '.bak';
$path = 'C:\\Program Files\\Microsoft SQL Server\\MSSQL13.SQLEXPRESS01\\MSSQL\\Backup\\' . $name;
$escapedPath = str_replace("'", "''", $path);
$db->exec("BACKUP DATABASE [Estrategia] TO DISK=N'{$escapedPath}' WITH COPY_ONLY, CHECKSUM, NAME=N'Estrategia antes da consistencia de relatorios'");
$db->exec("RESTORE VERIFYONLY FROM DISK=N'{$escapedPath}' WITH CHECKSUM");

echo json_encode(array('banco'=>$database,'arquivo'=>$path,'copyOnly'=>true,'checksum'=>true,'verifyOnly'=>'ok'),
    JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES), PHP_EOL;
