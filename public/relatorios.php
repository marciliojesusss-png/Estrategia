<?php
declare(strict_types=1);

require_once __DIR__ . '/../templates/page.php';
Auth::requirePermission('relatorios', 'visualizar');
render_legacy_page('relatorios.php');
