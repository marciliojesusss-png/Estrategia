<?php
declare(strict_types=1);

require_once __DIR__ . '/../templates/frontend.php';
$user = Auth::requirePagePermission('relatorios', 'visualizar');
if (isset($_GET['tipo']) && $_GET['tipo'] === 'governanca') {
    $activeProfile = Auth::normalizeProfile(isset($user['perfil']) ? $user['perfil'] : '');
    $originalProfile = Auth::normalizeProfile(isset($user['perfil_original']) ? $user['perfil_original'] : $activeProfile);
    if ($activeProfile !== 'administrador' || $originalProfile !== 'administrador') {
        http_response_code(403);
        require APP_ROOT . '/views/erros/403.php';
        exit;
    }
}
render_frontend_page('relatorios.php');
