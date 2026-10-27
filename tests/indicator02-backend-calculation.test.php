<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/services/NpsCalculator.php';

function indicator02_ok($condition, $message)
{
    if (!$condition) throw new RuntimeException($message);
}

function indicator02_close_to($actual, $expected, $tolerance = 1e-12)
{
    indicator02_ok(abs($actual - $expected) <= $tolerance, $actual . ' deveria ser aproximadamente ' . $expected);
}

$march = NpsCalculator::calculate(array('dados_entrada' => array(
    'npsApurado' => 55,
    'resultadoDocumentalNPS' => 55,
    'metaDocumentalNPS' => 55,
    'percentualAtingidoOficialNPS' => 1,
)), 55);
indicator02_ok($march['resultado_calculado'] === 55.0, 'Resultado técnico do 1TRI incorreto.');
indicator02_ok($march['percentual_atingido'] === 1.0 && $march['situacao'] === 'Atingido', 'Fechamento do 1TRI incorreto.');

$june = NpsCalculator::calculate(array('dados_entrada' => array(
    'percentualPromotores' => 0.7263,
    'percentualDetratores' => 0.1343,
    'totalRespondentesNPS' => 48003,
    'quantidadePromotoresNPS' => 34863,
    'quantidadeNeutrosNPS' => 6694,
    'quantidadeDetratoresNPS' => 6446,
    'resultadoDocumentalNPS' => 59.2,
    'metaDocumentalNPS' => 60,
    'percentualAtingidoOficialNPS' => 0.9866,
)), 60);
indicator02_close_to($june['resultado_calculado'], 59.2);
indicator02_close_to($june['atingimento_tecnico'], 59.2 / 60);
indicator02_ok($june['resultado_oficial'] === 59.2, 'Resultado documental do 2TRI incorreto.');
indicator02_ok($june['percentual_atingido'] === 0.9866, 'Atingimento literal do Informe deve ser preservado.');
indicator02_ok($june['situacao'] === 'Abaixo da meta', 'Situação documental do 2TRI incorreta.');

$april = NpsCalculator::calculate(array('dados_entrada' => array(
    'tipoPosicaoNPS' => 'ultima_pesquisa_disponivel',
    'resultadoDocumentalNPS' => 55,
)), 58);
indicator02_ok($april['meta_referencia'] === 58.0 && $april['resultado_calculado'] === 55.0, 'ABR deve usar meta 58 e a última posição 55.');
indicator02_close_to($april['percentual_atingido'], 55 / 58);
indicator02_ok($april['situacao'] === 'Abaixo da meta', 'Situação de ABR incorreta.');

$september = NpsCalculator::calculate(array('dados_entrada' => array(
    'resultadoDocumentalNPS' => 59.2,
    'metaDocumentalNPS' => 60,
    'percentualAtingidoOficialNPS' => 0.9866,
)), 60);
indicator02_ok($september['resultado_calculado'] === 59.2, 'SET deve reutilizar somente o resultado documental disponível.');
indicator02_ok($september['percentual_atingido'] === 0.9866 && $september['situacao'] === 'Abaixo da meta', 'Fechamento do 3TRI incorreto.');

try {
    NpsCalculator::calculate(array('dados_entrada' => array('percentualPromotores' => 0.80, 'percentualDetratores' => 0.30)), 60);
    throw new RuntimeException('Componentes inválidos foram aceitos.');
} catch (DomainException $expected) {
}

try {
    NpsCalculator::calculate(array('dados_entrada' => array(
        'totalRespondentesNPS' => 10,
        'quantidadePromotoresNPS' => 7,
        'quantidadeNeutrosNPS' => 2,
        'quantidadeDetratoresNPS' => 2,
    )), 60);
    throw new RuntimeException('Amostra divergente foi aceita.');
} catch (DomainException $expected) {
}

echo "Indicador 02: calculadora backend NPS validada." . PHP_EOL;
