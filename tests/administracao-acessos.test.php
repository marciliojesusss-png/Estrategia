<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/services/AdministracaoService.php';

function check_admin_access($condition, $message)
{
    if (!$condition) {
        fwrite(STDERR, 'FALHA: ' . $message . PHP_EOL);
        exit(1);
    }
}

final class FakeAccessAdministrationDb
{
    private $transaction = false;
    public function beginTransaction() { $this->transaction = true; }
    public function commit() { $this->transaction = false; }
    public function rollBack() { $this->transaction = false; }
    public function inTransaction() { return $this->transaction; }
}

final class FakeAccessAdministrationRepository
{
    public $users = array();
    public function __construct()
    {
        foreach (array(1 => 'C100001', 2 => 'C100002', 3 => 'C100003') as $id => $matricula) {
            $this->users[$id] = array(
                'id' => $id, 'matricula' => $matricula, 'nome' => 'Administrador ' . $matricula,
                'email' => null, 'perfil' => 'administrador', 'sg_unidade' => '', 'no_unidade' => '',
                'unidade_apuradora' => null, 'diretoria_responsavel' => null, 'ativo' => 1,
            );
        }
    }
    public function findUser($id) { return isset($this->users[(int) $id]) ? $this->users[(int) $id] : null; }
    public function matriculaExists($matricula, $ignore = null)
    {
        foreach ($this->users as $id => $user) {
            if ((int) $id !== (int) $ignore && $user['matricula'] === $matricula) return true;
        }
        return false;
    }
    public function activeAdmins()
    {
        return count(array_filter($this->users, function ($user) {
            return $user['perfil'] === 'administrador' && (int) $user['ativo'] === 1;
        }));
    }
    public function updateUser($id, array $data)
    {
        $this->users[(int) $id] = array_merge(array('id' => (int) $id), $data);
        return $this->users[(int) $id];
    }
}

final class FakeAccessAdministrationAudit
{
    public $events = array();
    public function append(array $event) { $this->events[] = $event; }
}

$serviceReflection = new ReflectionClass('AdministracaoService');
$service = $serviceReflection->newInstanceWithoutConstructor();
$validateUser = $serviceReflection->getMethod('validateUser');
$validateUser->setAccessible(true);

$normalized = $validateUser->invoke($service, array(
    'matricula' => 'c129446',
    'nome' => 'Gustavo Freitas Arruda',
    'email' => 'gustavo@example.test',
    'perfil' => 'unidade_apuradora',
    'sgUnidade' => 'surci',
    'noUnidade' => 'SURCI',
    'unidadeApuradora' => 'surci',
    'diretoriaResponsavel' => 'dicri',
    'ativo' => true,
));

check_admin_access($normalized['matricula'] === 'C129446', 'matricula deve ser normalizada');
check_admin_access($normalized['email'] === 'gustavo@example.test', 'email deve ser preservado');
check_admin_access($normalized['sg_unidade'] === 'SURCI', 'sg_unidade deve ser normalizada');
check_admin_access($normalized['unidade_apuradora'] === 'SURCI', 'unidade_apuradora deve ser persistida');
check_admin_access($normalized['diretoria_responsavel'] === null, 'unidade apuradora nao deve manter diretoria incompatível');
check_admin_access($normalized['ativo'] === true, 'status ativo deve ser preservado');

$invalidEmailRejected = false;
try {
    $validateUser->invoke($service, array(
        'matricula' => 'C129446',
        'nome' => 'Gustavo Freitas Arruda',
        'email' => 'email-invalido',
        'perfil' => 'unidade_apuradora',
    ));
} catch (DomainException $error) {
    $invalidEmailRejected = true;
}
check_admin_access($invalidEmailRejected, 'email invalido deve ser rejeitado');

$consultant = $validateUser->invoke($service, array(
    'matricula' => 'C200002',
    'nome' => 'Consultor DIFIR',
    'perfil' => 'consultor_diretoria',
    'unidadeApuradora' => 'SUCOL',
    'diretoriaResponsavel' => 'DIFIR',
    'ativo' => true,
));
check_admin_access($consultant['perfil'] === 'consultor_diretoria', 'consultor deve ser aceito como perfil distinto');
check_admin_access($consultant['diretoria_responsavel'] === 'DIFIR', 'consultor deve exigir e manter diretoria');
check_admin_access($consultant['unidade_apuradora'] === null, 'consultor nao deve manter unidade apuradora incompatível');

$administrators = array();
foreach (array('C100001', 'C100002', 'C100003') as $matricula) {
    $administrators[] = $validateUser->invoke($service, array(
        'matricula' => $matricula,
        'nome' => 'Administrador ' . $matricula,
        'perfil' => 'administrador',
        'ativo' => true,
    ));
}
check_admin_access(count($administrators) === 3, 'cadastro deve aceitar tres Administradores individuais');
foreach ($administrators as $administrator) {
    check_admin_access($administrator['perfil'] === 'administrador', 'todos devem usar o mesmo perfil tecnico Administrador');
    check_admin_access($administrator['ativo'] === true, 'os tres Administradores podem permanecer ativos');
}

$repository = file_get_contents(__DIR__ . '/../app/repositories/AdministracaoRepository.php');
foreach (array('email', 'unidade_apuradora', 'diretoria_responsavel') as $column) {
    check_admin_access(strpos($repository, $column) !== false, 'repository deve tratar ' . $column);
}
check_admin_access(strpos($repository, 'OUTPUT INSERTED.id') !== false, 'cadastro deve obter o id na mesma instrucao INSERT');
check_admin_access(strpos($repository, 'SCOPE_IDENTITY()') === false, 'cadastro nao deve consultar SCOPE_IDENTITY em outro batch');

$admin = file_get_contents(__DIR__ . '/../assets/js/admin.js');
$publicAdmin = file_get_contents(__DIR__ . '/../public/assets/js/admin.js');
check_admin_access($admin === $publicAdmin, 'as duas copias de admin.js devem permanecer sincronizadas');
check_admin_access(strpos($admin, 'method: "POST"') !== false, 'salvamento deve usar POST compativel com IIS');
check_admin_access(strpos($admin, 'method: payload.id ? "PUT" : "POST"') === false, 'atualizacao nao deve continuar usando PUT');
check_admin_access(strpos($admin, 'function normalizeAccessUser') !== false, 'resposta da API deve ser normalizada');

$controller = file_get_contents(__DIR__ . '/../app/controllers/AdministracaoApiController.php');
check_admin_access(strpos($controller, "array('POST','PUT','PATCH')") !== false, 'controlador deve aceitar POST para atualizacao por id');

$serviceSource = file_get_contents(__DIR__ . '/../app/services/AdministracaoService.php');
check_admin_access(strpos($serviceSource, '$this->repo->activeAdmins()<=1') !== false, 'ultimo Administrador ativo deve permanecer protegido');
check_admin_access(strpos($serviceSource, "'usuario_alterado':'usuario_criado'") !== false, 'alteracoes de acesso devem permanecer auditadas');

$schema = file_get_contents(__DIR__ . '/../database/sqlserver/schema.sql');
check_admin_access(strpos($schema, 'uq_usuarios_acesso_matricula UNIQUE (matricula)') !== false, 'matriculas administrativas devem ser individuais');
check_admin_access(strpos($schema, 'UNIQUE (perfil)') === false, 'banco nao deve limitar o perfil Administrador a uma unica matricula');

$authSource = file_get_contents(__DIR__ . '/../app/auth/Auth.php');
check_admin_access(strpos($authSource, "'perfil_original' => \$originalProfile") !== false, 'perfil original deve permanecer no contexto autenticado');
check_admin_access(strpos($authSource, "\$user['perfil'] = \$view['perfil']") !== false, 'Visualizar como deve alterar apenas o contexto operacional');
check_admin_access(strpos($authSource, "WHERE matricula = :matricula AND ativo = 1") !== false, 'somente perfil operacional ativo deve ser carregado');
check_admin_access(strpos($authSource, "'perfil' => self::DEFAULT_PROFILE") !== false, 'empregado LDAP sem perfil especial ativo deve assumir Usuario Companhia');

$governanceDocumentation = file_get_contents(__DIR__ . '/../docs/governanca-acessos.md');
check_admin_access(strpos($governanceDocumentation, 'exceção administrativa aceita e controlada') !== false, 'documentacao deve registrar a excecao deliberada');
check_admin_access(strpos($governanceDocumentation, '3 Administradores ativos') !== false, 'documentacao deve registrar a cobertura administrativa desejada');

$flowService = $serviceReflection->newInstanceWithoutConstructor();
$fakeDb = new FakeAccessAdministrationDb();
$fakeRepository = new FakeAccessAdministrationRepository();
$fakeAudit = new FakeAccessAdministrationAudit();
foreach (array('db' => $fakeDb, 'repo' => $fakeRepository, 'audit' => $fakeAudit) as $property => $value) {
    $reflectedProperty = $serviceReflection->getProperty($property);
    $reflectedProperty->setAccessible(true);
    $reflectedProperty->setValue($flowService, $value);
}
$actor = array('matricula' => 'C900001', 'perfil' => 'administrador');
foreach (array(1, 2) as $id) {
    $current = $fakeRepository->findUser($id);
    $flowService->saveUser($id, array_merge($current, array('ativo' => false)), $actor);
}
check_admin_access($fakeRepository->activeAdmins() === 1, 'inativacoes sucessivas devem preservar um Administrador ativo');
$lastAdministratorBlocked = false;
try {
    $current = $fakeRepository->findUser(3);
    $flowService->saveUser(3, array_merge($current, array('ativo' => false)), $actor);
} catch (LogicException $error) {
    $lastAdministratorBlocked = strpos($error->getMessage(), 'ao menos um administrador ativo') !== false;
}
check_admin_access($lastAdministratorBlocked, 'ultimo Administrador ativo deve ser bloqueado');
check_admin_access($fakeRepository->activeAdmins() === 1, 'bloqueio nao pode inativar o ultimo Administrador');
check_admin_access(count($fakeAudit->events) === 2, 'cada inativacao permitida deve possuir auditoria individual');
check_admin_access($fakeAudit->events[0]['usuario'] === 'C900001', 'auditoria deve preservar a matricula real do Administrador executor');

echo 'Testes de atualizacao de acessos administrativos OK' . PHP_EOL;
