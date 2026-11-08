<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/core/Database.php';
require_once __DIR__ . '/../app/repositories/AuditoriaRepository.php';

$arguments = array_slice($argv, 1);
$dryRun = in_array('--dry-run', $arguments, true);
$apply = in_array('--apply', $arguments, true);
if ($dryRun === $apply) {
    fwrite(STDERR, "Uso: php scripts/regularizar-metas-indicadores13-14.php --dry-run|--apply\n");
    exit(2);
}

$db = Database::getConnection();
if ((string) $db->query('SELECT DB_NAME()')->fetchColumn() !== 'Estrategia') {
    throw new RuntimeException('Regularizacao permitida somente no banco Estrategia.');
}

$targets = array(
    '148' => array('indicadorId' => '13', 'competencia' => '2026-04', 'meta' => '0.425'),
    '149' => array('indicadorId' => '13', 'competencia' => '2026-05', 'meta' => '0.425'),
    '150' => array('indicadorId' => '13', 'competencia' => '2026-06', 'meta' => '0.425'),
    '151' => array('indicadorId' => '13', 'competencia' => '2026-07', 'meta' => '0.425'),
    '160' => array('indicadorId' => '14', 'competencia' => '2026-04', 'meta' => '0.35'),
    '161' => array('indicadorId' => '14', 'competencia' => '2026-05', 'meta' => '0.35'),
    '162' => array('indicadorId' => '14', 'competencia' => '2026-06', 'meta' => '0.35'),
    '163' => array('indicadorId' => '14', 'competencia' => '2026-07', 'meta' => '0.35'),
);

$select = $db->prepare(
    'SELECT id, indicador_id, competencia, status, versao_atual, meta_referencia, '
    . 'resultado_oficial, percentual_atingido FROM dbo.lancamentos WHERE id=:id'
);
$update = $db->prepare(
    'UPDATE dbo.lancamentos SET meta_referencia=:meta, updated_at=:updated_at '
    . 'WHERE id=:id AND meta_referencia IS NULL'
);
$audits = new AuditoriaRepository($db);
$result = array('modo' => $dryRun ? 'dry-run' : 'apply', 'registros' => array(), 'alterados' => 0);

function closeEnough(float $left, float $right, float $tolerance = 0.000002): bool
{
    return abs($left - $right) <= $tolerance;
}

function validateTarget(array $row, array $target): void
{
    if ((string) $row['indicador_id'] !== $target['indicadorId']
        || (string) $row['competencia'] !== $target['competencia']
        || (string) $row['status'] !== 'Homologado'
        || (int) $row['versao_atual'] !== 1) {
        throw new RuntimeException('Pre-condicao estrutural falhou para o lancamento ' . $row['id'] . '.');
    }

    $currentTarget = $row['meta_referencia'];
    if ($currentTarget !== null && $currentTarget !== ''
        && !closeEnough((float) $currentTarget, (float) $target['meta'])) {
        throw new RuntimeException('O lancamento ' . $row['id'] . ' ja possui uma meta diferente da esperada.');
    }

    if (!is_numeric($row['resultado_oficial']) || !is_numeric($row['percentual_atingido'])
        || (float) $row['percentual_atingido'] == 0.0) {
        throw new RuntimeException('Resultado ou atingimento invalido no lancamento ' . $row['id'] . '.');
    }

    $implicitTarget = (float) $row['resultado_oficial'] / (float) $row['percentual_atingido'];
    if (!closeEnough($implicitTarget, (float) $target['meta'])) {
        throw new RuntimeException('A meta implicita nao confirma a meta esperada no lancamento ' . $row['id'] . '.');
    }
}

if ($apply) {
    $db->beginTransaction();
}

try {
    foreach ($targets as $launchId => $target) {
        $select->execute(array(':id' => $launchId));
        $row = $select->fetch();
        if (!$row) {
            throw new RuntimeException('Lancamento ' . $launchId . ' nao encontrado.');
        }
        validateTarget($row, $target);

        $alreadyCorrect = $row['meta_referencia'] !== null && $row['meta_referencia'] !== '';
        $entry = array(
            'lancamentoId' => $launchId,
            'indicadorId' => $target['indicadorId'],
            'competencia' => $target['competencia'],
            'metaAnterior' => $row['meta_referencia'],
            'metaCorreta' => $target['meta'],
            'alterado' => false,
        );

        if ($apply && !$alreadyCorrect) {
            $now = date('c');
            $update->execute(array(':meta' => $target['meta'], ':updated_at' => $now, ':id' => $launchId));
            if ($update->rowCount() !== 1) {
                throw new RuntimeException('Nao foi possivel atualizar o lancamento ' . $launchId . '.');
            }

            $audits->append(array(
                'entidade' => 'lancamentos',
                'registroId' => $launchId,
                'acao' => 'regularizacao_meta_homologada',
                'descricao' => 'Regularizacao da meta historica ausente para manter consistencia entre Lancamentos e Relatorios.',
                'valorAnterior' => array('metaReferencia' => null),
                'valorNovo' => array('metaReferencia' => $target['meta']),
                'usuario' => 'MIGRACAO-20261108',
                'perfilUsuario' => 'Sistema',
            ));

            $entry['alterado'] = true;
            $result['alterados']++;
        }

        $result['registros'][] = $entry;
    }

    if ($apply) {
        $db->commit();
    }
} catch (Throwable $error) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    throw $error;
}

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), PHP_EOL;
