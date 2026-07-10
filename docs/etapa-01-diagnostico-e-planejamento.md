# Etapa 1 — Diagnóstico e planejamento

## Checklist de execução

- [x] Inventariar páginas HTML/PHP, APIs, scripts JavaScript, serviços, repositories, banco SQLite e artefatos SQL Server existentes.
- [x] Mapear funcionalidades atuais por tela e identificar dependências entre frontend, API e persistência.
- [ ] Confirmar com os responsáveis o fluxo corporativo de autenticação, sem criar senha ou integração não validada.
- [ ] Obter o esquema real das 12 tabelas existentes no banco `DB5319_IndicadoresEstrategicos` do servidor `DF7436SR439`.
- [ ] Registrar colunas, tipos, nulabilidade, valores padrão, chaves primárias, estrangeiras, índices e restrições. **Parcial:** esquema versionado documentado; falta confrontar o banco real.
- [ ] Comparar `database/schema.sql` e `database/sqlserver/schema.sql` com o esquema real do SQL Server. **Pendente:** requer acesso somente leitura ao banco corporativo.
- [x] Mapear relacionamentos e cardinalidades entre indicadores, lançamentos, evidências, homologações, retificações e reaberturas no esquema disponível.
- [ ] Validar os campos reais de `usuarios_acesso`, `usuarios_validacao`, `configuracoes`, `acessos_log` e `auditoria`. **Pendente:** campos locais não comprovam o esquema corporativo.
- [x] Documentar estados e transições de lançamentos e homologações, incluindo regras de edição, rejeição, reabertura e retificação.
- [x] Elaborar uma matriz preliminar dos perfis `administrador`, `homologador`, `unidade_apuradora` e `usuario_companhia` por módulo e ação.
- [x] Identificar dados legados a preservar e definir estratégia de migração, reconciliação e retorno seguro.
- [x] Identificar incompatibilidades com PHP 7.1.19, IIS, `pdo_sqlsrv` e Windows Server 2012 R2 observáveis no repositório.
- [x] Levantar riscos de segurança, integridade, concorrência, upload, volume, desempenho e codificação UTF-8.
- [x] Definir arquitetura em camadas, convenções de nomes, responsabilidades e fluxo das requisições.
- [x] Definir a estrutura final de diretórios e a estratégia para retirar duplicações entre raiz, `api/` e `public/api/`.
- [x] Definir estratégia de ambientes, configuração externa, logs, backups e tratamento de credenciais.
- [x] Criar diagrama de arquitetura e fluxogramas iniciais dos fluxos críticos.
- [x] Priorizar lacunas e registrar dependências e ordem de implementação. **Responsáveis nominais ainda devem ser designados.**

## Critérios de aceite

- [ ] O dicionário de dados foi validado contra o SQL Server real.
- [ ] Nenhuma tabela ou coluna foi presumida.
- [ ] A matriz de acesso e os fluxos de status foram aprovados pelos responsáveis.
- [x] Arquitetura, riscos, estratégia de migração e estrutura de diretórios estão documentados.

## Acompanhamento

- Decisões: adotar uma única raiz pública com front controller; manter SQLite apenas como fonte temporária de validação/migração; não executar DDL durante requisições.
- Evidências: `docs/diagnostico/inventario-atual.md`, `banco-de-dados.md`, `regras-negocio-e-acesso.md`, `arquitetura-proposta.md` e `riscos-e-plano.md`.
- Pendências: acesso ao SQL Server corporativo; confirmação do contrato LDAP; aprovação dos estados, fórmulas e matriz de acesso; ambiente real com PHP 7.1.19 e `pdo_sqlsrv`; designação de responsáveis.
