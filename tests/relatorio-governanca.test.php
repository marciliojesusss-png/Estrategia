<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/services/RelatorioGovernancaService.php';

function governanca_relatorio_ok($condition, $message)
{
    if (!$condition) throw new RuntimeException('FALHA: ' . $message);
}

$allowed = array('perfil' => 'administrador', 'perfil_original' => 'administrador');
governanca_relatorio_ok(RelatorioGovernancaService::usuarioAutorizado($allowed), 'administrador ativo deve ser autorizado');
foreach (array(
    array('perfil' => 'unidade_apuradora', 'perfil_original' => 'administrador'),
    array('perfil' => 'homologador', 'perfil_original' => 'administrador'),
    array('perfil' => 'homologador', 'perfil_original' => 'homologador'),
    array('perfil' => 'consultor_diretoria', 'perfil_original' => 'consultor_diretoria'),
    array('perfil' => 'unidade_apuradora', 'perfil_original' => 'unidade_apuradora'),
    array('perfil' => 'usuario_companhia', 'perfil_original' => 'usuario_companhia'),
) as $denied) governanca_relatorio_ok(!RelatorioGovernancaService::usuarioAutorizado($denied), 'perfil indevido foi autorizado');

$filters = RelatorioGovernancaService::normalizarFiltros(array(
    'ano' => '2026', 'indicador' => '3', 'competencia' => '2026-03', 'trimestre' => '1',
    'evento' => 'homologacao', 'versao' => '2', 'pagina' => '2', 'ordem' => 'desc',
));
governanca_relatorio_ok($filters['ano'] === 2026 && $filters['pagina'] === 2 && $filters['ordem'] === 'desc', 'filtros validos foram alterados');
foreach (array(array('desconhecido' => '1'), array('competencia' => '03/2026'), array('evento' => 'inventado'), array('versao' => '0')) as $invalid) {
    try {
        RelatorioGovernancaService::normalizarFiltros($invalid);
        throw new RuntimeException('FALHA: parametro invalido foi aceito');
    } catch (InvalidArgumentException $expected) {
    }
}

function fixture_event($action, $date, $before, $after)
{
    return array(
        'id' => uniqid('a', true), 'lancamento_id' => 27, 'indicador_id' => 3, 'numero' => 3,
        'indicador_nome' => 'Indice de Clientes Ativos em Canais Digitais', 'competencia' => '2026-03',
        'unidade_apuradora' => 'SUCOL', 'diretoria_responsavel' => 'DICOT', 'acao' => $action,
        'descricao' => '<script>alert(1)</script>', 'usuario' => 'C118119', 'perfil_usuario' => 'Administrador',
        'data_acao' => $date, 'dados_anteriores_json' => json_encode($before), 'dados_novos_json' => json_encode($after),
    );
}

$audits = array(
    fixture_event('salvar_rascunho', '2026-06-01T09:00:00-03:00', array('status' => 'Nao iniciado'), array('status' => 'Em preenchimento', 'versaoAtual' => 1)),
    fixture_event('homologacao_lancamento', '2026-06-03T09:00:00-03:00', array('status' => 'Enviado para homologacao'), array('status' => 'Homologado', 'versaoAtual' => 1)),
    fixture_event('submissao_homologacao', '2026-10-27T07:52:31-03:00', array('status' => 'Retificado'), array('status' => 'Enviado para homologacao', 'versaoAtual' => 2)),
    fixture_event('homologacao_lancamento', '2026-10-28T16:02:29-03:00', array('status' => 'Enviado para homologacao'), array('status' => 'Homologado', 'versaoAtual' => 2)),
    fixture_event('alteracao_lancamento', '2026-10-26T12:00:00-03:00', array('versaoAtual' => 1, 'resultadoOficialAnual' => 0.7), array('versaoAtual' => 2, 'resultadoOficialAnual' => 0.7441)),
);
$homologations = array(
    array_merge($audits[2], array('status_anterior' => 'Retificado', 'status_novo' => 'Enviado para homologacao', 'justificativa' => null)),
    array_merge($audits[3], array('status_anterior' => 'Enviado para homologacao', 'status_novo' => 'Homologado', 'justificativa' => 'Aprovado')),
);
$retifications = array(array_merge($audits[4], array(
    'versao_anterior' => 1, 'versao_nova' => 2, 'justificativa' => 'Retificacao real',
    'data_retificacao' => '2026-10-26T12:00:00-03:00', 'versao_anterior_json' => json_encode(array('versaoAtual' => 1, 'resultadoOficialAnual' => 0.7)),
    'versao_nova_json' => json_encode(array('versaoAtual' => 2, 'resultadoOficialAnual' => 0.7441)),
)));
$reopenings = array(array(
    'id' => 'r1', 'lancamento_id' => 27, 'indicador_id' => 3, 'numero' => 3, 'indicador_nome' => 'Indice de Clientes Ativos em Canais Digitais',
    'competencia' => '2026-03', 'unidade_apuradora' => 'SUCOL', 'diretoria_responsavel' => 'DICOT',
    'solicitante_usuario' => 'C118119', 'solicitante_perfil' => 'Administrador', 'tipo_ajuste' => 'Retificacao',
    'justificativa' => 'Corrigir fonte', 'status_solicitacao' => 'Aprovada', 'administrador_responsavel' => 'C118119',
    'decisao_administrador' => 'Aprovada', 'justificativa_decisao' => 'Autorizada',
    'data_solicitacao' => '2026-10-26T10:00:00-03:00', 'data_decisao' => '2026-10-26T10:05:00-03:00',
));
$evidence = array(array(
    'id' => 'e2', 'lancamento_id' => 27, 'indicador_id' => 3, 'numero' => 3, 'indicador_nome' => 'Indice de Clientes Ativos em Canais Digitais',
    'competencia' => '2026-03', 'unidade_apuradora' => 'SUCOL', 'diretoria_responsavel' => 'DICOT', 'versao_lancamento' => 2,
    'nome_arquivo' => 'Informe <0029>.pdf', 'descricao' => 'Documento oficial', 'data_upload' => '2026-10-27T07:00:00-03:00', 'usuario' => 'C118119',
));
$documents = array(array(
    'id' => 'd1', 'lancamento_id' => 27, 'indicador_id' => 3, 'numero' => 3, 'indicador_nome' => 'Indice de Clientes Ativos em Canais Digitais',
    'competencia' => '2026-03', 'unidade_apuradora' => 'SUCOL', 'diretoria_responsavel' => 'DICOT', 'versao_lancamento' => 2,
    'fonte_documental' => 'Informe 0029/2026', 'origem_registro' => 'migration.sql', 'criado_em' => '2026-10-27T06:00:00-03:00',
));

$events = RelatorioGovernancaService::normalizeEvents($audits, $homologations, $retifications, $reopenings, $evidence, $documents);
$types = array_column($events, 'tipo');
foreach (array('salvamento', 'homologacao_legada', 'submissao', 'homologacao', 'retificacao', 'solicitacao_reabertura', 'decisao_reabertura', 'evidencia_anexada', 'observacao_documental') as $type) {
    governanca_relatorio_ok(in_array($type, $types, true), 'evento normalizado ausente: ' . $type);
}
governanca_relatorio_ok(count(array_filter($types, function ($type) { return $type === 'submissao'; })) === 1, 'submissao foi duplicada entre fontes');
governanca_relatorio_ok(count(array_filter($types, function ($type) { return $type === 'homologacao'; })) === 1, 'homologacao transacional foi duplicada');
$retification = array_values(array_filter($events, function ($event) { return $event['tipo'] === 'retificacao'; }))[0];
governanca_relatorio_ok($retification['versaoAnterior'] === 1 && $retification['versaoNova'] === 2, 'transicao de versao da retificacao ausente');
governanca_relatorio_ok(count($retification['alteracoes']) >= 2, 'comparacao amigavel da retificacao ausente');
$encoded = json_encode($events, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
foreach (array('dados_anteriores_json', 'dados_novos_json', 'versao_anterior_json', 'versao_nova_json', 'caminho_arquivo', 'hash') as $forbidden) {
    governanca_relatorio_ok(stripos($encoded, $forbidden) === false, 'payload normalizado expos campo tecnico: ' . $forbidden);
}

echo 'Relatorio de governanca: autorizacao, filtros, normalizacao, deduplicacao, legado e snapshots amigaveis validados.' . PHP_EOL;
