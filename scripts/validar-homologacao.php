<?php
declare(strict_types=1);

$options = getopt('', array('base-url::'));
$baseUrl = isset($options['base-url']) ? rtrim((string) $options['base-url'], '/') : '';

function homologacao_status($label, $status, $detail = '')
{
    echo $label . ': ' . $status . ($detail !== '' ? ' - ' . $detail : '') . PHP_EOL;
    return $status === 'ok' || $status === 'pendente';
}

function http_check($baseUrl, $path, array $accepted)
{
    if ($baseUrl === '') {
        return homologacao_status($path, 'pendente', 'informe --base-url=http://servidor/estrategia');
    }

    $url = $baseUrl . '/' . ltrim($path, '/');
    $context = stream_context_create(array(
        'http' => array(
            'method' => 'GET',
            'timeout' => 10,
            'ignore_errors' => true,
        ),
    ));
    $body = @file_get_contents($url, false, $context);
    $headers = isset($GLOBALS['http_response_header']) ? $GLOBALS['http_response_header'] : array();
    $status = 0;
    if ($headers && preg_match('#HTTP/\S+\s+(\d{3})#', $headers[0], $match)) {
        $status = (int) $match[1];
    }

    $ok = in_array($status, $accepted, true) && $body !== false;
    return homologacao_status($path, $ok ? 'ok' : 'falha', 'HTTP ' . ($status ?: 'sem resposta'));
}

$ok = true;

echo 'Homologacao funcional' . PHP_EOL;
echo 'Base URL: ' . ($baseUrl !== '' ? $baseUrl : 'nao informada') . PHP_EOL;

$ok = http_check($baseUrl, '/saude', array(200)) && $ok;
$ok = http_check($baseUrl, '/', array(200, 302, 401)) && $ok;
$ok = http_check($baseUrl, '/dashboard', array(200, 302, 401, 403)) && $ok;
$ok = http_check($baseUrl, '/indicadores', array(200, 302, 401, 403)) && $ok;
$ok = http_check($baseUrl, '/assets/css/styles.css', array(200)) && $ok;

$artifacts = array(
    'script preflight' => __DIR__ . '/preflight-servidor.php',
    'script permissoes' => __DIR__ . '/verificar-permissoes.php',
    'script banco/schema/usuarios' => __DIR__ . '/validar-banco-schema-usuarios.php',
    'teste seguranca/publicacao' => dirname(__DIR__) . '/tests/security-publication.test.php',
    'teste autenticacao/autorizacao' => dirname(__DIR__) . '/tests/auth-authorization.test.php',
    'teste lancamentos/evidencias' => dirname(__DIR__) . '/tests/launches-evidence-module.test.php',
    'teste homologacoes' => dirname(__DIR__) . '/tests/homologations-module.test.php',
    'teste administracao/auditoria' => dirname(__DIR__) . '/tests/administration-audit-module.test.php',
);

foreach ($artifacts as $label => $path) {
    $ok = homologacao_status($label, is_file($path) ? 'ok' : 'falha') && $ok;
}

$manual = array(
    'usuario corporativo identificado',
    'upload e download de evidencia via navegador',
    'administrador cadastra e edita indicador',
    'administrador consulta auditoria e administra usuarios',
    'unidade apuradora cria rascunho e submete lancamento',
    'homologador aprova, rejeita e consulta historico',
    'usuario companhia consulta dashboard e relatorios',
    'usuario sem cadastro recebe acesso negado',
    'CSRF exigido em alteracoes',
    'mensagens nao exibem credenciais',
);

foreach ($manual as $item) {
    homologacao_status($item, 'pendente', 'validacao manual em homologacao');
}

exit($ok ? 0 : 1);
