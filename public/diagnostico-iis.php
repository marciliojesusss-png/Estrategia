<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/config/config.php';

header('Content-Type: text/plain; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$remoteUser = isset($_SERVER['REMOTE_USER']) && trim((string) $_SERVER['REMOTE_USER']) !== '' ? 'presente' : 'ausente';
$values = array(
    'PHP_VERSION' => PHP_VERSION,
    'REMOTE_USER' => $remoteUser,
    'AUTH_TYPE' => isset($_SERVER['AUTH_TYPE']) ? (string) $_SERVER['AUTH_TYPE'] : '',
    'SERVER_SOFTWARE' => isset($_SERVER['SERVER_SOFTWARE']) ? (string) $_SERVER['SERVER_SOFTWARE'] : '',
    'REQUEST_URI' => isset($_SERVER['REQUEST_URI']) ? (string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) : '',
    'APP_BASE_PATH' => APP_BASE_PATH === '' ? '/' : APP_BASE_PATH,
);

foreach ($values as $label => $value) {
    echo $label . ': ' . str_replace(array("\r", "\n"), ' ', $value) . PHP_EOL;
}
