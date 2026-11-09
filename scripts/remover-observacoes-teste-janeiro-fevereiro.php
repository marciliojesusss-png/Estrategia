<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/core/Database.php';
require_once __DIR__ . '/../app/repositories/AuditoriaRepository.php';

$arguments = array_slice($argv, 1);
$dryRun = in_array('--dry-run', $arguments, true);
$apply = in_array('--apply', $arguments, true);
if ($dryRun === $apply) {
    fwrite(STDERR, "Uso: php scripts/remover-observacoes-teste-janeiro-fevereiro.php --dry-run|--apply\n");
    exit(2);
}

$db = Database::getConnection();
if ((string) $db->query('SELECT DB_NAME()')->fetchColumn() !== 'Estrategia') {
    throw new RuntimeException('Remocao permitida somente no banco Estrategia.');
}

$expectedIds = array('2', '26', '49', '50', '61', '62', '73', '74', '145', '146', '157', '158');
sort($expectedIds, SORT_STRING);

$load = static function ($connection, bool $lock): array {
    $hint = $lock ? ' WITH (UPDLOCK,HOLDLOCK)' : '';
    return $connection->query(
        "SELECT l.id,l.indicador_id,i.nome indicador,l.competencia,l.ano,l.mes,l.status,"
        . "l.versao_atual,l.observacao_unidade,"
        . "JSON_VALUE(l.dados_entrada_json,'$.observacaoArea') observacao_json "
        . "FROM dbo.lancamentos l" . $hint . " "
        . "INNER JOIN dbo.indicadores i ON i.id=l.indicador_id "
        . "WHERE l.ano=2026 AND l.mes IN (1,2) "
        . "AND LOWER(LTRIM(RTRIM(l.observacao_unidade))) IN ('teste','teste.','test','test.') "
        . "ORDER BY TRY_CONVERT(int,l.indicador_id),l.mes"
    )->fetchAll();
};

$validate = static function (array $rows) use ($expectedIds): void {
    $actualIds = array_map(static function (array $row): string {
        return (string) $row['id'];
    }, $rows);
    sort($actualIds, SORT_STRING);
    if ($actualIds !== $expectedIds) {
        throw new RuntimeException('O conjunto de textos de teste mudou depois do diagnostico; operacao cancelada.');
    }
    foreach ($rows as $row) {
        if ((int) $row['ano'] !== 2026 || !in_array((int) $row['mes'], array(1, 2), true)) {
            throw new RuntimeException('Competencia inesperada no lancamento ' . $row['id'] . '.');
        }
        $normalized = strtolower(trim((string) $row['observacao_unidade']));
        if (!in_array($normalized, array('teste', 'teste.', 'test', 'test.'), true)) {
            throw new RuntimeException('A observacao do lancamento ' . $row['id'] . ' nao e mais um texto de teste.');
        }
        if ($row['observacao_json'] !== null && trim((string) $row['observacao_json']) !== '') {
            throw new RuntimeException('O lancamento ' . $row['id'] . ' possui observacao duplicada no JSON legado.');
        }
    }
};

$rows = $load($db, false);
$validate($rows);
$result = array(
    'modo' => $dryRun ? 'dry-run' : 'apply',
    'quantidade' => count($rows),
    'janeiro' => count(array_filter($rows, static function (array $row): bool { return (int) $row['mes'] === 1; })),
    'fevereiro' => count(array_filter($rows, static function (array $row): bool { return (int) $row['mes'] === 2; })),
    'registros' => array_map(static function (array $row): array {
        return array(
            'lancamentoId' => (string) $row['id'],
            'indicadorId' => (string) $row['indicador_id'],
            'indicador' => (string) $row['indicador'],
            'competencia' => (string) $row['competencia'],
            'status' => (string) $row['status'],
            'versao' => (int) $row['versao_atual'],
            'valorAnterior' => (string) $row['observacao_unidade'],
            'valorNovo' => null,
        );
    }, $rows),
    'alterados' => 0,
);

if ($apply) {
    $db->beginTransaction();
    try {
        $lockedRows = $load($db, true);
        $validate($lockedRows);
        $update = $db->prepare(
            "UPDATE dbo.lancamentos SET observacao_unidade=NULL,updated_at=:updated_at "
            . "WHERE id=:id AND LOWER(LTRIM(RTRIM(observacao_unidade))) IN ('teste','teste.','test','test.')"
        );
        $audit = new AuditoriaRepository($db);
        foreach ($lockedRows as $row) {
            $update->execute(array(':updated_at' => date('c'), ':id' => (string) $row['id']));
            if ($update->rowCount() !== 1) {
                throw new RuntimeException('Nao foi possivel limpar a observacao do lancamento ' . $row['id'] . '.');
            }
            $audit->append(array(
                'entidade' => 'lancamentos',
                'registroId' => (string) $row['id'],
                'acao' => 'remocao_texto_teste_observacao',
                'descricao' => 'Remocao autorizada de texto de teste no campo Observacao da area de janeiro ou fevereiro de 2026.',
                'valorAnterior' => array('observacaoArea' => (string) $row['observacao_unidade']),
                'valorNovo' => array('observacaoArea' => null),
                'usuario' => 'MIGRACAO-20261108',
                'perfilUsuario' => 'Sistema',
            ));
            $result['alterados']++;
        }
        $db->commit();
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), PHP_EOL;
