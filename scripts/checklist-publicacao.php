<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/config/config.php';

function checklist_line($label, $ok, $detail = '')
{
    echo $label . ': ' . ($ok ? 'ok' : 'pendente') . ($detail !== '' ? ' - ' . $detail : '') . PHP_EOL;
    return $ok;
}

$root = dirname(__DIR__);
$ok = true;

echo 'Checklist de publicacao e rollback' . PHP_EOL;

$requiredFiles = array(
    'preflight' => $root . '/scripts/preflight-servidor.php',
    'validacao de banco' => $root . '/scripts/validar-banco-schema-usuarios.php',
    'validacao de permissoes' => $root . '/scripts/verificar-permissoes.php',
    'validacao de homologacao' => $root . '/scripts/validar-homologacao.php',
    'schema SQL Server' => $root . '/database/sqlserver/schema.sql',
    'modelo usuarios_acesso' => $root . '/database/sqlserver/usuarios-acesso.example.sql',
    'web.config public' => $root . '/public/web.config',
    'web.config raiz alternativo' => $root . '/web.config',
);

foreach ($requiredFiles as $label => $path) {
    $ok = checklist_line($label, is_file($path)) && $ok;
}

$ok = checklist_line('APP_BASE_PATH', APP_BASE_PATH === '/estrategia', APP_BASE_PATH === '' ? '/' : APP_BASE_PATH) && $ok;
$ok = checklist_line('servidor.local.php preservado externamente', !is_file($root . '/app/config/servidor.local.php'), 'arquivo local nao deve entrar no pacote versionado') && $ok;
$ok = checklist_line('uploads fora do public', is_dir($root . '/uploads/evidencias') && !is_dir($root . '/public/uploads')) && $ok;
$ok = checklist_line('diagnostico IIS temporario', is_file($root . '/public/diagnostico-iis.php'), 'remover apos homologacao') && $ok;

echo PHP_EOL . 'Pendencias operacionais obrigatorias:' . PHP_EOL;
echo '- backup do banco antes da publicacao' . PHP_EOL;
echo '- backup da aplicacao anterior' . PHP_EOL;
echo '- backup de app/config/servidor.local.php no servidor' . PHP_EOL;
echo '- preservacao de uploads existentes' . PHP_EOL;
echo '- execucao do preflight no servidor' . PHP_EOL;
echo '- plano de rollback com caminho IIS anterior documentado' . PHP_EOL;

exit($ok ? 0 : 1);
