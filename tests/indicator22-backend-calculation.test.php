<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/services/EcossistemaLotexCalculator.php';

$serviceSource = file_get_contents(__DIR__ . '/../app/services/LancamentoService.php');
if ($serviceSource === false) throw new RuntimeException('Nao foi possivel inspecionar LancamentoService.php.');

function indicator22_ok($condition, $message)
{
    if (!$condition) throw new RuntimeException($message);
}

function indicator22_close_to($actual, $expected, $tolerance = 1e-12)
{
    indicator22_ok(abs($actual - $expected) <= $tolerance, $actual . ' deveria ser aproximadamente ' . $expected);
}

indicator22_ok(strpos($serviceSource, "if((int)\$indicator['id']===22||\$indicator['tipoCalculo']==='participacao_ecossistema_lotex')") !== false, 'Fluxo normal do Indicador 22 deve usar a calculadora backend.');
indicator22_ok(strpos($serviceSource, 'EcossistemaLotexCalculator::calculate($current)') !== false, 'Backend deve ser a autoridade no salvamento do Indicador 22.');

$july = EcossistemaLotexCalculator::calculate(array(
    'mes' => 7,
    'dados_entrada' => array(
        'arrTotal2025' => 13555540052.00,
        'arrEcoLotex2025' => 105266400.00,
        'arrEcoMarketplace2025' => 334933864.05,
        'arrTotal2026' => 14157139768.80,
        'arrEcoLotex2026' => 87677530.50,
        'arrEcoMarketplace2026' => 512915099.64,
    ),
));
indicator22_close_to($july['referencia_2025'], 105266400 / 13555540052);
indicator22_close_to($july['meta_tecnica'], (105266400 / 13555540052) * 1.10);
indicator22_close_to($july['resultado_calculado'], 87677530.50 / 14157139768.80);
indicator22_ok($july['fator_meta'] === 1.10, 'JUL deve manter o fator 1,10.');

$august = EcossistemaLotexCalculator::calculate(array(
    'mes' => 8,
    'dados_entrada' => array(
        'arrTotal2025' => 15436581916.40,
        'arrEcoLotex2025' => 119416800.00,
        'arrEcoMarketplace2025' => 376653655.87,
        'arrTotal2026' => 16122321231.05,
        'arrEcoLotex2026' => 101554152.00,
        'arrEcoMarketplace2026' => 999999999999.99,
    ),
));
indicator22_ok($august['fator_meta'] === 1.01, 'AGO deve aplicar prospectivamente o fator 1,01.');
indicator22_close_to($august['meta_tecnica'], (119416800 / 15436581916.40) * 1.01);
indicator22_close_to($august['resultado_calculado'], 101554152 / 16122321231.05);

$march = EcossistemaLotexCalculator::calculate(array(
    'mes' => 3,
    'dados_entrada' => array(
        'arrTotal2025' => 5504494123.70,
        'arrEcoLotex2025' => 49752400.00,
        'arrTotal2026' => 5966912490.55,
        'arrEcoLotex2026' => 39819048.75,
        'tipoPosicaoEcossistema' => 'fechamento_trimestral',
        'metaDocumentalEcossistema' => 0.0099,
        'resultadoDocumentalEcossistema' => 0.0067,
        'percentualAtingidoOficialEcossistema' => 0.6712,
        'fonteResultadoEcossistema' => 'Informe DILOT/GERIN nº 0029/2026',
    ),
));
indicator22_close_to($march['meta_referencia'], 0.009942355967711213);
indicator22_ok($march['resultado_oficial'] === 0.0067, 'Resultado documental de MAR incorreto.');
indicator22_ok($march['percentual_atingido'] === 0.6712, 'Atingimento documental de MAR incorreto.');

$june = EcossistemaLotexCalculator::calculate(array(
    'mes' => 6,
    'dados_entrada' => array(
        'arrTotal2025' => 11569679632.60,
        'arrEcoLotex2025' => 89935200.00,
        'arrTotal2026' => 12191958306.55,
        'arrEcoLotex2026' => 74144913.25,
        'tipoPosicaoEcossistema' => 'fechamento_trimestral',
        'metaDocumentalEcossistema' => 0.0086,
        'resultadoDocumentalEcossistema' => 0.0061,
        'percentualAtingidoOficialEcossistema' => 0.7112,
        'fonteResultadoEcossistema' => 'Informe DILOT/GERIN nº 0056/2026',
    ),
));
indicator22_close_to($june['meta_referencia'], 0.008550687930999193);
indicator22_ok($june['resultado_oficial'] === 0.0061, 'Resultado documental de JUN incorreto.');
indicator22_ok($june['percentual_atingido'] === 0.7112, 'Atingimento documental de JUN incorreto.');

$september = EcossistemaLotexCalculator::calculate(array(
    'mes' => 9,
    'dados_entrada' => array(
        'arrTotal2025' => 17998386148.80,
        'arrEcoLotex2025' => 133276716.00,
        'arrEcoMarketplace2025' => 463811538.74,
        'tipoPosicaoEcossistema' => 'fechamento_trimestral',
        'metaDocumentalEcossistema' => 0.0075,
        'resultadoDocumentalEcossistema' => 0.006,
        'percentualAtingidoOficialEcossistema' => 0.8,
        'fonteResultadoEcossistema' => 'Informe DILOT/GERIN nº 0078/2026',
    ),
));
indicator22_close_to($september['meta_referencia'], (133276716 / 17998386148.80) * 1.01);
indicator22_ok($september['meta_referencia'] !== 0.0075, 'Meta documental nao pode sobrescrever a meta tecnica de SET.');
indicator22_ok($september['resultado_calculado'] === null, 'SET nao pode fabricar componentes tecnicos.');
indicator22_ok($september['resultado_oficial'] === 0.006, 'Resultado documental de SET incorreto.');
indicator22_ok($september['percentual_atingido'] === 0.8, 'Atingimento documental de SET deve ser literal.');
indicator22_ok($september['situacao'] === 'Abaixo da meta', 'Situacao documental de SET incorreta.');

$december = EcossistemaLotexCalculator::calculate(array(
    'mes' => 12,
    'dados_entrada' => array(
        'arrTotal2025' => 26612476457.00,
        'arrEcoLotex2025' => 173831435.50,
        'arrEcoMarketplace2025' => 746339639.03,
        'tipoPosicaoEcossistema' => 'fechamento_trimestral',
    ),
));
indicator22_ok($december['resultado_oficial'] === null, 'DEZ sem realizado deve permanecer nulo.');
indicator22_ok($december['percentual_atingido'] === null, 'DEZ sem realizado nao pode virar zero.');
indicator22_ok($december['situacao'] === null, 'DEZ sem realizado nao pode receber situacao.');

$invalidCases = array(
    array('mes' => 1, 'dados_entrada' => array('arrTotal2025' => 100)),
    array('mes' => 1, 'dados_entrada' => array('arrTotal2025' => 100, 'arrEcoLotex2025' => 1, 'arrTotal2026' => 0, 'arrEcoLotex2026' => 1)),
    array('mes' => 8, 'dados_entrada' => array('arrTotal2025' => 100, 'arrEcoLotex2025' => 1, 'arrEcoMarketplace2026' => -1)),
    array('mes' => 8, 'dados_entrada' => array('arrTotal2025' => 100, 'arrEcoLotex2025' => 1, 'resultadoDocumentalEcossistema' => 0.01)),
);
foreach ($invalidCases as $case) {
    try {
        EcossistemaLotexCalculator::calculate($case);
        throw new RuntimeException('Entrada invalida foi aceita: ' . json_encode($case));
    } catch (DomainException $expected) {
    }
}

echo "Indicador 22: calculadora PHP Lotex validada.\n";

