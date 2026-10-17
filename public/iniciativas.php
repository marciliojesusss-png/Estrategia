<?php
declare(strict_types=1);
require_once __DIR__.'/../templates/frontend.php';
Auth::requirePagePermission('iniciativas','visualizar');
render_frontend_page('iniciativas.php');
