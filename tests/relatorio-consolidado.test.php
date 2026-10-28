<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/services/RelatorioConsolidadoService.php';
require_once __DIR__ . '/../app/auth/AccessPolicy.php';

function relatorio_ok($condition, $message)
{
    if (!$condition) throw new RuntimeException('FALHA: ' . $message);
}

function relatorio_row(array $payload, $indicatorId)
{
    foreach ($payload['linhas'] as $row) {
        if ((string) $row['indicadorId'] === (string) $indicatorId) return $row;
    }
    throw new RuntimeException('Indicador ausente no payload: ' . $indicatorId);
}

function relatorio_indicator($id, $number, $name, $unit, $board, $measure = 'percentual')
{
    return array(
        'id' => $id, 'numero' => $number, 'indicador' => $name, 'nome' => $name,
        'plano' => 'PEI', 'unidadeApuradora' => $unit,
        'diretoriaResponsavel' => $board, 'unidadeMedida' => $measure,
        'tipoCalculo' => 'razao',
    );
}

function relatorio_launch($id, $indicatorId, $month, $status, $version, $meta, $result, $attainment, $situation)
{
    return array(
        'id' => $id, 'indicadorId' => $indicatorId,
        'competencia' => '2026-' . str_pad((string) $month, 2, '0', STR_PAD_LEFT),
        'ano' => 2026, 'mes' => $month, 'status' => $status, 'versaoAtual' => $version,
        'metaReferencia' => $meta, 'resultadoMensal' => $result,
        'resultadoOficialAnual' => $result, 'percentualAtingido' => $attainment,
        'situacaoCalculada' => $situation, 'camposEntrada' => array(),
    );
}

$indicators = array(
    relatorio_indicator(3, 3, 'Indice de Clientes Ativos em Canais Digitais', 'SUCOI', 'DICOT'),
    relatorio_indicator(4, 4, 'Indicador legado com zero real', 'SUCOL', 'DICOT'),
    relatorio_indicator(5, 5, 'Indicador ainda nao homologado', 'GENOL', 'DILOT'),
    relatorio_indicator(6, 6, 'Indicador estrito sem governanca atual', 'GERIN', 'DILOT'),
);

$launchV1 = relatorio_launch(27, 3, 3, 'Homologado', 1, 0.28, 0.70, 2.5, 'Atingido');
$launchV2 = relatorio_launch(27, 3, 3, 'Homologado', 2, 0.28, 0.7441, 2.6573, 'Atingido');
$launchV2['observacaoDocumental'] = array(
    'id' => 'observacao-documental-1tri-2026-ind-03',
    'fonteDocumental' => 'Informe DILOT/GERIN n. 0029/2026',
);
$legacyZero = relatorio_launch(40, 4, 6, 'Homologado', 1, 0.0, 0.0, 0.0, 'Abaixo da meta');
$notOfficial = relatorio_launch(50, 5, 9, 'Em preenchimento', 1, 1.0, 2.0, 2.0, 'Atingido');
$strictWithoutGovernance = relatorio_launch(60, 6, 9, 'Homologado', 2, 1.0, 2.0, 2.0, 'Atingido');

$data = array(
    'indicadores' => $indicators,
    'lancamentos' => array($launchV1, $launchV2, $legacyZero, $notOfficial, $strictWithoutGovernance),
    'regrasIndicadores' => array(
        array('indicadorId' => 3, 'exigirHomologacaoTransacionalVersaoAtual' => true),
        array('indicadorId' => 4),
        array('indicadorId' => 5),
        array('indicadorId' => 6, 'exigirHomologacaoTransacionalVersaoAtual' => true),
    ),
    'governancaHomologacaoAtual' => array(array('lancamentoId' => 27, 'versao' => 2)),
);
$user = array('perfil' => 'administrador', 'perfil_original' => 'administrador', 'nome' => 'Administrador', 'matricula' => 'C118119');
$filters = RelatorioConsolidadoService::normalizarFiltros(array('ano' => '2026', 'posicao' => 'ultima'));
$metadata = array('27' => array(
    'id' => 'homologacao-27-v2', 'usuario' => 'C118119', 'perfil' => 'administrador',
    'data' => '2026-10-28T16:02:29-03:00',
));
$payload = RelatorioConsolidadoService::montarPayload($data, $filters, $user, $metadata, array());

relatorio_ok($payload['somenteLeitura'] === true, 'contrato deve ser explicitamente somente leitura');
relatorio_ok($payload['total'] === 4, 'administrador deve receber uma linha por indicador');
$indicator03 = relatorio_row($payload, 3);
relatorio_ok((string) $indicator03['lancamentoId'] === '27', 'lancamento 27 deve ser a posicao oficial');
relatorio_ok($indicator03['versao'] === 2, 'versao historica 1 nao pode substituir a versao vigente 2');
relatorio_ok(abs($indicator03['resultadoOficial'] - 0.7441) < 1e-12, 'resultado oficial do lancamento 27 incorreto');
relatorio_ok(abs($indicator03['atingimento'] - 2.6573) < 1e-12, 'atingimento oficial do lancamento 27 incorreto');
relatorio_ok($indicator03['situacao'] === 'Atingido', 'situacao oficial do lancamento 27 incorreta');
relatorio_ok($indicator03['governanca'] === 'Homologado - versao atual', 'governanca atual nao identificada');
relatorio_ok($indicator03['dataHomologacao'] === '2026-10-28T16:02:29-03:00', 'data da homologacao atual incorreta');
relatorio_ok($indicator03['homologador'] === 'C118119', 'homologador atual incorreto');
relatorio_ok($indicator03['fonteDocumental'] === 'Informe DILOT/GERIN n. 0029/2026', 'fonte documental vigente incorreta');
relatorio_ok($indicator03['observacaoOficialDisponivel'] === true, 'disponibilidade da observacao oficial ausente');

$legacy = relatorio_row($payload, 4);
relatorio_ok($legacy['governanca'] === 'Homologado legado - sem evento transacional', 'legado deve ser distinguido');
relatorio_ok($legacy['dataHomologacao'] === null, 'legado nao pode receber data inventada');
relatorio_ok($legacy['metaOficial'] === 0.0 && $legacy['resultadoOficial'] === 0.0 && $legacy['atingimento'] === 0.0, 'zero real deve ser preservado');

$missing = relatorio_row($payload, 5);
relatorio_ok($missing['governanca'] === 'Sem posicao oficial', 'nao homologado nao pode ser oficial');
relatorio_ok($missing['resultadoOficial'] === null && $missing['atingimento'] === null, 'ausencia nao pode virar zero artificial');
$strict = relatorio_row($payload, 6);
relatorio_ok($strict['governanca'] === 'Sem posicao oficial', 'regra estrita deve rejeitar status sem governanca da versao atual');

$competenceFilters = RelatorioConsolidadoService::normalizarFiltros(array('ano' => '2026', 'posicao' => 'competencia', 'competencia' => '2026-03'));
$competencePayload = RelatorioConsolidadoService::montarPayload($data, $competenceFilters, $user, $metadata, array());
relatorio_ok(relatorio_row($competencePayload, 3)['versao'] === 2, 'competencia deve selecionar a versao homologada vigente');
$quarterFilters = RelatorioConsolidadoService::normalizarFiltros(array('ano' => '2026', 'posicao' => 'trimestre', 'trimestre' => '1'));
$quarterPayload = RelatorioConsolidadoService::montarPayload($data, $quarterFilters, $user, $metadata, array());
relatorio_ok(relatorio_row($quarterPayload, 3)['versao'] === 2, 'trimestre deve selecionar apenas posicao homologada vigente');

foreach (array(
    array(array('perfil' => 'unidade_apuradora', 'unidade_apuradora' => 'SUCOL'), array('unidade' => 'GENOL'), array('unidade_apuradora' => 'SUCOL')),
    array(array('perfil' => 'homologador', 'diretoria_responsavel' => 'DICOT'), array('diretoria' => 'DILOT'), array('diretoria_responsavel' => 'DICOT')),
    array(array('perfil' => 'consultor_diretoria', 'diretoria_responsavel' => 'DICOT'), array('diretoria' => 'DILOT'), array('diretoria_responsavel' => 'DICOT')),
    array(array('perfil' => 'homologador', 'perfil_original' => 'administrador', 'diretoria_responsavel' => 'DICOT'), array('diretoria' => 'DILOT'), array('diretoria_responsavel' => 'DICOT')),
    array(array('perfil' => 'unidade_apuradora', 'perfil_original' => 'administrador', 'unidade_apuradora' => 'SUCOL'), array('unidade' => 'GENOL'), array('unidade_apuradora' => 'SUCOL')),
) as $case) {
    relatorio_ok(RelatorioConsolidadoService::filtrosEscopo($case[0], $case[1]) === $case[2], 'query string nao pode ampliar o escopo autenticado');
}
relatorio_ok(RelatorioConsolidadoService::filtrosEscopo($user) === array(), 'administrador ativo deve manter escopo corporativo');
try {
    RelatorioConsolidadoService::filtrosEscopo(array('perfil' => 'usuario_companhia'));
    throw new RuntimeException('usuario companhia obteve acesso indevido');
} catch (DomainException $expected) {
}

foreach (array('administrador', 'homologador', 'consultor_diretoria', 'unidade_apuradora') as $profile) {
    relatorio_ok(AccessPolicy::allows($profile, 'relatorios', 'visualizar'), $profile . ' deveria acessar o consolidado');
}
relatorio_ok(!AccessPolicy::allows('usuario_companhia', 'relatorios', 'visualizar'), 'usuario companhia deve permanecer bloqueado');

echo 'Relatorio consolidado: posicao oficial, legado, zero real, escopo e IDOR validados.' . PHP_EOL;
