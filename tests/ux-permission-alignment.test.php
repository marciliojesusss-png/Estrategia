<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/auth/Auth.php';
require_once __DIR__ . '/../app/auth/AccessPolicy.php';

function ux_permission_ok($condition, $message)
{
    if (!$condition) throw new RuntimeException('FALHA: ' . $message);
}

foreach (array('homologador', 'consultor_diretoria') as $profile) {
    ux_permission_ok(AccessPolicy::allows($profile, 'lancamentos', 'visualizar'), $profile . ' perdeu a consulta de lancamentos');
    ux_permission_ok(!AccessPolicy::allows($profile, 'lancamentos', 'gerenciar'), $profile . ' obteve escrita de lancamentos');
}

ux_permission_ok(AccessPolicy::allows('unidade_apuradora', 'homologacoes', 'visualizar'), 'Unidade perdeu o historico de homologacoes');
ux_permission_ok(!AccessPolicy::allows('unidade_apuradora', 'homologacoes', 'decidir'), 'Unidade obteve decisao de homologacao');
ux_permission_ok(AccessPolicy::allows('administrador', 'lancamentos', 'gerenciar'), 'Administrador perdeu gerenciamento de lancamentos');
ux_permission_ok(AccessPolicy::allows('unidade_apuradora', 'lancamentos', 'gerenciar'), 'Unidade perdeu gerenciamento de lancamentos');
ux_permission_ok(!AccessPolicy::allows('usuario_companhia', 'lancamentos', 'visualizar'), 'Companhia obteve acesso operacional a lancamentos');
ux_permission_ok(!AccessPolicy::allows('usuario_companhia', 'homologacoes', 'visualizar'), 'Companhia obteve acesso operacional a homologacoes');

$legacyView = file_get_contents(__DIR__ . '/../views/lancamentos/show.php');
ux_permission_ok(
    preg_match('/<\?php if \(\$canManage\): \?>\s*<form method="post" enctype="multipart\/form-data"/s', $legacyView) === 1,
    'Upload legado nao esta condicionado a canManage'
);
ux_permission_ok(strpos($legacyView, 'Baixar evidência atual') !== false, 'Download legado deixou de ficar disponivel');

echo 'Permissoes backend preservadas e UX legada condicionada ao gerenciamento.' . PHP_EOL;
