# ALTERAÇÃO DO RESUMO EXECUTIVO — MAPA DE DESEMPENHO DOS 23 INDICADORES

Você está trabalhando no repositório:

`marciliojesusss-png/Estrategia`

Antes de alterar qualquer arquivo, analise a implementação atual da tela **Resumo Executivo** e as dependências envolvidas.

A aplicação é corporativa e deve continuar compatível com:

- PHP 7.1.19
- IIS
- Windows Server 2012 R2
- SQL Server
- JavaScript já utilizado pelo projeto
- Chart.js já existente no projeto

Não atualize versões de bibliotecas.
Não introduza frameworks novos.
Não altere módulos que não sejam necessários para esta demanda.
Não altere regras de autenticação, homologação ou persistência sem necessidade.

---

# OBJETIVO

Modernizar a tela **Resumo Executivo** criando um painel visual semelhante a um mapa de mercado/home broker, mostrando os **23 indicadores estratégicos simultaneamente**.

O objetivo é permitir que Diretoria e Conselho Administrativo identifiquem rapidamente:

- quais indicadores atingiram a meta;
- quais estão próximos da meta;
- quais estão em situação crítica;
- quais estão sem dados;
- qual foi a evolução em relação à competência anterior.

Os cards também deverão funcionar como filtro da **Tabela Executiva**.

---

# 1. ANALISE PRIMEIRO A IMPLEMENTAÇÃO EXISTENTE

Antes de escrever código, analise principalmente:

- `views/frontend/resumo-executivo.php`
- `assets/js/executiveSummary.js`
- `public/assets/js/executiveSummary.js`
- `assets/css/styles.css`
- `public/assets/css/styles.css`

E qualquer outro arquivo diretamente utilizado pelo Resumo Executivo.

Verifique também a estrutura existente em:

- `StrategicResults`
- `IndicatorFormulas`
- lançamentos
- resultados oficiais
- percentual de atingimento
- competências
- filtros do Resumo Executivo

IMPORTANTE:

Existe atualmente uma funcionalidade de seleção dos cards da área "Destaques dos Indicadores".

Procure e analise funções semelhantes a:

- `applyHighlightFilter()`
- `filterResultsByHighlight()`
- `scrollToExecutiveTable()`
- `renderHighlights()`
- `highlightCard()`

A nova funcionalidade deve, sempre que possível, **reutilizar essa lógica já existente**, em vez de criar uma segunda implementação paralela.

---

# 2. REMOVER A SEÇÃO "DESTAQUES DOS INDICADORES"

Remover completamente da tela a seção:

**LEITURA RÁPIDA**
**Destaques dos Indicadores**

Remover também seus controles:

- Pausar
- Continuar
- Ver todos
- carrossel horizontal
- animação automática
- duplicação de cards para animação

A funcionalidade de clicar em um indicador para filtrar a Tabela Executiva NÃO deve ser perdida.

Ela deverá ser transferida para o novo painel dos 23 indicadores.

Eliminar também código JavaScript e CSS que fique comprovadamente sem uso depois da remoção.

Não remover funções compartilhadas por outras partes do sistema.

---

# 3. CRIAR NOVA SEÇÃO

Criar uma nova seção no Resumo Executivo chamada:

## MAPA DE DESEMPENHO DOS INDICADORES

Ela deverá aparecer:

1. depois dos cards-resumo superiores;
2. antes da área "Desempenho por Pilar".

Estrutura geral desejada:

```text
Resumo Executivo

[Filtros]

[Cards resumo]

MAPA DE DESEMPENHO DOS INDICADORES

Cliente no Centro
[card] [card] [card]

Eficiência e Rentabilidade
[card] [card] [card] [card]

Tecnologia e Inovação
[card] [card] ...

Pessoas, Cultura e Agilidade
[...]

Sustentabilidade e Cidadania
[...]

Atuação em Ecossistema
[...]

DESEMPENHO POR PILAR

DISTRIBUIÇÃO DAS SITUAÇÕES

TABELA EXECUTIVA

4. EXIBIR TODOS OS 23 INDICADORES

O painel deve apresentar todos os indicadores que estiverem no recorte selecionado.

Quando nenhum filtro restringir os indicadores, deverão aparecer os 23 indicadores estratégicos.

Não criar uma lista fixa manual com nomes dos 23 indicadores.

Os cards devem ser criados dinamicamente a partir dos indicadores já existentes na aplicação.

A implementação deve continuar funcionando caso futuramente sejam incluídos ou removidos indicadores.

5. AGRUPAR OS INDICADORES POR PILAR

Organizar visualmente os cards pelos pilares existentes na aplicação.

Ordem preferencial:

Cliente no Centro
Eficiência e Rentabilidade
Tecnologia e Inovação
Pessoas, Cultura e Agilidade
Sustentabilidade e Cidadania
Atuação em Ecossistema

Usar os nomes reais existentes nos registros dos indicadores.

Não duplicar indicadores.

6. CONTEÚDO DE CADA CARD

Cada card deve apresentar de forma compacta:

Linha superior

Número do indicador + nome reduzido.

Exemplo:

05. Gross Gaming Revenue (GGR)

ou, quando necessário para economizar espaço:

05. GGR

Resultado oficial

Exemplo:

R$ 3,32 bi

ou:

72,5

ou:

10,8%

Usar as funções existentes da aplicação para formatação.

Não criar formatações paralelas se já existir:

StrategicResults.formatOfficialResult()
ou função equivalente.
Percentual de atingimento

Exemplo:

104% da meta

ou:

96% da meta

Variação

Exemplo:

▲ +4,8 p.p.

▼ -2,1 p.p.

→ 0,0 p.p.

Essa variação deverá representar a diferença do percentual de atingimento da meta, e não simplesmente a diferença do resultado bruto.

Exemplo:

Competência atual:

94% da meta

Competência oficial anterior:

88% da meta

Mostrar:

▲ +6,0 p.p.

7. REGRA DE CORES DOS CARDS

A classificação visual do novo mapa será:

VERDE

Percentual de atingimento:

>= 100%

Significado:

Meta atingida

AMARELO

Percentual de atingimento:

> 80% e < 100%

Ou seja:

80,01% até 99,99%

Significado:

Atenção

VERMELHO

Percentual de atingimento:

<= 80%

Significado:

Crítico

CINZA

Quando:

não houver resultado oficial;
não houver cálculo válido;
não houver percentual de atingimento disponível.

Significado:

Sem dados

IMPORTANTE:

Essa classificação é uma representação visual do Resumo Executivo.

Não alterar automaticamente a situação oficial armazenada no banco de dados.

Não mudar regras de homologação apenas para atender a essas cores.

8. LEGENDA

Na parte superior da seção incluir uma legenda discreta:

● Verde — Meta atingida
● Amarelo — Atenção
● Vermelho — Crítico
● Cinza — Sem dados

A legenda deverá acompanhar o padrão visual atual do sistema.

9. VARIAÇÃO EM RELAÇÃO À COMPETÊNCIA ANTERIOR

Para cada indicador, localizar a última competência oficial anterior à competência atual.

Normalmente será o mês anterior.

A comparação deverá utilizar:

percentual atual - percentual da competência oficial anterior

Exemplo:

Março:

91%

Abril:

96%

Resultado:

▲ +5,0 p.p.

Se houver redução:

▼ -3,2 p.p.

Se não houver alteração relevante:

→ 0,0 p.p.

Se não houver competência anterior válida:

mostrar apenas:

—

ou:

Sem comparação

Não inventar valores.

Não considerar lançamentos futuros.

Preferencialmente considerar resultados oficiais/homologados, seguindo a mesma regra utilizada pelo Resumo Executivo atual para definir resultado oficial.

10. IMPORTANTE PARA INDICADORES EM QUE MENOR É MELHOR

Não utilizar crescimento do valor bruto como sinal de melhora.

A seta deverá refletir a evolução do percentual de atingimento, pois existem indicadores onde reduzir o valor pode representar melhora.

Portanto:

percentual de atingimento aumentou → ▲
percentual de atingimento diminuiu → ▼
percentual igual → →
11. CARD CLICÁVEL

Todos os cards do Mapa de Desempenho deverão ser clicáveis.

Cada card deverá possuir referência ao id real do indicador.

Exemplo conceitual:

data-indicator-id="..."

Não utilizar nome do indicador como chave quando houver ID disponível.

12. COMPORTAMENTO AO CLICAR NO CARD

Quando o usuário clicar em um card:

Passo 1

Selecionar aquele indicador.

Passo 2

Filtrar a Tabela Executiva para exibir somente o indicador selecionado.

Passo 3

Executar rolagem suave automática até a Tabela Executiva.

Pode reutilizar a função existente:

scrollToExecutiveTable()

ou equivalente.

Passo 4

Exibir acima da tabela:

Filtro aplicado: Nome do Indicador

Exemplo:

Filtro aplicado: Gross Gaming Revenue (GGR)

Passo 5

Disponibilizar:

Limpar filtro

Ao clicar, todos os indicadores da Tabela Executiva devem voltar a aparecer de acordo com os filtros gerais da página.

13. DESTAQUE DO CARD SELECIONADO

O card selecionado deverá continuar visualmente identificado.

Aplicar algo discreto, por exemplo:

borda mais clara;
pequeno brilho;
contorno;
elevação visual.

Não alterar a cor que representa a situação do indicador.

Exemplo:

um card vermelho selecionado continua vermelho, apenas ganha um contorno de seleção.

14. TROCA DE INDICADOR

Se o usuário clicar em:

GGR

a tabela deverá mostrar apenas GGR.

Se depois clicar em:

NPS

a seleção deve mudar para NPS e a tabela passar a mostrar somente NPS.

Não acumular filtros de indicadores.

Sempre deve haver no máximo um indicador selecionado pelo mapa.

15. CLIQUE NOVAMENTE NO MESMO CARD

Se fizer sentido com a implementação existente, permitir:

1º clique:

seleciona indicador.

2º clique no mesmo indicador:

remove seleção.

Caso a implementação atual já possua esse comportamento, preservá-lo.

16. INTEGRAÇÃO COM OS FILTROS SUPERIORES

O novo mapa deverá respeitar os filtros já existentes:

Período
Plano
Pilar
Unidade apuradora
Diretoria responsável
Status
Situação
Competência

Ao alterar os filtros, o mapa deverá ser recalculado usando o mesmo conjunto de resultados utilizado pelo restante do Resumo Executivo.

Não criar uma fonte de dados separada.

17. MENSAL, TRIMESTRAL E ANUAL

O painel deverá continuar respeitando os modos já existentes:

Mensal
Trimestral
Anual

Antes de implementar a variação, analise como cada período é consolidado atualmente.

A comparação mensal é obrigatória quando o período for Mensal.

Não inventar uma lógica de comparação trimestral ou anual se ela não estiver claramente definida na aplicação.

Para períodos em que não houver comparação segura, poderá ser exibido:

—

18. RESPONSIVIDADE

Em telas grandes, mostrar vários cards por linha.

Os 23 indicadores devem ficar visíveis em um painel compacto.

Não utilizar carrossel horizontal.

Não esconder indicadores.

Não obrigar o usuário a clicar em "Ver todos".

A grade deve se reorganizar conforme a largura disponível.

Exemplo conceitual:

Desktop grande:

5 ou 6 cards por linha, conforme espaço.

Desktop menor:

4 cards por linha.

Tablet:

2 ou 3 cards.

Não comprometer a legibilidade.

19. TAMANHO DOS CARDS

Os cards devem ser compactos.

O objetivo é permitir uma visão geral dos 23 indicadores sem aumentar excessivamente a altura da página.

Não utilizar cards muito altos.

Prioridade visual:

nome;
resultado oficial;
percentual de atingimento;
variação.
20. TOOLTIP

Se for possível com a estrutura atual, ao passar o mouse no card mostrar informações adicionais:

nome completo do indicador;
resultado oficial;
meta;
percentual de atingimento;
competência;
resultado da competência anterior;
percentual anterior;
variação;
situação;
status.

Não é obrigatório introduzir biblioteca externa para tooltip.

Pode utilizar title, CSS/HTML existente ou solução simples já adotada pela aplicação.

21. NÃO DUPLICAR REGRA DE NEGÓCIO

O novo mapa não deve recalcular os indicadores por conta própria se o sistema já possui:

resultado oficial;
meta oficial;
percentual de atingimento;
situação;
consolidação mensal/trimestral/anual.

Utilizar os resultados produzidos por:

StrategicResults

IndicatorFormulas

QuarterlyConsolidation

ou serviços equivalentes existentes.

Criar apenas a lógica necessária para determinar:

faixa visual do card;
comparação com competência anterior.
22. CUIDADO COM AS DUAS PASTAS DE ASSETS

O projeto possui:

assets/...

e:

public/assets/...

Analise a forma como o projeto mantém essas pastas.

Atualmente existem arquivos correspondentes nas duas estruturas.

Se o projeto exigir sincronização entre elas, manter as duas versões idênticas.

Não alterar uma cópia e deixar a outra desatualizada.

Principalmente:

assets/js/executiveSummary.js
public/assets/js/executiveSummary.js
assets/css/styles.css
public/assets/css/styles.css
23. NÃO ALTERAR O BANCO DE DADOS

Para esta demanda, NÃO criar tabela nova.

NÃO alterar o schema.sql, salvo se durante a análise ficar comprovado que é absolutamente necessário.

A princípio, todos os dados necessários já existem nos lançamentos e resultados da aplicação.

24. PRESERVAR A TABELA EXECUTIVA

A Tabela Executiva atual deverá permanecer.

Não remover colunas.

Não mudar suas regras de acesso por perfil.

Não alterar o funcionamento do botão "Ver".

Apenas adicionar a integração:

card do mapa → filtra tabela → rola até tabela.

25. PRESERVAR OS GRÁFICOS

Manter:

Desempenho por Pilar
Distribuição das Situações

Não alterar suas regras nesta demanda, exceto algum ajuste mínimo de layout necessário para acomodar o novo painel.

26. TESTES

Depois das alterações, executar os testes existentes relacionados ao Resumo Executivo.

Analise principalmente:

tests/executive-summary.test.js
tests/executive-chart-filter.test.js
tests/dashboard-module.test.php
tests/navigation-layout.test.js

e outros testes impactados.

Criar ou atualizar testes para validar pelo menos:

Classificação visual
105% → verde
100% → verde
99% → amarelo
81% → amarelo
80% → vermelho
50% → vermelho
sem percentual → cinza
Variação
atual 105%, anterior 100% → +5 p.p.
atual 92%, anterior 96% → -4 p.p.
atual 100%, anterior 100% → 0 p.p.
sem competência anterior → sem comparação
Interação
clicar em card seleciona indicador;
tabela passa a conter somente esse indicador;
trocar card troca o indicador filtrado;
limpar filtro restaura tabela;
card selecionado recebe estado visual ativo.
27. NÃO QUEBRAR COMPATIBILIDADE

IMPORTANTE:

Embora boa parte dessa alteração seja JavaScript/CSS, toda mudança em PHP deve permanecer compatível com PHP 7.1.19.

NÃO introduzir no PHP:

match
arrow functions fn
typed properties
named arguments
enums
atributos PHP 8
sintaxe exclusiva de PHP 8
28. RESULTADO ESPERADO

Ao concluir, o início do Resumo Executivo deverá ficar conceitualmente assim:

RESUMO EXECUTIVO


[FILTROS]


[23 INDICADORES]
[ATINGIDOS]
[ABAIXO DA META]
[SEM DADOS]
[HOMOLOGADOS]
[PENDENTES]


--------------------------------------------------------


MAPA DE DESEMPENHO DOS INDICADORES


● Verde Meta atingida
● Amarelo Atenção
● Vermelho Crítico
● Cinza Sem dados


CLIENTE NO CENTRO


[NPS]
72,5
104% da meta
▲ +4,8 p.p.


[...]


EFICIÊNCIA E RENTABILIDADE


[GGR]
R$ 3,32 bi
105% da meta
▲ +5,2 p.p.


[IEO]
10,8%
96% da meta
▼ -0,8 p.p.


[...]


--------------------------------------------------------


DESEMPENHO POR PILAR


[gráficos atuais]


--------------------------------------------------------


TABELA EXECUTIVA


Filtro aplicado: GGR                  [Limpar filtro]


[apenas GGR]


29. IMPORTANTE: NÃO FAÇA ALTERAÇÕES DESNECESSÁRIAS

Não aproveite esta tarefa para:

refatorar toda a aplicação;
trocar arquitetura;
trocar banco;
alterar autenticação;
alterar menu;
alterar homologação;
atualizar bibliotecas;
redesenhar outras telas.

O objetivo é exclusivamente modernizar o Resumo Executivo e integrar o novo Mapa de Desempenho à Tabela Executiva.

30. ANTES DE FINALIZAR

Depois de implementar:

informe exatamente quais arquivos foram alterados;
descreva resumidamente cada alteração;
informe quais testes foram executados;
informe se todos passaram;
informe qualquer comportamento que não tenha sido possível validar;
confirme que não houve alteração no banco de dados;
confirme que os 23 indicadores continuam vindo dinamicamente da base;
confirme que assets e public/assets estão sincronizados quando aplicável.

Não considere a tarefa concluída se o novo mapa estiver apenas visualmente pronto.

A funcionalidade:

clicar no card → filtrar Tabela Executiva → rolar até a tabela → permitir limpar seleção

é parte obrigatória da entrega.



Um ponto que coloquei de propósito no prompt é **não mandar o Codex redesenhar