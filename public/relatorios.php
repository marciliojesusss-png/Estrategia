<?php
declare(strict_types=1);

require_once __DIR__ . '/../templates/frontend.php';
Auth::requirePagePermission('relatorios', 'visualizar');
render_frontend_page('relatorios.php');
