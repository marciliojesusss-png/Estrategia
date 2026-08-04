# Plano De Compatibilizacao Do Servidor

O plano original foi dividido em documentos menores dentro de:

```text
docs/compatibilidade-servidor/
```

Use este arquivo como indice principal.

## Navegacao

- [Indice da pasta](compatibilidade-servidor/README.md)
- [Objetivo do plano](compatibilidade-servidor/00-objetivo.md)
- [Visao geral das fases](compatibilidade-servidor/01-visao-geral.md)
- [Fase 0 - Preparacao do projeto](compatibilidade-servidor/fase-0-preparacao.md)
- [Fase 1 - Configuracao compativel](compatibilidade-servidor/fase-1-configuracao-compativel.md)
- [Fase 2 - SQL Server](compatibilidade-servidor/fase-2-sql-server.md)
- [Fase 3 - Autenticacao corporativa](compatibilidade-servidor/fase-3-autenticacao-corporativa.md)
- [Fase 4 - IIS](compatibilidade-servidor/fase-4-iis.md)
- [Fase 5 - Permissoes, logs, sessoes e uploads](compatibilidade-servidor/fase-5-permissoes-logs-sessoes-uploads.md)
- [Fase 6 - Banco, schema e usuarios](compatibilidade-servidor/fase-6-banco-schema-usuarios.md)
- [Fase 7 - Diagnostico tecnico](compatibilidade-servidor/fase-7-diagnostico-tecnico.md)
- [Fase 8 - Homologacao funcional](compatibilidade-servidor/fase-8-homologacao-funcional.md)
- [Fase 9 - Publicacao e rollback](compatibilidade-servidor/fase-9-publicacao-rollback.md)
- [Decisoes tecnicas principais](compatibilidade-servidor/decisoes-tecnicas.md)
- [Ordem recomendada de execucao](compatibilidade-servidor/ordem-recomendada.md)
- [Analise de impacto na aplicacao](compatibilidade-servidor/analise-aplicacao.md)

## Observacao

As fases continuam separadas por responsabilidade, mas a implementacao deve considerar a analise de impacto antes de alterar codigo. Em especial, as fases de banco, autenticacao e IIS afetam contratos centrais da aplicacao.
