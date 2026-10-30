<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Erro interno</title>
    <link rel="stylesheet" href="/assets/css/styles.css">
</head>
<body>
<main class="login-shell">
    <section class="login-panel">
        <p class="eyebrow">Erro 500</p>
        <h1>Não foi possível concluir a solicitação</h1>
        <p>Tente novamente. Se o problema continuar, contate o suporte.</p>
        <?php if (!empty($requestId)): ?>
            <p>Código da requisição: <code><?= htmlspecialchars((string) $requestId, ENT_QUOTES, 'UTF-8') ?></code></p>
        <?php endif; ?>
        <?php if (!empty($debugDetails)): ?>
            <details>
                <summary>Detalhes de desenvolvimento</summary>
                <pre><?= htmlspecialchars(print_r($debugDetails, true), ENT_QUOTES, 'UTF-8') ?></pre>
            </details>
        <?php endif; ?>
        <a class="primary-action" href="/dashboard">Voltar ao início</a>
    </section>
</main>
</body>
</html>
