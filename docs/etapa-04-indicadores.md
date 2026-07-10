# Etapa 4 — Indicadores

## Checklist de execução

- [ ] Confirmar os campos, restrições e relacionamentos reais de `dbo.indicadores`. **Implementação limitada ao esquema versionado; falta confrontar o SQL Server corporativo.**
- [x] Definir regras de cadastro, edição, ativação, inativação e unicidade a partir dos campos disponíveis.
- [x] Implementar `IndicadoresRepository` com prepared statements, filtros e paginação.
- [x] Implementar service com regras de negócio e impedimento de exclusão física, inclusive quando houver lançamentos.
- [x] Implementar validações de entrada no servidor e mensagens por campo.
- [x] Implementar controller HTML com listagem, detalhe, cadastro, edição, ativação e inativação.
- [x] Criar views sem SQL ou regras de negócio, com escape de saída e CSRF.
- [x] Implementar pesquisa e filtros pelos campos efetivamente disponíveis.
- [x] Implementar paginação determinística e segura.
- [x] Aplicar permissões por perfil e unidade a cada operação.
- [x] Registrar inclusões, alterações e mudança de situação em `dbo.auditoria`.
- [x] Implementar API de indicadores com JSON e códigos HTTP padronizados.
- [x] Avaliar e implementar exportação CSV com os mesmos filtros e escopo da consulta.
- [x] Criar testes de validação, autorização, filtros, paginação, auditoria e integridade referencial.

## Critérios de aceite

- [x] O CRUD lógico opera somente sobre os campos do esquema disponível e com consultas parametrizadas.
- [x] Indicadores associados a lançamentos não são excluídos fisicamente.
- [x] Todas as mutações exigem autorização, CSRF quando aplicável e auditoria.
- [x] Views e API apresentam resultados consistentes para os mesmos filtros.

## Acompanhamento

- Decisões: apenas administrador realiza mutações; número é único pela regra de negócio; `DELETE` da API significa inativação; nenhuma alteração estrutural foi feita; o campo “objetivo” não foi criado porque não existe no esquema disponível.
- Evidências: `app/repositories/IndicadoresRepository.php`, `app/validators/IndicadorValidator.php`, `app/services/IndicadorService.php`, controllers e views de indicadores, `tests/indicators-module.test.php` e `docs/arquitetura/modulo-indicadores.md`.
- Pendências: comparar os campos e restrições com `dbo.indicadores` real; validar paginação e transações com `pdo_sqlsrv`; homologar regras de obrigatoriedade e unicidade com a área de negócio.
