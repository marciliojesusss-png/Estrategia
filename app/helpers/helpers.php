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

function redirect_to($location, $status = 302)
{
    header('Location: ' . $location, true, $status);
    exit;
}

function input_text(array $source, $key, $default = '')
{
    return isset($source[$key]) && is_scalar($source[$key]) ? trim((string) $source[$key]) : $default;
}
