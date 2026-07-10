# Etapa 9 — APIs e integrações

## Checklist de execução

- [x] Inventariar endpoints existentes em `api/` e `public/api/` e definir `/api` sem extensão como superfície canônica.
- [x] Documentar método, rota, perfil, entrada, saída e códigos HTTP de cada endpoint canônico.
- [x] Padronizar respostas JSON de sucesso, validação, autenticação, autorização, conflito e falha interna.
- [x] Implementar parsing seguro de JSON e rejeitar conteúdo, payload ou método não suportado.
- [x] Validar parâmetros de rota, consulta e corpo no servidor.
- [x] Aplicar autenticação por sessão corporativa e autorização por perfil, unidade e registro.
- [x] Aplicar CSRF às operações mutáveis baseadas em sessão.
- [x] Usar prepared statements e transações por meio de repositories e services existentes.
- [x] Evitar duplicar regras de negócio entre controllers HTML e controllers de API.
- [x] Implementar endpoints de indicadores, lançamentos, homologações e dashboard previstos e autorizados.
- [x] Definir semântica segura para `DELETE`: inativação de indicador e exclusão apenas de rascunho.
- [x] Registrar em auditoria todas as mutações relevantes da API por meio dos services.
- [x] Tratar exceções sem retornar SQL, caminhos, credenciais ou stack trace.
- [x] Definir limites de paginação, tamanho de payload e upload.
- [x] Documentar exemplos completos de requisição e resposta sem dados sensíveis.
- [x] Criar testes de contrato, envelopes, limites, autorização, CSRF, idempotência, concorrência e rollback. **A nova rodada HTTP ampliada ficou impedida por limite operacional do ambiente; testes HTTP anteriores permanecem válidos.**

## Critérios de aceite

- [x] Existe uma implementação canônica; aliases `.php` carregam os mesmos arquivos e anunciam depreciação.
- [x] Todos os endpoints protegidos validam sessão e autorização no servidor.
- [x] Contratos, erros e códigos HTTP são consistentes e documentados.
- [x] Testes cobrem caminhos de sucesso, validação, negação, conflito e falha transacional.

## Acompanhamento

- Decisões: `/api` sem extensão é canônica; aliases físicos são temporários e enviam `Deprecation`/`Sunset`; payload JSON padrão é limitado a 1 MiB; integrações permanecem same-origin e autenticadas por sessão; endpoint genérico `/api/database` é legado e não deve receber novas integrações.
- Evidências: `Request.php`, `Response.php`, `HttpException.php`, `Router.php`, controllers de API, `docs/api.md` e `tests/api-contract.test.php`, além dos testes transacionais dos módulos.
- Pendências: executar novamente a matriz HTTP ampliada quando o limite operacional do ambiente permitir; definir data corporativa definitiva para remoção dos aliases e migrar consumidores remanescentes de endpoints legados.
