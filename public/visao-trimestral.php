<?php
declare(strict_types=1);

require_once __DIR__ . '/../templates/page.php';
render_protected_page('visao-trimestral.html', ['usuario_companhia', 'unidade_apuradora', 'homologador', 'administrador']);
