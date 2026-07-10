<?php
declare(strict_types=1);

ob_start();
putenv('APP_ENV=local');
putenv('DB_CONNECTION=sqlite');
putenv('SESSION_IDLE_TIMEOUT=1');
require_once __DIR__ . '/../app/bootstrap.php';
require_once __DIR__ . '/../app/auth/Auth.php';
require_once __DIR__ . '/../app/auth/AccessPolicy.php';
require_once __DIR__ . '/../app/auth/CorporateIdentity.php';

function assert_auth($condition, $message)
{
    if (!$condition) {
        ob_end_clean();
        fwrite(STDERR, 'FALHA: ' . $message . PHP_EOL);
        exit(1);
    }
}

$profiles = array('administrador', 'homologador', 'unidade_apuradora', 'usuario_companhia');
foreach ($profiles as $profile) {
    assert_auth(AccessPolicy::allows($profile, 'dashboard', 'visualizar'), $profile . ' deve visualizar dashboard');
}
assert_auth(AccessPolicy::allows('administrador', 'administracao', 'gerenciar'), 'administrador deve gerenciar administracao');
assert_auth(!AccessPolicy::allows('homologador', 'administracao', 'gerenciar'), 'homologador nao deve gerenciar administracao');
assert_auth(AccessPolicy::allows('unidade_apuradora', 'lancamentos', 'gerenciar'), 'unidade deve gerenciar lancamentos');
assert_auth(!AccessPolicy::allows('homologador', 'lancamentos', 'gerenciar'), 'homologador nao deve editar lancamentos');
assert_auth(AccessPolicy::allows('homologador', 'homologacoes', 'decidir'), 'homologador deve decidir homologacao');
assert_auth(!AccessPolicy::allows('usuario_companhia', 'homologacoes', 'decidir'), 'usuario companhia nao deve homologar');

$unitUser = array('perfil' => 'unidade_apuradora', 'unidade_apuradora' => 'SUCOL');
assert_auth(AccessPolicy::scopeAllows($unitUser, array('unidadeApuradora' => ' sucol ')), 'escopo de unidade deve normalizar caixa e espacos');
assert_auth(!AccessPolicy::scopeAllows($unitUser, array('unidadeApuradora' => 'GERIN')), 'unidade diferente deve ser negada');
$approver = array('perfil' => 'homologador', 'diretoria_responsavel' => 'DIFIR');
assert_auth(AccessPolicy::scopeAllows($approver, array('diretoriaResponsavel' => 'DIFIR')), 'homologador deve acessar sua diretoria');
assert_auth(!AccessPolicy::scopeAllows($approver, array('diretoriaResponsavel' => 'DICOT')), 'homologador nao deve acessar outra diretoria');

$identity = CorporateIdentity::load(__DIR__ . '/fixtures/ldap-valid.php');
assert_auth(is_array($identity) && $identity['matricula'] === 'C123456', 'identidade corporativa deve extrair matricula valida');

Session::start();
$_SESSION['_last_activity'] = time() - 5;
Session::start();
assert_auth(Session::consumeExpired(), 'sessao inativa deve expirar');

AccessLogger::record('teste_autorizacao', array('matricula' => 'C123456', 'nome' => 'Teste', 'perfil' => 'administrador', 'sg_unidade' => 'SUCOL'));
$row = Database::getConnection()->query('SELECT user_agent FROM acessos_log ORDER BY id DESC LIMIT 1')->fetchColumn();
assert_auth(strpos((string) $row, '[evento=teste_autorizacao]') === 0, 'evento deve ser registrado usando coluna existente');

ob_end_clean();
echo 'Testes de autenticacao e autorizacao OK' . PHP_EOL;
