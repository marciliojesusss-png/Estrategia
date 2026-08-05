<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/core/Database.php';

try {
    $db = Database::getConnection();
    $value = $db->query('SELECT 1 AS conexao')->fetchColumn();

    echo 'Driver: ' . DB_DRIVER . PHP_EOL;
    echo 'SELECT 1: ' . ((int) $value === 1 ? 'sucesso' : 'falha') . PHP_EOL;

    try {
        $stmt = $db->query('SELECT COUNT(*) FROM dbo.indicadores');
        echo 'dbo.indicadores: consultavel' . PHP_EOL;
    } catch (Exception $error) {
        echo 'dbo.indicadores: nao validado' . PHP_EOL;
    }
} catch (Exception $error) {
    fwrite(STDERR, 'Falha SQL Server: ' . $error->getMessage() . PHP_EOL);
    exit(1);
}
