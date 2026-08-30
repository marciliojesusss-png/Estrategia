# Prazos de Apuração

## Finalidade

A funcionalidade controla, por competência mensal, duas datas independentes:

- prazo para preenchimento e envio pela Unidade Apuradora;
- prazo para homologação pela Unidade ou Diretoria Homologadora.

O cumprimento do prazo é operacional e não altera o cálculo, a situação nem a cor de desempenho do indicador.

## Estrutura de dados

A tabela `dbo.prazos_apuracao` contém:

- `id`: identificador numérico;
- `competencia`: competência única no formato `YYYY-MM`;
- `data_limite_preenchimento`: último dia, inclusive, para preenchimento;
- `data_limite_homologacao`: último dia, inclusive, para homologação;
- `ativo`: permite desativar o prazo sem exclusão física;
- `created_at` e `updated_at`: datas de controle.

A constraint de datas impede que a homologação seja anterior ao preenchimento. A migration não cadastra datas oficiais automaticamente.

## Migration

Arquivo obrigatório:

`database/sqlserver/migrations/20260829_001_prazos_apuracao.sql`

A migration é idempotente, não recria o banco, não executa `DROP` e não remove dados.

## Administração

Um administrador acessa **Configurações > Prazos de Apuração** para listar, cadastrar, editar, ativar ou desativar prazos.

Campos:

- Competência;
- Prazo para preenchimento;
- Prazo para homologação;
- Ativo.

A leitura da API `GET /api/prazos-apuracao` é permitida a qualquer usuário autenticado. As operações `POST`, `PUT` e `PATCH` exigem permissão administrativa e token CSRF.

## Regras de atraso

- Sem prazo ativo: não há alerta.
- Não iniciado, Rascunho ou Em preenchimento após o prazo de preenchimento: **Preenchimento em atraso**.
- Enviado para homologação após o prazo de homologação: **Homologação em atraso**.
- Homologado: não há alerta.
- Devolvido para ajuste após o prazo de preenchimento: **Ajuste em atraso**. Essa mensagem diferencia a pendência devolvida de um primeiro preenchimento.
- Reaberto ou Retificado: não recebe atraso automaticamente, preservando o fluxo histórico de retificação.

O prazo vale durante todo o dia informado. A avaliação ocorre apenas quando existe um lançamento real para a competência representada pelo card. A obrigação operacional é definida por `frequenciasCobrancaOperacional`, sem inferência a partir da fórmula, consolidação, meta ou periodicidade de desempenho.

No filtro mensal, o alerta usa o lançamento da competência selecionada, mesmo quando o desempenho mantém na tela o último resultado oficial homologado. A faixa identifica explicitamente a competência operacional para não confundir os dois contextos. As frequências aceitas são: mensal (todos os meses), trimestral (março, junho, setembro e dezembro), semestral (junho e dezembro) e anual (dezembro).

## Fonte única do Resumo Executivo

O Resumo Executivo consulta `GET /api/dashboard/dados`. Indicadores, lançamentos, regras, frequências operacionais e prazos são obtidos na mesma resposta e pela mesma conexão central. A tela exige o driver `sqlsrv` e não usa `localStorage`, IndexedDB ou SQLite como fallback.

## Frequência de cobrança operacional

A configuração fica na chave `frequenciasCobrancaOperacional` de `dbo.configuracoes`, separada das regras de cálculo. Cada item contém `indicadorId` e `frequenciaCobrancaOperacional`. Indicadores ainda não presentes na configuração recebem o padrão operacional mensal no servidor.

A migration idempotente `database/sqlserver/migrations/20260830_001_frequencias_cobranca_operacional.sql` cria somente a configuração inicial, sem criar ou alterar tabelas e sem sobrescrever uma configuração já existente.

## Mapa de Desempenho

O card conserva a cor calculada pelo percentual de atingimento. Quando houver atraso, recebe uma faixa vermelha independente contendo a mensagem operacional e a data limite.

## Validação

Execute:

```powershell
node tests/prazo-apuracao.test.js
php tests/prazos-apuracao-backend.test.php
node tests/prazos-apuracao-migration.test.js
```

Depois da migration, confirme a estrutura no SQL Server e valide pela API o cadastro, a consulta, a edição e a desativação de um prazo temporário. Remova o registro temporário ao final somente se ele tiver sido criado especificamente para o teste.

## Arquivos principais

- `app/repositories/PrazosApuracaoRepository.php`
- `app/services/PrazosApuracaoService.php`
- `app/controllers/PrazosApuracaoApiController.php`
- `assets/js/prazo-apuracao.js`
- `assets/js/admin.js`
- `assets/js/executiveSummary.js`
- `assets/css/styles.css`
- equivalentes publicados em `public/assets/`
- `views/frontend/administracao.php`
- `views/frontend/resumo-executivo.php`

## Implantação no SQL Server corporativo

1. Faça backup do banco corporativo.
2. Atualize os arquivos da aplicação.
3. Conecte-se explicitamente ao banco `Estrategia`.
4. Execute `database/sqlserver/migrations/20260829_001_prazos_apuracao.sql`.
5. Confirme a tabela, as colunas e as constraints.
6. Cadastre os prazos oficiais pela Administração; a migration não inventa datas.
7. Teste um indicador não crítico.
8. Valide o alerta no Mapa de Desempenho e confirme que a cor de desempenho não mudou.

Não inclua credenciais ou nomes de servidores no script de implantação.
