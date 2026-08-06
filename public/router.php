<?php
declare(strict_types=1);

$path = (string) parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/', PHP_URL_PATH);
$basePath = getenv('APP_BASE_PATH');
if ($basePath === false) {
    $basePath = (getenv('APP_ENV') ?: 'production') === 'production' ? '/estrategia' : '';
}
$basePath = '/' . trim((string) $basePath, '/');
if ($basePath === '/') {
    $basePath = '';
}
$hasBasePathPrefix = false;
if ($basePath !== '' && ($path === $basePath || strpos($path, $basePath . '/') === 0)) {
    $hasBasePathPrefix = true;
    $path = substr($path, strlen($basePath));
    if ($path === '') {
        $path = '/';
    }
}
$publicRoot = realpath(__DIR__);
$file = realpath(__DIR__ . str_replace('/', DIRECTORY_SEPARATOR, rawurldecode($path)));

if ($path !== '/' && $file !== false && is_file($file)
    && strpos($file, $publicRoot . DIRECTORY_SEPARATOR) === 0) {
    if (strtolower(pathinfo($file, PATHINFO_EXTENSION)) === 'php') {
        require __DIR__ . '/index.php';
        exit;
    }
    if ($hasBasePathPrefix) {
        $mimeTypes = array(
            'css' => 'text/css; charset=utf-8',
            'js' => 'application/javascript; charset=utf-8',
            'json' => 'application/json; charset=utf-8',
            'svg' => 'image/svg+xml',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'ico' => 'image/x-icon',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
            'eot' => 'application/vnd.ms-fontobject',
        );
        $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        header('Content-Type: ' . (isset($mimeTypes[$extension]) ? $mimeTypes[$extension] : 'application/octet-stream'));
        readfile($file);
        exit;
    }
    return false;
}

require __DIR__ . '/index.php';
