<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Autenticação necessária</title>
</head>
<body>
  <main>
    <h1>Autenticação necessária</h1>
    <p><?= htmlspecialchars(isset($errorMessage) ? $errorMessage : 'Não foi possível validar sua identidade corporativa.', ENT_QUOTES, 'UTF-8') ?></p>
  </main>
</body>
</html>