<?php
declare(strict_types=1);

require_once __DIR__ . '/../templates/frontend.php';
$isDetailView = isset($_GET['view'])
    && $_GET['view'] === 'detalhe'
    && (!empty($_GET['id']) || !empty($_GET['indicadorId']) || !empty($_GET['lancamentoId']));

if ($isDetailView) {
    Auth::requirePermission('indicadores', 'visualizar');
} else {
    Auth::requirePagePermission('indicadores', 'visualizar');
}
render_frontend_page('indicadores.php');
