# Etapa 9 — APIs e integrações

## Checklist de execução

- [ ] Inventariar endpoints existentes em `api/` e `public/api/` e definir uma única superfície canônica.
- [ ] Documentar método, rota, perfil, entrada, saída e códigos HTTP de cada endpoint.
- [ ] Padronizar respostas JSON de sucesso, validação, autenticação, autorização, conflito e falha interna.
- [ ] Implementar parsing seguro de JSON e rejeitar conteúdo ou método não suportado.
- [ ] Validar parâmetros de rota, consulta e corpo no servidor.
- [ ] Aplicar autenticação por sessão corporativa e autorização por perfil, unidade e registro.
- [ ] Aplicar CSRF às operações mutáveis baseadas em sessão conforme o modelo adotado.
- [ ] Usar prepared statements e transações por meio de repositories e services existentes.
- [ ] Evitar duplicar regras de negócio entre controllers HTML e controllers de API.
- [ ] Implementar endpoints de indicadores, lançamentos, homologações e dashboard previstos e autorizados.
- [ ] Definir semântica segura para `DELETE`, respeitando inativação e exclusão apenas de rascunhos.
- [ ] Registrar em auditoria todas as mutações relevantes da API.
- [ ] Tratar exceções sem retornar SQL, caminhos, credenciais ou stack trace.
- [ ] Definir limites de paginação, tamanho de payload e upload.
- [ ] Documentar exemplos completos de requisição e resposta sem dados sensíveis.
- [ ] Criar testes de contrato, códigos HTTP, JSON inválido, autorização, CSRF, idempotência e concorrência.

## Critérios de aceite

- [ ] Existe uma implementação canônica, sem comportamento divergente entre rotas duplicadas.
- [ ] Todos os endpoints protegidos validam sessão e autorização no servidor.
- [ ] Contratos, erros e códigos HTTP são consistentes e documentados.
- [ ] Testes cobrem caminhos de sucesso, validação, negação, conflito e falha transacional.

## Acompanhamento

- Decisões:
- Evidências:
- Pendências:

