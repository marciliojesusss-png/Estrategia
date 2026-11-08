<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/core/Database.php';
require_once __DIR__ . '/../app/repositories/EvidenciasRepository.php';
require_once __DIR__ . '/../app/repositories/LancamentosRepository.php';
require_once __DIR__ . '/../app/repositories/AuditoriaRepository.php';

$arguments = array_slice($argv, 1);
$dryRun = in_array('--dry-run', $arguments, true);
$apply = in_array('--apply', $arguments, true);
if ($dryRun === $apply) {
    fwrite(STDERR, "Uso: php scripts/anexar-evidencia-primeiro-trimestre-2026.php --source=ARQUIVO --dry-run|--apply\n");
    exit(2);
}

$sourceArgument = null;
foreach ($arguments as $argument) {
    if (strpos($argument, '--source=') === 0) {
        $sourceArgument = substr($argument, strlen('--source='));
    }
}
if ($sourceArgument === null || trim($sourceArgument) === '') {
    throw new InvalidArgumentException('Informe o PDF de origem com --source=ARQUIVO.');
}

$source = realpath($sourceArgument);
if ($source === false || !is_file($source)) {
    throw new RuntimeException('Arquivo de origem nao encontrado.');
}
if (strtolower((string) pathinfo($source, PATHINFO_EXTENSION)) !== 'pdf') {
    throw new RuntimeException('A evidencia deve ser um arquivo PDF.');
}
$size = filesize($source);
if ($size === false || $size <= 0 || $size > UPLOAD_MAX_BYTES) {
    throw new RuntimeException('Tamanho do PDF invalido para as regras de upload.');
}
$mime = (string) (new finfo(FILEINFO_MIME_TYPE))->file($source);
if ($mime !== 'application/pdf') {
    throw new RuntimeException('O arquivo informado nao possui tipo MIME application/pdf.');
}
$hash = hash_file('sha256', $source);
if ($hash === false) {
    throw new RuntimeException('Nao foi possivel calcular o SHA-256 da evidencia.');
}

$uploadRoot = realpath((string) UPLOAD_PATH);
if ($uploadRoot === false || !is_dir($uploadRoot) || !is_writable($uploadRoot)) {
    throw new RuntimeException('Diretorio de evidencias indisponivel para escrita.');
}

$db = Database::getConnection();
if ((string) $db->query('SELECT DB_NAME()')->fetchColumn() !== 'Estrategia') {
    throw new RuntimeException('Carga permitida somente no banco Estrategia.');
}

$allowedStatuses = array('Em preenchimento', 'Homologado', 'Retificado');
$loadLaunches = static function ($connection, bool $lock = false): array {
    $hint = $lock ? ' WITH (UPDLOCK,HOLDLOCK)' : '';
    return $connection->query(
        'SELECT l.id,l.indicador_id,l.competencia,l.status,l.versao_atual,l.evidencia_id,i.numero,i.nome '
        . 'FROM dbo.lancamentos l' . $hint . ' INNER JOIN dbo.indicadores i ON i.id=l.indicador_id '
        . 'WHERE l.ano=2026 AND l.mes=3 ORDER BY i.numero'
    )->fetchAll();
};

$validateLaunches = static function (array $launches) use ($allowedStatuses): void {
    if (count($launches) !== 23) {
        throw new RuntimeException('Esperados 23 lancamentos de marco/2026; encontrados ' . count($launches) . '.');
    }
    $indicatorIds = array();
    foreach ($launches as $launch) {
        $indicatorId = (int) $launch['indicador_id'];
        $indicatorIds[$indicatorId] = true;
        if ((string) $launch['competencia'] !== '2026-03') {
            throw new RuntimeException('Competencia inesperada no lancamento ' . $launch['id'] . '.');
        }
        if (!in_array((string) $launch['status'], $allowedStatuses, true)) {
            throw new RuntimeException('Status nao elegivel no lancamento ' . $launch['id'] . ': ' . $launch['status'] . '.');
        }
        if ((int) $launch['versao_atual'] < 1) {
            throw new RuntimeException('Versao invalida no lancamento ' . $launch['id'] . '.');
        }
    }
    if (count($indicatorIds) !== 23 || min(array_keys($indicatorIds)) !== 1 || max(array_keys($indicatorIds)) !== 23) {
        throw new RuntimeException('Os lancamentos nao cobrem exatamente os Indicadores 01 a 23.');
    }
};

$launches = $loadLaunches($db, false);
$validateLaunches($launches);
$existing = (int) $db->query(
    "SELECT COUNT(*) FROM dbo.evidencias e INNER JOIN dbo.lancamentos l ON l.id=e.lancamento_id "
    . "WHERE l.ano=2026 AND l.mes=3 AND e.versao_lancamento=l.versao_atual"
)->fetchColumn();
if ($existing !== 0) {
    throw new RuntimeException('Existem evidencias atuais em marco/2026; carga interrompida para evitar duplicidade.');
}

$originalName = basename($source);
$description = 'Informe DILOT/GERIN n. 0029/2026 - Monitoramento PEI/PN - 1o trimestre de 2026.';
$statusCounts = array_count_values(array_map(static function (array $launch): string {
    return (string) $launch['status'];
}, $launches));
$result = array(
    'modo' => $dryRun ? 'dry-run' : 'apply',
    'banco' => 'Estrategia',
    'arquivoOriginal' => $originalName,
    'mime' => $mime,
    'bytesPorArquivo' => $size,
    'sha256' => $hash,
    'lancamentos' => count($launches),
    'porStatus' => $statusCounts,
    'copiasFisicas' => $apply ? 23 : 0,
    'registrosCriados' => 0,
    'ponteirosAtualizados' => 0,
    'alterado' => false,
);

if ($apply) {
    $storedFiles = array();
    $db->beginTransaction();
    try {
        $locked = $loadLaunches($db, true);
        $validateLaunches($locked);
        foreach ($locked as $index => $launch) {
            $before = $launches[$index];
            if ((string) $launch['id'] !== (string) $before['id']
                || (string) $launch['status'] !== (string) $before['status']
                || (int) $launch['versao_atual'] !== (int) $before['versao_atual']
                || (string) ($launch['evidencia_id'] ?? '') !== (string) ($before['evidencia_id'] ?? '')) {
                throw new RuntimeException('O lancamento ' . $launch['id'] . ' mudou durante a carga; operacao cancelada.');
            }
        }

        $evidenceRepository = new EvidenciasRepository($db);
        $launchRepository = new LancamentosRepository($db);
        $auditRepository = new AuditoriaRepository($db);
        $created = array();

        foreach ($locked as $launch) {
            $storedPath = $uploadRoot . DIRECTORY_SEPARATOR . bin2hex(random_bytes(24)) . '.pdf';
            if (!copy($source, $storedPath)) {
                throw new RuntimeException('Falha ao armazenar a evidencia do lancamento ' . $launch['id'] . '.');
            }
            $storedFiles[] = $storedPath;
            if (hash_file('sha256', $storedPath) !== $hash) {
                throw new RuntimeException('A copia da evidencia falhou na verificacao de integridade.');
            }

            $evidence = $evidenceRepository->create(array(
                'lancamento_id' => (string) $launch['id'],
                'versao_lancamento' => (int) $launch['versao_atual'],
                'nome_arquivo' => $originalName,
                'tipo_arquivo' => $mime,
                'caminho_arquivo' => $storedPath,
                'descricao' => $description,
                'usuario' => 'MIGRACAO-20261108',
            ));
            if (!$launchRepository->setEvidence($launch['id'], $evidence['id'], (int) $launch['versao_atual'])) {
                throw new RuntimeException('Falha ao vincular evidencia ao lancamento ' . $launch['id'] . '.');
            }
            $auditRepository->append(array(
                'entidade' => 'evidencias',
                'registroId' => $evidence['id'],
                'acao' => 'evidencia_trimestral_anexada',
                'descricao' => 'Carga administrativa autorizada do informe do 1o trimestre de 2026.',
                'valorNovo' => array(
                    'evidencia' => $evidence,
                    'sha256' => $hash,
                    'indicadorId' => (string) $launch['indicador_id'],
                    'competencia' => '2026-03',
                ),
                'usuario' => 'MIGRACAO-20261108',
                'perfilUsuario' => 'Sistema',
            ));
            $created[] = array(
                'indicador' => (int) $launch['numero'],
                'lancamentoId' => (string) $launch['id'],
                'versao' => (int) $launch['versao_atual'],
                'status' => (string) $launch['status'],
                'evidenciaId' => (string) $evidence['id'],
            );
        }

        $db->commit();
        $result['alterado'] = true;
        $result['registrosCriados'] = count($created);
        $result['ponteirosAtualizados'] = count($created);
        $result['itens'] = $created;
    } catch (Throwable $error) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        foreach ($storedFiles as $storedPath) {
            if (is_file($storedPath)) {
                @unlink($storedPath);
            }
        }
        throw $error;
    }
}

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), PHP_EOL;
