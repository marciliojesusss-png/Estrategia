<?php
declare(strict_types=1);

putenv('APP_ENV=local');
putenv('DB_CONNECTION=sqlite');
require_once __DIR__ . '/../app/bootstrap.php';
require_once __DIR__ . '/../app/services/IndicadorConsultaInstitucionalService.php';

function institutional_ok($condition, $message)
{
    if (!$condition) throw new RuntimeException($message);
}

$db = new PDO('sqlite::memory:');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$db->exec('CREATE TABLE configuracoes (chave TEXT PRIMARY KEY, valor_json TEXT, updated_at TEXT)');
$db->exec('CREATE TABLE indicadores (id TEXT PRIMARY KEY, numero INTEGER, nome TEXT, plano TEXT, pilar TEXT, unidade_apuradora TEXT, diretoria_responsavel TEXT, periodicidade TEXT, unidade_medida TEXT, tipo_calculo TEXT, tipo_consolidacao TEXT, meta_anual TEXT, formula_referencia TEXT, observacao_acompanhamento TEXT, ativo INTEGER, created_at TEXT, updated_at TEXT)');
$db->exec('CREATE TABLE lancamentos (id TEXT PRIMARY KEY, indicador_id TEXT, competencia TEXT, ano INTEGER, mes INTEGER, trimestre TEXT, plano TEXT, pilar TEXT, unidade_apuradora TEXT, diretoria_responsavel TEXT, dados_entrada_json TEXT, resultado_calculado TEXT, resultado_oficial TEXT, meta_referencia TEXT, percentual_atingido TEXT, situacao TEXT, status TEXT, observacao_unidade TEXT, referencia_evidencia TEXT, evidencia_id TEXT, usuario_responsavel TEXT, created_at TEXT, updated_at TEXT)');
$db->exec("INSERT INTO configuracoes VALUES ('regrasIndicadores','[{\"indicadorId\":12,\"tipoCalculo\":\"nota_pesquisa_anual\"}]','')");
$db->exec("INSERT INTO indicadores VALUES ('6',6,'IEO','PN','P','SUCTF','DIFIR','Mensal','percentual','indice_inverso','media','','','',1,'',''), ('12',12,'Clima Organizacional','PN','P','SURCI','DILOT','Anual','pontos','nota_pesquisa_anual','ultima_posicao','','','',1,'','')");
$db->exec("INSERT INTO lancamentos VALUES ('H12','12','2026-03',2026,3,'1TRI/2026','PN','P','SURCI','DILOT','{\"notaClimaApurada\":60,\"evidenciaClima\":\"arquivo-interno.pdf\"}','60','60','60','1','Em acompanhamento','Homologado','Posicao oficial','MEMO-12','EV-12','SURCI-USER','',''), ('R12','12','2026-04',2026,4,'2TRI/2026','PN','P','SURCI','DILOT','{\"notaClimaApurada\":61}','61',NULL,'60','1.016','Atingido','Rascunho','Ainda em preenchimento',NULL,NULL,'SURCI-USER','','')");

$service = new IndicadorConsultaInstitucionalService($db);
$difir = array('perfil' => 'homologador', 'diretoria_responsavel' => 'DIFIR');
$institutional = $service->detalhe(12, $difir);

institutional_ok($institutional['consulta']['somenteLeitura'] === true, 'DIFIR deve consultar DILOT somente em leitura.');
institutional_ok($institutional['consulta']['dentroEscopoOperacional'] === false, 'DILOT nao pertence ao escopo operacional DIFIR.');
institutional_ok(count($institutional['lancamentos']) === 1, 'Consulta institucional deve retornar apenas posicoes homologadas.');
institutional_ok($institutional['lancamentos'][0]['status'] === 'Homologado', 'Rascunho de outra diretoria nao pode ser exposto.');
institutional_ok($institutional['lancamentos'][0]['evidenciasRestritas'] === true, 'Existencia de evidencia deve ser sinalizada sem liberar documento.');
institutional_ok(!isset($institutional['lancamentos'][0]['evidenciaId']), 'ID da evidencia deve ser removido.');
institutional_ok(!isset($institutional['lancamentos'][0]['camposEntrada']['evidenciaClima']), 'Referencia documental interna deve ser removida.');

$dilot = array('perfil' => 'homologador', 'diretoria_responsavel' => 'DILOT');
$own = $service->detalhe(12, $dilot);
institutional_ok($own['consulta']['somenteLeitura'] === false, 'Indicador proprio deve manter o detalhe operacional normal.');
institutional_ok(count($own['lancamentos']) === 2, 'Escopo proprio deve manter as posicoes operacionais existentes.');

$admin = $service->detalhe(12, array('perfil' => 'administrador'));
institutional_ok($admin['consulta']['somenteLeitura'] === false, 'Administrador deve manter suas permissoes atuais.');

$unit = $service->detalhe(12, array('perfil' => 'unidade_apuradora', 'unidade_apuradora' => 'SUCTF'));
institutional_ok($unit['consulta']['somenteLeitura'] === true, 'Unidade de outro escopo deve receber somente consulta institucional.');

$companyUser = $service->detalhe(12, array('perfil' => 'usuario_companhia'));
institutional_ok($companyUser['consulta']['somenteLeitura'] === true, 'Usuario Companhia deve permanecer em consulta institucional.');

institutional_ok(!AccessPolicy::scopeAllows($difir, $institutional['indicador']), 'A consulta institucional nao pode ampliar o escopo operacional.');
institutional_ok(!AccessPolicy::allows('homologador', 'lancamentos', 'gerenciar'), 'Homologador continua sem permissao de lancamento.');

echo "Testes do detalhe institucional do indicador OK" . PHP_EOL;
