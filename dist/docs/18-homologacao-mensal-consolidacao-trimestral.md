# Homologação mensal e consolidação trimestral automática

## Objetivo

Manter o fluxo operacional mensal e gerar automaticamente os consolidados trimestrais utilizando exclusivamente competências homologadas.

```text
Mensal alimenta.
Homologação mensal valida.
Trimestral consolida e apresenta.
```

## Fluxo mensal

Cada uma das 276 competências mensais permanece independente e pode assumir os status:

- Não iniciado.
- Em preenchimento.
- Enviado para homologação.
- Devolvido para ajuste.
- Homologado.
- Reaberto.
- Cancelado.
- Substituído.

A homologação continua sendo executada mês a mês. Não existe homologação manual do trimestre.

Os lançamentos agora também possuem os campos derivados:

- `competencia`, no formato `2026-01`;
- `trimestre`, no formato `1TRI/2026`.

## Motor trimestral

O módulo `assets/js/quarterly.js` disponibiliza:

```javascript
obterTrimestrePorMes(mes, ano)
obterMesesDoTrimestre(trimestre)
consolidarTrimestre(indicador, regra, lancamentos, trimestre)
consolidarAno(indicador, regra, lancamentos, ano)
```

Somente lançamentos com status `Homologado` entram no cálculo.

### Status do trimestre

- `Sem dados`: nenhum mês homologado.
- `Parcial`: um ou dois meses homologados.
- `Fechado`: três meses homologados.

O consolidado informa a quantidade de meses homologados, a composição mensal e alertas de competências devolvidas.

## Regras de consolidação

O cálculo trimestral delega ao motor `IndicatorFormulas`:

- valores financeiros: soma dos meses homologados;
- razões: soma dos numeradores dividida pela soma dos denominadores;
- última posição: última competência homologada disponível;
- planos de ação e quantidades acumuladas: posição homologada acumulada até o trimestre;
- projetos e pesquisas: última posição homologada.

Não é utilizada média simples quando a regra exige soma, razão ou última posição.

## Visão Trimestral

A página `visao-trimestral.html` apresenta:

- filtros por ano, trimestre, plano, pilar, unidade, diretoria e status trimestral;
- cards de consolidados fechados, parciais e sem dados;
- alertas de trimestre incompleto e mês devolvido;
- agrupamento por Plano, Pilar e Indicador;
- meta, realizado, desempenho e status trimestrais;
- ação para visualizar o detalhe.

O filtro inicia em `1TRI` e também permite selecionar todos os trimestres.

## Detalhe do indicador

A tela de indicadores ganhou:

- composição das 12 competências mensais;
- status e ação de cada mês;
- consolidação dos quatro trimestres;
- mensagens explicando meses homologados e parcialidade.

## Reabertura

Uma unidade apuradora pode solicitar reabertura de lançamento homologado. O status permanece `Homologado` até a diretoria ou o administrador reabrir.

A solicitação e o atendimento são registrados no histórico.

## Resumo Executivo

O filtro `Período` permite:

- Mensal.
- Trimestral.
- Anual.

Na opção trimestral, os cards, destaques, gráfico e tabela usam o consolidado do trimestre selecionado.

## Critérios de aceite

- [x] Manter lançamentos e homologações mensais independentes.
- [x] Considerar somente meses homologados no trimestre.
- [x] Classificar trimestre como Sem dados, Parcial ou Fechado.
- [x] Alertar sobre mês devolvido.
- [x] Respeitar soma, razão, última posição e acumulados.
- [x] Criar a Visão Trimestral.
- [x] Exibir composição mensal e trimestral no detalhe.
- [x] Permitir solicitação de reabertura.
- [x] Adicionar período trimestral ao Resumo Executivo.
- [x] Preservar todas as regras específicas dos indicadores.
