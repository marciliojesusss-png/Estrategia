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
check_admin_access($normalized['diretoria_responsavel'] === 'DICRI', 'diretoria_responsavel deve ser persistida');
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

echo 'Testes de atualizacao de acessos administrativos OK' . PHP_EOL;
