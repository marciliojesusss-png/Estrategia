# Plano de migração para PHP puro

Este diretório organiza a migração do Sistema de Gestão de Indicadores Estratégicos nas 10 etapas definidas em `prompt-migracao-php.md`.

## Como usar

- Execute as etapas na ordem indicada abaixo.
- Marque um item com `[x]` somente após implementá-lo e validar seu critério de aceite.
- Registre decisões, evidências e pendências na seção de acompanhamento de cada arquivo.
- Não altere tabelas ou colunas sem documentar previamente limitação, proposta, justificativa e impacto.
- Em todas as etapas, preserve a compatibilidade com PHP 7.1.19, IIS, Windows Server 2012 R2 e SQL Server via `pdo_sqlsrv`.

## Etapas

1. [Diagnóstico e planejamento](./etapa-01-diagnostico-e-planejamento.md)
2. [Fundação técnica](./etapa-02-fundacao-tecnica.md)
3. [Autenticação e autorização](./etapa-03-autenticacao-e-autorizacao.md)
4. [Indicadores](./etapa-04-indicadores.md)
5. [Lançamentos e evidências](./etapa-05-lancamentos-e-evidencias.md)
6. [Homologações](./etapa-06-homologacoes.md)
7. [Dashboard](./etapa-07-dashboard.md)
8. [Administração e auditoria](./etapa-08-administracao-e-auditoria.md)
9. [APIs e integrações](./etapa-09-apis-e-integracoes.md)
10. [Testes e publicação](./etapa-10-testes-e-publicacao.md)

## Restrições permanentes

- PHP puro, sem framework, CMS, ORM ou engine de templates.
- Sem dependência obrigatória do Composer em produção.
- Sem recursos de linguagem posteriores ao PHP 7.1.
- Consultas somente com PDO e parâmetros preparados.
- SQL fora das views e regras de negócio fora dos controllers.
- Controle de acesso, CSRF, XSS, auditoria e tratamento seguro de erros.
- Bibliotecas de frontend preferencialmente locais em `assets/vendor`.

