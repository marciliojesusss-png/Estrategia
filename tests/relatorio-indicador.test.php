<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/services/RelatorioIndicadorService.php';
require_once __DIR__ . '/../app/auth/AccessPolicy.php';

function detalhe_ok($condition, $message)
{
    if (!$condition) throw new RuntimeException('FALHA: ' . $message);
}

function detalhe_lancamento($id, $indicatorId, $month, $status, $version, $meta, $result, $attainment, $situation)
{
    return array(
        'id' => $id, 'indicadorId' => $indicatorId,
        'competencia' => '2026-' . str_pad((string) $month, 2, '0', STR_PAD_LEFT),
        'ano' => 2026, 'mes' => $month, 'status' => $status, 'versaoAtual' => $version,
        'metaReferencia' => $meta, 'resultadoMensal' => $result,
        'resultadoOficialAnual' => $result, 'percentualAtingido' => $attainment,
        'situacaoCalculada' => $situation, 'camposEntrada' => array(),
        'observacaoArea' => '', 'referenciaEvidencia' => '',
    );
}

function detalhe_mes(array $payload, $month)
{
    foreach ($payload['trajetoria'] as $row) if ((int) $row['mes'] === (int) $month) return $row;
    throw new RuntimeException('Mes ausente: ' . $month);
}

$indicator03 = array(
    'id' => 3, 'numero' => 3, 'indicador' => 'Indice de Clientes Ativos em Canais Digitais',
    'plano' => 'PEI', 'pilar' => 'Clientes', 'unidadeApuradora' => 'SUCOL',
    'diretoriaResponsavel' => 'DICOT', 'periodicidade' => 'Mensal', 'unidadeMedida' => 'percentual',
    'tipoCalculo' => 'crescimento_clientes_ativos', 'tipoConsolidacao' => 'ultima_posicao',
    'metaAnualDescricao' => '28%', 'metrica' => '(QMAATU / QMAANT) - 1',
    'observacaoAcompanhamento' => 'Crescimento dos clientes ativos.',
);
$march = detalhe_lancamento(27, 3, 3, 'Homologado', 2, 0.28, 0.7441, 2.6573, 'Atingido');
$march['observacaoDocumental'] = array(
    'observacao' => 'Posicao oficial do primeiro trimestre.',
    'fonteDocumental' => 'Informe DILOT/GERIN n. 0029/2026',
    'paginasDocumento' => '3-4', 'tipoObservacao' => 'OBSERVACAO_AREA_INFORME_TRIMESTRAL',
    'criadoEm' => '2026-10-27T10:00:00-03:00',
);
$june = detalhe_lancamento(30, 3, 6, 'Em preenchimento', 1, 0.28, 0.80, 2.85, 'Atingido');
$june['observacaoDocumental'] = array(
    'observacao' => 'Observacao do segundo trimestre ainda sem posicao homologada.',
    'fonteDocumental' => 'Informe 2TRI', 'paginasDocumento' => '5',
    'tipoObservacao' => 'OBSERVACAO_AREA_INFORME_TRIMESTRAL', 'criadoEm' => '2026-10-27T11:00:00-03:00',
);
$september = detalhe_lancamento(33, 3, 9, 'Homologado', 1, 0.28, 0.0, 0.0, 'Abaixo da meta');
$september['observacaoArea'] = 'Zero real documentado no terceiro trimestre.';
$september['referenciaEvidencia'] = 'Informe 3TRI';

$rule03 = array(
    'indicadorId' => 3, 'exigirHomologacaoTransacionalVersaoAtual' => true,
    'parametrosCalculo' => array('sentidoMeta' => 'quanto_maior_melhor', 'mesesFechamentoTrimestral' => array(3, 6, 9, 12)),
);
$governance03 = array(array('lancamentoId' => 27, 'versao' => 2), array('lancamentoId' => 33, 'versao' => 1));
$approvals03 = array(
    '27' => array('usuario' => 'C118119', 'data' => '2026-10-28T16:02:29-03:00'),
    '33' => array('usuario' => 'HOMOLOGADOR', 'data' => '2026-10-28T17:00:00-03:00'),
);
$submissions03 = array('27' => array('usuario' => 'C118119', 'data' => '2026-10-27T07:52:31-03:00'));
$evidence03 = array(
    '27' => array(
        array('id' => 'evidencia-v1', 'versao_lancamento' => 1, 'nome_arquivo' => 'legado.xlsx', 'tipo_arquivo' => 'xlsx', 'caminho_arquivo' => 'C:/segredo/legado.xlsx', 'descricao' => 'Versao anterior', 'data_upload' => '2026-01-01T10:00:00-03:00', 'usuario' => 'LEGADO'),
        array('id' => 'evidencia-v2', 'versao_lancamento' => 2, 'nome_arquivo' => 'Informe-0029.pdf', 'tipo_arquivo' => 'pdf', 'caminho_arquivo' => 'C:/segredo/informe.pdf', 'descricao' => 'Versao vigente', 'data_upload' => '2026-10-27T10:00:00-03:00', 'usuario' => 'C118119'),
    ),
);
$previous = detalhe_lancamento(27, 3, 3, 'Homologado', 1, 0.28, 0.70, 2.50, 'Atingido');
$retifications03 = array('27' => array(array(
    'versao_anterior_json' => json_encode($previous), 'versao_anterior' => 1, 'versao_nova' => 2,
    'justificativa' => 'Retificacao documental', 'usuario' => 'C118119', 'data_retificacao' => '2026-10-27T09:00:00-03:00',
)));
$administrator = array('perfil' => 'administrador', 'perfil_original' => 'administrador', 'nome' => 'Administrador', 'matricula' => 'C118119');
$payload03 = RelatorioIndicadorService::montarPayload(
    $indicator03, array($march, $june, $september), $rule03, $governance03,
    $approvals03, $submissions03, $evidence03, $retifications03, 2026, $administrator
);

detalhe_ok($payload03['somenteLeitura'] === true, 'payload deve declarar somente leitura');
detalhe_ok(count($payload03['trajetoria']) === 12, 'trajetoria deve conter JAN a DEZ');
$marchRow = detalhe_mes($payload03, 3);
detalhe_ok($marchRow['versao'] === 2, 'MAR deve exibir somente a versao vigente 2');
detalhe_ok(abs($marchRow['resultado'] - 0.7441) < 1e-12, 'resultado vigente de MAR deve ser 74,41%');
detalhe_ok(abs($marchRow['atingimento'] - 2.6573) < 1e-12, 'atingimento vigente de MAR deve ser 265,73%');
detalhe_ok($marchRow['situacao'] === 'Atingido', 'situacao de MAR incorreta');
detalhe_ok($marchRow['governanca'] === 'Homologado - versao atual', 'governanca vigente de MAR incorreta');
detalhe_ok($marchRow['homologadoEm'] === '2026-10-28T16:02:29-03:00', 'data de homologacao vigente incorreta');
detalhe_ok($marchRow['homologadoPor'] === 'C118119', 'homologador vigente incorreto');

$juneRow = detalhe_mes($payload03, 6);
detalhe_ok($juneRow['resultado'] === null && $juneRow['atingimento'] === null, 'acompanhamento nao homologado nao pode virar posicao oficial');
detalhe_ok($juneRow['governanca'] === 'Sem posicao oficial', 'governanca de JUN deve indicar ausencia oficial');
$septemberRow = detalhe_mes($payload03, 9);
detalhe_ok($septemberRow['resultado'] === 0.0 && $septemberRow['atingimento'] === 0.0, 'zero real homologado deve ser preservado');
detalhe_ok(detalhe_mes($payload03, 1)['resultado'] === null, 'ausencia de apuracao nao pode virar zero');
detalhe_ok(count($payload03['observacoesOficiais']) === 3, 'observacoes devem existir somente nos fechamentos MAR/JUN/SET');
detalhe_ok(array_column($payload03['observacoesOficiais'], 'competencia') === array('2026-03', '2026-06', '2026-09'), 'observacao trimestral nao pode ser duplicada nos meses intermediarios');
detalhe_ok(count($payload03['evidencias']['versaoAtual']) === 1 && $payload03['evidencias']['versaoAtual'][0]['id'] === 'evidencia-v2', 'evidencia vigente deve ficar separada');
detalhe_ok(count($payload03['evidencias']['versoesAnteriores']) === 1 && $payload03['evidencias']['versoesAnteriores'][0]['id'] === 'evidencia-v1', 'evidencia historica deve ficar separada');
$encoded03 = json_encode($payload03);
detalhe_ok(strpos($encoded03, 'C:/segredo') === false, 'caminho fisico da evidencia nao pode ser exposto');
detalhe_ok(stripos($encoded03, 'versao_anterior_json') === false, 'snapshot tecnico nao pode ser exposto');
detalhe_ok(count($payload03['historicoVersoes']) === 1 && $payload03['historicoVersoes'][0]['versao'] === 1, 'versao 1 deve aparecer somente no historico');

$legacyIndicator = $indicator03;
$legacyIndicator['id'] = 4; $legacyIndicator['numero'] = 4; $legacyIndicator['indicador'] = 'Indicador legado';
$legacyLaunch = detalhe_lancamento(39, 4, 3, 'Homologado', 2, 0.0, 0.0, 0.0, 'Atingido');
$legacyPayload = RelatorioIndicadorService::montarPayload($legacyIndicator, array($legacyLaunch), array('indicadorId' => 4), array(), array(), array(), array(), array(), 2026, $administrator);
$legacyRow = detalhe_mes($legacyPayload, 3);
detalhe_ok($legacyRow['governanca'] === 'Homologado legado - sem evento transacional', 'homologacao legada deve ser identificada');
detalhe_ok($legacyRow['homologadoEm'] === null && $legacyRow['homologadoPor'] === null, 'legado nao pode receber homologacao inventada');

$indicator22 = $indicator03;
$indicator22['id'] = 22; $indicator22['numero'] = 22; $indicator22['indicador'] = 'Arrecadacao Gerada com o Ecossistema Lotex';
$launches22 = array(); $governance22 = array();
foreach (array(3, 6, 9) as $month) {
    $launch = detalhe_lancamento(250 + $month, 22, $month, 'Homologado', 1, 1, 1, 1, 'Atingido');
    $launch['observacaoDocumental'] = array(
        'observacao' => 'Observacao Lotex ' . ($month / 3) . 'TRI', 'fonteDocumental' => 'Informe Lotex ' . ($month / 3) . 'TRI',
        'paginasDocumento' => (string) $month, 'tipoObservacao' => 'OBSERVACAO_AREA_INFORME_TRIMESTRAL', 'criadoEm' => '2026-10-27T10:00:00-03:00',
    );
    $launches22[] = $launch; $governance22[] = array('lancamentoId' => 250 + $month, 'versao' => 1);
}
$rule22 = array('indicadorId' => 22, 'exigirHomologacaoTransacionalVersaoAtual' => true, 'parametrosCalculo' => array(
    'mesesFechamentoTrimestral' => array(3, 6, 9, 12),
    'apresentacoesOficiaisTrimestrais' => array(
        '1TRI/2026' => array('metaOficialReportada' => 10, 'resultadoOficialReportado' => 11, 'percentualAtingidoOficialReportado' => 1.1, 'situacaoOficial' => 'Atingido'),
        '2TRI/2026' => array('metaOficialReportada' => 20, 'resultadoOficialReportado' => 18, 'percentualAtingidoOficialReportado' => 0.9, 'situacaoOficial' => 'Abaixo da meta'),
        '3TRI/2026' => array('metaOficialReportada' => 30, 'resultadoOficialReportado' => 33, 'percentualAtingidoOficialReportado' => 1.1, 'situacaoOficial' => 'Atingido'),
    ),
));
$payload22 = RelatorioIndicadorService::montarPayload($indicator22, $launches22, $rule22, $governance22, array(), array(), array(), array(), 2026, $administrator);
detalhe_ok($payload22['fechamentosTrimestrais'][0]['resultado'] === 11.0, '1TRI Lotex deve preservar apresentacao oficial');
detalhe_ok($payload22['fechamentosTrimestrais'][1]['resultado'] === 18.0, '2TRI Lotex deve preservar historico oficial');
detalhe_ok($payload22['fechamentosTrimestrais'][2]['resultado'] === 33.0, '3TRI Lotex deve preservar metodologia temporal');
detalhe_ok(count($payload22['observacoesOficiais']) === 3 && count(array_unique(array_column($payload22['observacoesOficiais'], 'observacao'))) === 3, 'observacoes Lotex trimestrais devem permanecer distintas');

foreach (array(
    array(array('perfil' => 'unidade_apuradora', 'unidade_apuradora' => 'GENOL'), array('unidadeApuradora' => 'SUCOL'), false),
    array(array('perfil' => 'homologador', 'diretoria_responsavel' => 'DICOT'), array('diretoriaResponsavel' => 'DICOT'), true),
    array(array('perfil' => 'consultor_diretoria', 'diretoria_responsavel' => 'DILOT'), array('diretoriaResponsavel' => 'DICOT'), false),
    array(array('perfil' => 'homologador', 'perfil_original' => 'administrador', 'diretoria_responsavel' => 'DILOT'), array('diretoriaResponsavel' => 'DICOT'), false),
) as $case) detalhe_ok(AccessPolicy::scopeAllows($case[0], $case[1]) === $case[2], 'escopo detalhado/IDOR divergente');
detalhe_ok(AccessPolicy::scopeAllows($administrator, array('diretoriaResponsavel' => 'DILOT')), 'administrador ativo deve acessar qualquer indicador');
detalhe_ok(!AccessPolicy::allows('usuario_companhia', 'relatorios', 'visualizar'), 'usuario companhia deve permanecer bloqueado');

echo 'Relatorio detalhado: Indicadores 03/22, oficial, legado, zero, ausencia, versoes, evidencias e IDOR validados.' . PHP_EOL;
