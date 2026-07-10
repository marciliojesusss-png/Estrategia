<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/auth/Auth.php';

function render_legacy_page($viewFile)
{
    $path = APP_ROOT . '/views/legacy/' . basename($viewFile);
    if (!is_file($path)) {
        http_response_code(404);
        echo 'Página não encontrada.';
        return;
    }

    header('Content-Type: text/html; charset=utf-8');
    $html = (string) file_get_contents($path);
    $assetVersion = 'AUTH-CORPORATIVA-001';
    $authUser = json_encode(
        Auth::currentUserForFrontend(),
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
    );
    $authScript = "<script>window.CAIXA_LOTERIAS_AUTH_USER = {$authUser};</script>\n";
    $html = str_replace('</head>', $authScript . '</head>', $html);
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

function render_protected_page($viewFile, array $profiles)
{
    Auth::requireProfiles($profiles);
    render_legacy_page($viewFile);
}
