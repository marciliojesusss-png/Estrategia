<?php
declare(strict_types=1);

putenv('APP_ENV=local');
putenv('DB_CONNECTION=sqlsrv');
require_once __DIR__ . '/../app/bootstrap.php';
require_once __DIR__ . '/../app/core/Database.php';
require_once __DIR__ . '/../app/services/RelatorioIndicadorService.php';

function detalhe_integracao_ok($condition, $message)
{
    if (!$condition) throw new RuntimeException('FALHA: ' . $message);
}

function detalhe_integracao_mes(array $payload, $month)
{
    foreach ($payload['trajetoria'] as $row) if ((int) $row['mes'] === (int) $month) return $row;
    throw new RuntimeException('Mes ausente: ' . $month);
}

$service = new RelatorioIndicadorService(Database::getConnection());
$administrator = array(
    'perfil' => 'administrador', 'perfil_original' => 'administrador',
    'nome' => 'Administrador', 'matricula' => 'C118119',
    'unidade_apuradora' => '', 'diretoria_responsavel' => '',
);
$indicator03 = $service->gerar(3, array('ano' => '2026'), $administrator);
$march = detalhe_integracao_mes($indicator03, 3);
detalhe_integracao_ok(count($indicator03['trajetoria']) === 12, 'Indicador 03 deve conter JAN a DEZ');
detalhe_integracao_ok($march['versao'] === 2, 'MAR do Indicador 03 deve usar a versao vigente 2');
detalhe_integracao_ok(abs($march['resultado'] - 0.7441) < 1e-12, 'MAR deve apresentar 74,41%');
detalhe_integracao_ok(abs($march['atingimento'] - 2.6573) < 1e-12, 'MAR deve apresentar 265,73%');
detalhe_integracao_ok($march['situacao'] === 'Atingido', 'MAR deve estar Atingido');
detalhe_integracao_ok($march['governanca'] === 'Homologado - versao atual', 'MAR deve ter homologacao vigente');
detalhe_integracao_ok($march['homologadoEm'] === '2026-10-28T16:02:29-03:00', 'data de homologacao de MAR divergente');
detalhe_integracao_ok($march['homologadoPor'] === 'C118119', 'homologador de MAR divergente');
detalhe_integracao_ok(count($indicator03['evidencias']['versaoAtual']) >= 1, 'evidencia da versao 2 ausente');
detalhe_integracao_ok(count($indicator03['evidencias']['versoesAnteriores']) >= 1, 'evidencia historica da versao 1 ausente');
detalhe_integracao_ok(count(array_filter($indicator03['historicoVersoes'], function ($row) { return (int) $row['versao'] === 1; })) >= 1, 'versao 1 deve aparecer somente no historico');

$indicator22 = $service->gerar(22, array('ano' => '2026'), $administrator);
detalhe_integracao_ok(count($indicator22['fechamentosTrimestrais']) === 4, 'Indicador 22 deve conter os quatro fechamentos');
$observations22 = array_values(array_filter($indicator22['observacoesOficiais'], function ($item) {
    return in_array($item['competencia'], array('2026-03', '2026-06', '2026-09'), true);
}));
detalhe_integracao_ok(count($observations22) === 3, 'Indicador 22 deve preservar observacoes de 1TRI, 2TRI e 3TRI');
detalhe_integracao_ok(count(array_unique(array_column($observations22, 'observacao'))) === 3, 'observacoes temporais do Indicador 22 devem permanecer distintas');

$indicator07 = $service->gerar(7, array('ano' => '2026'), $administrator);
$expected07 = array(
    1 => array(89555555.56, 119377680.03, 1.333001389847),
    2 => array(89555555.55, 102633750.55, 1.146034435493),
    3 => array(89555555.56, 114310457.11, 1.276419496202),
);
foreach ($expected07 as $month => $expected) {
    $row = detalhe_integracao_mes($indicator07, $month);
    detalhe_integracao_ok(abs($row['meta'] - $expected[0]) < 0.005, 'meta mensal do Indicador 07 divergente');
    detalhe_integracao_ok(abs($row['resultado'] - $expected[1]) < 0.005, 'resultado mensal do Indicador 07 divergente');
    detalhe_integracao_ok(abs($row['atingimento'] - $expected[2]) < 0.000000000001, 'atingimento do Indicador 07 divergente');
    detalhe_integracao_ok($row['situacao'] === 'Atingido', 'situacao do Indicador 07 deve ser Atingido');
}
$quarter07 = $indicator07['fechamentosTrimestrais'][0];
detalhe_integracao_ok(abs($quarter07['meta'] - 268666666.67) < 0.005, 'meta acumulada do 1TRI do Indicador 07 divergente');
detalhe_integracao_ok(abs($quarter07['resultado'] - 336321887.69) < 0.005, 'resultado acumulado do 1TRI do Indicador 07 divergente');
detalhe_integracao_ok(abs($quarter07['atingimento'] - (336321887.69 / 268666666.67)) < 0.000000000001, 'atingimento acumulado do 1TRI do Indicador 07 divergente');
detalhe_integracao_ok($quarter07['situacao'] === 'Atingido', 'situacao acumulada do 1TRI do Indicador 07 deve ser Atingido');

$indicator05 = $service->gerar(5, array('ano' => '2026'), $administrator);
$january05 = detalhe_integracao_mes($indicator05, 1);
detalhe_integracao_ok(abs($january05['meta'] - 1056593039.00) < 0.005, 'meta de JAN do Indicador 05 divergente');
detalhe_integracao_ok(abs($january05['resultado'] - 1131557094.81) < 0.005, 'resultado de JAN do Indicador 05 perdeu precisao');
detalhe_integracao_ok(abs($january05['atingimento'] - 1.070948845055) < 0.000000000001, 'atingimento de JAN do Indicador 05 perdeu precisao');
detalhe_integracao_ok($january05['situacao'] === 'Atingido', 'situacao de JAN do Indicador 05 deve ser Atingido');

foreach (array(
    array(array('perfil' => 'unidade_apuradora', 'perfil_original' => 'unidade_apuradora', 'unidade_apuradora' => 'GENOL', 'diretoria_responsavel' => ''), 3),
    array(array('perfil' => 'homologador', 'perfil_original' => 'homologador', 'unidade_apuradora' => '', 'diretoria_responsavel' => 'DILOT'), 3),
    array(array('perfil' => 'consultor_diretoria', 'perfil_original' => 'consultor_diretoria', 'unidade_apuradora' => '', 'diretoria_responsavel' => 'DILOT'), 3),
    array(array('perfil' => 'homologador', 'perfil_original' => 'administrador', 'unidade_apuradora' => '', 'diretoria_responsavel' => 'DILOT'), 3),
) as $case) {
    try {
        $service->gerar($case[1], array('ano' => '2026'), $case[0]);
        throw new RuntimeException('FALHA: IDOR permitiu indicador fora do escopo');
    } catch (UnexpectedValueException $expected) {
    }
}

$unitAllowed = $service->gerar(3, array('ano' => '2026'), array(
    'perfil' => 'unidade_apuradora', 'perfil_original' => 'unidade_apuradora',
    'unidade_apuradora' => 'SUCOL', 'diretoria_responsavel' => '', 'nome' => 'SUCOL', 'matricula' => 'UNIDADE-SUCOL',
));
detalhe_integracao_ok((int) $unitAllowed['indicador']['codigo'] === 3, 'unidade propria deve consultar o Indicador 03');

$encoded = json_encode(array($indicator03, $indicator05, $indicator07, $indicator22), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
foreach (array('caminho_arquivo', 'versao_anterior_json', 'dados_entrada_json', 'sha256Observacao', 'sha256DocumentoDeclarado', 'sha256ArquivoFisico', 'snapshot', 'ip') as $forbidden) {
    detalhe_integracao_ok(stripos($encoded, '"' . $forbidden . '"' . ':') === false, 'payload detalhado expos campo tecnico proibido: ' . $forbidden);
}

echo 'Relatorio detalhado: SQL Server somente leitura, Indicadores 03/22, evidencias, versoes e IDOR validados.' . PHP_EOL;
