<?php
declare(strict_types=1);

require_once __DIR__ . '/../templates/page.php';
Auth::requirePermission('administracao', 'gerenciar');
render_static_page('administracao.html');
