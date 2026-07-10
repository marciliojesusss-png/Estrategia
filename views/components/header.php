<?php
$headerUser = Auth::currentUserForFrontend();
?>
<header class="app-header">
  <div class="header-top">
    <a class="brand-block header-brand" href="/dashboard" aria-label="Página inicial">
      <img class="brand-logo-caixa-loterias" src="/assets/img/caixa-loterias-logo-negativa.png" alt="CAIXA Loterias">
      <span class="brand-divider" aria-hidden="true"></span>
      <span class="brand-system-name">Indicadores Estratégicos</span>
    </a>
    <div class="header-actions">
      <span class="header-chip"><?= e($headerUser['nome']) ?></span>
      <span class="header-chip"><?= e($headerUser['perfil']) ?></span>
      <span class="header-chip"><?= e($headerUser['unidadeApuradora'] ?: ($headerUser['diretoriaResponsavel'] ?: 'Escopo geral')) ?></span>
      <a class="secondary-action btn-sair" href="/logout">Sair</a>
    </div>
  </div>
</header>
