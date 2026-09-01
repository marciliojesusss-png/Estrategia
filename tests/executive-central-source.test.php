<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/services/ResumoExecutivoDadosService.php';

function central_ok($condition, $message)
{
    if (!$condition) throw new RuntimeException($message);
}

$db = new PDO('sqlite::memory:');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$db->exec('CREATE TABLE configuracoes (chave TEXT PRIMARY KEY, valor_json TEXT, updated_at TEXT)');
$db->exec('CREATE TABLE indicadores (id TEXT PRIMARY KEY, numero INTEGER, nome TEXT, plano TEXT, pilar TEXT, unidade_apuradora TEXT, diretoria_responsavel TEXT, periodicidade TEXT, unidade_medida TEXT, tipo_calculo TEXT, tipo_consolidacao TEXT, meta_anual TEXT, formula_referencia TEXT, observacao_acompanhamento TEXT, ativo INTEGER, created_at TEXT, updated_at TEXT)');
$db->exec('CREATE TABLE lancamentos (id TEXT PRIMARY KEY, indicador_id TEXT, competencia TEXT, ano INTEGER, mes INTEGER, trimestre TEXT, plano TEXT, pilar TEXT, unidade_apuradora TEXT, diretoria_responsavel TEXT, dados_entrada_json TEXT, resultado_calculado TEXT, resultado_oficial TEXT, meta_referencia TEXT, percentual_atingido TEXT, situacao TEXT, status TEXT, observacao_unidade TEXT, referencia_evidencia TEXT, evidencia_id TEXT, usuario_responsavel TEXT, created_at TEXT, updated_at TEXT)');
$db->exec('CREATE TABLE prazos_apuracao (id INTEGER PRIMARY KEY, competencia TEXT, data_limite_preenchimento TEXT, data_limite_homologacao TEXT, ativo INTEGER, created_at TEXT, updated_at TEXT)');
$db->exec("INSERT INTO configuracoes VALUES ('regrasIndicadores','[]',''), ('frequenciasCobrancaOperacional','[{\"indicadorId\":2,\"frequenciaCobrancaOperacional\":\"trimestral\"}]','')");
$db->exec("INSERT INTO indicadores VALUES ('1',1,'Mensal','PEI','P','U','D','Anual','unidade','formula_anual','consolidacao_anual','','','',1,'',''), ('2',2,'Trimestral','PEI','P','U','D','Mensal','unidade','formula_mensal','consolidacao_mensal','','','',1,'','')");
$db->exec("INSERT INTO lancamentos VALUES ('L1','1','2026-05',2026,5,'2TRI/2026','PEI','P','U','D','{}',NULL,NULL,NULL,NULL,NULL,'Não iniciado',NULL,NULL,NULL,NULL,'',''), ('L2','2','2026-05',2026,5,'2TRI/2026','PEI','P','U','D','{}',NULL,NULL,NULL,NULL,NULL,'Não iniciado',NULL,NULL,NULL,NULL,'','')");
$db->exec("INSERT INTO prazos_apuracao VALUES (1,'2026-05','2026-05-05','2026-05-11',1,'','')");

$data = (new ResumoExecutivoDadosService($db))->dados();
$frequencies = array();
foreach ($data['frequenciasCobrancaOperacional'] as $item) {
    $frequencies[(int) $item['indicadorId']] = $item['frequenciaCobrancaOperacional'];
}

central_ok(count($data['indicadores']) === 2, 'Indicadores devem vir da fonte central.');
central_ok(count($data['lancamentos']) === 2, 'Lançamentos devem vir da fonte central.');
central_ok(is_int($data['lancamentos'][0]['indicadorId']), 'O contrato central deve normalizar indicadorId como inteiro.');
central_ok($data['lancamentos'][0]['indicadorId'] === $data['indicadores'][0]['id'], 'Indicador e lançamento devem usar o mesmo tipo de ID.');
central_ok(count($data['prazos']) === 1, 'Prazos devem vir da fonte central.');
central_ok($frequencies[1] === 'mensal', 'Ausência de configuração deve usar o padrão operacional mensal.');
central_ok($frequencies[2] === 'trimestral', 'Configuração operacional explícita deve prevalecer.');
central_ok($data['indicadores'][0]['periodicidade'] === 'Anual', 'Periodicidade de desempenho não deve ser alterada.');

echo "Teste da fonte central e frequência operacional OK" . PHP_EOL;
