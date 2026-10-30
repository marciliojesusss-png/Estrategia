<?php
declare(strict_types=1);

// A configuracao externa pode estar permissiva. O bootstrap comeca em modo seguro
// e somente libera detalhes depois de validar ambiente e APP_DEBUG.
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
ini_set('log_errors', '1');

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/core/Request.php';
require_once __DIR__ . '/core/Response.php';
require_once __DIR__ . '/core/ErrorHandler.php';
require_once __DIR__ . '/helpers/helpers.php';

$errorEnvironment = strtolower((string) APP_ENV);
$errorDebugEnabled = APP_DEBUG && in_array($errorEnvironment, array('development', 'dev', 'local'), true);
ini_set('display_errors', $errorDebugEnabled ? '1' : '0');
ini_set('display_startup_errors', $errorDebugEnabled ? '1' : '0');
ErrorHandler::register($errorDebugEnabled);

date_default_timezone_set(APP_TIMEZONE);

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
header("Permissions-Policy: camera=(), microphone=(), geolocation=()");
