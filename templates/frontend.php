<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/auth/Auth.php';

function render_frontend_page($viewFile)
{
    $path = APP_ROOT . '/views/frontend/' . basename($viewFile);
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
    $csrfToken = json_encode(Auth::csrfToken(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    $basePath = json_encode(APP_BASE_PATH, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    $authScript = "<script>window.CAIXA_LOTERIAS_AUTH_USER = {$authUser};window.CAIXA_LOTERIAS_CSRF_TOKEN = {$csrfToken};window.APP_BASE_PATH = {$basePath};window.appUrl=function(path){return window.APP_BASE_PATH+'/'+String(path||'').replace(/^\\/+/, '')};(function(){var originalFetch=window.fetch;if(!originalFetch)return;window.fetch=function(input,options){if(typeof input==='string'&&input.charAt(0)==='/'&&input.indexOf(window.APP_BASE_PATH+'/')!==0)input=window.APP_BASE_PATH+input;return originalFetch.call(window,input,options);};})();</script>\n<script src=\"" . APP_BASE_PATH . "/assets/js/logout-modal.js?v=LOGOUT-MODAL-001\" defer></script>\n";
    $html = str_replace('</head>', $authScript . '</head>', $html);
    $html = (string) preg_replace(
        '#assets/css/styles\.css(?:\?v=[^"]*)?#',
        'assets/css/styles.css?v=' . $assetVersion,
        $html
    );
    $html = str_replace(array('href="/', 'src="/', 'action="/'), array('href="' . APP_BASE_PATH . '/', 'src="' . APP_BASE_PATH . '/', 'action="' . APP_BASE_PATH . '/'), $html);
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
    render_frontend_page($viewFile);
}
