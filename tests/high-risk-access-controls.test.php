<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/auth/Auth.php';
require_once __DIR__ . '/../app/auth/AccessPolicy.php';
require_once __DIR__ . '/../app/services/ResumoExecutivoDadosService.php';

function high_risk_ok($condition, $message)
{
    if (!$condition) throw new RuntimeException('FALHA: ' . $message);
}

$company = array('perfil' => 'usuario_companhia');
high_risk_ok(AccessPolicy::allows($company['perfil'], 'dashboard', 'visualizar'), 'Companhia perdeu o Dashboard institucional');
high_risk_ok(AccessPolicy::allows($company['perfil'], 'indicadores', 'visualizar'), 'Companhia perdeu o detalhe institucional');
foreach (array('lancamentos', 'homologacoes', 'visao_trimestral') as $module) {
    high_risk_ok(!AccessPolicy::allows($company['perfil'], $module, 'visualizar'), 'Companhia manteve acesso operacional: ' . $module);
}
high_risk_ok(!AccessPolicy::allows($company['perfil'], 'relatorios', 'visualizar'), 'Companhia obteve Relatorios');
high_risk_ok(!AccessPolicy::allows($company['perfil'], 'auditoria', 'visualizar'), 'Companhia obteve Auditoria');
high_risk_ok(!AccessPolicy::scopeAllows($company, array('unidadeApuradora' => 'SUCOL')), 'Companhia manteve escopo operacional global');

foreach (array('homologador', 'consultor_diretoria') as $profile) {
    high_risk_ok(AccessPolicy::allows($profile, 'homologacoes', 'decidir'), $profile . ' perdeu a decisao vigente');
    high_risk_ok(AccessPolicy::allows($profile, 'reaberturas', 'reabrir'), $profile . ' perdeu a reabertura vigente');
}

$admin = array('perfil' => 'administrador', 'perfil_original' => 'administrador');
$simulatedUnit = array('perfil' => 'unidade_apuradora', 'perfil_original' => 'administrador', 'unidade_apuradora' => 'SUCOL');
$simulatedBoard = array('perfil' => 'homologador', 'perfil_original' => 'administrador', 'diretoria_responsavel' => 'DICOT');
high_risk_ok(AccessPolicy::allowsGeneralDashboard($admin), 'Administrador ativo perdeu visao geral');
high_risk_ok(!AccessPolicy::allowsGeneralDashboard($simulatedUnit), 'Administrador simulado como Unidade ampliou escopo');
high_risk_ok(!AccessPolicy::allowsGeneralDashboard($simulatedBoard), 'Administrador simulado como Diretoria ampliou escopo');

$unitFilters = Auth::scopeFiltersForUser($simulatedUnit, array('escopo' => 'geral', 'unidade_apuradora' => 'GERIN'));
high_risk_ok($unitFilters['unidade_apuradora'] === 'SUCOL', 'escopo=geral ampliou Unidade');
$boardFilters = Auth::scopeFiltersForUser($simulatedBoard, array('escopo' => 'geral', 'diretoria_responsavel' => 'DILOT'));
high_risk_ok($boardFilters['diretoria_responsavel'] === 'DICOT', 'escopo=geral ampliou Diretoria');
$consultantFilters = Auth::scopeFiltersForUser(array('perfil' => 'consultor_diretoria', 'diretoria_responsavel' => 'DIFIR'), array('escopo' => 'geral'));
high_risk_ok($consultantFilters['diretoria_responsavel'] === 'DIFIR', 'escopo=geral ampliou Consultor');

$projection = ResumoExecutivoDadosService::projecaoInstitucional(array(
    'indicadores' => array(array('id' => 3, 'createdAt' => 'x', 'updatedAt' => 'y')),
    'lancamentos' => array(
        array('id' => 27, 'indicadorId' => 3, 'competencia' => '2026-03', 'status' => 'Homologado', 'camposEntrada' => array('segredo' => 1), 'evidenciaId' => 'e1', 'usuarioResponsavel' => 'C1', 'observacaoArea' => 'restrita'),
        array('id' => 30, 'indicadorId' => 3, 'competencia' => '2026-06', 'status' => 'Em preenchimento', 'camposEntrada' => array('segredo' => 2))
    ),
    'governancaHomologacaoAtual' => array(array('lancamentoId' => 27, 'versao' => 2)),
    'prazos' => array(array('indicadorId' => 3)),
    'fonte' => array('tipo' => 'banco_central', 'driver' => 'sqlsrv', 'banco' => 'Estrategia')
));
high_risk_ok(count($projection['lancamentos']) === 1, 'Dashboard institucional expos posicao nao homologada');
high_risk_ok($projection['lancamentos'][0]['camposEntrada'] === array(), 'Dashboard institucional expos componentes operacionais');
foreach (array('evidenciaId', 'usuarioResponsavel', 'observacaoArea', 'createdAt', 'updatedAt') as $field) {
    high_risk_ok(!array_key_exists($field, $projection['lancamentos'][0]), 'Dashboard institucional expos ' . $field);
}
high_risk_ok($projection['prazos'] === array() && !isset($projection['fonte']['banco']), 'Dashboard institucional expos configuracao operacional');

$reopen = file_get_contents(__DIR__ . '/../api/solicitacoes-reabertura.php');
high_risk_ok(strpos($reopen, "if (\$method === 'GET')") !== false, 'GET nao possui guard explicito');
high_risk_ok(strpos($reopen, "if (\$action !== 'listar')") !== false, 'GET ainda pode decidir reabertura');
high_risk_ok(strpos($reopen, "if (\$method !== 'POST')") !== false, 'decisao nao ficou exclusiva de POST');
$csrfPosition = strpos($reopen, 'Auth::requireCsrf();');
$transactionPosition = strpos($reopen, '$db->beginTransaction();');
high_risk_ok($csrfPosition !== false && $transactionPosition !== false && $csrfPosition < $transactionPosition, 'CSRF nao precede a transacao');
high_risk_ok(strpos($reopen, "Auth::requirePermission('reaberturas', 'decidir', true)") !== false, 'decisao deixou de exigir Administrador');

$apiBootstrap = file_get_contents(__DIR__ . '/../api/bootstrap.php');
high_risk_ok(strpos($apiBootstrap, "in_array(Request::method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)") !== false, 'POST sem CSRF nao e bloqueado globalmente');

$routes = file_get_contents(__DIR__ . '/../public/index.php');
high_risk_ok(strpos($routes, "\$router->get('/api/solicitacoes-reabertura'") !== false, 'rota GET de leitura ausente');
high_risk_ok(strpos($routes, "\$router->post('/api/solicitacoes-reabertura'") !== false, 'rota POST de decisao ausente');

$app = file_get_contents(__DIR__ . '/../assets/js/app.js');
high_risk_ok(strpos($app, 'institutionalIndicatorDetail') !== false, 'detalhe institucional ainda depende da base operacional');
$configApi = file_get_contents(__DIR__ . '/../api/configuracoes.php');
high_risk_ok(strpos($configApi, "Auth::requireApiProfiles(array('administrador', 'homologador', 'consultor_diretoria', 'unidade_apuradora'))") !== false, 'Companhia ainda acessa configuracoes operacionais');
$databaseApi = file_get_contents(__DIR__ . '/../api/database.php');
high_risk_ok(strpos($databaseApi, "=== 'usuario_companhia'") !== false, 'Companhia ainda acessa colecoes operacionais');
$evidenceController = file_get_contents(__DIR__ . '/../app/controllers/EvidenciaController.php');
high_risk_ok(substr_count($evidenceController, "requirePermission('lancamentos', 'visualizar', true)") >= 2, 'lista ou historico de evidencias nao herdou o bloqueio operacional');
$dashboardController = file_get_contents(__DIR__ . '/../app/controllers/DashboardApiController.php');
high_risk_ok(strpos($dashboardController, 'AccessPolicy::allowsGeneralDashboard($user)') !== false, 'Dashboard nao valida perfil ativo para escopo geral');
high_risk_ok(strpos($dashboardController, 'Auth::scopeFiltersForUser($user, $requestedFilters)') !== false, 'Dashboard nao reaplica escopo autenticado');

foreach (array('administrador', 'homologador', 'consultor_diretoria', 'unidade_apuradora') as $profile) {
    high_risk_ok(AccessPolicy::allows($profile, 'relatorios', 'visualizar'), 'Relatorios regrediram para ' . $profile);
    high_risk_ok(AccessPolicy::allows($profile, 'iniciativas', 'visualizar'), 'Iniciativas regrediram para ' . $profile);
}

echo 'Riscos altos: Companhia, escopo do Dashboard e reabertura GET/CSRF validados.' . PHP_EOL;
