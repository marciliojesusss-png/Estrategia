<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/services/CalculoIndicadoresService.php';

function backend_calc_ok($condition, $message) {
    if (!$condition) throw new RuntimeException($message);
}

$service = new CalculoIndicadoresService();
$rule7 = array('tipoCalculo'=>'lucro_recorrente_mensal','parametrosCalculo'=>array(
    'metasMensaisPorCompetencia'=>array('2026-01'=>100.0,'2026-02'=>100.0)
));
$january = array('id'=>'j','indicadorId'=>7,'ano'=>2026,'mes'=>1,'competencia'=>'2026-01',
    'camposEntrada'=>array('lucroLiquidoRecorrenteAcumulado'=>130.0),
    'metaReferencia'=>100.0,'resultadoMensal'=>130.0,'resultadoOficialAnual'=>130.0,
    'percentualAtingido'=>1.3,'situacaoCalculada'=>'Atingido');
$february = array('id'=>'f','indicadorId'=>7,'ano'=>2026,'mes'=>2,'competencia'=>'2026-02',
    'camposEntrada'=>array('lucroLiquidoRecorrenteAcumulado'=>250.0),
    'metaReferencia'=>100.0,'resultadoMensal'=>120.0,'resultadoOficialAnual'=>120.0,
    'percentualAtingido'=>1.2,'situacaoCalculada'=>'Atingido');
$valid = $service->validar(array('id'=>7,'tipoCalculo'=>'lucro_recorrente_mensal'),$rule7,$february,array($january,$february));
backend_calc_ok($valid['valido'] === true, 'Lucro mensal correto foi rejeitado.');
$february['resultadoMensal'] = 250.0;
$invalid = $service->validar(array('id'=>7,'tipoCalculo'=>'lucro_recorrente_mensal'),$rule7,$february,array($january,$february));
backend_calc_ok($invalid['valido'] === false, 'Lucro acumulado divergente foi aceito.');
backend_calc_ok(in_array('resultado_calculado',array_column($invalid['divergencias'],'campo'),true),'Divergencia do resultado nao identificada.');

$rule20 = array('tipoCalculo'=>'execucao_acoes_propostas','parametrosCalculo'=>array(
    'totalAcoesPropostas'=>2,'statusQueConta'=>'Publicada/realizada','campoAcao'=>'acao','campoStatus'=>'status',
    'curvaTrimestralAcumulada'=>array('2TRI/2026'=>array('metaAcoesRealizadasAcumuladas'=>1))
));
$launch20 = array('id'=>'20','indicadorId'=>20,'ano'=>2026,'mes'=>6,'competencia'=>'2026-06','trimestre'=>'2TRI/2026',
    'camposEntrada'=>array('acao'=>'relatorio','status'=>'Publicada/realizada'),
    'metaReferencia'=>0.5,'resultadoMensal'=>0.5,'resultadoOficialAnual'=>0.5,
    'percentualAtingido'=>1.0,'situacaoCalculada'=>'Atingido');
$valid20 = $service->validar(array('id'=>20,'tipoCalculo'=>'execucao_acoes_propostas'),$rule20,$launch20,array($launch20));
backend_calc_ok($valid20['valido'] === true, 'Indicador 20 correto foi rejeitado.');

echo "calculo-indicadores-backend.test.php: ok\n";
