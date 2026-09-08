<?php
declare(strict_types=1);

$users = Auth::localLoginUsers();
$csrfToken = Csrf::token();
?><!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CAIXA Loterias | Indicadores Estratégicos</title>
  <link rel="stylesheet" href="<?= e(asset_url('assets/css/styles.css?v=LOGIN-PHP-003')) ?>">
</head>
<body data-page="login">
  <main class="login-shell">
    <section class="login-panel" aria-labelledby="login-title">
      <div class="brand-block">
        <span class="brand-mark">CL</span>
        <div><p class="eyebrow">CAIXA Loterias</p><h1 id="login-title">Indicadores Estratégicos</h1></div>
      </div>

      <div class="notice info"><strong>Acesso local de desenvolvimento.</strong><br>Usuários e perfis carregados exclusivamente do SQL Server.</div>
      <?php if (!empty($loginError)): ?><div class="notice danger"><?= htmlspecialchars($loginError, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
      <?php if (!$users): ?><div class="notice danger">Nenhum usuário ativo foi encontrado em <code>dbo.usuarios_acesso</code>.</div><?php endif; ?>

      <form method="post" action="<?= e(app_url('login')) ?>" class="form-grid" id="loginFormPhp">
        <input type="hidden" name="_csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8') ?>">
        <label>Usuário
          <select name="matricula" id="usuarioSelectPhp" required <?= !$users ? 'disabled' : '' ?>>
            <?php foreach ($users as $user): ?>
              <option value="<?= htmlspecialchars($user['matricula'], ENT_QUOTES, 'UTF-8') ?>"
                data-perfil="<?= htmlspecialchars($user['perfil'], ENT_QUOTES, 'UTF-8') ?>"
                data-unidade="<?= htmlspecialchars($user['unidade'], ENT_QUOTES, 'UTF-8') ?>"
                data-diretoria="<?= htmlspecialchars($user['diretoria'], ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($user['nome'], ENT_QUOTES, 'UTF-8') ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <label>Perfil<input id="perfilInputPhp" type="text" readonly></label>
        <label>Unidade apuradora<input id="unidadeInputPhp" type="text" readonly></label>
        <label>Diretoria responsável<input id="diretoriaInputPhp" type="text" readonly></label>
        <button class="primary-action" type="submit" <?= !$users ? 'disabled' : '' ?>>Entrar</button>
      </form>
    </section>
  </main>
  <script>
  (function () {
    var select = document.getElementById('usuarioSelectPhp');
    function updateFields() {
      var option = select && select.options.length ? select.options[select.selectedIndex] : null;
      document.getElementById('perfilInputPhp').value = option ? option.getAttribute('data-perfil') || '' : '';
      document.getElementById('unidadeInputPhp').value = option ? option.getAttribute('data-unidade') || 'Todas' : '';
      document.getElementById('diretoriaInputPhp').value = option ? option.getAttribute('data-diretoria') || 'Todas' : '';
    }
    if (select) select.addEventListener('change', updateFields);
    updateFields();
  }());
  </script>
</body>
</html>
