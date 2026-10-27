<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/services/CompetenciaPeriodicidade.php';

function periodicidade_ok($condition, $message)
{
    if (!$condition) throw new RuntimeException($message);
}

$mensal = array('periodicidade' => 'Não especificada');
$trimestral = array('periodicidade' => 'Trimestral');
$semestral = array('periodicidade' => 'Semestral');
$anual = array('periodicidade' => 'Anual');

periodicidade_ok(CompetenciaPeriodicidade::expectedMonths($mensal) === range(1, 12), 'Não especificada deve preservar o comportamento mensal.');
periodicidade_ok(CompetenciaPeriodicidade::expectedMonths($trimestral) === array(3, 6, 9, 12), 'Trimestral deve cobrar fechamentos de trimestre.');
periodicidade_ok(CompetenciaPeriodicidade::expectedMonths($semestral) === array(6, 12), 'Semestral deve cobrar junho e dezembro.');
periodicidade_ok(CompetenciaPeriodicidade::expectedMonths($anual) === array(12), 'Anual deve cobrar dezembro.');
periodicidade_ok(!CompetenciaPeriodicidade::isExpected($trimestral, '2026-04'), 'Abril não é competência trimestral.');
periodicidade_ok(!CompetenciaPeriodicidade::isExpected($trimestral, '2026-05'), 'Maio não é competência trimestral.');
periodicidade_ok(CompetenciaPeriodicidade::isExpected($trimestral, '2026-06'), 'Junho é competência trimestral.');

$ofertasPersonalizadas = array('id' => 1, 'periodicidade' => 'Trimestral');
periodicidade_ok(CompetenciaPeriodicidade::isTrackingAllowed($ofertasPersonalizadas, '2026-01'), 'Indicador 01 deve aceitar acompanhamento mensal.');
periodicidade_ok(!CompetenciaPeriodicidade::isExpected($ofertasPersonalizadas, '2026-01'), 'JAN do Indicador 01 não deve virar fechamento oficial.');
periodicidade_ok(CompetenciaPeriodicidade::isExpected($ofertasPersonalizadas, '2026-03'), 'MAR do Indicador 01 deve ser fechamento oficial.');

$indicador03 = array('id' => 3, 'periodicidade' => 'Mensal', 'permiteAcompanhamentoMensal' => true);
$regra03 = array(
    'exigeEvidencia' => true,
    'exigeEvidenciaNosFechamentos' => true,
    'parametrosCalculo' => array('mesesFechamentoTrimestral' => array(3, 6, 9, 12)),
);
periodicidade_ok(CompetenciaPeriodicidade::closingMonths($indicador03, $regra03) === array(3, 6, 9, 12), 'Indicador 03 deve usar os fechamentos configurados.');
foreach (array(1, 2, 4, 5, 7, 8, 10, 11) as $month) {
    periodicidade_ok(!CompetenciaPeriodicidade::requiresEvidence($indicador03, $regra03, array('ano' => 2026, 'mes' => $month)), 'Mês intermediário não deve exigir evidência.');
}
foreach (array(3, 6, 9, 12) as $month) {
    periodicidade_ok(CompetenciaPeriodicidade::requiresEvidence($indicador03, $regra03, array('ano' => 2026, 'mes' => $month)), 'Fechamento trimestral deve exigir evidência.');
}
periodicidade_ok(CompetenciaPeriodicidade::requiresEvidence($trimestral, array('exigeEvidencia' => true), array('mes' => 4)), 'Regra antiga sem escopo deve manter a exigência integral.');
$regra03Persistida = $regra03;
unset($regra03Persistida['exigeEvidenciaNosFechamentos']);
periodicidade_ok(!CompetenciaPeriodicidade::requiresEvidence($indicador03, $regra03Persistida, array('mes' => 1)), 'Regra persistida anterior do Indicador 03 deve receber o escopo trimestral sem DML.');

$blocked = false;
try {
    CompetenciaPeriodicidade::assertExpected($trimestral, array('ano' => 2026, 'mes' => 5));
} catch (DomainException $error) {
    $blocked = true;
}
periodicidade_ok($blocked, 'O backend deve rejeitar operação fora do ciclo oficial.');

echo "Testes PHP de periodicidade OK" . PHP_EOL;
