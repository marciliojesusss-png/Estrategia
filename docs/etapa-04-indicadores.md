# Etapa 4 — Indicadores

## Checklist de execução

- [ ] Confirmar os campos, restrições e relacionamentos reais de `dbo.indicadores`.
- [ ] Definir regras de cadastro, edição, ativação, inativação e unicidade a partir dos dados reais.
- [ ] Implementar `IndicadoresRepository` com prepared statements, filtros e paginação.
- [ ] Implementar service com regras de negócio e impedimento de exclusão física quando houver lançamentos.
- [ ] Implementar validações de entrada no servidor e mensagens por campo.
- [ ] Implementar controller HTML com listagem, detalhe, cadastro, edição, ativação e inativação.
- [ ] Criar views sem SQL ou regras de negócio, com escape de saída e CSRF.
- [ ] Implementar pesquisa e filtros pelos campos efetivamente disponíveis.
- [ ] Implementar paginação determinística e segura.
- [ ] Aplicar permissões por perfil e unidade a cada operação.
- [ ] Registrar inclusões, alterações e mudança de situação em `dbo.auditoria`.
- [ ] Implementar API de indicadores com JSON e códigos HTTP padronizados.
- [ ] Avaliar exportação de dados e implementá-la somente se compatível e autorizada.
- [ ] Criar testes de validação, autorização, filtros, paginação, auditoria e integridade referencial.

## Critérios de aceite

- [ ] O CRUD lógico opera somente sobre campos reais e com consultas parametrizadas.
- [ ] Indicadores associados a lançamentos não são excluídos fisicamente.
- [ ] Todas as mutações exigem autorização, CSRF quando aplicável e auditoria.
- [ ] Views e API apresentam resultados consistentes para os mesmos filtros.

## Acompanhamento

- Decisões:
- Evidências:
- Pendências:

