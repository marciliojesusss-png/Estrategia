<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/auth/Auth.php';
require_once __DIR__ . '/../app/auth/AccessPolicy.php';
require_once __DIR__ . '/../app/services/AdministracaoService.php';
require_once __DIR__ . '/../app/services/MatrizCoberturaAcessos.php';
require_once __DIR__ . '/../app/services/RelatorioGovernancaService.php';

function grupos_auditor_ok($condition, $message)
{
    if (!$condition) throw new RuntimeException('FALHA: ' . $message);
}

$dicot = array(
    'perfil' => 'unidade_apuradora', 'grupo_preenchimento' => 'DICOT',
    'grupo_tipo_escopo' => 'DIRETORIA', 'grupo_escopo_referencia' => 'DICOT',
    'unidade_apuradora' => '', 'diretoria_responsavel' => 'DICOT',
);
grupos_auditor_ok(AccessPolicy::scopeAllows($dicot, array('unidadeApuradora' => 'SUCOL', 'diretoriaResponsavel' => 'DICOT')), 'DICOT deve preencher indicador SUCOL');
grupos_auditor_ok(AccessPolicy::scopeAllows($dicot, array('unidadeApuradora' => 'GENOL', 'diretoriaResponsavel' => 'DICOT')), 'DICOT deve preencher indicador GENOL');
grupos_auditor_ok(!AccessPolicy::scopeAllows($dicot, array('unidadeApuradora' => 'SUCTF', 'diretoriaResponsavel' => 'DIFIR')), 'DICOT nao pode preencher DIFIR');
grupos_auditor_ok(AccessPolicy::initiativeScopeAllows($dicot, array('unidadeSnapshot' => 'SUNEG', 'diretoriaSnapshot' => 'DICOT')), 'SUNEG deve ser compartilhada pelo grupo DICOT');
$filters = Auth::scopeFiltersForUser($dicot, array('unidade_apuradora' => 'SUCTF'));
grupos_auditor_ok(($filters['diretoria_responsavel'] ?? '') === 'DICOT' && !isset($filters['unidade_apuradora']), 'filtro DICOT deve usar diretoria');

$suctf = array(
    'perfil' => 'unidade_apuradora', 'grupo_preenchimento' => 'SUCTF',
    'grupo_tipo_escopo' => 'DIRETORIA', 'grupo_escopo_referencia' => 'DIFIR',
    'unidade_apuradora' => '', 'diretoria_responsavel' => 'DIFIR',
);
grupos_auditor_ok(AccessPolicy::scopeAllows($suctf, array('unidadeApuradora' => 'SUCTF', 'diretoriaResponsavel' => 'DIFIR')), 'SUCTF deve preencher indicadores DIFIR');
grupos_auditor_ok(AccessPolicy::initiativeScopeAllows($suctf, array('unidadeSnapshot' => 'GELOF', 'diretoriaSnapshot' => 'DIFIR')), 'GELOF deve ser compartilhada pelo grupo SUCTF');
grupos_auditor_ok(!AccessPolicy::initiativeScopeAllows($suctf, array('unidadeSnapshot' => 'SURCI', 'diretoriaSnapshot' => 'DICRI')), 'SUCTF nao pode preencher iniciativas fora da DIFIR');

$auditor = array('perfil' => 'auditor_caixa', 'perfil_original' => 'auditor_caixa');
foreach (array(array('dashboard','visualizar'), array('indicadores','visualizar'), array('iniciativas','visualizar'), array('homologacoes','visualizar'), array('relatorios','visualizar'), array('auditoria','visualizar')) as $permission) {
    grupos_auditor_ok(AccessPolicy::allows($auditor['perfil'], $permission[0], $permission[1]), 'auditor perdeu leitura de ' . $permission[0]);
}
foreach (array(array('lancamentos','gerenciar'), array('iniciativas','gerenciar'), array('homologacoes','decidir'), array('administracao','gerenciar'), array('reaberturas','reabrir')) as $permission) {
    grupos_auditor_ok(!AccessPolicy::allows($auditor['perfil'], $permission[0], $permission[1]), 'auditor recebeu escrita em ' . $permission[0]);
}
grupos_auditor_ok(AccessPolicy::scopeAllows($auditor, array('unidadeApuradora' => 'SUCOL')), 'auditor deve ter leitura global');
grupos_auditor_ok(RelatorioGovernancaService::usuarioAutorizado($auditor), 'auditor deve acessar dossie de governanca');

$groups = array(
    array('codigo'=>'DICOT','nome'=>'DICOT','tipoEscopo'=>'DIRETORIA','escopoReferencia'=>'DICOT','limiteVagas'=>6,'ativo'=>true),
    array('codigo'=>'DILOT','nome'=>'DILOT','tipoEscopo'=>'DIRETORIA','escopoReferencia'=>'DILOT','limiteVagas'=>2,'ativo'=>true),
    array('codigo'=>'SURCI','nome'=>'SURCI','tipoEscopo'=>'UNIDADE','escopoReferencia'=>'SURCI','limiteVagas'=>2,'ativo'=>true),
    array('codigo'=>'SUCTF','nome'=>'SUCTF e GELOF','tipoEscopo'=>'DIRETORIA','escopoReferencia'=>'DIFIR','limiteVagas'=>2,'ativo'=>true),
);
$matrix = MatrizCoberturaAcessos::build(array(), array(), array(), array(), $groups);
$groupRows = array_values(array_filter($matrix['linhas'], static function ($row) { return strpos($row['id'], 'grupo-') === 0; }));
grupos_auditor_ok(count($groupRows) === 4, 'matriz deve listar quatro grupos');
$expected = array(); foreach ($groupRows as $row) $expected[$row['unidadeEscopo']] = $row['esperado'];
grupos_auditor_ok($expected['DICOT'] === 6 && $expected['DILOT'] === 2 && $expected['SURCI'] === 2 && $expected['SUCTF'] === 2, 'limites de vagas incorretos');

$service = (new ReflectionClass('AdministracaoService'))->newInstanceWithoutConstructor();
$method = (new ReflectionClass('AdministracaoService'))->getMethod('validateUser'); $method->setAccessible(true);
$groupUser = $method->invoke($service, array('matricula'=>'C900010','nome'=>'Preenchedor DICOT','perfil'=>'unidade_apuradora','grupoPreenchimentoCodigo'=>'dicot','ativo'=>true));
grupos_auditor_ok($groupUser['grupo_preenchimento_codigo'] === 'DICOT' && $groupUser['unidade_apuradora'] === null, 'cadastro por grupo deve dispensar unidade individual');
$auditUser = $method->invoke($service, array('matricula'=>'C900011','nome'=>'Auditor','perfil'=>'auditor_caixa','concessaoDataInicio'=>'2026-01-01T00:00','concessaoDataFim'=>'2099-12-31T23:59','concessaoJustificativa'=>'Auditoria formal','concessaoProtocolo'=>'AUD-001','concessaoAprovadoPor'=>'C118119','ativo'=>true));
grupos_auditor_ok($auditUser['concessao_auditoria']['ativo'] === true, 'concessao valida do auditor deve ser aceita');
grupos_auditor_ok($auditUser['concessao_auditoria']['data_inicio'] === '2026-01-01 00:00:00', 'inicio da concessao deve ser normalizado para o SQL Server');
grupos_auditor_ok($auditUser['concessao_auditoria']['data_fim'] === '2099-12-31 23:59:00', 'fim da concessao deve ser normalizado para o SQL Server');

$migration = file_get_contents(__DIR__ . '/../database/sqlserver/migrations/20261120_001_grupos_preenchimento_auditor_caixa.sql');
foreach (array('SET XACT_ABORT ON', 'BEGIN TRANSACTION', 'ROLLBACK TRANSACTION', 'grupos_preenchimento', 'concessoes_acesso_auditoria', '@ownerSidAntes') as $fragment) grupos_auditor_ok(strpos($migration, $fragment) !== false, 'migracao sem protecao: ' . $fragment);
grupos_auditor_ok(strpos($migration, 'UPDATE dbo.indicadores') !== false && strpos($migration, "numero IN (12, 15)") !== false, 'migracao deve transferir GERIN para DILOT de forma controlada');

$authSource = file_get_contents(__DIR__ . '/../app/auth/Auth.php');
grupos_auditor_ok(strpos($authSource, "FROM dbo.grupos_preenchimento g") !== false, 'simulacao administrativa deve carregar grupos de preenchimento');
grupos_auditor_ok(strpos($authSource, "'grupo:' . \$code") !== false, 'simulacao administrativa deve identificar o grupo selecionado');
grupos_auditor_ok(strpos($authSource, "'grupo_preenchimento' => \$code") !== false, 'simulacao deve aplicar o grupo na sessao efetiva');
grupos_auditor_ok(strpos($authSource, "'SUCTF/GELOF'") !== false, 'menu deve identificar o compartilhamento SUCTF e GELOF');
grupos_auditor_ok(strpos($authSource, "SELECT 'unidade' AS tipo") === false, 'menu nao deve recriar opcoes antigas por unidade organizacional');

$administrationController = file_get_contents(__DIR__ . '/../app/controllers/AdministracaoApiController.php');
grupos_auditor_ok(strpos($administrationController, "array('auditoria', 'acessos')") !== false, 'auditor deve consultar operacoes e registros de acesso em modo leitura');

echo 'Grupos compartilhados e Auditor CAIXA validados' . PHP_EOL;
