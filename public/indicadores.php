<?php
declare(strict_types=1);

require_once __DIR__ . '/../templates/frontend.php';
Auth::requirePermission('indicadores', 'visualizar');
render_frontend_page('indicadores.php');
