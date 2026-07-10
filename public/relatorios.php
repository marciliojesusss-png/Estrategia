<?php
declare(strict_types=1);

require_once __DIR__ . '/../templates/page.php';
Auth::requirePermission('relatorios', 'visualizar');
render_static_page('relatorios.html');
