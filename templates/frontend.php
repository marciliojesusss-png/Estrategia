<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/auth/Auth.php';
require_once __DIR__ . '/../app/helpers/helpers.php';

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
    $isLocal = Auth::isLocal() ? 'true' : 'false';
    $authUser = json_encode(
        Auth::currentUserForFrontend(),
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
    );
    $csrfToken = json_encode(Auth::csrfToken(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    $basePath = json_encode(APP_BASE_PATH, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    $publicPrefix = json_encode(app_public_url_prefix(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    $logoutScript = e(asset_url('assets/js/logout-modal.js?v=LOGOUT-MODAL-001'));
    $authScript = <<<HTML
<script>
window.CAIXA_LOTERIAS_AUTH_USER = {$authUser};
window.CAIXA_LOTERIAS_CSRF_TOKEN = {$csrfToken};
window.CAIXA_LOTERIAS_IS_LOCAL = {$isLocal};
window.APP_BASE_PATH = {$basePath};
window.APP_PUBLIC_URL_PREFIX = {$publicPrefix};
window.normalizeAppRoute = function(route) {
  route = String(route || 'dashboard').replace(/^\/+|\/+$/g, '');
  route = route || 'dashboard';
  return route.replace(/^api\/([^\/?]+)\.php$/i, 'api/$1');
};
window.appUrl = function(route, params) {
  route = String(route || 'dashboard');
  var hashIndex = route.indexOf('#');
  var hash = hashIndex >= 0 ? route.slice(hashIndex) : '';
  if (hashIndex >= 0) route = route.slice(0, hashIndex);
  var queryIndex = route.indexOf('?');
  var query = queryIndex >= 0 ? route.slice(queryIndex + 1) : '';
  if (queryIndex >= 0) route = route.slice(0, queryIndex);
  route = window.normalizeAppRoute(route);
  var url = String(window.APP_BASE_PATH || '') + '/index.php?route=' + encodeURIComponent(route).replace(/%2F/g, '/');
  var queryParams = new URLSearchParams(query);
  if (params) {
    var extraParams = params instanceof URLSearchParams ? params : new URLSearchParams(params);
    extraParams.forEach(function(value, key) { queryParams.append(key, value); });
  }
  queryParams.delete('route');
  var queryString = queryParams.toString();
  if (queryString) url += '&' + queryString;
  return url + hash;
};
window.assetUrl = function(path) {
  return String(window.APP_BASE_PATH || '') + String(window.APP_PUBLIC_URL_PREFIX || '') + '/' + String(path || '').replace(/^\/+/, '');
};
(function(){
  var originalFetch = window.fetch;
  if (!originalFetch) return;
  function routeFromAbsolute(path) {
    if (path.indexOf('/assets/') === 0) return window.assetUrl(path);
    var hashIndex = path.indexOf('#');
    var hash = hashIndex >= 0 ? path.slice(hashIndex) : '';
    if (hashIndex >= 0) path = path.slice(0, hashIndex);
    var queryIndex = path.indexOf('?');
    var query = queryIndex >= 0 ? path.slice(queryIndex + 1) : '';
    var route = queryIndex >= 0 ? path.slice(0, queryIndex) : path;
    return window.appUrl(route, new URLSearchParams(query)) + hash;
  }
  window.fetch = function(input, options) {
    if (typeof input === 'string' && input.charAt(0) === '/' && input.indexOf('//') !== 0 && input.indexOf(String(window.APP_BASE_PATH || '') + '/index.php?route=') !== 0) {
      input = routeFromAbsolute(input);
    }
    return originalFetch.call(window, input, options);
  };
})();
</script>
<script src="{$logoutScript}" defer></script>
HTML;
    // As views/frontend são carregadas como texto para receber o shell comum;
    // portanto, as tags PHP de APP_BASE_PATH não são interpretadas pelo require.
    $html = str_replace('<?= APP_BASE_PATH ?>', APP_BASE_PATH . app_public_url_prefix(), $html);
    $html = str_replace('</head>', $authScript . '</head>', $html);
    $html = (string) preg_replace_callback(
        '#assets/(?:css|js)/[A-Za-z0-9._/-]+(?:\?v=[^"<]*)?#',
        static function (array $matches) {
            $asset = preg_replace('#\?v=.*$#', '', $matches[0]);
            $assetPath = APP_ROOT . '/public/' . $asset;
            $assetHash = is_file($assetPath) ? hash_file('sha256', $assetPath) : false;
            return $assetHash ? $asset . '?v=' . substr($assetHash, 0, 12) : $matches[0];
        },
        $html
    );
    $html = prefix_app_base_path_urls($html);
    echo $html;
}

function render_protected_page($viewFile, array $profiles)
{
    Auth::requireProfiles($profiles);
    render_frontend_page($viewFile);
}
