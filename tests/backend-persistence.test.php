<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/repositories/LancamentosRepository.php';
require_once __DIR__ . '/../app/repositories/HomologacoesRepository.php';
require_once __DIR__ . '/../app/repositories/AuditoriaRepository.php';
require_once __DIR__ . '/../app/repositories/SolicitacoesReaberturaRepository.php';

function persistence_ok($condition, $message) { if (!$condition) { fwrite(STDERR, 'FALHA: ' . $message . PHP_EOL); exit(1); } }

$db = new PDO('sqlite::memory:');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$db->exec('PRAGMA foreign_keys=ON');
$db->exec('CREATE TABLE indicadores(id TEXT PRIMARY KEY); INSERT INTO indicadores VALUES ("1")');
$db->exec('CREATE TABLE lancamentos(id TEXT PRIMARY KEY,indicador_id TEXT NOT NULL,competencia TEXT,ano INTEGER,mes INTEGER,trimestre TEXT,plano TEXT,pilar TEXT,unidade_apuradora TEXT,diretoria_responsavel TEXT,dados_entrada_json TEXT,resultado_calculado TEXT,resultado_oficial TEXT,meta_referencia TEXT,percentual_atingido TEXT,situacao TEXT,status TEXT,observacao_unidade TEXT,evidencia_id TEXT,usuario_responsavel TEXT,created_at TEXT,updated_at TEXT,FOREIGN KEY(indicador_id) REFERENCES indicadores(id))');
$db->exec('CREATE TABLE homologacoes(id TEXT PRIMARY KEY,lancamento_id TEXT NOT NULL,acao TEXT,status_anterior TEXT,status_novo TEXT,justificativa TEXT,usuario TEXT,perfil_usuario TEXT,data_acao TEXT,created_at TEXT,FOREIGN KEY(lancamento_id) REFERENCES lancamentos(id))');
$db->exec('CREATE TABLE auditoria(id TEXT PRIMARY KEY,entidade TEXT,entidade_id TEXT,acao TEXT,descricao TEXT,dados_anteriores_json TEXT,dados_novos_json TEXT,usuario TEXT,perfil_usuario TEXT,data_acao TEXT,created_at TEXT)');
$db->exec('CREATE TABLE solicitacoes_reabertura(id TEXT PRIMARY KEY,lancamento_id TEXT NOT NULL,indicador_id TEXT,competencia TEXT,solicitante_usuario TEXT,solicitante_perfil TEXT,solicitante_unidade TEXT,tipo_ajuste TEXT,justificativa TEXT,observacao_complementar TEXT,status_solicitacao TEXT,administrador_responsavel TEXT,decisao_administrador TEXT,justificativa_decisao TEXT,data_solicitacao TEXT,data_decisao TEXT,created_at TEXT,updated_at TEXT,FOREIGN KEY(lancamento_id) REFERENCES lancamentos(id))');

$launches = new LancamentosRepository($db);
$snapshot = array(array('id'=>'L1','indicadorId'=>1,'competencia'=>'2026-01','ano'=>2026,'mes'=>1,'trimestre'=>'1TRI/2026','plano'=>'PEI','pilar'=>'Cliente no Centro','unidadeApuradora'=>'SUCOL','diretoriaResponsavel'=>'DICOT','camposEntrada'=>array('valor'=>10),'status'=>'Não iniciado'));
$launches->replaceAll($snapshot);
$snapshot[0]['status'] = 'Em preenchimento';
$launches->replaceAll($snapshot);
persistence_ok($db->query("SELECT status FROM lancamentos WHERE id='L1'")->fetchColumn()==='Em preenchimento', 'snapshot de lancamentos deve inserir e atualizar');

$approvals = new HomologacoesRepository($db);
$approvals->replaceAll(array(array('id'=>'H1','lancamentoId'=>'L1','acao'=>'aprovar','statusAnterior'=>'Enviado para homologação','statusNovo'=>'Homologado','usuario'=>'ADMIN','perfilUsuario'=>'administrador')));
persistence_ok((int)$db->query('SELECT COUNT(*) FROM homologacoes')->fetchColumn()===1, 'snapshot de homologacoes deve persistir');

$audit = new AuditoriaRepository($db);
$audit->replaceAll(array(array('id'=>'A1','entidade'=>'lancamentos','registroId'=>'L1','acao'=>'teste','valorNovo'=>array('ok'=>true))));
$audit->replaceAll(array(array('id'=>'A1','entidade'=>'lancamentos','registroId'=>'L1','acao'=>'atualizado','valorNovo'=>array('ok'=>true))));
persistence_ok($db->query("SELECT acao FROM auditoria WHERE id='A1'")->fetchColumn()==='atualizado', 'auditoria deve fazer upsert portavel');

$reopen = new SolicitacoesReaberturaRepository($db);
$request = array('id'=>'S1','lancamentoId'=>'L1','indicadorId'=>'1','competencia'=>'2026-01','justificativa'=>'Ajuste','statusSolicitacao'=>'Pendente');
$reopen->replaceAll(array($request));$request['statusSolicitacao']='Aprovada';$reopen->replaceAll(array($request));
persistence_ok($db->query("SELECT status_solicitacao FROM solicitacoes_reabertura WHERE id='S1'")->fetchColumn()==='Aprovada', 'reabertura deve fazer upsert portavel');

echo 'Testes de persistencia backend OK' . PHP_EOL;
