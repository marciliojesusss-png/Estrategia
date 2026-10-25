<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/services/RedeLotericaPeriodoEquivalenteCalculator.php';

function indicator23_close_to($actual, $expected, $tolerance = 1e-12) {
    if (abs($actual - $expected) > $tolerance) {
        fwrite(STDERR, $actual . ' deveria ser aproximadamente ' . $expected . ".\n");
        exit(1);
    }
}

$components = RedeLotericaPeriodoEquivalenteCalculator::calculate(array(
    'ano' => 2026,
    'mes' => 1,
    'dados_entrada' => array(
        'arrecadacaoRedeLoterica2025Acumulada' => 100,
        'arrecadacaoRedeLotericaAcumulada2026' => 101,
    ),
), array(), 1.005);
indicator23_close_to($components['resultado_calculado'], 1.01);
indicator23_close_to($components['percentual_atingido'], 1.01 / 1.005);
if ($components['situacao'] !== 'Atingido') exit(1);

$monthly = array(
    array('mes' => 1, 'dados_entrada' => array('arrecadacaoRedeLoterica2025PeriodoEquivalente' => 100, 'arrecadacaoRedeLotericaMes2026' => 102)),
    array('mes' => 2, 'dados_entrada' => array('arrecadacaoRedeLoterica2025PeriodoEquivalente' => 200, 'arrecadacaoRedeLotericaMes2026' => 199)),
    array('mes' => 3, 'dados_entrada' => array('arrecadacaoRedeLoterica2025PeriodoEquivalente' => 300, 'arrecadacaoRedeLotericaMes2026' => 304)),
);
$accumulated = RedeLotericaPeriodoEquivalenteCalculator::calculate($monthly[2], $monthly, 1.005);
indicator23_close_to($accumulated['resultado_calculado'], 605 / 600);

$officialMonthly = array(
    array('mes' => 1, 'dados_entrada' => array('arrecadacaoRedeLoterica2025PeriodoEquivalente' => 1345843615.20, 'arrecadacaoRedeLotericaMes2026' => 1483427750.90)),
    array('mes' => 2, 'dados_entrada' => array('arrecadacaoRedeLoterica2025PeriodoEquivalente' => 1691450489.90, 'arrecadacaoRedeLotericaMes2026' => 1439543898.10)),
    array('mes' => 3, 'dados_entrada' => array('arrecadacaoRedeLoterica2025PeriodoEquivalente' => 1337016995.60, 'arrecadacaoRedeLotericaMes2026' => 1476242711.30)),
    array('mes' => 4, 'dados_entrada' => array('arrecadacaoRedeLoterica2025PeriodoEquivalente' => 1435038130.70, 'arrecadacaoRedeLotericaMes2026' => 1520757013.20)),
    array('mes' => 5, 'dados_entrada' => array('arrecadacaoRedeLoterica2025PeriodoEquivalente' => 1527837662.30, 'arrecadacaoRedeLotericaMes2026' => 1600397124.10)),
    array('mes' => 6, 'dados_entrada' => array('arrecadacaoRedeLoterica2025PeriodoEquivalente' => 1862564945.90, 'arrecadacaoRedeLotericaMes2026' => 1573326249.20)),
    array('mes' => 7, 'dados_entrada' => array('arrecadacaoRedeLoterica2025PeriodoEquivalente' => 1552114336.40, 'arrecadacaoRedeLotericaMes2026' => 1464165326.50)),
    array('mes' => 8, 'dados_entrada' => array('arrecadacaoRedeLoterica2025PeriodoEquivalente' => 1468593628.90, 'arrecadacaoRedeLotericaMes2026' => 1516647865.60)),
);
$expectedResults = array(1.102228917346800517, 0.962360426042365086, 1.005693070069025235, 1.019042088484210662, 1.024966190251646309, 0.988471744167763192, 0.981956053067973007, 0.988056761502420872);
$targets = array(1.005, 1.005, 1.005, 1.010, 1.010, 1.010, 1.015, 1.015);
foreach ($officialMonthly as $index => $launch) {
    $result = RedeLotericaPeriodoEquivalenteCalculator::calculate($launch, array_slice($officialMonthly, 0, $index + 1), $targets[$index]);
    indicator23_close_to($result['resultado_calculado'], $expectedResults[$index]);
    indicator23_close_to($result['percentual_atingido'], $expectedResults[$index] / $targets[$index]);
}

$march = RedeLotericaPeriodoEquivalenteCalculator::calculate(array(
    'mes' => 3,
    'dados_entrada' => array(
        'resultadoDocumentalRedeLoterica' => 0.0057,
        'percentualAtingidoOficialRedeLoterica' => 1.1386,
        'tipoPosicaoRedeLoterica' => 'fechamento_trimestral',
        'fonteResultadoRedeLoterica' => 'Informe 0029',
        'escalaResultadoDocumentalRedeLoterica' => 'incremento',
    ),
), array(), 1.005);
indicator23_close_to($march['resultado_calculado'], 1.0057);
indicator23_close_to($march['percentual_atingido'], 1.0057 / 1.005);
if ($march['situacao'] !== 'Atingido') exit(1);

$september = array(
    'mes' => 9,
    'dados_entrada' => array(
        'resultadoDocumentalRedeLoterica' => 0.9816,
        'percentualAtingidoOficialRedeLoterica' => 0.9671,
        'tipoPosicaoRedeLoterica' => 'fechamento_trimestral',
        'fonteResultadoRedeLoterica' => 'Informe 0078',
        'escalaResultadoDocumentalRedeLoterica' => 'indice',
    ),
);
$historyThroughSeptember = $officialMonthly;
$historyThroughSeptember[] = $september;
$septemberResult = RedeLotericaPeriodoEquivalenteCalculator::calculate($september, $historyThroughSeptember, 1.015);
indicator23_close_to($septemberResult['resultado_calculado'], 0.9816);
indicator23_close_to($septemberResult['percentual_atingido'], 0.9816 / 1.015);

$october = RedeLotericaPeriodoEquivalenteCalculator::calculate(array('mes' => 10, 'dados_entrada' => array()), $officialMonthly, 1.02);
if ($october['resultado_calculado'] !== null || $october['percentual_atingido'] !== null) exit(1);

$december = RedeLotericaPeriodoEquivalenteCalculator::calculate(array('mes' => 12, 'dados_entrada' => array()), array(), 1.02);
if ($december['meta_referencia'] !== 1.02 || $december['resultado_calculado'] !== null
    || $december['percentual_atingido'] !== null || $december['situacao'] !== null) exit(1);

try {
    RedeLotericaPeriodoEquivalenteCalculator::calculate(array(
        'mes' => 1,
        'dados_entrada' => array('arrecadacaoRedeLoterica2025Acumulada' => 100),
    ), array(), 1.005);
    fwrite(STDERR, "Par de componentes incompleto foi aceito.\n");
    exit(1);
} catch (DomainException $expected) {
}

echo "Indicador 23: calculadora backend canonica validada.\n";
