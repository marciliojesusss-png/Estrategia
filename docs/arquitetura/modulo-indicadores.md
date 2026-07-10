# Módulo de indicadores

## Limite do esquema

O módulo usa somente os campos presentes nos scripts versionados: `id`, `numero`, `nome`, `plano`, `pilar`, `unidade_apuradora`, `diretoria_responsavel`, `periodicidade`, `unidade_medida`, `tipo_calculo`, `tipo_consolidacao`, `meta_anual`, `formula_referencia`, `observacao_acompanhamento`, `ativo`, `created_at` e `updated_at`.

O campo “objetivo” citado no prompt não existe no esquema disponível e, por isso, não foi criado nem utilizado. A confirmação contra `dbo.indicadores` no SQL Server corporativo permanece pendente.

## Regras implementadas

- Número inteiro maior que zero e único pela regra de negócio.
- Nome, plano e pilar obrigatórios.
- Limites de tamanho coerentes com o script SQL Server.
- Apenas administrador cadastra, edita, ativa ou inativa.
- Demais perfis têm consulta conforme matriz e escopo.
- Nenhuma operação realiza exclusão física; `DELETE` da API significa inativação.
- Toda mutação ocorre em transação e gera registro em `auditoria` com valor anterior e novo.
- Filtros aceitos: pesquisa textual, plano, pilar, unidade, diretoria e situação ativa.
- Paginação limitada a 100 itens por página e ordenada por número e ID.

## Rotas HTML

- `GET /indicadores`
- `GET|POST /indicadores/novo`
- `GET /indicadores/{id}`
- `GET|POST /indicadores/{id}/editar`
- `POST /indicadores/{id}/status`
- `GET /indicadores/exportar`

## API

- `GET /api/indicadores`
- `GET /api/indicadores/{id}`
- `POST /api/indicadores`
- `PUT|PATCH /api/indicadores/{id}`
- `POST /api/indicadores/{id}` para ativar/inativar por payload
- `DELETE /api/indicadores/{id}` para inativação lógica

Mutações exigem sessão de administrador e CSRF. Validação retorna HTTP 422, duplicidade retorna 409, ausência retorna 404 e autorização insuficiente retorna 403.
