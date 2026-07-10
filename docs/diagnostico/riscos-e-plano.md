# Riscos, decisões e plano de migração

## Riscos priorizados

| Prioridade | Risco | Evidência | Tratamento proposto |
|---|---|---|---|
| Crítica | Código incompatível com PHP 7.1.19 | `match`, `mixed`, `never`, propriedades tipadas, promoção de propriedades, arrow functions, spread e `array_is_list` | Reescrever a fundação antes de evoluir módulos e validar com binário PHP 7.1.19. |
| Crítica | SQL SQLite em execução com conexão SQL Server | `INSERT OR REPLACE`, `CREATE TABLE IF NOT EXISTS` nos repositories | Separar migração de runtime e implementar SQL Server explícito. |
| Alta | Esquema real não confirmado | Apenas script local e relatório de migração estão disponíveis | Extrair metadados somente leitura e comparar antes dos módulos. |
| Alta | Campos de autenticação presumidos | Script usa campos extras não informados no prompt | Confirmar contrato de `usuarios_acesso` e modelar escopo sem inventar colunas. |
| Alta | Regras de negócio no navegador | Cálculos, homologação e persistência em JavaScript | Migrar regra para services e manter JS apenas para interação. |
| Alta | APIs duplicadas e divergentes | Dez pares homônimos em `api/` e `public/api/`, nenhum idêntico | Criar única entrada e controllers canônicos. |
| Alta | Substituição integral de coleções | `replaceAll` e endpoint genérico | Trocar por operações transacionais específicas por entidade e ação. |
| Alta | Alteração de esquema em runtime | `Auth::ensureTables()` executa DDL | Remover DDL da aplicação e usar scripts aprovados. |
| Alta | Ausência de timeout de sessão identificado | Sessão é iniciada, mas não há controle explícito de inatividade | Implementar política configurável e testes. |
| Alta | Upload de evidência incompleto | Há metadados, mas não foi identificada cadeia segura completa de upload/download | Implementar armazenamento privado e validações na Etapa 5. |
| Média | Dados temporais e numéricos como texto | Script SQL Server usa muitos `NVARCHAR` | Não alterar sem autorização; validar conversões e propor ajuste formal se necessário. |
| Média | Estados e perfis inconsistentes | `Devolvido` vs. `Rejeitado`; perfil `Consulta/Gestão` extra | Aprovar vocabulário canônico e matriz de acesso. |
| Média | Encoding corrompido em trechos | Valores como `NÃ£o`/`NÃƒÂ£o` no PHP | Normalizar fontes em UTF-8 e criar regressão específica. |
| Média | Configurações inválidas como JSON | Três falhas no relatório SQL Server | Definir tipo por chave ou normalizar JSON durante migração. |
| Média | Bibliotecas visuais sem inventário de versões | Não há `package.json` nem `assets/vendor` identificado | Incorporar versões locais aprovadas e documentá-las. |
| Média | Cobertura PHP ausente | Só há testes Node | Criar harness compatível com PHP 7.1 e testes de integração. |

## Estratégia de preservação e migração

1. Congelar o SQLite versionado como fonte de comparação, sem torná-lo dependência de produção.
2. Extrair e versionar apenas metadados sanitizados do esquema corporativo.
3. Comparar esquema local, esquema corporativo e modelo usado pelo código.
4. Adaptar a aplicação ao banco existente; propor alteração apenas mediante documento de limitação, tabela, proposta, justificativa e impacto.
5. Ensaiar a carga em homologação com backup, contagens, IDs, FKs, amostras e hashes/valores críticos.
6. Corrigir os três alertas de configuração conforme regra aprovada.
7. Migrar autenticação e usuários apenas depois de confirmar a origem corporativa e os campos reais.
8. Executar migração final em janela autorizada, com plano de rollback testado.
9. Reconciliar dados e executar smoke tests antes da liberação.

## Ordem recomendada

1. Obter o esquema real e aprovar regras/matriz de acesso.
2. Refatorar o código para PHP 7.1.19 e eliminar SQL incompatível.
3. Criar front controller, roteamento, configuração, erros, sessão e segurança.
4. Consolidar autenticação/autorização.
5. Migrar módulos na ordem: indicadores, lançamentos/evidências, homologações, dashboard, administração/auditoria.
6. Consolidar APIs após os services de domínio.
7. Executar testes, migração ensaiada, documentação e publicação.

## Dependências externas abertas

- Acesso somente leitura ao servidor `DF7436SR439` e ao banco `DB5319_IndicadoresEstrategicos`.
- Responsável técnico pelo contrato LDAP.
- Responsável de negócio para estados, fórmulas, acesso e fluxos de aprovação.
- PHP 7.1.19 com versão compatível do driver `pdo_sqlsrv` para validação real.
- Definição de formatos, tamanho e retenção das evidências.
- Aprovação de segurança e infraestrutura para IIS, identidade do Application Pool e diretórios graváveis.

