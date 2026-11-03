<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/services/MatrizCoberturaAcessos.php';
require_once __DIR__ . '/../app/auth/Auth.php';

function coverage_ok($condition, $message)
{
    if (!$condition) {
        fwrite(STDERR, 'FALHA: ' . $message . PHP_EOL);
        exit(1);
    }
}

function coverage_row(array $matrix, string $id): array
{
    foreach ($matrix['linhas'] as $row) {
        if ($row['id'] === $id) return $row;
    }
    throw new RuntimeException('Linha não encontrada: ' . $id);
}

$units = array_map(static function ($code) {
    return array('id' => strtolower($code), 'sigla' => $code, 'nome' => $code, 'ativo' => true);
}, array('GENOL', 'SUCOL', 'SULOT', 'SURCI', 'SUCTF', 'GERIN'));
$directories = array_map(static function ($code) {
    return array('id' => strtolower($code), 'sigla' => $code, 'nome' => $code, 'ativo' => true);
}, array('DICOT', 'DICRI', 'DIFIR', 'DILOT'));
$relations = array(
    array('id' => 1, 'unidadeApuradora' => 'GENOL', 'diretoriaResponsavel' => 'DICOT', 'ativo' => true),
    array('id' => 2, 'unidadeApuradora' => 'SUCOL', 'diretoriaResponsavel' => 'DICOT', 'ativo' => true),
    array('id' => 3, 'unidadeApuradora' => 'SULOT', 'diretoriaResponsavel' => 'DICOT', 'ativo' => true),
    array('id' => 4, 'unidadeApuradora' => 'SURCI', 'diretoriaResponsavel' => 'DICRI', 'ativo' => true),
    array('id' => 5, 'unidadeApuradora' => 'SUCTF', 'diretoriaResponsavel' => 'DIFIR', 'ativo' => true),
    array('id' => 6, 'unidadeApuradora' => 'GERIN', 'diretoriaResponsavel' => 'DILOT', 'ativo' => true),
);

$oneAdministrator = array(
    array('matricula' => 'C100001', 'nome' => 'Administrador Um', 'perfil' => 'administrador', 'ativo' => 1),
    array('matricula' => 'C999999', 'nome' => 'Administrador Inativo', 'perfil' => 'administrador', 'ativo' => 0),
);
$matrix = MatrizCoberturaAcessos::build($oneAdministrator, $units, $directories, $relations);
$adminRow = coverage_row($matrix, 'administracao-geral-administrador');
coverage_ok($adminRow['ativos'] === 1 && $adminRow['esperado'] === 3, 'um Administrador deve produzir 1 / 3');
coverage_ok($adminRow['cobertura'] === 'Reduzida', 'um Administrador deve produzir cobertura reduzida');
coverage_ok($matrix['cards']['administradores'] === array('ativos' => 1, 'esperado' => 3, 'cobertura' => 'Reduzida'), 'card de Administradores deve refletir a matriz');
coverage_ok($matrix['cards']['unidadesCompletas'] === array('atuais' => 0, 'total' => 6), 'nenhuma unidade sem usuário deve estar completa');
coverage_ok($matrix['cards']['diretoriasCompletas'] === array('atuais' => 0, 'total' => 4), 'nenhuma diretoria sem usuário deve estar completa');
coverage_ok($matrix['cards']['posicoesPendentes'] === 22, 'uma posição preenchida deve deixar 22 posições pendentes');
coverage_ok(coverage_row($matrix, 'unidade-genol-preenchedor')['diretoria'] === 'DICOT', 'relação DICOT → GENOL deve vir dos indicadores');
coverage_ok(coverage_row($matrix, 'unidade-gerin-preenchedor')['diretoria'] === 'DILOT', 'relação DILOT → GERIN deve vir dos indicadores');
coverage_ok(count($adminRow['usuarios']) === 1 && !array_key_exists('email', $adminRow['usuarios'][0]), 'matriz deve expor somente matrícula e nome úteis');

$threeAdministrators = array(
    array('matricula' => 'C100001', 'nome' => 'Administrador Um', 'perfil' => 'administrador', 'ativo' => 1),
    array('matricula' => 'C100002', 'nome' => 'Administrador Dois', 'perfil' => 'administrador', 'ativo' => 1),
    array('matricula' => 'C100003', 'nome' => 'Administrador Três', 'perfil' => 'administrador', 'ativo' => 1),
);
$threeAdminMatrix = MatrizCoberturaAcessos::build($threeAdministrators, $units, $directories, $relations);
coverage_ok(coverage_row($threeAdminMatrix, 'administracao-geral-administrador')['cobertura'] === 'Completa', 'três Administradores devem produzir cobertura completa');

$unitCoverageUsers = array_merge($oneAdministrator, array(
    array('matricula' => 'C200001', 'nome' => 'Preenchedor Um', 'perfil' => 'unidade_apuradora', 'unidade_apuradora' => 'SUCOL', 'ativo' => 1),
));
$oneFillerMatrix = MatrizCoberturaAcessos::build($unitCoverageUsers, $units, $directories, $relations);
coverage_ok(coverage_row($oneFillerMatrix, 'unidade-genol-preenchedor')['cobertura'] === 'Sem cobertura', 'zero preenchedores devem produzir sem cobertura');
coverage_ok(coverage_row($oneFillerMatrix, 'unidade-sucol-preenchedor')['cobertura'] === 'Reduzida', 'um preenchedor deve produzir cobertura reduzida');
$unitCoverageUsers[] = array('matricula' => 'C200002', 'nome' => 'Preenchedor Dois', 'perfil' => 'unidade_apuradora', 'unidade_apuradora' => 'sucol', 'ativo' => 1);
$twoFillersMatrix = MatrizCoberturaAcessos::build($unitCoverageUsers, $units, $directories, $relations);
coverage_ok(coverage_row($twoFillersMatrix, 'unidade-sucol-preenchedor')['cobertura'] === 'Completa', 'dois preenchedores devem produzir cobertura completa');
coverage_ok($twoFillersMatrix['cards']['unidadesCompletas']['atuais'] === 1, 'card deve contar uma unidade completa');

$directoryUsers = array_merge($oneAdministrator, array(
    array('matricula' => 'C300001', 'nome' => 'Homologador DICOT', 'perfil' => 'homologador', 'diretoria_responsavel' => 'DICOT', 'ativo' => 1),
));
$incompleteDirectory = MatrizCoberturaAcessos::build($directoryUsers, $units, $directories, $relations);
coverage_ok($incompleteDirectory['cards']['diretoriasCompletas']['atuais'] === 0, 'diretoria sem Consultor deve permanecer incompleta');
$directoryUsers[] = array('matricula' => 'C300002', 'nome' => 'Consultor DICOT', 'perfil' => 'consultor_diretoria', 'diretoria_responsavel' => 'DICOT', 'ativo' => 1);
$completeDirectory = MatrizCoberturaAcessos::build($directoryUsers, $units, $directories, $relations);
coverage_ok($completeDirectory['cards']['diretoriasCompletas']['atuais'] === 1, 'Homologador e Consultor devem completar a diretoria');
coverage_ok(coverage_row($completeDirectory, 'diretoria-dicot-homologador')['funcao'] === 'Diretor/Homologador', 'perfil Homologador deve usar apresentação institucional');

coverage_ok(AccessPolicy::allows('administrador', 'administracao', 'gerenciar'), 'Administrador deve acessar a matriz administrativa');
foreach (array('unidade_apuradora', 'homologador', 'consultor_diretoria', 'usuario_companhia') as $profile) {
    coverage_ok(!AccessPolicy::allows($profile, 'administracao', 'gerenciar'), $profile . ' não deve acessar a matriz administrativa');
}

$conflictDetected = false;
try {
    MatrizCoberturaAcessos::build($oneAdministrator, $units, $directories, array_merge($relations, array(
        array('id' => 7, 'unidadeApuradora' => 'GENOL', 'diretoriaResponsavel' => 'DICRI', 'ativo' => true),
    )));
} catch (LogicException $error) {
    $conflictDetected = strpos($error->getMessage(), 'GENOL') !== false;
}
coverage_ok($conflictDetected, 'relação organizacional conflitante não pode ser ocultada');

echo 'Matriz de cobertura de acessos somente leitura OK' . PHP_EOL;
