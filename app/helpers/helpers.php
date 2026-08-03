<?php
declare(strict_types=1);

function e($value)
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function app_url($path = '/')
{
    $path = '/' . ltrim((string) $path, '/');
    return APP_BASE_PATH . ($path === '/' ? '/' : $path);
}

function prefix_app_base_path_urls($content)
{
    $content = (string) $content;
    if (APP_BASE_PATH === '' || strpos($content, '="/') === false) {
        return $content;
    }

    $base = trim(APP_BASE_PATH, '/');
    $prefix = APP_BASE_PATH . '/';
    $content = (string) preg_replace_callback(
        '#\b(href|src|action)="\/(?!\/)([^"]*)"#',
        static function (array $matches) use ($base, $prefix) {
            $path = $matches[2];
            if ($path === $base || strpos($path, $base . '/') === 0) {
                return $matches[0];
            }
            return $matches[1] . '="' . $prefix . $path . '"';
        },
        $content
    );

    return (string) preg_replace_callback(
        '#content="0;url=\/(?!\/)([^"]*)"#',
        static function (array $matches) use ($base, $prefix) {
            $path = $matches[1];
            if ($path === $base || strpos($path, $base . '/') === 0) {
                return $matches[0];
            }
            return 'content="0;url=' . $prefix . $path . '"';
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
