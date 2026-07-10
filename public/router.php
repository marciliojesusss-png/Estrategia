<?php
declare(strict_types=1);

$path = parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/', PHP_URL_PATH);
$publicRoot = realpath(__DIR__);
$file = realpath(__DIR__ . str_replace('/', DIRECTORY_SEPARATOR, rawurldecode($path)));

if ($path !== '/' && $file !== false && is_file($file)
    && strpos($file, $publicRoot . DIRECTORY_SEPARATOR) === 0) {
    return false;
}

require __DIR__ . '/index.php';
