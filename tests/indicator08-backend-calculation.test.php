<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/services/RazaoCanaisDigitaisCalculator.php';

function close_to($actual, $expected, $tolerance = 1e-14) {
    if (abs($actual - $expected) > $tolerance) {
        fwrite(STDERR, "{$actual} deveria ser aproximadamente {$expected}.\n");
        exit(1);
    }
}

$jan = array(
    'id'=>85, 'ano'=>2026, 'mes'=>1,
    'dados_entrada'=>array(
        'arrecadacaoCanaisEletronicosMes'=>624392611.64,
        'arrecadacaoTotalProdutosLoteriasMes'=>2030288935.15,
    ),
    'resultado_calculado'=>null,
    'resultado_oficial'=>null,
    'percentual_atingido'=>null,
    'situacao'=>'Sem dados',
);
$calculated = RazaoCanaisDigitaisCalculator::calculate($jan, array($jan), 0.2770);
close_to($calculated['resultado_calculado'], 0.3075387945183621);
close_to($calculated['resultado_oficial'], 0.3075387945183621);
close_to($calculated['percentual_atingido'], 1.110248355661957);
if ($calculated['meta_referencia'] !== 0.277 || $calculated['situacao'] !== 'Atingido') exit(1);
if (number_format($calculated['resultado_oficial'] * 100, 2, ',', '.') !== '30,75') exit(1);
if (number_format($calculated['percentual_atingido'] * 100, 2, ',', '.') !== '111,02') exit(1);

$feb = array(
    'id'=>86, 'ano'=>2026, 'mes'=>2,
    'dados_entrada'=>array(
        'arrecadacaoCanaisEletronicosMes'=>580582876.90,
        'arrecadacaoTotalProdutosLoteriasMes'=>1954616641.35,
    ),
);
$febCalculated = RazaoCanaisDigitaisCalculator::calculate($feb, array($jan, $feb), 0.2829);
close_to($febCalculated['resultado_oficial'], 0.3023849537730697);

try {
    RazaoCanaisDigitaisCalculator::calculate(array(
        'mes'=>1,
        'dados_entrada'=>array('arrecadacaoCanaisEletronicosMes'=>10),
    ), array(), 0.2770);
    fwrite(STDERR, "Payload incompleto foi aceito.\n");
    exit(1);
} catch (DomainException $expected) {
}

echo "Indicador 08: barreira deterministica do backend validada.\n";
