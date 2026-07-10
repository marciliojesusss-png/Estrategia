# Etapa 2 — Fundação técnica

## Checklist de execução

- [x] Criar ou ajustar a estrutura `app`, `api`, `assets`, `views`, `uploads`, `storage`, `database`, `docs` e ponto público de entrada.
- [x] Garantir que apenas arquivos públicos sejam servidos pelo IIS e bloquear acesso direto a configuração, logs, banco e código interno.
- [x] Centralizar configuração de ambiente sem versionar credenciais reais.
- [x] Implementar conexão PDO SQL Server com `pdo_sqlsrv`, UTF-8, exceções e parâmetros configuráveis.
- [x] Implementar roteador em PHP puro para URLs amigáveis e fallback `index.php?rota=...`.
- [x] Criar `web.config` com regras de reescrita, páginas de erro, bloqueios e cabeçalhos compatíveis com IIS.
- [x] Implementar request, response HTML/JSON e códigos HTTP padronizados.
- [x] Implementar inicialização e configuração segura de sessão.
- [x] Implementar tratamento centralizado de erros e exceções, com mensagens públicas seguras.
- [x] Implementar logs técnicos fora da área pública, com rotação e proteção de dados sensíveis.
- [x] Implementar proteção CSRF reutilizável para formulários e requisições mutáveis.
- [x] Implementar helpers de escape de saída, validação e redirecionamento.
- [x] Criar layout base responsivo com cabeçalho, menu, breadcrumb, alertas e conteúdo.
- [ ] Incorporar e documentar versões locais compatíveis de Bootstrap, DataTables, Font Awesome e Chart.js.
- [x] Criar páginas 403, 404 e 500 sem detalhes técnicos.
- [x] Configurar diretórios graváveis mínimos para logs, temporários, backups e evidências.
- [x] Criar teste de saúde da aplicação e teste controlado de conexão ao banco.
- [x] Revisar todo PHP criado quanto à sintaxe e aos recursos disponíveis no PHP 7.1.19. **Revisão estática concluída; execução no binário 7.1.19 ainda é necessária.**

## Critérios de aceite

- [ ] A aplicação inicia no IIS por URL amigável e pelo fallback sem URL Rewrite.
- [ ] A conexão SQL Server funciona sem expor credenciais ou detalhes em falhas.
- [x] Rotas, sessões, CSRF, logs e páginas de erro possuem testes básicos.
- [x] Os ativos essenciais atuais funcionam sem CDN. **As quatro bibliotecas previstas ainda aguardam seleção e incorporação.**

## Acompanhamento

- Decisões: IIS deve apontar exclusivamente para `public/`; `public/index.php` é o front controller; configuração sensível é externa; DDL foi removido do fluxo de autenticação; páginas e APIs legadas permanecem como destinos temporários do roteador.
- Evidências: `app/bootstrap.php`, componentes de `app/core`, `public/index.php`, `public/web.config`, `views/layouts`, `views/erros`, `tests/foundation.test.php` e `docs/instalacao/fundacao-iis.md`.
- Pendências: instalar e validar no PHP 7.1.19 real; validar FastCGI/URL Rewrite no IIS; testar `pdo_sqlsrv` contra o banco corporativo; selecionar e incorporar Bootstrap, DataTables, Font Awesome e Chart.js em `assets/vendor`.
