<?php
//declare(strict_types=1);
define('APP_PUBLIC_URL_PREFIX', '/public');

// Falha segura antes de o bootstrap conseguir determinar o ambiente.
// O bootstrap habilita detalhes somente em desenvolvimento/local com APP_DEBUG=true.
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
ini_set('log_errors', '1');

require __DIR__ . '/public/index.php';
