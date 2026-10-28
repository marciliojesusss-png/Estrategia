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

$encoded = json_encode(array($indicator03, $indicator22), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
foreach (array('caminho_arquivo', 'versao_anterior_json', 'dados_entrada_json', 'sha256Observacao', 'sha256DocumentoDeclarado', 'sha256ArquivoFisico', 'snapshot', 'ip') as $forbidden) {
    detalhe_integracao_ok(stripos($encoded, '"' . $forbidden . '"' . ':') === false, 'payload detalhado expos campo tecnico proibido: ' . $forbidden);
}

echo 'Relatorio detalhado: SQL Server somente leitura, Indicadores 03/22, evidencias, versoes e IDOR validados.' . PHP_EOL;
