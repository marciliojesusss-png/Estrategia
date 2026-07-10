# API do Sistema de Indicadores Estratégicos

## Convenções

Base canônica: `/api`. Autenticação usa a sessão corporativa. Operações `POST`, `PUT`, `PATCH` e `DELETE` exigem `X-CSRF-Token`. O corpo JSON deve usar `Content-Type: application/json` e ter no máximo 1 MiB por padrão (`API_MAX_PAYLOAD_BYTES`). Uploads seguem limite próprio.

Sucesso:

```json
{"sucesso":true,"mensagem":"Operacao realizada.","dados":{}}
```

Erro:

```json
{"sucesso":false,"mensagem":"Verifique os campos informados.","erros":{"campo":"Mensagem"}}
```

Códigos: `200` consulta/alteração, `201` criação, `400` JSON/parâmetro inválido, `401` identidade ausente, `403` perfil/escopo/CSRF, `404` inexistente, `405` método, `409` conflito/idempotência, `413` payload, `415` tipo de conteúdo, `422` validação e `500` falha interna segura.

## Endpoints canônicos

| Método e rota | Perfis | Finalidade |
|---|---|---|
| `GET /api/indicadores` | todos | Lista paginada e filtrada. |
| `GET /api/indicadores/{id}` | todos no escopo | Consulta detalhe. |
| `POST /api/indicadores` | administrador | Cadastra. |
| `PUT/PATCH /api/indicadores/{id}` | administrador | Atualiza. |
| `DELETE /api/indicadores/{id}` | administrador | Inativa logicamente. |
| `POST /api/indicadores/{id}` | administrador | Ativa/inativa com `{"ativo":true}`. |
| `GET /api/lancamentos` | administrador, homologador, unidade | Lista no escopo. |
| `GET /api/lancamentos/{id}` | perfis no escopo | Consulta detalhe. |
| `POST /api/lancamentos` | administrador, unidade | Cria rascunho. |
| `PUT/PATCH /api/lancamentos/{id}` | administrador, unidade | Edita estado permitido. |
| `DELETE /api/lancamentos/{id}` | administrador, unidade | Exclui somente rascunho. |
| `POST /api/lancamentos/{id}/submeter` | administrador, unidade | Submete atomicamente. |
| `POST /api/lancamentos/{id}/reabrir` | administrador | Reabre com justificativa. |
| `GET /api/homologacoes` | administrador, homologador, unidade | Fila ou histórico. |
| `GET /api/homologacoes/{id}` | perfil no escopo | Detalhe e evidências. |
| `POST /api/homologacoes/{id}/aprovar` | administrador, homologador | Aprova. |
| `POST /api/homologacoes/{id}/rejeitar` | administrador, homologador | Rejeita com justificativa. |
| `GET /api/dashboard/resumo` | todos | Cards, gráficos e recentes. |
| `GET /api/dashboard/graficos` | todos | Séries consolidadas. |
| `GET /api/administracao/usuarios` | administrador | Usuários paginados. |
| `POST /api/administracao/usuarios` | administrador | Cadastra usuário. |
| `PUT/PATCH /api/administracao/usuarios/{id}` | administrador | Atualiza usuário. |
| `GET /api/administracao/{validacao|configuracoes|auditoria|acessos}` | administrador | Consultas administrativas. |
| `PUT /api/administracao/configuracoes/{chave}` | administrador | Atualiza chave não sensível existente. |

Filtros de paginação usam `page` e `perPage` (máximo 100). Filtros de escopo enviados pelo cliente são sobrescritos pela sessão.

## Exemplos

```http
GET /api/indicadores?page=1&perPage=25&plano=Plano%20A
Accept: application/json
Cookie: PHPSESSID=...
```

```http
POST /api/homologacoes/L123/rejeitar
Content-Type: application/json
X-CSRF-Token: token-da-sessao
Cookie: PHPSESSID=...

{"justificativa":"Evidencia insuficiente para homologacao."}
```

Não registre ou compartilhe cookies, tokens, credenciais ou respostas administrativas reais.

## Compatibilidade legada

Arquivos `/api/*.php` em `public/api` são aliases temporários que carregam a mesma implementação e retornam cabeçalhos `Deprecation` e `Sunset`. O endpoint genérico `/api/database` e endpoints de protótipo não devem ser usados em novas integrações.
