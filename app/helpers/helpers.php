<?php
declare(strict_types=1);

function e($value)
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function current_route($default = 'dashboard')
{
    $route = isset($_GET['route']) ? trim((string) $_GET['route'], '/') : '';
    return $route === '' ? trim((string) $default, '/') : $route;
}

function app_route_value($route)
{
    $route = trim((string) $route);
    $route = trim($route, '/');
    $route = preg_replace('#^api/([^/]+)\.php$#', 'api/$1', $route);
    return $route === '' ? 'dashboard' : $route;
}

function app_route_query_value($route)
{
    return str_replace('%2F', '/', rawurlencode(app_route_value($route)));
}

function app_url($route = 'dashboard', array $params = array())
{
    $route = app_route_value($route);
    if (isset($params['route'])) {
        unset($params['route']);
    }

    $url = APP_BASE_PATH . '/index.php?route=' . app_route_query_value($route);
    if (!empty($params)) {
        $url .= '&' . http_build_query($params, '', '&', PHP_QUERY_RFC3986);
    }
    return $url;
}

function app_index_url()
{
    return APP_BASE_PATH . '/index.php';
}

function app_public_url_prefix()
{
    if (defined('APP_PUBLIC_URL_PREFIX')) {
        $prefix = '/' . trim((string) APP_PUBLIC_URL_PREFIX, '/');
        return $prefix === '/' ? '' : $prefix;
    }
    return '';
}

function asset_url($path)
{
    $path = ltrim((string) $path, '/');
    return APP_BASE_PATH . app_public_url_prefix() . '/' . $path;
}

function app_url_from_path($path)
{
    $path = (string) $path;
    $fragment = '';
    $fragmentPos = strpos($path, '#');
    if ($fragmentPos !== false) {
        $fragment = substr($path, $fragmentPos);
        $path = substr($path, 0, $fragmentPos);
    }

    $query = '';
    $queryPos = strpos($path, '?');
    if ($queryPos !== false) {
        $query = substr($path, $queryPos + 1);
        $path = substr($path, 0, $queryPos);
    }

    $route = app_route_value($path);
    $params = array();
    if ($query !== '') {
        parse_str($query, $params);
    }

    return app_url($route, $params) . $fragment;
}

function prefix_app_base_path_urls($content)
{
    $content = (string) $content;
    if (strpos($content, '="') === false) {
        return $content;
    }

    $base = trim(APP_BASE_PATH, '/');
    $content = (string) preg_replace_callback(
        '#\b(href|src|action)="\/(?!\/)([^"]*)"#',
        static function (array $matches) use ($base) {
            $path = $matches[2];
            if ($path === $base || strpos($path, $base . '/') === 0) {
                return $matches[0];
            }
            if (strpos($path, 'assets/') === 0 || strpos($path, 'public/assets/') === 0) {
                return $matches[1] . '="' . asset_url(preg_replace('#^public/#', '', $path)) . '"';
            }
            if (strpos($path, 'index.php?route=') === 0) {
                return $matches[1] . '="' . APP_BASE_PATH . '/' . $path . '"';
            }
            return $matches[1] . '="' . app_url_from_path($path) . '"';
        },
        $content
    );

    $content = (string) preg_replace_callback(
        '#\b(href|src)="(assets/[^"]*)"#',
        static function (array $matches) {
            return $matches[1] . '="' . asset_url($matches[2]) . '"';
        },
        $content
    );

    return (string) preg_replace_callback(
        '#content="0;url=\/(?!\/)([^"]*)"#',
        static function (array $matches) use ($base) {
            $path = $matches[1];
            if ($path === $base || strpos($path, $base . '/') === 0) {
                return $matches[0];
            }
            return 'content="0;url=' . app_url_from_path($path) . '"';
        },
        $content
    );
}

function redirect_to($location, $status = 302)
{
    header('Location: ' . $location, true, $status);
    exit;
}

function input_text(array $source, $key, $default = '')
{
    return isset($source[$key]) && is_scalar($source[$key]) ? trim((string) $source[$key]) : $default;
}
