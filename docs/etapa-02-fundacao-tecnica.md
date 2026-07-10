# Etapa 2 — Fundação técnica

## Checklist de execução

- [ ] Criar ou ajustar a estrutura `app`, `api`, `assets`, `views`, `uploads`, `storage`, `database`, `docs` e ponto público de entrada.
- [ ] Garantir que apenas arquivos públicos sejam servidos pelo IIS e bloquear acesso direto a configuração, logs, banco e código interno.
- [ ] Centralizar configuração de ambiente sem versionar credenciais reais.
- [ ] Implementar conexão PDO SQL Server com `pdo_sqlsrv`, UTF-8, exceções e parâmetros configuráveis.
- [ ] Implementar roteador em PHP puro para URLs amigáveis e fallback `index.php?rota=...`.
- [ ] Criar `web.config` com regras de reescrita, páginas de erro, bloqueios e cabeçalhos compatíveis com IIS.
- [ ] Implementar request, response HTML/JSON e códigos HTTP padronizados.
- [ ] Implementar inicialização e configuração segura de sessão.
- [ ] Implementar tratamento centralizado de erros e exceções, com mensagens públicas seguras.
- [ ] Implementar logs técnicos fora da área pública, com rotação e proteção de dados sensíveis.
- [ ] Implementar proteção CSRF reutilizável para formulários e requisições mutáveis.
- [ ] Implementar helpers de escape de saída, validação e redirecionamento.
- [ ] Criar layout base responsivo com cabeçalho, menu, breadcrumb, alertas e conteúdo.
- [ ] Incorporar e documentar versões locais compatíveis de Bootstrap, DataTables, Font Awesome e Chart.js.
- [ ] Criar páginas 403, 404 e 500 sem detalhes técnicos.
- [ ] Configurar diretórios graváveis mínimos para logs, temporários, backups e evidências.
- [ ] Criar teste de saúde da aplicação e teste controlado de conexão ao banco.
- [ ] Revisar todo PHP criado quanto à sintaxe e aos recursos disponíveis no PHP 7.1.19.

## Critérios de aceite

- [ ] A aplicação inicia no IIS por URL amigável e pelo fallback sem URL Rewrite.
- [ ] A conexão SQL Server funciona sem expor credenciais ou detalhes em falhas.
- [ ] Rotas, sessões, CSRF, logs e páginas de erro possuem testes básicos.
- [ ] Os ativos essenciais funcionam sem CDN.

## Acompanhamento

- Decisões:
- Evidências:
- Pendências:

