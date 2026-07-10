<?php
declare(strict_types=1);

require_once __DIR__ . '/../templates/page.php';
Auth::requirePermission('homologacoes', 'visualizar');
render_static_page('homologacao.html');
