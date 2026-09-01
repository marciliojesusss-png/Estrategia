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

$blocked = false;
try {
    CompetenciaPeriodicidade::assertExpected($trimestral, array('ano' => 2026, 'mes' => 5));
} catch (DomainException $error) {
    $blocked = true;
}
periodicidade_ok($blocked, 'O backend deve rejeitar operação fora do ciclo oficial.');

echo "Testes PHP de periodicidade OK" . PHP_EOL;
