<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/core/Database.php';
require_once __DIR__ . '/../app/repositories/AuditoriaRepository.php';

$arguments = array_slice($argv, 1);
$dryRun = in_array('--dry-run', $arguments, true);
$apply = in_array('--apply', $arguments, true);
if ($dryRun === $apply) {
    fwrite(STDERR, "Uso: php scripts/remover-observacoes-teste-fechamentos.php --dry-run|--apply\n");
    exit(2);
}

$db = Database::getConnection();
if ((string) $db->query('SELECT DB_NAME()')->fetchColumn() !== 'Estrategia') {
    throw new RuntimeException('Remocao permitida somente no banco Estrategia.');
}

$expected = array(
    '27' => array('indicadorId' => '3', 'competencia' => '2026-03', 'versao' => 2),
    '51' => array('indicadorId' => '5', 'competencia' => '2026-03', 'versao' => 1),
    '75' => array('indicadorId' => '7', 'competencia' => '2026-03', 'versao' => 1),
    '147' => array('indicadorId' => '13', 'competencia' => '2026-03', 'versao' => 1),
    '159' => array('indicadorId' => '14', 'competencia' => '2026-03', 'versao' => 1),
);

$load = static function ($connection, bool $lock): array {
    $hint = $lock ? ' WITH (UPDLOCK,HOLDLOCK)' : '';
    return $connection->query(
        "SELECT l.id,l.indicador_id,l.competencia,l.status,l.versao_atual,l.observacao_unidade,"
        . "JSON_VALUE(l.dados_entrada_json,'$.observacaoArea') observacao_json,"
        . "d.id observacao_documental_id,d.fonte_documental "
        . "FROM dbo.lancamentos l" . $hint . " "
        . "LEFT JOIN dbo.lancamentos_observacoes_documentais d ON d.lancamento_id=l.id "
        . "AND d.indicador_id=l.indicador_id AND d.competencia=l.competencia "
        . "AND d.versao_lancamento=l.versao_atual "
        . "AND d.tipo_observacao=N'OBSERVACAO_AREA_INFORME_TRIMESTRAL' "
        . "AND NOT EXISTS (SELECT 1 FROM dbo.lancamentos_observacoes_documentais s "
        . "WHERE s.substitui_observacao_id=d.id) "
        . "WHERE l.id IN (N'27',N'51',N'75',N'147',N'159') ORDER BY TRY_CONVERT(int,l.indicador_id)"
    )->fetchAll();
};

$validate = static function (array $rows) use ($expected): void {
    if (count($rows) !== count($expected)) {
        throw new RuntimeException('Esperados cinco lancamentos; encontrados ' . count($rows) . '.');
    }
    foreach ($rows as $row) {
        $id = (string) $row['id'];
        if (!isset($expected[$id])) throw new RuntimeException('Lancamento inesperado: ' . $id . '.');
        $item = $expected[$id];
        if ((string) $row['indicador_id'] !== $item['indicadorId']
            || (string) $row['competencia'] !== $item['competencia']
            || (int) $row['versao_atual'] !== $item['versao']
            || (string) $row['status'] !== 'Homologado') {
            throw new RuntimeException('Pre-condicao estrutural falhou no lancamento ' . $id . '.');
        }
        $normalized = strtolower(trim((string) $row['observacao_unidade']));
        if (!in_array($normalized, array('teste', 'teste.', 'test', 'test.'), true)) {
            throw new RuntimeException('A observacao do lancamento ' . $id . ' nao e mais um texto de teste.');
        }
        if ($row['observacao_json'] !== null && trim((string) $row['observacao_json']) !== '') {
            throw new RuntimeException('O lancamento ' . $id . ' possui observacao duplicada no JSON legado.');
        }
        if (empty($row['observacao_documental_id'])) {
            throw new RuntimeException('O lancamento ' . $id . ' nao possui observacao documental oficial vigente.');
        }
    }
};

$rows = $load($db, false);
$validate($rows);
$result = array(
    'modo' => $dryRun ? 'dry-run' : 'apply',
    'registros' => array_map(static function (array $row): array {
        return array(
            'lancamentoId' => (string) $row['id'],
            'indicadorId' => (string) $row['indicador_id'],
            'competencia' => (string) $row['competencia'],
            'valorAnterior' => (string) $row['observacao_unidade'],
            'valorNovo' => null,
            'observacaoDocumentalPreservada' => (string) $row['observacao_documental_id'],
            'fonteDocumental' => (string) $row['fonte_documental'],
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
                'descricao' => 'Remocao autorizada de texto de teste no campo Observacao da area.',
                'valorAnterior' => array('observacaoArea' => (string) $row['observacao_unidade']),
                'valorNovo' => array(
                    'observacaoArea' => null,
                    'observacaoDocumentalPreservada' => (string) $row['observacao_documental_id'],
                    'fonteDocumental' => (string) $row['fonte_documental'],
                ),
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
