<?php
declare(strict_types=1);

require_once __DIR__ . '/../templates/frontend.php';
Auth::requirePagePermission('administracao', 'gerenciar');
render_frontend_page('administracao.php');
