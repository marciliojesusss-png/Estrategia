<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/core/Database.php';
require_once __DIR__ . '/../app/repositories/LancamentosRepository.php';
require_once __DIR__ . '/../app/repositories/LancamentosResultadosHomologadosRepository.php';
require_once __DIR__ . '/../app/repositories/AuditoriaRepository.php';

$arguments = array_slice($argv, 1);
$dryRun = in_array('--dry-run', $arguments, true);
$apply = in_array('--apply', $arguments, true);
if ($dryRun === $apply) {
    fwrite(STDERR, "Uso: php scripts/corrigir-indicador05-janeiro.php --dry-run|--apply\n");
    exit(2);
}

$db = Database::getConnection();
if ((string) $db->query('SELECT DB_NAME()')->fetchColumn() !== 'Estrategia') {
    throw new RuntimeException('Correcao permitida somente no banco Estrategia.');
}

$launches = new LancamentosRepository($db);
$snapshots = new LancamentosResultadosHomologadosRepository($db);
$audits = new AuditoriaRepository($db);
$launchId = '49';

function cents($value): int
{
    if ($value === null || $value === '' || !is_numeric($value)) {
        throw new RuntimeException('Valor monetario ausente ou invalido.');
    }
    return (int) round(((float) $value) * 100);
}

function decimalFromCents(int $value): string
{
    $sign = $value < 0 ? '-' : '';
    $absolute = abs($value);
    return $sign . intdiv($absolute, 100) . '.' . str_pad((string) ($absolute % 100), 2, '0', STR_PAD_LEFT);
}

function projectionForJanuary(array $launch): array
{
    if ((string) ($launch['indicadorId'] ?? '') !== '5'
        || (string) ($launch['competencia'] ?? '') !== '2026-01'
        || (string) ($launch['status'] ?? '') !== 'Homologado'
        || (int) ($launch['versaoAtual'] ?? 0) !== 1) {
        throw new RuntimeException('Pre-condicao falhou: o lancamento 49 nao corresponde ao Indicador 05, janeiro/2026, homologado na versao 1.');
    }

    $inputs = isset($launch['camposEntrada']) && is_array($launch['camposEntrada'])
        ? $launch['camposEntrada'] : array();
    $revenueCents = cents($inputs['arrecadacaoTotalMes'] ?? null);
    $prizesCents = cents($inputs['premiosAPagarMes'] ?? null);
    $targetCents = cents($launch['metaReferencia'] ?? null);
    if ($revenueCents !== 195000000000 || $prizesCents !== 81844290519 || $targetCents !== 105659303900) {
        throw new RuntimeException('Pre-condicao falhou: os dados brutos ou a meta de janeiro foram alterados.');
    }

    $resultCents = $revenueCents - $prizesCents;
    if ($resultCents < 0 || $targetCents <= 0) {
        throw new RuntimeException('Resultado ou meta invalido para a regularizacao.');
    }

    $result = decimalFromCents($resultCents);
    $target = decimalFromCents($targetCents);
    $percentage = number_format($resultCents / $targetCents, 12, '.', '');

    return array(
        'resultado_calculado' => $result,
        'resultado_oficial' => $result,
        'meta_oficial' => $target,
        'percentual_atingido' => $percentage,
        'situacao' => 'Atingido',
        'origem_resultado' => 'ggr_formula_dados_brutos',
    );
}

$before = $launches->find($launchId);
if (!$before) throw new RuntimeException('Lancamento 49 nao encontrado.');
$projection = projectionForJanuary($before);
$snapshotExists = $snapshots->exists($launchId, 1);

$result = array(
    'modo' => $dryRun ? 'dry-run' : 'apply',
    'lancamentoId' => $launchId,
    'indicadorId' => '5',
    'competencia' => '2026-01',
    'antes' => array(
        'resultadoCalculado' => $before['resultadoMensal'],
        'resultadoOficial' => $before['resultadoOficialAnual'],
        'percentualAtingido' => $before['percentualAtingido'],
    ),
    'projecao' => $projection,
    'snapshotExistia' => $snapshotExists,
    'alterado' => false,
);

if ($apply) {
    $db->beginTransaction();
    try {
        $locked = $launches->findForUpdate($launchId);
        if (!$locked) throw new RuntimeException('Lancamento 49 desapareceu durante a regularizacao.');
        $lockedProjection = projectionForJanuary($locked);
        $after = $launches->updateDerivedFields($launchId, $lockedProjection);

        $snapshot = array(
            'lancamentoId' => $launchId,
            'versaoLancamento' => 1,
            'indicadorId' => '5',
            'competencia' => '2026-01',
            'metaOficial' => $lockedProjection['meta_oficial'],
            'resultadoCalculado' => $lockedProjection['resultado_calculado'],
            'resultadoOficial' => $lockedProjection['resultado_oficial'],
            'percentualAtingido' => $lockedProjection['percentual_atingido'],
            'situacao' => $lockedProjection['situacao'],
            'origemResultado' => $lockedProjection['origem_resultado'],
            'versaoFormula' => 'ggr_formula_2026.11.08.1',
            'detalhes' => array(
                'correcao' => 'Precisao de janeiro/2026 do Indicador 05',
                'formula' => 'arrecadacaoTotalMes - premiosAPagarMes',
                'dadosBrutosPreservados' => true,
            ),
            'homologadoPor' => 'MIGRACAO-20261108',
            'homologadoEm' => date('c'),
        );
        if ($snapshots->exists($launchId, 1)) $snapshots->updateValues($snapshot);
        else $snapshots->save($snapshot);

        $audits->append(array(
            'entidade' => 'lancamentos',
            'registroId' => $launchId,
            'acao' => 'regularizacao_indicador05_janeiro',
            'descricao' => 'Correcao da precisao dos campos derivados do GGR de janeiro/2026 e criacao do snapshot homologado.',
            'valorAnterior' => $locked,
            'valorNovo' => array('lancamento' => $after, 'snapshot' => $snapshot),
            'usuario' => 'MIGRACAO-20261108',
            'perfilUsuario' => 'Sistema',
        ));

        $db->commit();
        $result['alterado'] = true;
        $result['depois'] = array(
            'resultadoCalculado' => $after['resultadoMensal'],
            'resultadoOficial' => $after['resultadoOficialAnual'],
            'percentualAtingido' => $after['percentualAtingido'],
            'situacao' => $after['situacaoCalculada'],
            'snapshotCriadoOuAtualizado' => true,
        );
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), PHP_EOL;
