<?php
declare(strict_types=1);

$users = array(
    'ADMIN' => array('nome' => 'Administrador Simulado', 'perfil' => 'Administrador', 'unidade' => 'Todas', 'diretoria' => 'Todas'),
    'CONSULTA' => array('nome' => 'Consulta Gestão', 'perfil' => 'Consulta/Gestão', 'unidade' => 'Todas', 'diretoria' => 'Todas'),
    'USUARIO-COMPANHIA' => array('nome' => 'Usuário da Companhia', 'perfil' => 'Usuário Companhia', 'unidade' => 'Todas', 'diretoria' => 'Todas'),
    'UNIDADE-GENOL' => array('nome' => 'Unidade GENOL', 'perfil' => 'Unidade Apuradora', 'unidade' => 'GENOL', 'diretoria' => 'Todas'),
    'UNIDADE-GERIN' => array('nome' => 'Unidade GERIN', 'perfil' => 'Unidade Apuradora', 'unidade' => 'GERIN', 'diretoria' => 'Todas'),
    'UNIDADE-SUCOL' => array('nome' => 'Unidade SUCOL', 'perfil' => 'Unidade Apuradora', 'unidade' => 'SUCOL', 'diretoria' => 'Todas'),
    'UNIDADE-SUCTF' => array('nome' => 'Unidade SUCTF', 'perfil' => 'Unidade Apuradora', 'unidade' => 'SUCTF', 'diretoria' => 'Todas'),
    'UNIDADE-SULOT' => array('nome' => 'Unidade SULOT', 'perfil' => 'Unidade Apuradora', 'unidade' => 'SULOT', 'diretoria' => 'Todas'),
    'UNIDADE-SURCI' => array('nome' => 'Unidade SURCI', 'perfil' => 'Unidade Apuradora', 'unidade' => 'SURCI', 'diretoria' => 'Todas'),
    'DIRETORIA-DICOT' => array('nome' => 'Diretoria DICOT', 'perfil' => 'Diretoria Homologadora', 'unidade' => 'Todas', 'diretoria' => 'DICOT'),
    'DIRETORIA-DICRI' => array('nome' => 'Diretoria DICRI', 'perfil' => 'Diretoria Homologadora', 'unidade' => 'Todas', 'diretoria' => 'DICRI'),
    'DIRETORIA-DIFIR' => array('nome' => 'Diretoria DIFIR', 'perfil' => 'Diretoria Homologadora', 'unidade' => 'Todas', 'diretoria' => 'DIFIR'),
    'DIRETORIA-DILOT' => array('nome' => 'Diretoria DILOT', 'perfil' => 'Diretoria Homologadora', 'unidade' => 'Todas', 'diretoria' => 'DILOT'),
);
$csrfToken = Csrf::token();
?><!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CAIXA Loterias | Indicadores Estratégicos</title>
  <link rel="stylesheet" href="/assets/css/styles.css?v=LOGIN-PHP-002">
</head>
<body data-page="login">
  <main class="login-shell">
    <section class="login-panel" aria-labelledby="login-title">
      <div class="brand-block">
        <span class="brand-mark">CL</span>
        <div><p class="eyebrow">CAIXA Loterias</p><h1 id="login-title">Indicadores Estratégicos</h1></div>
      </div>

      <div class="notice info"><strong>Modo validação local ativo.</strong><br>Dados salvos neste perfil do navegador.</div>
      <div class="notice info"><strong>Modo SQL local ativo.</strong> A base versionável fica em <code>/database/indicadores.sqlite</code> e não substitui o banco corporativo multiusuário.</div>
      <?php if (!empty($loginError)): ?><div class="notice danger"><?= htmlspecialchars($loginError, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>

      <form method="post" action="/login" class="form-grid" id="loginFormPhp">
        <input type="hidden" name="_csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8') ?>">
        <label>Usuário
          <select name="matricula" id="usuarioSelectPhp" required>
            <?php foreach ($users as $matricula => $user): ?>
              <option value="<?= htmlspecialchars($matricula, ENT_QUOTES, 'UTF-8') ?>"
                data-perfil="<?= htmlspecialchars($user['perfil'], ENT_QUOTES, 'UTF-8') ?>"
                data-unidade="<?= htmlspecialchars($user['unidade'], ENT_QUOTES, 'UTF-8') ?>"
                data-diretoria="<?= htmlspecialchars($user['diretoria'], ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($user['nome'], ENT_QUOTES, 'UTF-8') ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <label>Perfil<input id="perfilInputPhp" type="text" readonly></label>
        <label>Unidade apuradora<input id="unidadeInputPhp" type="text" readonly></label>
        <label>Diretoria responsável<input id="diretoriaInputPhp" type="text" readonly></label>
        <button class="primary-action" type="submit">Entrar</button>
      </form>
    </section>
  </main>
  <script>
  (function () {
    var select = document.getElementById('usuarioSelectPhp');
    function updateFields() {
      var option = select.options[select.selectedIndex];
      document.getElementById('perfilInputPhp').value = option.getAttribute('data-perfil') || '';
      document.getElementById('unidadeInputPhp').value = option.getAttribute('data-unidade') || 'Todas';
      document.getElementById('diretoriaInputPhp').value = option.getAttribute('data-diretoria') || 'Todas';
    }
    select.addEventListener('change', updateFields);
    updateFields();
  }());
  </script>
</body>
</html>
