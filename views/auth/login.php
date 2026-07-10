<?php
declare(strict_types=1);

$users = array(
    'C000001' => array('nome' => 'Administrador Local', 'perfil' => 'Administrador'),
    'C000002' => array('nome' => 'Unidade Apuradora Local', 'perfil' => 'Unidade Apuradora — SUCOL'),
    'C000003' => array('nome' => 'Homologador Local', 'perfil' => 'Diretoria Homologadora — DIFIR'),
    'C000004' => array('nome' => 'Usuário Companhia Local', 'perfil' => 'Consulta institucional'),
);
$csrfToken = Csrf::token();
?><!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Entrar | Indicadores Estratégicos</title>
  <link rel="stylesheet" href="/assets/css/styles.css">
</head>
<body data-page="login">
  <main class="login-shell">
    <section class="login-panel" aria-labelledby="login-title">
      <div class="brand-block">
        <img class="brand-logo-caixa-loterias" src="/assets/img/caixa-loterias-logo-negativa.png" alt="CAIXA Loterias">
        <div><p class="eyebrow">Ambiente local</p><h1 id="login-title">Indicadores Estratégicos</h1></div>
      </div>
      <p>Selecione um perfil de desenvolvimento para acessar a aplicação.</p>
      <?php if (!empty($loginError)): ?><div class="notice danger"><?= htmlspecialchars($loginError, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
      <form method="post" action="/login" class="form-grid">
        <input type="hidden" name="_csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8') ?>">
        <label>Usuário
          <select name="matricula" required>
            <?php foreach ($users as $matricula => $user): ?>
              <option value="<?= htmlspecialchars($matricula, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($user['nome'] . ' — ' . $user['perfil'], ENT_QUOTES, 'UTF-8') ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <button class="primary-action" type="submit">Entrar</button>
      </form>
    </section>
  </main>
</body>
</html>
