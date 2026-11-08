<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/core/Database.php';
require_once __DIR__ . '/../app/repositories/AuditoriaRepository.php';

$arguments = array_slice($argv, 1);
$dryRun = in_array('--dry-run', $arguments, true);
$apply = in_array('--apply', $arguments, true);
if ($dryRun === $apply) {
    fwrite(STDERR, "Uso: php scripts/remover-evidencias-teste-indicadores.php --dry-run|--apply\n");
    exit(2);
}

$db = Database::getConnection();
if ((string) $db->query('SELECT DB_NAME()')->fetchColumn() !== 'Estrategia') {
    throw new RuntimeException('Remocao permitida somente no banco Estrategia.');
}

$uploadRoot = realpath((string) UPLOAD_PATH);
if ($uploadRoot === false || !is_dir($uploadRoot)) {
    throw new RuntimeException('Diretorio de evidencias nao encontrado.');
}

function normalizedPath(string $path): string
{
    return rtrim(str_replace('\\', '/', $path), '/');
}

function pathInside(string $candidate, string $root): bool
{
    $candidate = normalizedPath($candidate);
    $root = normalizedPath($root);
    return $candidate === $root || strpos($candidate, $root . '/') === 0;
}

function indicatorEvidenceFiles(string $root): array
{
    $files = array();
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::LEAVES_ONLY
    );
    foreach ($iterator as $item) {
        if (!$item->isFile()) continue;
        $path = $item->getPathname();
        if (!pathInside($path, $root)) throw new RuntimeException('Arquivo fora do diretorio gerenciado.');
        $relative = ltrim(substr(normalizedPath($path), strlen(normalizedPath($root))), '/');
        if ($relative === '.gitkeep' || strpos($relative, 'iniciativas/') === 0) continue;
        $files[] = $path;
    }
    sort($files);
    return $files;
}

$rows = $db->query(
    "SELECT e.*,l.indicador_id,l.competencia,l.status "
    . "FROM dbo.evidencias e INNER JOIN dbo.lancamentos l ON l.id=e.lancamento_id "
    . "ORDER BY e.id"
)->fetchAll();

foreach ($rows as $row) {
    $storedPath = trim((string) ($row['caminho_arquivo'] ?? ''));
    if ($storedPath !== '' && !pathInside($storedPath, $uploadRoot)) {
        throw new RuntimeException('Caminho fora de uploads/evidencias no registro ' . (string) $row['id']);
    }
}

$files = indicatorEvidenceFiles($uploadRoot);
$pointerCount = (int) $db->query(
    "SELECT COUNT(*) FROM dbo.lancamentos "
    . "WHERE evidencia_id IS NOT NULL AND LTRIM(RTRIM(evidencia_id))<>''"
)->fetchColumn();
$initiativeCount = (int) $db->query('SELECT COUNT(*) FROM dbo.iniciativas_evidencias')->fetchColumn();
if ($initiativeCount !== 0) {
    throw new RuntimeException('Foram encontradas evidencias de iniciativas; a operacao foi interrompida para preservar o escopo.');
}

$statusCounts = array();
foreach ($rows as $row) {
    $status = (string) ($row['status'] ?? '');
    $statusCounts[$status] = ($statusCounts[$status] ?? 0) + 1;
}

$result = array(
    'modo' => $dryRun ? 'dry-run' : 'apply',
    'banco' => 'Estrategia',
    'diretorio' => $uploadRoot,
    'registrosEvidencias' => count($rows),
    'lancamentosDistintos' => count(array_unique(array_column($rows, 'lancamento_id'))),
    'ponteirosLegados' => $pointerCount,
    'arquivosParaRemover' => count($files),
    'bytesParaRemover' => array_sum(array_map('filesize', $files)),
    'porStatus' => $statusCounts,
    'evidenciasIniciativasPreservadas' => $initiativeCount,
    'referenciasTextuaisPreservadas' => true,
    'alterado' => false,
);

if ($apply) {
    $db->beginTransaction();
    try {
        $lockedRows = $db->query(
            "SELECT e.* FROM dbo.evidencias e WITH (UPDLOCK,HOLDLOCK) ORDER BY e.id"
        )->fetchAll();
        if (count($lockedRows) !== count($rows)) {
            throw new RuntimeException('A quantidade de evidencias mudou depois do inventario; operacao cancelada.');
        }

        $updatedPointers = $db->exec(
            "UPDATE dbo.lancamentos SET evidencia_id=NULL "
            . "WHERE evidencia_id IS NOT NULL AND LTRIM(RTRIM(evidencia_id))<>''"
        );
        $deletedRows = $db->exec('DELETE FROM dbo.evidencias');
        if ((int) $deletedRows !== count($rows) || (int) $updatedPointers !== $pointerCount) {
            throw new RuntimeException('Quantidade alterada divergiu do inventario validado.');
        }

        if ($rows) {
            (new AuditoriaRepository($db))->append(array(
                'entidade' => 'evidencias',
                'registroId' => 'TODAS-EVIDENCIAS-INDICADORES',
                'acao' => 'remocao_evidencias_teste_indicadores',
                'descricao' => 'Remocao autorizada de evidencias de teste dos lancamentos de indicadores.',
                'valorAnterior' => array(
                    'quantidade' => count($rows),
                    'lancamentos' => array_values(array_unique(array_column($rows, 'lancamento_id'))),
                    'evidencias' => array_map(static function (array $row): array {
                        return array(
                            'id' => $row['id'],
                            'lancamentoId' => $row['lancamento_id'],
                            'nomeArquivo' => $row['nome_arquivo'],
                            'versaoLancamento' => $row['versao_lancamento'],
                        );
                    }, $rows),
                ),
                'valorNovo' => array('quantidade' => 0, 'ponteirosLegados' => 0),
                'usuario' => 'MIGRACAO-20261108',
                'perfilUsuario' => 'Sistema',
            ));
        }
        $db->commit();
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }

    $deletedFiles = 0;
    $failedFiles = array();
    foreach ($files as $file) {
        if (!pathInside($file, $uploadRoot)) {
            $failedFiles[] = $file;
            continue;
        }
        if (!is_file($file) || @unlink($file)) $deletedFiles++;
        else $failedFiles[] = $file;
    }

    $directories = array();
    $directoryIterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($uploadRoot, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($directoryIterator as $item) {
        if (!$item->isDir()) continue;
        $directory = $item->getPathname();
        $relative = ltrim(substr(normalizedPath($directory), strlen(normalizedPath($uploadRoot))), '/');
        if ($relative === 'iniciativas' || strpos($relative, 'iniciativas/') === 0) continue;
        if (pathInside($directory, $uploadRoot)) $directories[] = $directory;
    }
    foreach ($directories as $directory) @rmdir($directory);

    $result['alterado'] = true;
    $result['registrosRemovidos'] = count($rows);
    $result['ponteirosLimpos'] = $pointerCount;
    $result['arquivosRemovidos'] = $deletedFiles;
    $result['falhasArquivos'] = $failedFiles;
    if ($failedFiles) {
        echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), PHP_EOL;
        throw new RuntimeException('Alguns arquivos nao puderam ser removidos; consulte falhasArquivos.');
    }
}

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), PHP_EOL;
