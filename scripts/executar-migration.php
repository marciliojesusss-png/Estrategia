<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/core/Database.php';

const EXIT_ARGUMENTOS = 2;
const EXIT_ARQUIVO = 3;
const EXIT_CONEXAO = 4;
const EXIT_EXECUCAO = 5;

function failMigrationExecutor(string $message, int $code): void
{
    fwrite(STDERR, $message . PHP_EOL);
    exit($code);
}

function fetchMigrationResultSets($statement): array
{
    $resultSets = array();

    while (true) {
        $fieldCount = sqlsrv_num_fields($statement);
        if (is_int($fieldCount) && $fieldCount > 0) {
            $rows = array();
            while (true) {
                $row = sqlsrv_fetch_array($statement, SQLSRV_FETCH_ASSOC);
                if ($row === null) {
                    break;
                }
                if ($row === false) {
                    throw new RuntimeException('Falha ao ler resultado: ' . SqlsrvConnectionAdapter::lastError());
                }
                $rows[] = $row;
            }
            $resultSets[] = $rows;
        }

        $next = sqlsrv_next_result($statement);
        if ($next === true) {
            continue;
        }
        if ($next === false) {
            throw new RuntimeException('Falha ao avançar resultado: ' . SqlsrvConnectionAdapter::lastError());
        }
        break;
    }

    return $resultSets;
}

$arguments = array_slice($argv, 1);
$dryRun = in_array('--dry-run', $arguments, true);
$execute = in_array('--execute', $arguments, true);
$paths = array_values(array_filter(
    $arguments,
    static function (string $argument): bool {
        return $argument !== '--dry-run' && $argument !== '--execute';
    }
));

if (count($paths) !== 1 || $dryRun === $execute) {
    failMigrationExecutor(
        'Uso: php scripts/executar-migration.php <migration.sql> (--dry-run|--execute)',
        EXIT_ARGUMENTOS
    );
}

$workspaceRoot = realpath(__DIR__ . '/..');
$migrationsRoot = realpath(__DIR__ . '/../database/sqlserver/migrations');
$migrationPath = realpath($paths[0]);

if ($workspaceRoot === false || $migrationsRoot === false || $migrationPath === false || !is_file($migrationPath)) {
    failMigrationExecutor('Migration inexistente ou caminho inválido.', EXIT_ARQUIVO);
}

$normalizedMigration = str_replace('\\', '/', $migrationPath);
$normalizedRoot = rtrim(str_replace('\\', '/', $migrationsRoot), '/') . '/';
if (strpos($normalizedMigration . '/', $normalizedRoot) !== 0 || strtolower(pathinfo($migrationPath, PATHINFO_EXTENSION)) !== 'sql') {
    failMigrationExecutor('O arquivo deve ser uma migration .sql dentro de database/sqlserver/migrations.', EXIT_ARQUIVO);
}

$sql = file_get_contents($migrationPath);
if ($sql === false || trim($sql) === '') {
    failMigrationExecutor('Migration vazia ou ilegível.', EXIT_ARQUIVO);
}

$fileInfo = array(
    'caminho_absoluto' => $migrationPath,
    'caminho_relativo' => substr($normalizedMigration, strlen(rtrim(str_replace('\\', '/', $workspaceRoot), '/')) + 1),
    'tamanho_bytes' => strlen($sql),
    'sha256' => hash('sha256', $sql),
);

try {
    $database = Database::getConnection();
    $connection = $database->query(
        "SELECT DB_NAME() AS banco, @@SERVERNAME AS servidor, " .
        "CONVERT(nvarchar(100), SERVERPROPERTY('ProductVersion')) AS versao, " .
        "(SELECT compatibility_level FROM sys.databases WHERE name=DB_NAME()) AS compatibilidade"
    )->fetch();
} catch (Throwable $error) {
    failMigrationExecutor('Falha de conexão/SELECT: ' . $error->getMessage(), EXIT_CONEXAO);
}

if (!is_array($connection)) {
    failMigrationExecutor('SELECT de confirmação não retornou dados.', EXIT_CONEXAO);
}

if ($dryRun) {
    echo json_encode(array(
        'modo' => 'dry-run',
        'migration_enviada_ao_sql_server' => false,
        'arquivo' => $fileInfo,
        'conexao' => $connection,
    ), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL;
    exit(0);
}

try {
    $statement = sqlsrv_query($database->nativeConnection(), $sql);
    if ($statement === false) {
        throw new RuntimeException(SqlsrvConnectionAdapter::lastError());
    }
    $resultSets = fetchMigrationResultSets($statement);
    sqlsrv_free_stmt($statement);
} catch (Throwable $error) {
    failMigrationExecutor('Falha ao executar migration: ' . $error->getMessage(), EXIT_EXECUCAO);
}

echo json_encode(array(
    'modo' => 'execute',
    'migration_enviada_ao_sql_server' => true,
    'arquivo' => $fileInfo,
    'conexao' => $connection,
    'resultados' => $resultSets,
), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL;
