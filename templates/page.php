<?php
declare(strict_types=1);

function render_static_page(string $htmlFile): void
{
    $path = dirname(__DIR__) . DIRECTORY_SEPARATOR . $htmlFile;
    if (!is_file($path)) {
        http_response_code(404);
        echo 'Página não encontrada.';
        return;
    }

    header('Content-Type: text/html; charset=utf-8');
    $html = (string) file_get_contents($path);
    $html = str_replace(
        [
            'index.html',
            'dashboard.html',
            'resumo-executivo.html',
            'visao-trimestral.html',
            'indicadores.html',
            'lancamentos.html',
            'homologacao.html',
            'relatorios.html',
            'administracao.html',
        ],
        [
            'index.php',
            'dashboard.php',
            'resumo-executivo.php',
            'visao-trimestral.php',
            'indicadores.php',
            'lancamentos.php',
            'homologacao.php',
            'relatorios.php',
            'administracao.php',
        ],
        $html
    );
    $assetVersion = 'AVISOS-TECNICOS-ADMIN-001';
    $html = (string) preg_replace(
        '#assets/css/styles\.css(?:\?v=[^"]*)?#',
        'assets/css/styles.css?v=' . $assetVersion,
        $html
    );
    $html = (string) preg_replace(
        '#assets/js/auth\.js(?:\?v=[^"]*)?#',
        'assets/js/auth.js?v=' . $assetVersion,
        $html
    );
    $html = (string) preg_replace(
        '#assets/js/app\.js(?:\?v=[^"]*)?#',
        'assets/js/app.js?v=' . $assetVersion,
        $html
    );
    echo $html;
}
