<?php
declare(strict_types=1);

require_once __DIR__ . '/../templates/page.php';
Auth::requirePermission('dashboard', 'visualizar');
render_static_page('resumo-executivo.html');
