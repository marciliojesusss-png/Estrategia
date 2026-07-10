<?php
require_once APP_ROOT . '/app/helpers/helpers.php';
$pageTitle = isset($pageTitle) ? $pageTitle : 'Indicadores Estratégicos';
$contentView = isset($contentView) ? $contentView : null;
?><!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= e($pageTitle) ?> | CAIXA Loterias</title>
  <link rel="stylesheet" href="/assets/css/styles.css">
</head>
<body>
  <div class="app-shell">
    <?php require APP_ROOT . '/views/components/header.php'; ?>
    <?php require APP_ROOT . '/views/components/menu.php'; ?>
    <main id="conteudo-principal" class="content">
      <?php require APP_ROOT . '/views/components/breadcrumb.php'; ?>
      <?php require APP_ROOT . '/views/components/alerts.php'; ?>
      <?php if ($contentView && is_file($contentView)) require $contentView; ?>
    </main>
  </div>
  <script src="/assets/js/logout-modal.js" defer></script>
</body>
</html>
