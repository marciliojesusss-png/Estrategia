<?php
$menuUser = Auth::currentUserForFrontend();
$menuItems = array(
    array('/dashboard', 'Resumo Executivo', 'dashboard', 'visualizar'),
    array('/visao-trimestral', 'Visão Trimestral', 'visao_trimestral', 'visualizar'),
    array('/indicadores', 'Indicadores', 'indicadores', 'visualizar'),
    array('/lancamentos', 'Lançamentos', 'lancamentos', 'visualizar'),
    array('/homologacoes', 'Homologações', 'homologacoes', 'visualizar'),
    array('/relatorios', 'Relatórios', 'relatorios', 'visualizar'),
    array('/administracao', 'Administração', 'administracao', 'gerenciar'),
);
?>
<nav class="header-nav" aria-label="Navegação principal">
  <?php foreach ($menuItems as $menuItem): ?>
    <?php if (AccessPolicy::allows($menuUser['perfilCodigo'], $menuItem[2], $menuItem[3])): ?>
      <a class="nav-link" href="<?= e($menuItem[0]) ?>"><?= e($menuItem[1]) ?></a>
    <?php endif; ?>
  <?php endforeach; ?>
</nav>
