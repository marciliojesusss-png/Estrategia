(function () {
  let dialog = null;
  let lastFocused = null;

  function close() {
    if (!dialog || !dialog.open) return;
    dialog.close();
    if (lastFocused) lastFocused.focus();
  }

  function submitLogout(event) {
    event.preventDefault();
    try {
      localStorage.removeItem("central_indicadores_usuario_atual");
      localStorage.removeItem("central_indicadores_perfil_atual");
      localStorage.removeItem("central_indicadores_permissoes_atual");
    } catch (error) {
      // O logout do servidor deve continuar mesmo sem acesso ao armazenamento local.
    }
    event.currentTarget.submit();
  }

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = document.querySelector("[data-logout-modal]");
    if (!dialog) {
      document.body.insertAdjacentHTML("beforeend", `
        <dialog class="logout-modal" data-logout-modal aria-labelledby="logout-modal-title">
          <form class="logout-modal-card" method="post" action="${window.APP_BASE_PATH || ""}/logout">
            <button class="logout-modal-close" type="button" data-close-logout aria-label="Fechar">&times;</button>
            <span class="logout-modal-icon" aria-hidden="true">&#8594;</span>
            <h2 id="logout-modal-title">Encerrar sessão?</h2>
            <p>Você será desconectado do sistema e precisará entrar novamente para continuar.</p>
            <input type="hidden" name="_csrf_token" value="">
            <div class="logout-modal-actions">
              <button class="secondary-action" type="button" data-close-logout>Cancelar</button>
              <button class="logout-confirm-button" type="submit">Sim, sair</button>
            </div>
          </form>
        </dialog>
      `);
      dialog = document.querySelector("[data-logout-modal]");
    }

    const token = dialog.querySelector('[name="_csrf_token"]');
    if (token && window.CAIXA_LOTERIAS_CSRF_TOKEN) token.value = window.CAIXA_LOTERIAS_CSRF_TOKEN;
    dialog.querySelectorAll("[data-close-logout]").forEach((button) => button.addEventListener("click", close));
    dialog.querySelector("form").addEventListener("submit", submitLogout);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) close();
    });
    return dialog;
  }

  function open() {
    lastFocused = document.activeElement;
    ensureDialog().showModal();
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-open-logout]").forEach((button) => button.addEventListener("click", open));
  });

  window.LogoutModal = { open, close };
})();
