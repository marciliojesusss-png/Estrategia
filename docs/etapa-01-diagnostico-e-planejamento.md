# Etapa 1 — Diagnóstico e planejamento

## Checklist de execução

- [ ] Inventariar páginas HTML/PHP, APIs, scripts JavaScript, serviços, repositories, banco SQLite e artefatos SQL Server existentes.
- [ ] Mapear funcionalidades atuais por tela e identificar dependências entre frontend, API e persistência.
- [ ] Confirmar com os responsáveis o fluxo corporativo de autenticação, sem criar senha ou integração não validada.
- [ ] Obter o esquema real das 12 tabelas existentes no banco `DB5319_IndicadoresEstrategicos` do servidor `DF7436SR439`.
- [ ] Registrar colunas, tipos, nulabilidade, valores padrão, chaves primárias, estrangeiras, índices e restrições.
- [ ] Comparar `database/schema.sql` e `database/sqlserver/schema.sql` com o esquema real do SQL Server.
- [ ] Mapear relacionamentos e cardinalidades entre indicadores, lançamentos, evidências, homologações, retificações e reaberturas.
- [ ] Validar os campos reais de `usuarios_acesso`, `usuarios_validacao`, `configuracoes`, `acessos_log` e `auditoria`.
- [ ] Documentar estados e transições de lançamentos e homologações, incluindo regras de edição, rejeição, reabertura e retificação.
- [ ] Elaborar a matriz dos perfis `administrador`, `homologador`, `unidade_apuradora` e `usuario_companhia` por rota e ação.
- [ ] Identificar dados legados a preservar e definir estratégia de migração, reconciliação e retorno seguro.
- [ ] Identificar incompatibilidades com PHP 7.1.19, IIS, `pdo_sqlsrv` e Windows Server 2012 R2.
- [ ] Levantar riscos de segurança, integridade, concorrência, upload, volume, desempenho e codificação UTF-8.
- [ ] Definir arquitetura em camadas, convenções de nomes, responsabilidades e fluxo das requisições.
- [ ] Definir a estrutura final de diretórios e a estratégia para retirar duplicações entre raiz, `api/` e `public/api/`.
- [ ] Definir ambientes, configuração externa, política de logs, backups e tratamento de credenciais.
- [ ] Criar diagrama de arquitetura e fluxogramas iniciais dos fluxos críticos.
- [ ] Priorizar lacunas e registrar dependências, responsáveis e ordem de implementação.

## Critérios de aceite

- [ ] O dicionário de dados foi validado contra o SQL Server real.
- [ ] Nenhuma tabela ou coluna foi presumida.
- [ ] A matriz de acesso e os fluxos de status foram aprovados pelos responsáveis.
- [ ] Arquitetura, riscos, estratégia de migração e estrutura de diretórios estão documentados.

## Acompanhamento

- Decisões:
- Evidências:
- Pendências: