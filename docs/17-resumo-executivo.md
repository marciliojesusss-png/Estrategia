# Resumo Executivo

## Objetivo

Criar uma visão gerencial anterior ao dashboard detalhado, permitindo leitura rápida do desempenho oficial dos indicadores estratégicos.

## Estrutura

### Cards gerais

- Total de indicadores.
- Indicadores atingidos.
- Indicadores abaixo da meta.
- Indicadores críticos.
- Indicadores sem dados.
- Indicadores homologados.
- Pendentes de homologação.

### Destaques executivos

- Pilar com maior quantidade de indicadores críticos.
- Plano com melhor percentual de indicadores atingidos.

Quando não existem resultados oficiais, o destaque do plano informa `Sem dados`. Empates entre PEI e PN são apresentados explicitamente.

### Panorama dos pilares

Cada pilar apresenta:

- quantidade total;
- quantidade atingida;
- quantidade em atenção ou crítica;
- quantidade crítica;
- percentual de indicadores atingidos.

### Distribuição por pilar

Gráfico de barras empilhadas e tabela acessível com:

- atingidos;
- abaixo da meta;
- críticos;
- sem dados.

### Tabela executiva

- Plano.
- Pilar.
- Indicador.
- Última competência.
- Resultado oficial.
- Meta.
- Situação.
- Status.
- Ação para visualizar.

## Filtros

- Plano.
- Pilar.
- Unidade apuradora.
- Diretoria responsável.
- Status.
- Situação.
- Competência.

O filtro de competência calcula a posição oficial acumulada até o mês selecionado, preservando as regras de consolidação anual.

## Regras preservadas

A página reutiliza `StrategicResults`, exportado pelo módulo do dashboard. Os resultados continuam sendo calculados por `IndicatorFormulas.calcularIndicador()` conforme o tipo de consolidação configurado.

Nenhuma fórmula ou regra de indicador foi alterada.

## Acesso

A tela está disponível para todos os perfis com acesso ao dashboard e aparece antes dele no menu principal. Após o login, ela é a primeira página exibida.

## Critérios de aceite

- [x] Exibir os 23 indicadores na visão inicial.
- [x] Classificar indicadores sem lançamento válido como `Sem dados`.
- [x] Exibir cards gerais e por pilar.
- [x] Identificar pilar crítico e melhor plano.
- [x] Exibir gráfico e tabela por situação.
- [x] Exibir tabela executiva com ação `Visualizar`.
- [x] Aplicar filtros a todos os blocos.
- [x] Reutilizar o resultado oficial existente.
- [x] Preservar as regras de cálculo.
