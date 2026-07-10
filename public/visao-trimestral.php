<?php
declare(strict_types=1);

require_once __DIR__ . '/../templates/page.php';
Auth::requirePermission('visao_trimestral', 'visualizar');
render_legacy_page('visao-trimestral.php');
