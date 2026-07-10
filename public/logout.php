<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';
require_once __DIR__ . '/../app/auth/Auth.php';

$user = Auth::requireAnyAuthenticated();
if (Request::method() === 'POST') {
    Auth::requireCsrf();
    Auth::logout();
    Response::redirect('/');
}

header('Content-Type: text/html; charset=utf-8');
?><!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sair</title><link rel="stylesheet" href="/assets/css/styles.css"></head><body><main class="container py-5"><h1>Encerrar sessão</h1><p>Confirme para encerrar sua sessão com segurança.</p><form method="post" action="/logout"><input type="hidden" name="_csrf_token" value="<?= htmlspecialchars(Auth::csrfToken(), ENT_QUOTES, 'UTF-8') ?>"><button type="submit">Sair</button> <a href="/dashboard">Cancelar</a></form></main></body></html>
