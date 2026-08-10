<?php
$menuUser = Auth::currentUserForFrontend();
$menuItems = array(
    array('dashboard', 'Resumo Executivo', 'dashboard', 'visualizar'),
    array('visao-trimestral', 'Visao Trimestral', 'visao_trimestral', 'visualizar'),
    array('indicadores', 'Indicadores', 'indicadores', 'visualizar'),
    array('lancamentos', 'Lancamentos', 'lancamentos', 'visualizar'),
    array('homologacoes', 'Homologacoes', 'homologacoes', 'visualizar'),
    array('relatorios', 'Relatorios', 'relatorios', 'visualizar'),
    array('administracao', 'Administracao', 'administracao', 'gerenciar'),
);
?>
<nav class="header-nav" aria-label="Navegacao principal">
  <?php foreach ($menuItems as $menuItem): ?>
    <?php if (AccessPolicy::allowsPage($menuUser['perfilCodigo'], $menuItem[2], $menuItem[3])): ?>
      <a class="nav-link" href="<?= e(app_url($menuItem[0])) ?>"><?= e($menuItem[1]) ?></a>
    <?php endif; ?>
  <?php endforeach; ?>
</nav>
