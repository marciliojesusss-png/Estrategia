<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/services/OfertasPersonalizadasCalculator.php';
require_once __DIR__ . '/../app/services/CompetenciaPeriodicidade.php';

function indicator01_ok($condition, $message)
{
    if (!$condition) throw new RuntimeException($message);
}

function indicator01_close_to($actual, $expected, $tolerance = 1e-12)
{
    indicator01_ok(abs($actual - $expected) <= $tolerance, $actual . ' deveria ser aproximadamente ' . $expected);
}

$march = OfertasPersonalizadasCalculator::calculate(array(
    'dados_entrada' => array(
        'baseClientesAtivosCompetencia' => 2773599,
        'clientesUnicosComOfertaPersonalizadaCompetencia' => 1241587,
        'resultadoDocumentalOfertasPersonalizadas' => 0.4476,
        'percentualAtingidoOficialOfertasPersonalizadas' => 4.4764,
    ),
), 0.10);
indicator01_close_to($march['resultado_calculado'], 1241587 / 2773599);
indicator01_close_to($march['atingimento_tecnico'], (1241587 / 2773599) / 0.10);
indicator01_ok($march['resultado_oficial'] === 0.4476, 'Resultado oficial de MAR incorreto.');
indicator01_ok($march['percentual_atingido'] === 4.4764, 'Atingimento oficial de MAR incorreto.');

$june = OfertasPersonalizadasCalculator::calculate(array(
    'dados_entrada' => array(
        'baseClientesAtivosCompetencia' => 3018556,
        'clientesUnicosComOfertaPersonalizadaCompetencia' => 2371981,
        'resultadoDocumentalOfertasPersonalizadas' => 0.7858,
        'percentualAtingidoOficialOfertasPersonalizadas' => 7.858,
    ),
), 0.10);
indicator01_close_to($june['resultado_calculado'], 2371981 / 3018556);
indicator01_ok($june['percentual_atingido'] === 7.858, 'Atingimento oficial de JUN incorreto.');

$september = OfertasPersonalizadasCalculator::calculate(array(
    'dados_entrada' => array(
        'resultadoDocumentalOfertasPersonalizadas' => 0.8379,
        'percentualAtingidoOficialOfertasPersonalizadas' => 8.379,
    ),
), 0.10);
indicator01_ok($september['resultado_calculado'] === null, 'SET não pode ganhar componentes técnicos artificiais.');
indicator01_ok($september['resultado_oficial'] === 0.8379 && $september['percentual_atingido'] === 8.379, 'Fechamento documental de SET incorreto.');

$december = OfertasPersonalizadasCalculator::calculate(array('dados_entrada' => array()), 0.10);
indicator01_ok($december['resultado_calculado'] === null && $december['resultado_oficial'] === null && $december['situacao'] === null, 'DEZ deve permanecer vazio.');

try {
    OfertasPersonalizadasCalculator::calculate(array('dados_entrada' => array('baseClientesAtivosCompetencia' => 10)), 0.10);
    throw new RuntimeException('Par incompleto foi aceito.');
} catch (DomainException $expected) {
}

$indicator = array('id' => 1, 'periodicidade' => 'Trimestral');
indicator01_ok(CompetenciaPeriodicidade::isTrackingAllowed($indicator, '2026-01'), 'JAN deve permitir acompanhamento mensal.');
indicator01_ok(!CompetenciaPeriodicidade::isExpected($indicator, '2026-01'), 'JAN não pode ser fechamento oficial.');
indicator01_ok(CompetenciaPeriodicidade::isExpected($indicator, '2026-03'), 'MAR deve ser fechamento oficial.');

echo "Indicador 01: calculadora backend e periodicidade validadas." . PHP_EOL;
