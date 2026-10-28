<?php
declare(strict_types=1);

putenv('APP_ENV=local');
putenv('DB_CONNECTION=sqlsrv');
require_once __DIR__ . '/../app/bootstrap.php';
require_once __DIR__ . '/../app/core/Database.php';
require_once __DIR__ . '/../app/services/RelatorioConsolidadoService.php';

function relatorio_integracao_ok($condition, $message)
{
    if (!$condition) throw new RuntimeException('FALHA: ' . $message);
}

function relatorio_integracao_row(array $payload, $indicatorId)
{
    foreach ($payload['linhas'] as $row) {
        if ((string) $row['indicadorId'] === (string) $indicatorId) return $row;
    }
    throw new RuntimeException('Indicador ausente: ' . $indicatorId);
}

$service = new RelatorioConsolidadoService(Database::getConnection());
$administrator = array(
    'perfil' => 'administrador', 'perfil_original' => 'administrador',
    'nome' => 'Administrador', 'matricula' => 'C118119',
    'unidade_apuradora' => '', 'diretoria_responsavel' => '',
);
$march = $service->gerar(array(
    'ano' => '2026', 'posicao' => 'competencia', 'competencia' => '2026-03',
), $administrator);

relatorio_integracao_ok($march['total'] === 23, 'administrador deve receber os 23 indicadores');
$indicator03 = relatorio_integracao_row($march, 3);
relatorio_integracao_ok((string) $indicator03['lancamentoId'] === '27', 'MAR do indicador 03 deve usar o lancamento 27');
relatorio_integracao_ok($indicator03['versao'] === 2, 'lancamento 27 deve usar a versao 2');
relatorio_integracao_ok(abs($indicator03['resultadoOficial'] - 0.7441) < 1e-12, 'resultado oficial de MAR deve ser 74,41%');
relatorio_integracao_ok(abs($indicator03['atingimento'] - 2.6573) < 1e-12, 'atingimento oficial de MAR deve ser 265,73%');
relatorio_integracao_ok($indicator03['situacao'] === 'Atingido', 'situacao de MAR deve ser Atingido');
relatorio_integracao_ok($indicator03['governanca'] === 'Homologado - versao atual', 'governanca atual do lancamento 27 ausente');
relatorio_integracao_ok($indicator03['dataHomologacao'] === '2026-10-28T16:02:29-03:00', 'data da homologacao do lancamento 27 divergente');
relatorio_integracao_ok($indicator03['homologador'] === 'C118119', 'homologador do lancamento 27 divergente');
relatorio_integracao_ok(strpos((string) $indicator03['fonteDocumental'], '0029/2026') !== false, 'fonte documental do lancamento 27 ausente');

$encoded = json_encode($march, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
foreach (array('camposEntrada', 'dados_entrada_json', 'auditoria', 'snapshot', 'ip', 'sha256') as $forbidden) {
    relatorio_integracao_ok(stripos($encoded, '"' . $forbidden . '"' . ':') === false, 'payload minimo expos campo proibido: ' . $forbidden);
}

$unitPayload = $service->gerar(array(
    'ano' => '2026', 'posicao' => 'ultima', 'unidade' => 'GENOL',
), array(
    'perfil' => 'unidade_apuradora', 'perfil_original' => 'unidade_apuradora',
    'unidade_apuradora' => 'SUCOL', 'diretoria_responsavel' => '',
    'nome' => 'Unidade SUCOL', 'matricula' => 'UNIDADE-SUCOL',
));
relatorio_integracao_ok($unitPayload['total'] === 0, 'filtro de outra unidade deve restringir, nunca ampliar o escopo SUCOL');
relatorio_integracao_ok($unitPayload['escopo'] === 'Unidade SUCOL', 'descricao do escopo de unidade incorreta');

$simulatedAdministrator = $service->gerar(array(
    'ano' => '2026', 'posicao' => 'ultima', 'diretoria' => 'DILOT',
), array(
    'perfil' => 'homologador', 'perfil_original' => 'administrador',
    'unidade_apuradora' => '', 'diretoria_responsavel' => 'DICOT',
    'nome' => 'Administrador', 'matricula' => 'C118119',
));
relatorio_integracao_ok($simulatedAdministrator['total'] === 0, 'administrador simulado nao pode ampliar DICOT para DILOT');
relatorio_integracao_ok($simulatedAdministrator['escopo'] === 'Diretoria DICOT', 'visao simulada deve declarar o escopo ativo');

echo 'Relatorio consolidado: SQL Server somente leitura, 23 indicadores, lancamento 27 e escopos validados.' . PHP_EOL;
