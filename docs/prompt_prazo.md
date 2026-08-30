Você está trabalhando no projeto "Estrategia", aplicação PHP + JavaScript
com SQL Server.

IMPORTANTE:
Estou desenvolvendo no meu computador pessoal e a aplicação atualmente
está conectada ao SQL Server LOCAL:

Servidor: localhost
Banco: Estrategia

Depois de toda a funcionalidade estar validada, a aplicação será levada
para um servidor da empresa e os mesmos ajustes estruturais terão que ser
executados no SQL Server corporativo.

NESTA TAREFA:
- altere a aplicação;
- altere SOMENTE o SQL Server LOCAL "Estrategia";
- NÃO acesse nem altere banco corporativo;
- NÃO recrie o banco;
- NÃO apague dados existentes;
- NÃO faça DROP TABLE;
- NÃO faça limpeza de lançamentos;
- NÃO altere os cálculos dos indicadores;
- NÃO implemente envio de e-mail ainda;
- NÃO implemente destinatários de e-mail ainda.

============================================================
OBJETIVO DA FUNCIONALIDADE
============================================================

Precisamos implementar no sistema a gestão mensal de prazo para:

1. preenchimento/envio dos indicadores pelas Unidades Apuradoras;
2. homologação dos indicadores pelas Unidades/Diretorias Homologadoras;
3. identificação automática de atraso;
4. alerta visual no card do indicador no painel
   "Mapa de Desempenho dos Indicadores".

A solicitação veio da gestão porque não podemos permitir que competências
mensais fiquem sem preenchimento ou sem homologação sem que isso seja
visível no painel.

IMPORTANTE:
"desempenho do indicador" e "cumprimento do prazo" são conceitos diferentes.

Um indicador pode:

- estar com a meta atingida;
- continuar com o card verde pelo desempenho;
- e, ao mesmo tempo, possuir um alerta vermelho de atraso operacional.

NÃO mudar a cor de desempenho do indicador devido ao atraso.

============================================================
1. ANALISE O PROJETO ANTES DE ALTERAR
============================================================

Antes de escrever código:

1. confirme a branch atual e o estado do git;
2. verifique alterações locais ainda não commitadas;
3. NÃO sobrescreva alterações locais do usuário;
4. analise a arquitetura existente;
5. identifique exatamente:
   - como o SQL Server é acessado;
   - como estão os repositories/services/controllers;
   - como as rotas da API são registradas;
   - como funciona o módulo Administração;
   - como o Mapa de Desempenho é montado;
   - como os lançamentos e seus status são representados;
   - como indicador, unidade apuradora e diretoria responsável
     estão relacionados.

Arquivos que provavelmente serão relevantes:

app/repositories/
app/services/
app/controllers/
public/index.php
public/router.php
views/frontend/administracao.php
assets/js/admin.js
public/assets/js/admin.js
assets/js/executiveSummary.js
public/assets/js/executiveSummary.js
assets/css/styles.css
public/assets/css/styles.css
database/sqlserver/schema.sql

O projeto mantém arquivos JavaScript em:
assets/js/
e
public/assets/js/

Quando existir a mesma lógica nas duas árvores, mantenha as duas cópias
sincronizadas e, idealmente, byte a byte idênticas.

Faça o mesmo para CSS duplicado, se houver.

============================================================
2. NOVO CONCEITO: PRAZOS DE APURAÇÃO
============================================================

Queremos DUAS datas diferentes por competência.

Exemplo:

Competência: Agosto/2026

Prazo para preenchimento/envio:
05/09/2026

Prazo para homologação:
09/09/2026

A primeira data é responsabilidade da Unidade Apuradora.

A segunda data é responsabilidade da Unidade/Diretoria Homologadora.

Não utilize uma única data para os dois processos.

============================================================
3. BANCO DE DADOS
============================================================

Crie uma tabela específica para os prazos.

Sugestão de nome:

dbo.prazos_apuracao

Estrutura recomendada:

id INT IDENTITY(1,1) PRIMARY KEY
competencia CHAR(7) NOT NULL
data_limite_preenchimento DATE NOT NULL
data_limite_homologacao DATE NOT NULL
ativo BIT NOT NULL DEFAULT 1
created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
updated_at DATETIME2 NULL

Criar restrição UNIQUE para competencia.

Formato de competencia:

YYYY-MM

Exemplo:

2026-08
2026-09
2026-10

Validações:

- competência obrigatória;
- formato YYYY-MM;
- prazo de preenchimento obrigatório;
- prazo de homologação obrigatório;
- prazo de homologação não pode ser anterior ao prazo de preenchimento.

IMPORTANTE:
Antes de criar a tabela, verifique se ela já existe.

O script deve ser IDEMPOTENTE.

Exemplo conceitual:

IF OBJECT_ID(N'dbo.prazos_apuracao', N'U') IS NULL
BEGIN
    CREATE TABLE ...
END;

Não faça DROP e recriação.

============================================================
4. MIGRATION PARA FUTURA IMPLANTAÇÃO NA EMPRESA
============================================================

Além de executar a alteração no banco LOCAL, salve o SQL utilizado no
repositório.

Crie uma pasta se ainda não existir:

database/sqlserver/migrations/

E crie um arquivo semelhante a:

database/sqlserver/migrations/20260829_001_prazos_apuracao.sql

Esse script deverá poder ser executado posteriormente no SQL Server da
empresa.

Também atualize:

database/sqlserver/schema.sql

para que uma instalação nova do sistema já contenha a tabela.

IMPORTANTE:
O script da migration não deve conter configurações específicas do meu
computador.

Não colocar:
- nome do usuário Windows;
- senha;
- connection string;
- localhost;
- caminho pessoal;
- credenciais.

============================================================
5. EXECUÇÃO NO SQL SERVER LOCAL
============================================================

O Codex pode executar a migration SOMENTE se confirmar primeiro que está
conectado a:

Servidor: localhost
Banco: Estrategia

Antes do DDL, executar uma verificação equivalente a:

SELECT
    @@SERVERNAME AS servidor,
    DB_NAME() AS banco;

Somente prosseguir se o banco for:

Estrategia

Se não conseguir confirmar o banco, NÃO execute a alteração.
Nesse caso, apenas deixe o script pronto e informe o comando que eu devo
executar manualmente.

Nunca solicitar nem gravar senha no repositório.

Preferir autenticação integrada do Windows se já estiver configurada.

============================================================
6. NÃO INSERIR PRAZOS OFICIAIS AUTOMATICAMENTE
============================================================

A migration deve criar a estrutura.

Não considere datas inventadas como prazos oficiais.

Não inserir no script principal algo como:

2026-08 -> 05/09 e 09/09

sem que tenha sido cadastrado pelo administrador.

Para testes automatizados, use fixtures/mocks/dados temporários.

Se precisar inserir dados temporários no SQL local para teste manual,
remova-os ao final do teste ou deixe claramente identificado que são dados
de teste e não fazem parte da migration.

============================================================
7. ADMINISTRAÇÃO DOS PRAZOS
============================================================

Na tela:

Configurações / Administração

criar um novo módulo:

"Prazos de Apuração"

O administrador deverá conseguir:

- listar prazos;
- cadastrar;
- editar;
- ativar/desativar.

Não é necessário excluir fisicamente um prazo.
Preferir ativo/inativo.

Campos do formulário:

Competência
Prazo para preenchimento
Prazo para homologação
Ativo

Exemplo visual:

Competência
[ Agosto/2026 ]

Prazo para preenchimento
[ 05/09/2026 ]

Prazo para homologação
[ 09/09/2026 ]

[ Salvar ]

Na listagem:

Competência | Preenchimento | Homologação | Status | Ações

Ago/2026 | 05/09/2026 | 09/09/2026 | Ativo | Editar

============================================================
8. API E BACKEND
============================================================

Seguir o padrão arquitetural já utilizado no projeto.

Preferencialmente criar componentes específicos, por exemplo:

PrazosApuracaoRepository.php
PrazosApuracaoService.php

e controller/API compatível com o padrão atual.

Não colocar SQL diretamente no JavaScript.

IMPORTANTE SOBRE PERMISSÕES:

- qualquer usuário autenticado que tenha acesso ao
  Mapa de Desempenho precisa conseguir LER os prazos;
- somente Administrador pode CRIAR/ALTERAR os prazos.

Portanto, não coloque a consulta de leitura exclusivamente atrás de uma
rota que exija "administracao/gerenciar", pois isso impediria o painel de
gestores/outros perfis de consultar os prazos.

Criar uma rota de leitura autenticada adequada e proteger as operações de
escrita com a permissão administrativa existente.

Usar CSRF nas operações de escrita, conforme padrão do projeto.

============================================================
9. MOTOR DE SITUAÇÃO DO PRAZO
============================================================

Criar uma lógica reutilizável para determinar a situação operacional de
cada lançamento em relação ao prazo.

Não espalhar comparações de datas pelo executiveSummary.js.

Criar uma função/serviço central, por exemplo:

PrazoStatus
DeadlineStatus
PrazoApuracao

ou equivalente.

A função deve receber pelo menos:

- lançamento;
- prazo da competência;
- data de referência.

A data de referência deve poder ser injetada em testes para que os testes
não dependam do relógio real.

============================================================
10. REGRAS DE ATRASO
============================================================

Utilizar os status reais existentes no projeto.
Antes de implementar, confirme exatamente quais strings de status o
sistema usa e utilize as funções de normalização existentes quando houver.

Regra funcional desejada:

A) COMPETÊNCIA SEM PRAZO CADASTRADO

Não gerar falso atraso.

Retornar algo equivalente a:

sem_prazo

No Mapa de Desempenho não precisa aparecer alerta vermelho.

Para administrador, se for útil, pode ser exibido discretamente:
"Prazo não configurado".

B) ANTES OU NO DIA DO PRAZO DE PREENCHIMENTO

Se o lançamento estiver:

Não iniciado
Em preenchimento

não existe atraso ainda.

C) APÓS O PRAZO DE PREENCHIMENTO

Se o lançamento continuar:

Não iniciado
Em preenchimento

classificar:

preenchimento_atrasado

Mensagem:

"Preenchimento em atraso"

Exibir também:

Prazo: dd/mm/aaaa

D) LANÇAMENTO JÁ ENVIADO PARA HOMOLOGAÇÃO

Se estiver:

Enviado para homologação

e a data atual ainda não ultrapassou o prazo de homologação:

não considerar atrasado.

Pode permanecer apenas com seu status normal.

E) APÓS O PRAZO DE HOMOLOGAÇÃO

Se estiver:

Enviado para homologação

e o prazo de homologação já venceu:

classificar:

homologacao_atrasada

Mensagem:

"Homologação em atraso"

Exibir:

Prazo: dd/mm/aaaa

F) HOMOLOGADO

Se o lançamento estiver:

Homologado

NÃO exibir alerta de atraso, mesmo que a data atual seja posterior aos
prazos.

G) DEVOLVIDO PARA AJUSTE

Analise como esse status funciona atualmente.

Se o lançamento foi devolvido e a competência está além do prazo de
preenchimento, considerar que existe uma pendência da Unidade Apuradora.

Pode utilizar:

"Ajuste em atraso"

ou, se for mais coerente com a arquitetura atual:

"Preenchimento em atraso"

Documente a decisão.

H) REABERTO / RETIFICAÇÃO

NÃO marque automaticamente uma competência histórica como
"preenchimento em atraso" somente porque ela foi homologada no passado e
posteriormente reaberta para retificação.

Respeite o fluxo atual de reabertura.

Não destrua nem altere a lógica existente de reabertura/retificação.

============================================================
11. PERIODICIDADE DOS INDICADORES
============================================================

Antes de aplicar o alerta indiscriminadamente a todos os indicadores,
analise a periodicidade existente.

O sistema possui indicadores com metodologias diferentes.

Não gere alerta mensal falso para uma competência na qual, pela regra
existente do indicador, não há obrigação de apuração.

Utilize:
- periodicidade;
- regra do indicador;
- lançamento existente;
- demais mecanismos já disponíveis no projeto.

Como regra segura:

somente avaliar atraso quando existir um lançamento válido para aquela
competência e ele fizer parte do ciclo esperado de apuração.

Não inventar competências adicionais.

============================================================
12. MAPA DE DESEMPENHO DOS INDICADORES
============================================================

O principal local onde o alerta deverá aparecer é:

Mapa de Desempenho dos Indicadores

Hoje o mapa é montado em:

assets/js/executiveSummary.js
public/assets/js/executiveSummary.js

Preservar a lógica atual de desempenho.

Exemplo:

IEO
133,43% da meta
Meta atingida

e adicionar separadamente:

⚠ Preenchimento em atraso
Prazo: 05/09/2026

ou:

⚠ Homologação em atraso
Prazo: 09/09/2026

IMPORTANTE:

Se o indicador está verde por desempenho e atrasado operacionalmente:

NÃO transformar o card em vermelho.

Manter:

verde = desempenho

e acrescentar um badge/faixa/alerta visual de atraso.

Exemplo conceitual:

┌──────────────────────────────┐
│ 06  IEO                      │
│                              │
│       133,43%                │
│       META ATINGIDA          │
│                              │
│ ⚠ HOMOLOGAÇÃO EM ATRASO      │
│ Prazo: 09/09/2026            │
└──────────────────────────────┘

O alerta deve ser suficientemente visível, mas não deve prejudicar a
leitura atual do mapa.

============================================================
13. VISIBILIDADE DO ALERTA
============================================================

O objetivo desse alerta é gerencial.

Por isso, o alerta de prazo deve ser visível para todos os perfis que
possam visualizar o Mapa de Desempenho, respeitando naturalmente as
restrições de escopo de dados já existentes.

Não esconder o alerta apenas porque determinado perfil não vê controles
operacionais de homologação.

Não expor informações de unidades/indicadores que o perfil não poderia
ver normalmente.

============================================================
14. QUAL COMPETÊNCIA USAR NO CARD
============================================================

O alerta precisa corresponder à MESMA competência que o card está
representando no contexto/filtro atual do Mapa.

Não comparar um resultado de março com o prazo de agosto.

Se o painel trabalha com:
- competência selecionada;
- última posição;
- filtro mensal;
- filtro trimestral;

analise a implementação atual e associe corretamente lançamento e prazo.

Não alterar a regra de qual resultado oficial é exibido no card.

A nova funcionalidade apenas acrescenta o status de prazo correspondente.

============================================================
15. CSS / DESIGN
============================================================

Criar estilos específicos para o alerta.

Sugestão de classes semânticas:

deadline-alert
deadline-alert--fill-overdue
deadline-alert--approval-overdue

ou equivalentes.

Não usar style inline se o projeto já possui CSS centralizado.

Evitar poluição visual.

Usar linguagem em português:

"Preenchimento em atraso"
"Homologação em atraso"
"Prazo: 05/09/2026"

============================================================
16. NÃO IMPLEMENTAR E-MAIL
============================================================

ESTA É UMA RESTRIÇÃO EXPRESSA.

Não implementar nesta tarefa:

- SMTP;
- Microsoft Graph;
- Microsoft 365;
- PHPMailer;
- caixa remetente;
- destinatários;
- templates de e-mail;
- agendador de e-mail;
- tabela de envio de notificações.

Essa será uma segunda etapa depois que a gestão de prazo estiver validada.

Também não é necessário corrigir agora usuarios_acesso.email, salvo se
alguma alteração for absolutamente necessária para esta funcionalidade,
o que em princípio não é.

============================================================
17. TESTES OBRIGATÓRIOS
============================================================

Criar testes determinísticos para a lógica de prazo.

Não depender da data real do computador.

Casos mínimos:

1.
prazo preenchimento = 05/09/2026
data teste = 04/09/2026
status = Não iniciado
resultado:
SEM ATRASO

2.
prazo preenchimento = 05/09/2026
data teste = 05/09/2026
status = Em preenchimento
resultado:
SEM ATRASO
(o prazo vale durante todo o dia)

3.
prazo preenchimento = 05/09/2026
data teste = 06/09/2026
status = Não iniciado
resultado:
PREENCHIMENTO EM ATRASO

4.
data teste = 06/09/2026
status = Em preenchimento
resultado:
PREENCHIMENTO EM ATRASO

5.
prazo homologação = 09/09/2026
data teste = 08/09/2026
status = Enviado para homologação
resultado:
SEM ATRASO

6.
prazo homologação = 09/09/2026
data teste = 09/09/2026
status = Enviado para homologação
resultado:
SEM ATRASO

7.
prazo homologação = 09/09/2026
data teste = 10/09/2026
status = Enviado para homologação
resultado:
HOMOLOGAÇÃO EM ATRASO

8.
data teste = 20/09/2026
status = Homologado
resultado:
SEM ATRASO

9.
sem prazo cadastrado
status = Não iniciado
resultado:
SEM PRAZO / SEM FALSO ATRASO

10.
validar comportamento do status Devolvido para ajuste.

11.
validar comportamento de competência reaberta/retificada.

============================================================
18. TESTE DE INTEGRAÇÃO COM O SQL SERVER
============================================================

Depois da migration local:

confirmar:

SELECT
    TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = 'prazos_apuracao';

Depois:

SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'prazos_apuracao'
ORDER BY ORDINAL_POSITION;

Testar através da API:

- cadastrar prazo;
- consultar;
- editar;
- desativar;
- recarregar página;
- confirmar persistência no SQL Server.

============================================================
19. TESTE FUNCIONAL DO MAPA
============================================================

Criar uma forma segura de validar visualmente um atraso.

Não modificar permanentemente lançamentos homologados apenas para testar.

Preferir:
- prazo temporário de teste;
- lançamento não crítico;
- fixture/teste;
- ou mecanismo reversível.

Validar:

- card mantém a cor do desempenho;
- badge de atraso aparece;
- prazo correto aparece;
- após mudar o status para Homologado o alerta desaparece;
- outro indicador não é afetado;
- competência diferente não herda o alerta.

============================================================
20. NÃO QUEBRAR FUNCIONALIDADES EXISTENTES
============================================================

Regressionar no mínimo:

- login;
- Resumo Executivo;
- Mapa de Desempenho;
- Indicadores;
- Lançamentos;
- envio para homologação;
- homologação;
- reabertura;
- Administração.

Não alterar fórmulas dos indicadores.

Em especial, não alterar a regra do IEO Recorrente nesta tarefa.

Não alterar metas ou valores dos lançamentos existentes.

============================================================
21. DOCUMENTAÇÃO PARA IMPLANTAÇÃO NA EMPRESA
============================================================

Criar documentação, por exemplo:

docs/prazos-apuracao.md

Ela deve explicar:

1. finalidade;
2. tabela criada;
3. migration necessária;
4. arquivos de aplicação alterados;
5. como cadastrar os prazos;
6. regras de atraso;
7. como validar;
8. como implantar posteriormente no servidor da empresa.

Criar uma seção:

"Implantação no SQL Server corporativo"

com instrução semelhante a:

1. fazer backup;
2. atualizar arquivos da aplicação;
3. executar:
   database/sqlserver/migrations/20260829_001_prazos_apuracao.sql
4. confirmar estrutura;
5. cadastrar os prazos oficiais;
6. testar um indicador;
7. validar Mapa de Desempenho.

NÃO incluir credenciais ou nomes de servidores corporativos.

============================================================
22. RELATÓRIO FINAL OBRIGATÓRIO
============================================================

Ao terminar, apresente um relatório com:

A. DIAGNÓSTICO
- como o projeto funcionava antes;
- onde a nova funcionalidade foi integrada.

B. ARQUIVOS ALTERADOS
Listar um por um.

C. BANCO LOCAL
Informar exatamente:
- servidor usado;
- banco usado;
- tabela criada;
- índices/constraints criados;
- comandos executados.

D. IMPACTO SQL
Classificar obrigatoriamente como:

🔴 Aplicação + estrutura do banco

E explicar que futuramente a mesma migration terá que ser executada no
SQL Server da empresa.

E. DADOS
Confirmar explicitamente:
- nenhum lançamento foi excluído;
- nenhuma homologação foi excluída;
- nenhuma meta foi alterada;
- nenhuma fórmula de indicador foi alterada.

F. TESTES
Listar:
- testes executados;
- resultado de cada teste;
- testes que não puderam ser executados e motivo.

G. MIGRATION CORPORATIVA
Informar o caminho exato do arquivo SQL que deverá ser executado
posteriormente no banco da empresa.

H. GIT
Mostrar:
git status
git diff --stat

e resumir o diff.

============================================================
23. CRITÉRIO DE ACEITE
============================================================

A tarefa somente estará concluída se:

[ ] administrador consegue cadastrar duas datas por competência;
[ ] prazos permanecem salvos no SQL Server após recarregar;
[ ] usuário comum/gestor autorizado consegue consultar os prazos para o painel;
[ ] lançamento não iniciado após o prazo mostra "Preenchimento em atraso";
[ ] lançamento em preenchimento após o prazo mostra "Preenchimento em atraso";
[ ] enviado para homologação após o prazo de homologação mostra
    "Homologação em atraso";
[ ] homologado não mostra atraso;
[ ] falta de prazo não gera falso atraso;
[ ] alerta aparece no card correto e na competência correta;
[ ] alerta não muda a classificação/cor de desempenho;
[ ] nenhuma fórmula de indicador foi alterada;
[ ] nenhum dado existente foi perdido;
[ ] migration SQL está versionada;
[ ] schema.sql foi atualizado;
[ ] documentação foi criada;
[ ] testes passaram.

Não implemente e-mail nesta etapa.