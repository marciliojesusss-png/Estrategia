<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/services/RazaoPixCalculator.php';

function pix_close_to($actual, $expected, $tolerance = 1e-12)
{
    if ($actual === null || abs($actual - $expected) > $tolerance) {
        fwrite(STDERR, var_export($actual, true) . ' deveria ser aproximadamente ' . $expected . ".\n");
        exit(1);
    }
}

function pix_launch($month, array $inputs, $target)
{
    return array(
        'indicador_id' => '9',
        'ano' => 2026,
        'mes' => $month,
        'meta_referencia' => $target,
        'dados_entrada' => $inputs,
    );
}

$parameters = array(
    'campoNumeradorAcumulado' => 'arrecadacaoPixAcumuladaCompetencia',
    'campoDenominadorAcumulado' => 'arrecadacaoTotalCanaisEletronicosAcumuladaCompetencia',
    'campoResultadoOficial' => 'resultadoOficialPix',
    'campoPercentualAtingidoOficial' => 'percentualAtingidoOficialPix',
    'mesesFechamentoTrimestral' => array(3, 6, 9, 12),
);

$mar = RazaoPixCalculator::calculate(pix_launch(3, array(
    'arrecadacaoPixAcumuladaCompetencia' => 1127026595.61,
    'arrecadacaoTotalCanaisEletronicosAcumuladaCompetencia' => 1686118105.09,
    'resultadoOficialPix' => 0.67,
    'percentualAtingidoOficialPix' => 1.1009,
), 0.61), $parameters, 0.61);
pix_close_to($mar['resultado_calculado'], 1127026595.61 / 1686118105.09);
pix_close_to($mar['resultado_oficial'], 0.67);
pix_close_to($mar['percentual_atingido'], 1.1009);
if ($mar['situacao'] !== 'Atingido') exit(1);

$jun = RazaoPixCalculator::calculate(pix_launch(6, array(
    'arrecadacaoPixAcumuladaCompetencia' => 2261919134.59,
    'arrecadacaoTotalCanaisEletronicosAcumuladaCompetencia' => 3369675084.95,
    'resultadoOficialPix' => 0.6713,
    'percentualAtingidoOficialPix' => 1.0914,
), 0.62), $parameters, 0.62);
pix_close_to($jun['resultado_oficial'], 0.6713);
pix_close_to($jun['percentual_atingido'], 1.0914);
if ($jun['situacao'] !== 'Atingido') exit(1);

$set = RazaoPixCalculator::calculate(pix_launch(9, array(
    'arrecadacaoPixAcumuladaCompetenciaAproximada' => 3538000000,
    'resultadoOficialPix' => 0.6764,
    'percentualAtingidoOficialPix' => 1.0737,
), 0.63), $parameters, 0.63);
if ($set['resultado_calculado'] !== null) exit(1);
pix_close_to($set['resultado_oficial'], 0.6764);
pix_close_to($set['percentual_atingido'], 1.0737);
if ($set['situacao'] !== 'Atingido') exit(1);

$aug = RazaoPixCalculator::calculate(pix_launch(8, array(
    'arrecadacaoPixAcumuladaCompetencia' => 3076438388.87,
    'arrecadacaoTotalCanaisEletronicosAcumuladaCompetencia' => 4555836512.10,
    'resultadoOficialPix' => 0.675274,
), 0.63), $parameters, 0.63);
pix_close_to($aug['resultado_calculado'], 3076438388.87 / 4555836512.10);
pix_close_to($aug['percentual_atingido'], (3076438388.87 / 4555836512.10) / 0.63);
if ($aug['situacao'] !== 'Em acompanhamento') exit(1);

$dec = RazaoPixCalculator::calculate(pix_launch(12, array(
    'resultadoOficialPix' => 0.66,
    'percentualAtingidoOficialPix' => 1.015,
), 0.6543), $parameters, 0.6543);
if ($dec['resultado_calculado'] !== null) exit(1);
pix_close_to($dec['resultado_oficial'], 0.66);
pix_close_to($dec['percentual_atingido'], 1.015);
if ($dec['situacao'] !== 'Atingido') exit(1);

$serviceSource = file_get_contents(__DIR__ . '/../app/services/LancamentoService.php');
if ($serviceSource === false
    || strpos($serviceSource, "require_once __DIR__.'/RazaoPixCalculator.php'") === false
    || strpos($serviceSource, 'RazaoPixCalculator::calculate') === false
    || strpos($serviceSource, 'metasOperacionaisPorCompetencia') === false) {
    fwrite(STDERR, "LancamentoService nao integra a normalizacao de razao_pix.\n");
    exit(1);
}

echo "Indicador 09: calculo deterministico do backend validado.\n";
