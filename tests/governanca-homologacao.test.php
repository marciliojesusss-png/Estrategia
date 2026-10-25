<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/services/GovernancaHomologacao.php';
require_once __DIR__ . '/../app/services/LancamentoStateMachine.php';
require_once __DIR__ . '/../app/auth/Auth.php';
require_once __DIR__ . '/../app/auth/AccessPolicy.php';
require_once __DIR__ . '/../app/repositories/ConfiguracoesRepository.php';

final class FakeCouncilConfigStatement
{
    private $db;
    private $sql;
    private $result = 0;
    public function __construct($db, $sql) { $this->db = $db; $this->sql = $sql; }
    public function execute($params)
    {
        if (strpos($this->sql, 'SELECT COUNT(*)') === 0) {
            $this->result = array_key_exists($params[':chave'], $this->db->rows) ? 1 : 0;
        } elseif (strpos($this->sql, 'INSERT INTO configuracoes') === 0) {
            $this->db->rows[$params[':chave']] = $params[':valor'];
        } elseif (strpos($this->sql, 'UPDATE configuracoes') === 0) {
            $this->db->rows[$params[':chave']] = $params[':valor'];
        }
        return true;
    }
    public function fetchColumn() { return $this->result; }
}

final class FakeCouncilConfigDb
{
    public $rows = array();
    public function prepare($sql) { return new FakeCouncilConfigStatement($this, $sql); }
}

function governance_ok($condition, $message)
{
    if (!$condition) {
        fwrite(STDERR, 'FALHA: ' . $message . PHP_EOL);
        exit(1);
    }
}

function governance_throws($class, $callback, $message)
{
    try {
        call_user_func($callback);
    } catch (Throwable $error) {
        governance_ok($error instanceof $class, $message . ' (excecao incorreta)');
        return $error;
    }
    governance_ok(false, $message . ' (nenhuma excecao)');
}

$consultant = array('perfil' => 'consultor_diretoria', 'matricula' => 'C200002', 'diretoria_responsavel' => 'DIFIR');
$director = array('perfil' => 'homologador', 'matricula' => 'C300003', 'diretoria_responsavel' => 'DIFIR');
$admin = array('perfil' => 'administrador', 'matricula' => 'C100001', 'diretoria_responsavel' => '');
$unit = array('perfil' => 'unidade_apuradora', 'matricula' => 'C400004', 'unidade_apuradora' => 'SUCOL');
$launch = array(
    'id' => 'lancamento-1', 'indicadorId' => 7, 'competencia' => '2026-09',
    'diretoriaResponsavel' => 'DIFIR', 'status' => 'Homologado', 'usuarioResponsavel' => 'C400004',
);
$closures = GovernancaHomologacao::validateClosures(array(array(
    'id' => 'ca-3tri-2026', 'periodo' => '3TRI/2026',
    'competencias' => array('2026-07', '2026-08', '2026-09'),
    'dataReuniao' => '2026-10-22', 'dataFechamento' => '2026-10-15', 'ativo' => true,
)));

// Perfil, permissao e escopo.
governance_ok(Auth::normalizeProfile('Consultor da Diretoria') === 'consultor_diretoria', 'consultor deve ser perfil valido e distinto');
governance_ok(AccessPolicy::allows('consultor_diretoria', 'homologacoes', 'decidir'), 'consultor deve decidir homologacao');
governance_ok(!AccessPolicy::allows('consultor_diretoria', 'lancamentos', 'gerenciar'), 'consultor nao deve preencher lancamento');
governance_ok(!AccessPolicy::allows('consultor_diretoria', 'administracao', 'gerenciar'), 'consultor nao deve administrar');
governance_ok(AccessPolicy::scopeAllows($consultant, $launch), 'consultor DIFIR deve acessar DIFIR');
governance_ok(!AccessPolicy::scopeAllows($consultant, array_merge($launch, array('diretoriaResponsavel' => 'DICOT'))), 'consultor DIFIR nao deve acessar DICOT');

// Segregacao permanece vinculada a matricula, inclusive apos troca de perfil.
GovernancaHomologacao::assertIndependentReviewer($launch, 'C400004', $consultant);
$selfLaunch = array_merge($launch, array('usuarioResponsavel' => 'CORPCAIXA\\C200002'));
$error = governance_throws('UnexpectedValueException', function () use ($selfLaunch, $consultant) {
    GovernancaHomologacao::assertIndependentReviewer($selfLaunch, '', $consultant);
}, 'consultor nao pode homologar o que preencheu');
governance_ok(strpos($error->getMessage(), 'participou do preenchimento ou envio') !== false, 'mensagem de auto-homologacao deve ser clara');
governance_throws('UnexpectedValueException', function () use ($launch, $director) {
    GovernancaHomologacao::assertIndependentReviewer($launch, 'C300003', $director);
}, 'homologador nao pode homologar o que enviou');
governance_throws('UnexpectedValueException', function () use ($launch, $consultant) {
    GovernancaHomologacao::assertIndependentReviewer($launch, 'C200002', $consultant);
}, 'troca posterior para consultor nao remove autoria do envio');
governance_throws('UnexpectedValueException', function () use ($launch, $admin) {
    GovernancaHomologacao::assertIndependentReviewer(array_merge($launch, array('usuarioResponsavel' => 'C100001')), '', $admin);
}, 'administrador tambem deve respeitar segregacao');

// Participacao historica permanece vinculada a matricula depois da troca de perfil.
$historicalLaunch = array_merge($launch, array('usuarioResponsavel' => 'C300003'));
governance_throws('UnexpectedValueException', function () use ($historicalLaunch, $consultant) {
    GovernancaHomologacao::assertIndependentReviewer(
        $historicalLaunch,
        'C300003',
        $consultant,
        array('CORPCAIXA\\C200002', 'C300003')
    );
}, 'autor historico nao pode homologar depois de virar consultor');
GovernancaHomologacao::assertIndependentReviewer($historicalLaunch, 'C300003', array_merge($consultant, array('matricula'=>'C900009')), array('C200002'));
$productionActions = GovernancaHomologacao::productionActions();
governance_ok(in_array('lancamento_alterado', $productionActions, true), 'alteracao deve identificar participante');
governance_ok(in_array('envio_para_homologacao', $productionActions, true), 'envio legado deve identificar participante');
governance_ok(!in_array('homologacao_lancamento', $productionActions, true), 'homologacao nao deve identificar autor do preenchimento');
governance_ok(!in_array('meta_propagada_lancamento', $productionActions, true), 'propagacao automatica nao deve identificar autor');

// Janela: antes permite; na data e depois bloqueia.
foreach (array($consultant, $director) as $reviewer) {
    governance_ok(GovernancaHomologacao::reopenPolicy($launch, $reviewer, $closures, '2026-10-14')['permitida'], 'diretoria deve reabrir antes do fechamento');
    governance_ok(!GovernancaHomologacao::reopenPolicy($launch, $reviewer, $closures, '2026-10-15')['permitida'], 'diretoria deve bloquear na data do fechamento');
    governance_ok(!GovernancaHomologacao::reopenPolicy($launch, $reviewer, $closures, '2026-10-16')['permitida'], 'diretoria deve bloquear apos fechamento');
    governance_ok(!GovernancaHomologacao::reopenPolicy($launch, $reviewer, array(), '2026-10-14')['permitida'], 'diretoria deve bloquear sem configuracao');
}
governance_ok(GovernancaHomologacao::reopenPolicy($launch, $admin, $closures, '2026-10-14')['permitida'], 'administrador deve reabrir antes do fechamento');
$exceptional = GovernancaHomologacao::reopenPolicy($launch, $admin, $closures, '2026-10-15');
governance_ok($exceptional['permitida'] && $exceptional['excepcional'], 'administrador deve ter excecao pos-fechamento');
governance_ok(!GovernancaHomologacao::reopenPolicy($launch, $unit, $closures, '2026-10-14')['permitida'], 'unidade nao deve reabrir diretamente');
governance_ok(!GovernancaHomologacao::reopenPolicy(array_merge($launch, array('diretoriaResponsavel' => 'DICOT')), $consultant, $closures, '2026-10-14')['permitida'], 'escopo deve vir do lancamento persistido');

// Congelamento real e ciclo excepcional.
governance_ok(GovernancaHomologacao::launchMutationPolicy($launch, $closures, false, '2026-10-14')['permitida'], 'unidade deve editar antes do fechamento');
$closedMutation = GovernancaHomologacao::launchMutationPolicy($launch, $closures, false, '2026-10-15');
governance_ok(!$closedMutation['permitida'], 'unidade deve bloquear gravacao na data do fechamento');
governance_ok(strpos($closedMutation['mensagem'], '15/10/2026') !== false, 'bloqueio deve informar data do fechamento');
governance_ok(GovernancaHomologacao::launchMutationPolicy($launch, $closures, true, '2026-10-15')['permitida'], 'ciclo excepcional deve permitir correcao apos fechamento');
governance_ok(GovernancaHomologacao::exceptionalCycleActiveFromActions(array('reabertura_excepcional_pos_fechamento_ca')), 'reabertura excepcional deve abrir ciclo');
governance_ok(GovernancaHomologacao::exceptionalCycleActiveFromActions(array('submissao_lancamento', 'reabertura_excepcional_pos_fechamento_ca')), 'submissao intermediaria deve manter ciclo');
governance_ok(!GovernancaHomologacao::exceptionalCycleActiveFromActions(array('homologacao_lancamento', 'reabertura_excepcional_pos_fechamento_ca')), 'nova homologacao deve encerrar ciclo');
governance_ok(!GovernancaHomologacao::exceptionalCycleActiveFromActions(array('lancamento_reaberto', 'reabertura_excepcional_pos_fechamento_ca')), 'nova reabertura normal nao deve herdar excecao antiga');
governance_throws('DomainException', function () use ($launch, $closures) {
    GovernancaHomologacao::assertLaunchMutable($launch, $closures, false, '2026-10-15');
}, 'salvar e enviar devem ser bloqueados pelo backend apos fechamento');

// Configuracao valida e conflitos.
governance_throws('LogicException', function () use ($closures) {
    GovernancaHomologacao::validateClosures(array($closures[0], array_merge($closures[0], array('id' => 'conflito', 'periodo' => 'OUTRO'))));
}, 'competencia ativa conflitante deve ser rejeitada');
governance_throws('DomainException', function () use ($closures) {
    GovernancaHomologacao::validateClosures(array(array_merge($closures[0], array('dataFechamento' => '2026-10-22'))));
}, 'fechamento deve anteceder reuniao');

$launchService = file_get_contents(__DIR__ . '/../app/services/LancamentoService.php');
$homologationService = file_get_contents(__DIR__ . '/../app/services/HomologacaoService.php');
$homologationRepository = file_get_contents(__DIR__ . '/../app/repositories/HomologacoesRepository.php');
$baseService = file_get_contents(__DIR__ . '/../app/services/BaseDadosService.php');
$legacyRequests = file_get_contents(__DIR__ . '/../api/solicitacoes-reabertura.php');
$legacyDatabaseJs = file_get_contents(__DIR__ . '/../assets/js/databaseService.js');
$genericDatabaseApi = file_get_contents(__DIR__ . '/../api/database.php');
$configRepository = file_get_contents(__DIR__ . '/../app/repositories/ConfiguracoesRepository.php');
$adminService = file_get_contents(__DIR__ . '/../app/services/AdministracaoService.php');
governance_ok(strpos($launchService, "reabertura_excepcional_pos_fechamento_ca") !== false, 'reabertura excepcional deve ter auditoria especifica');
governance_ok(strpos($launchService, "Justificativa obrigatoria") !== false, 'reabertura deve exigir justificativa');
governance_ok(strpos($launchService, '$reason=trim((string)$reason)') !== false, 'backend deve rejeitar justificativa vazia ou composta por espacos');
governance_ok(strpos($launchService, '$ownsTransaction=!$this->db->inTransaction()') !== false, 'reabertura central deve reutilizar transacao externa sem aninhar');
governance_ok(strpos($launchService, 'assertMutable($before)') !== false && strpos($launchService, 'assertMutable($x)') !== false, 'update e submit devem aplicar congelamento central');
governance_ok(strpos($baseService, 'assertLaunchMutable($before)') !== false, 'fluxo central legado deve aplicar congelamento');
governance_ok(strpos($homologationService, 'productionParticipantUsers') !== false, 'decisao deve consultar participantes historicos');
governance_ok(strpos($homologationRepository, 'lancamento_criado') === false, 'acoes de producao devem permanecer centralizadas na governanca');
governance_ok(strpos($legacyRequests, '$lancamentoService->reopen(') !== false, 'solicitacao antiga aprovada deve usar reabertura central');
governance_ok(strpos($legacyRequests, "updateStatus(") === false, 'solicitacao antiga nao pode alterar status diretamente');
governance_ok(strpos($legacyRequests, 'Novas solicitacoes administrativas de reabertura nao sao aceitas') !== false, 'novas solicitacoes legadas devem permanecer desativadas');
governance_ok(strpos($legacyDatabaseJs, 'status: "Reaberto"') === false, 'helper JavaScript legado deve usar endpoint central de reabertura');
governance_ok(
    strpos($baseService, 'Lancamento em ciclo transacional deve ser alterado exclusivamente por PATCH /api/lancamentos/{id}.') !== false
    && strpos($baseService, 'LancamentoStateMachine::REOPENED') !== false
    && strpos($baseService, 'LancamentoStateMachine::RECTIFIED') !== false
    && strpos($baseService, 'LancamentoStateMachine::HOMOLOGATED') !== false,
    'gravacao em lote nao pode contornar reabertura, retificacao ou homologacao central'
);
governance_ok(strpos($baseService, 'Homologacoes devem ser gravadas exclusivamente pelo fluxo oficial de decisao') !== false, 'eventos de homologacao nao podem ser fabricados pela API generica');
governance_ok(strpos($genericDatabaseApi, 'Lancamentos devem ser gravados exclusivamente pelas acoes oficiais') !== false, 'API generica nao pode alterar lancamentos fora do fluxo auditado');
$fakeConfigDb = new FakeCouncilConfigDb();
$config = new ConfiguracoesRepository($fakeConfigDb);
$config->setCouncilClosures($closures);
governance_ok(isset($fakeConfigDb->rows[GovernancaHomologacao::CLOSURES_KEY]), 'chave inicial deve ser criada pela aplicacao sem migration');
$config->setCouncilClosures(array());
governance_ok(json_decode($fakeConfigDb->rows[GovernancaHomologacao::CLOSURES_KEY], true) === array(), 'chave existente deve ser atualizada com seguranca');
governance_ok(strpos($configRepository, 'INSERT INTO configuracoes') !== false, 'repositorio deve conter criacao explicita da chave reservada');
governance_ok(strpos($adminService, 'fechamento_ca_configuracao_alterada') !== false, 'alteracao do fechamento deve ser auditada');
governance_ok(LancamentoStateMachine::editable(LancamentoStateMachine::REOPENED), 'fluxo reaberto deve continuar editavel');

echo 'Governanca de homologacao, segregacao e fechamento CA OK' . PHP_EOL;
