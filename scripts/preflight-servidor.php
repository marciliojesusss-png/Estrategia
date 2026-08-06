<?php
declare(strict_types=1);

require_once __DIR__ . '/diagnostico-servidor-lib.php';

Logger::info('[BOOT] Preflight do servidor iniciado.');
$resultado = diagnostico_servidor_preflight();
echo $resultado['output'];
Logger::info('[BOOT] Preflight do servidor finalizado.', array('status' => $resultado['ok'] ? 'ok' : 'falha'));
exit((int) $resultado['exit_code']);
