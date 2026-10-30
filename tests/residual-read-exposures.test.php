<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/auth/Auth.php';
require_once __DIR__ . '/../app/auth/AccessPolicy.php';
require_once __DIR__ . '/../app/services/IndicadorConsultaInstitucionalService.php';
require_once __DIR__ . '/../app/services/ResumoExecutivoDadosService.php';

function residual_read_ok($condition, $message)
{
    if (!$condition) throw new RuntimeException('FALHA: ' . $message);
}

$indicatorSUCOL = array('unidadeApuradora' => 'SUCOL', 'diretoriaResponsavel' => 'DICOT');
$indicatorGENOL = array('unidadeApuradora' => 'GENOL', 'diretoriaResponsavel' => 'DICOT');
$indicatorGERIN = array('unidadeApuradora' => 'GERIN', 'diretoriaResponsavel' => 'DILOT');

$unit = array('perfil' => 'unidade_apuradora', 'unidade_apuradora' => 'SUCOL');
residual_read_ok(IndicadorConsultaInstitucionalService::permiteDetalheGeral($unit, $indicatorSUCOL), 'Unidade perdeu indicador proprio');
residual_read_ok(!IndicadorConsultaInstitucionalService::permiteDetalheGeral($unit, $indicatorGENOL), 'Unidade ampliou escopo com escopo=geral');

$homologator = array('perfil' => 'homologador', 'diretoria_responsavel' => 'DICOT');
residual_read_ok(IndicadorConsultaInstitucionalService::permiteDetalheGeral($homologator, $indicatorGENOL), 'Homologador perdeu a propria diretoria');
residual_read_ok(!IndicadorConsultaInstitucionalService::permiteDetalheGeral($homologator, $indicatorGERIN), 'Homologador ampliou diretoria com escopo=geral');

// REGRA FUNCIONAL DELIBERADA: Consultor da Diretoria possui, por decisao da
// Diretoria, as mesmas prerrogativas operacionais do Homologador nesta fase.
$consultant = array('perfil' => 'consultor_diretoria', 'diretoria_responsavel' => 'DICOT');
residual_read_ok(IndicadorConsultaInstitucionalService::permiteDetalheGeral($consultant, $indicatorGENOL), 'Consultor perdeu a propria diretoria');
residual_read_ok(!IndicadorConsultaInstitucionalService::permiteDetalheGeral($consultant, $indicatorGERIN), 'Consultor ampliou diretoria com escopo=geral');

$admin = array('perfil' => 'administrador', 'perfil_original' => 'administrador');
residual_read_ok(IndicadorConsultaInstitucionalService::permiteDetalheGeral($admin, $indicatorGERIN), 'Administrador ativo perdeu visao corporativa');

$simulatedUnit = array('perfil' => 'unidade_apuradora', 'perfil_original' => 'administrador', 'unidade_apuradora' => 'SUCOL');
residual_read_ok(!IndicadorConsultaInstitucionalService::permiteDetalheGeral($simulatedUnit, $indicatorGENOL), 'Administrador simulado como Unidade ampliou escopo');
$simulatedBoard = array('perfil' => 'homologador', 'perfil_original' => 'administrador', 'diretoria_responsavel' => 'DICOT');
residual_read_ok(!IndicadorConsultaInstitucionalService::permiteDetalheGeral($simulatedBoard, $indicatorGERIN), 'Administrador simulado como Diretoria ampliou escopo');

$company = array('perfil' => 'usuario_companhia');
residual_read_ok(IndicadorConsultaInstitucionalService::permiteDetalheGeral($company, $indicatorGERIN), 'Companhia perdeu a excecao institucional explicita');
$institutionalSource = IndicadorConsultaInstitucionalService::fonteDetalhe('sqlsrv', 'Estrategia', true);
residual_read_ok(!array_key_exists('banco', $institutionalSource), 'Detalhe institucional ainda expoe fonte.banco');
residual_read_ok(!array_key_exists('driver', $institutionalSource), 'Detalhe institucional ainda expoe fonte.driver');
residual_read_ok($institutionalSource === array('tipo' => 'institucional'), 'Detalhe institucional deve usar fonte minima');
$institutionalDashboard = ResumoExecutivoDadosService::projecaoInstitucional(array(
    'indicadores' => array(),
    'lancamentos' => array(),
    'governancaHomologacaoAtual' => array(),
    'prazos' => array(),
    'fonte' => array(
        'tipo' => 'banco_central',
        'driver' => 'sqlsrv',
        'banco' => 'Estrategia',
        'servidor' => 'interno',
        'dsn' => 'restrito',
        'host' => 'restrito',
    ),
));
residual_read_ok(
    $institutionalDashboard['fonte'] === array('tipo' => 'institucional'),
    'Dashboard institucional ainda expoe metadados tecnicos de conexao'
);
$operationalSource = IndicadorConsultaInstitucionalService::fonteDetalhe('sqlsrv', 'Estrategia', false);
residual_read_ok(($operationalSource['banco'] ?? '') === 'Estrategia', 'Payload operacional perdeu a identificacao tecnica vigente');
residual_read_ok(($operationalSource['driver'] ?? '') === 'sqlsrv', 'Payload operacional perdeu o driver vigente');

$indicatorController = file_get_contents(__DIR__ . '/../app/controllers/IndicadorApiController.php');
residual_read_ok(strpos($indicatorController, 'catch (UnexpectedValueException $error)') !== false, 'Negacao de escopo nao retorna 403 no detalhe');

$deadlinesController = file_get_contents(__DIR__ . '/../app/controllers/PrazosApuracaoApiController.php');
foreach (array('administrador', 'homologador', 'consultor_diretoria', 'unidade_apuradora') as $profile) {
    residual_read_ok(strpos($deadlinesController, "'" . $profile . "'") !== false, 'Perfil operacional perdeu leitura de prazos: ' . $profile);
}
residual_read_ok(strpos($deadlinesController, "Auth::requireApiProfiles(array(") !== false, 'GET de prazos continua com autenticacao generica');
residual_read_ok(strpos($deadlinesController, "'usuario_companhia'") === false, 'Companhia continua autorizada nos prazos');
residual_read_ok(strpos($deadlinesController, "requirePermission('administracao', 'gerenciar', true)") !== false, 'Escrita de prazos deixou de ser exclusiva do Administrador');

$databaseApi = file_get_contents(__DIR__ . '/../api/database.php');
$pingPosition = strpos($databaseApi, "if ((\$_GET['ping'] ?? '') !== '')");
$companyGuardPosition = strpos($databaseApi, "=== 'usuario_companhia'", $pingPosition);
$databaseNamePosition = strpos($databaseApi, "'databaseName'", $pingPosition);
residual_read_ok($pingPosition !== false && $companyGuardPosition !== false && $databaseNamePosition !== false, 'Guard ou resposta do ping nao identificado');
residual_read_ok($companyGuardPosition < $databaseNamePosition, 'Ping ainda expoe databaseName antes de bloquear Companhia');

echo 'Exposicoes residuais de leitura validadas sem acesso ao banco.' . PHP_EOL;
