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
      <button class="secondary-action btn-sair" type="button" data-open-logout> Sair </button>
    </div>
  </div>
</header>
<dialog class="logout-modal" data-logout-modal aria-labelledby="logout-modal-title">
  <form class="logout-modal-card" method="post" action="/logout">
    <button class="logout-modal-close" type="button" data-close-logout aria-label="Fechar">&times;</button>
    <span class="logout-modal-icon" aria-hidden="true">&#8594;</span>
    <h2 id="logout-modal-title">Encerrar sessão?</h2>
    <p>Você será desconectado do sistema e precisará entrar novamente para continuar.</p>
    <input type="hidden" name="_csrf_token" value="<?= e(Auth::csrfToken()) ?>">
    <div class="logout-modal-actions">
      <button class="secondary-action" type="button" data-close-logout>Cancelar</button>
      <button class="logout-confirm-button" type="submit">Sim, sair</button>
    </div>
  </form>
</dialog>
