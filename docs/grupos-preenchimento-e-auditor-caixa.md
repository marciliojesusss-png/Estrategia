# Grupos de preenchimento e Auditor CAIXA

## O que mudou

O acesso de preenchimento deixou de depender apenas da unidade de lotação do empregado. A unidade responsável pelo indicador ou iniciativa continua registrada normalmente, mas o usuário pode receber acesso por um grupo compartilhado.

| Grupo | Vagas | Escopo compartilhado |
|---|---:|---|
| DICOT | 6 | Indicadores da DICOT e iniciativas de SUCOL, SULOT, GENOL e SUNEG |
| DILOT | 2 | Indicadores da DILOT, incluindo os dois anteriormente vinculados à GERIN |
| SURCI | 2 | Indicadores e iniciativas da SURCI |
| SUCTF | 2 | Indicadores da SUCTF e iniciativa da GELOF, compartilhados no escopo DIFIR |

A matrícula real do empregado continua gravada em cada preenchimento, envio, anexo e evento de auditoria. Nenhuma matrícula foi cadastrada automaticamente nesta implementação.

## Auditor CAIXA

O perfil `auditor_caixa` é nominal, temporário e somente leitura. O cadastro exige:

- matrícula e nome;
- início e fim da autorização;
- justificativa;
- protocolo;
- matrícula do aprovador.

O auditor pode consultar o Resumo Executivo, indicadores, iniciativas, relatórios, evidências e a trilha de auditoria. Ele não pode preencher, editar, homologar, reabrir, consolidar ou administrar o sistema. Downloads de evidências são registrados na auditoria.

O auditor continua sendo identificado pelo LDAP corporativo existente. Nenhuma configuração ou regra do LDAP foi alterada. A autorização adicional é validada no banco `Estrategia`.

## Banco de dados

A migração está em:

`database/sqlserver/migrations/20261120_001_grupos_preenchimento_auditor_caixa.sql`

Ela cria:

- `grupos_preenchimento`;
- `grupos_preenchimento_unidades`;
- a coluna `usuarios_acesso.grupo_preenchimento_codigo`;
- `concessoes_acesso_auditoria`.

Também altera somente o cadastro mestre dos indicadores 12 e 15 de GERIN para DILOT. Lançamentos e snapshots históricos permanecem com a unidade registrada na época.

O script é transacional e idempotente. Ele verifica o SID do proprietário e as quantidades de usuários, lançamentos, homologações, evidências e eventos de auditoria antes de confirmar a transação.

## Como cadastrar os acessos

Em **Configurações > Acessos**:

1. Para um preenchedor, selecione `Unidade Apuradora` e escolha o grupo DICOT, DILOT, SURCI ou SUCTF.
2. Para um auditor, selecione `Auditor CAIXA` e preencha todos os dados da concessão temporária.
3. Salve o acesso.

O sistema bloqueia novas vagas quando o limite do grupo é atingido e nega automaticamente o acesso do auditor fora do período autorizado.

## Simulação do administrador

O menu **Visualizar como** utiliza os mesmos grupos de preenchimento dos usuários reais. As opções são DICOT, DILOT, SUCTF/GELOF e SURCI; unidades internas como SUCOL, SULOT, GENOL e SUNEG não aparecem separadamente. As opções de homologação continuam organizadas pelas diretorias oficiais.

Essa simulação não cria acessos nem substitui o teste com uma matrícula associada ao grupo. O perfil Auditor CAIXA não é oferecido nesse menu porque depende de concessão nominal e temporária.

## Backup anterior à alteração

O backup de segurança criado antes desta mudança é:

`backup/Estrategia_PRE_GRUPOS_AUDITOR_20261120_182348.bak`

## Situação da execução local

Em 20/11/2026, a migração foi executada duas vezes no banco `Estrategia` para comprovar a idempotência. A validação final confirmou:

- 4 grupos ativos e 9 vínculos de unidades;
- 15 indicadores no escopo DICOT;
- indicadores 12 e 15 no escopo DILOT;
- 7 iniciativas DICOT entre SUCOL, SULOT, GENOL e SUNEG;
- 1 iniciativa GELOF compartilhada com o grupo SUCTF no escopo DIFIR;
- nenhuma matrícula ou concessão de auditor criada automaticamente;
- proprietário, usuários, lançamentos, homologações, evidências e histórico preservados.

As matrículas dos preenchedores e dos auditores devem ser cadastradas posteriormente em **Configurações > Acessos**.
