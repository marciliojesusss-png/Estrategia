<?php
declare(strict_types=1);

require_once __DIR__ . '/../templates/page.php';
Auth::requirePermission('indicadores', 'visualizar');
render_legacy_page('indicadores.php');
