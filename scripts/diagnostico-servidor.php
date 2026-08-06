<?php
declare(strict_types=1);

require_once __DIR__ . '/diagnostico-servidor-lib.php';

if (PHP_SAPI !== 'cli') {
    header('Content-Type: text/plain; charset=utf-8');
    http_response_code(403);
    echo 'Diagnostico CLI deve ser executado pelo terminal.' . PHP_EOL;
    exit(1);
}

$resultado = diagnostico_servidor_run(array('web' => false));
echo $resultado['report'];
exit((int) $resultado['exit_code']);
