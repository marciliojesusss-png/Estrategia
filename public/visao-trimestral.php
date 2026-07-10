<?php
declare(strict_types=1);

require_once __DIR__ . '/../templates/frontend.php';
Auth::requirePermission('visao_trimestral', 'visualizar');
render_frontend_page('visao-trimestral.php');
