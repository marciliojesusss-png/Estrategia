<?php
declare(strict_types=1);

putenv('APP_ENV=local');
putenv('DB_CONNECTION=sqlsrv');
require_once __DIR__ . '/../app/bootstrap.php';
require_once __DIR__ . '/../app/core/Database.php';
require_once __DIR__ . '/../app/services/RelatorioGovernancaService.php';

function governanca_integracao_ok($condition, $message)
{
    if (!$condition) throw new RuntimeException('FALHA: ' . $message);
}

function governanca_tipos(array $payload)
{
    return array_values(array_unique(array_column($payload['eventos'], 'tipo')));
}

$service = new RelatorioGovernancaService(Database::getConnection());
$admin = array(
    'perfil' => 'administrador', 'perfil_original' => 'administrador',
    'nome' => 'Administrador', 'matricula' => 'C118119',
);

$initial = $service->gerar(array('ano' => '2026', 'inicial' => '1'), $admin);
governanca_integracao_ok($initial['consultaExecutada'] === false && count($initial['eventos']) === 0, 'carga inicial nao pode consultar historico completo');
governanca_integracao_ok(count($initial['opcoes']['indicadores']) === 23, 'opcoes devem conter os 23 indicadores');

$launch27 = $service->gerar(array('ano' => '2026', 'indicador' => '3', 'competencia' => '2026-03'), $admin);
governanca_integracao_ok(count($launch27['posicoesAtuais']) === 1, 'posicao atual do lancamento 27 ausente');
$current27 = $launch27['posicoesAtuais'][0];
governanca_integracao_ok((string) $current27['lancamentoId'] === '27', 'lancamento 27 divergente');
governanca_integracao_ok($current27['versao'] === 2 && $current27['status'] === 'Homologado', 'versao/status vigente do lancamento 27 divergente');
governanca_integracao_ok(abs($current27['resultado'] - 0.7441) < 1e-12 && abs($current27['atingimento'] - 2.6573) < 1e-12, 'resultado vigente do lancamento 27 divergente');
$types27 = governanca_tipos($launch27);
foreach (array('submissao', 'homologacao', 'homologacao_legada', 'reabertura', 'retificacao', 'evidencia_anexada', 'observacao_documental') as $type) {
    governanca_integracao_ok(in_array($type, $types27, true), 'evento real do lancamento 27 ausente: ' . $type);
}
governanca_integracao_ok(count(array_filter($launch27['evidencias'], function ($row) { return (int) $row['versao'] === 1; })) >= 1, 'evidencia v1 do lancamento 27 ausente');
governanca_integracao_ok(count(array_filter($launch27['evidencias'], function ($row) { return (int) $row['versao'] === 2; })) >= 1, 'evidencia v2 do lancamento 27 ausente');
governanca_integracao_ok(count($launch27['observacoesDocumentais']) >= 1, 'observacao documental do lancamento 27 ausente');
governanca_integracao_ok($launch27['paginacao']['porPagina'] === 50, 'paginacao deve usar 50 eventos por pagina');
for ($index = 1; $index < count($launch27['eventos']); $index++) {
    governanca_integracao_ok(strtotime($launch27['eventos'][$index - 1]['dataHora']) <= strtotime($launch27['eventos'][$index]['dataHora']), 'ordem cronologica crescente divergente');
}
$launch27Descending = $service->gerar(array('ano' => '2026', 'indicador' => '3', 'competencia' => '2026-03', 'ordem' => 'desc'), $admin);
for ($index = 1; $index < count($launch27Descending['eventos']); $index++) {
    governanca_integracao_ok(strtotime($launch27Descending['eventos'][$index - 1]['dataHora']) >= strtotime($launch27Descending['eventos'][$index]['dataHora']), 'ordem cronologica decrescente divergente');
}

$launch152 = $service->gerar(array('ano' => '2026', 'indicador' => '13', 'competencia' => '2026-08'), $admin);
governanca_integracao_ok(count($launch152['posicoesAtuais']) === 1, 'posicao atual do lancamento 152 ausente');
$current152 = $launch152['posicoesAtuais'][0];
governanca_integracao_ok((string) $current152['lancamentoId'] === '152', 'lancamento 152 divergente');
governanca_integracao_ok($current152['versao'] === 2 && $current152['status'] === 'Retificado', 'versao/status vigente do lancamento 152 divergente');
$types152 = governanca_tipos($launch152);
foreach (array('submissao', 'homologacao', 'reabertura', 'retificacao', 'evidencia_anexada') as $type) {
    governanca_integracao_ok(in_array($type, $types152, true), 'evento real do lancamento 152 ausente: ' . $type);
}

$withoutEvents = $service->gerar(array('ano' => '2026', 'indicador' => '3', 'usuario' => 'USUARIO-INEXISTENTE-XYZ'), $admin);
governanca_integracao_ok($withoutEvents['consultaExecutada'] === true && count($withoutEvents['eventos']) === 0, 'consulta sem eventos deve retornar colecao vazia');
governanca_integracao_ok($withoutEvents['paginacao']['total'] === 0, 'paginacao da consulta sem eventos deve ser zero');

foreach (array(
    array('perfil' => 'unidade_apuradora', 'perfil_original' => 'administrador'),
    array('perfil' => 'homologador', 'perfil_original' => 'administrador'),
    array('perfil' => 'homologador', 'perfil_original' => 'homologador'),
    array('perfil' => 'consultor_diretoria', 'perfil_original' => 'consultor_diretoria'),
    array('perfil' => 'unidade_apuradora', 'perfil_original' => 'unidade_apuradora'),
    array('perfil' => 'usuario_companhia', 'perfil_original' => 'usuario_companhia'),
) as $denied) {
    try {
        $service->gerar(array('ano' => '2026', 'indicador' => '3'), $denied);
        throw new RuntimeException('FALHA: acesso indevido ao relatorio de governanca');
    } catch (UnexpectedValueException $expected) {
    }
}

$encoded = json_encode(array($launch27, $launch152), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
foreach (array('dados_anteriores_json', 'dados_novos_json', 'versao_anterior_json', 'versao_nova_json', 'caminho_arquivo', 'hash_arquivo', 'ip', 'sql') as $forbidden) {
    governanca_integracao_ok(stripos($encoded, '"' . $forbidden . '":') === false, 'payload expos dado tecnico proibido: ' . $forbidden);
}

echo 'Relatorio de governanca: SQL Server somente leitura, lancamentos 27/152, autorizacao e payload minimo validados.' . PHP_EOL;
