<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/services/ClientesAtivosDigitaisCalculator.php';

function indicator03_ok($condition, $message)
{
    if (!$condition) throw new RuntimeException($message);
}

function indicator03_close_to($actual, $expected, $tolerance = 1e-12)
{
    indicator03_ok(abs($actual - $expected) <= $tolerance, $actual . ' deveria ser aproximadamente ' . $expected);
}

$march = ClientesAtivosDigitaisCalculator::calculate(array(
    'dados_entrada' => array(
        'qmaatu' => 2982989,
        'qmaant' => 1710374,
        'resultadoDocumentalClientesAtivos' => 0.7441,
        'percentualAtingidoOficialClientesAtivos' => 2.6573,
        'tipoPosicaoClientesAtivos' => 'fechamento_trimestral',
        'fonteResultadoClientesAtivos' => 'Informe DILOT/GERIN nº 0029/2026',
    ),
), 0.28);
indicator03_close_to($march['resultado_calculado'], 2982989 / 1710374 - 1);
indicator03_close_to($march['atingimento_tecnico'], (2982989 / 1710374 - 1) / 0.28);
indicator03_ok($march['resultado_oficial'] === 0.7441, 'Resultado documental de MAR incorreto.');
indicator03_ok($march['percentual_atingido'] === 2.6573, 'Atingimento literal do Informe deve ser preservado.');
indicator03_ok($march['situacao'] === 'Atingido', 'Situação de MAR incorreta.');

$january = ClientesAtivosDigitaisCalculator::calculate(array(
    'dados_entrada' => array(
        'qmaatu' => 3295778,
        'qmaant' => 1748166,
        'resultadoDocumentalClientesAtivos' => 0.8853,
        'percentualAtingidoOficialClientesAtivos' => 3.1617,
        'tipoPosicaoClientesAtivos' => 'acompanhamento',
        'fonteResultadoClientesAtivos' => 'Tabela mensal de acompanhamento da area',
    ),
), 0.28);
indicator03_ok(
    $january['resultado_calculado'] === '0.885277485090088699',
    'Resultado tecnico de JAN deve preservar 18 casas antes da persistencia.'
);

$june = ClientesAtivosDigitaisCalculator::calculate(array(
    'dados_entrada' => array('qmaatu' => 3040125, 'qmaant' => 1874815),
), 0.28);
indicator03_close_to($june['resultado_calculado'], 3040125 / 1874815 - 1);
indicator03_close_to($june['percentual_atingido'], (3040125 / 1874815 - 1) / 0.28);

$documentary = ClientesAtivosDigitaisCalculator::calculate(array(
    'dados_entrada' => array(
        'resultadoDocumentalClientesAtivos' => 0.7046,
        'percentualAtingidoOficialClientesAtivos' => 2.5164,
        'tipoPosicaoClientesAtivos' => 'acompanhamento',
        'fonteResultadoClientesAtivos' => '16.10(3).xlsx',
    ),
), 0.28);
indicator03_ok($documentary['resultado_calculado'] === null, 'Posição documental não pode fabricar resultado técnico.');
indicator03_ok($documentary['resultado_oficial'] === 0.7046, 'Resultado documental mensal incorreto.');

$empty = ClientesAtivosDigitaisCalculator::calculate(array('dados_entrada' => array()), 0.28);
indicator03_ok($empty['resultado_calculado'] === null && $empty['resultado_oficial'] === null, 'Competência vazia deve permanecer sem resultado.');

$invalidCases = array(
    array('qmaatu' => 10),
    array('qmaatu' => 0, 'qmaant' => 10),
    array('qmaatu' => 10.5, 'qmaant' => 10),
    array('resultadoDocumentalClientesAtivos' => 0.50),
);
foreach ($invalidCases as $inputs) {
    try {
        ClientesAtivosDigitaisCalculator::calculate(array('dados_entrada' => $inputs), 0.28);
        throw new RuntimeException('Entrada inválida foi aceita: ' . json_encode($inputs));
    } catch (DomainException $expected) {
    }
}

echo "Indicador 03: calculadora PHP validada.\n";
