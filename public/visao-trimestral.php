<?php
declare(strict_types=1);

require_once __DIR__ . '/../templates/page.php';
Auth::requirePermission('visao_trimestral', 'visualizar');
render_static_page('visao-trimestral.html');
