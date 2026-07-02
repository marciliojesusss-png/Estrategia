<?php
declare(strict_types=1);

define('APP_ROOT', dirname(__DIR__, 2));
define('DB_PATH', APP_ROOT . '/database/indicadores.sqlite');
define('SCHEMA_PATH', APP_ROOT . '/database/schema.sql');
define('BACKUP_DIR', APP_ROOT . '/database/backups');

date_default_timezone_set('America/Sao_Paulo');
