# Dashboard por Plano, Pilar e Indicador

## Objetivo

Reorganizar a visão gerencial do dashboard conforme a estrutura estratégica:

```text
Plano
 └── Pilar
      └── Indicador
```

## Estrutura implementada

- Plano PEI exibido antes do plano PN.
- Cabeçalho destacado para cada plano e ano.
- Pilares agrupados dentro do respectivo plano.
- Indicadores ordenados pelo número dentro de cada pilar.
- Indicadores sem dados mantidos na estrutura, com situação `Sem dados` e status `Não iniciado`.

## Colunas

- Indicador.
- Última competência.
- Resultado oficial.
- Meta.
- Desempenho.
- Situação.
- Status.
- Ações.

## Regras preservadas

O dashboard continua usando `IndicatorFormulas.calcularIndicador()` e o `tipoConsolidacao` configurado para cada indicador. A reorganização não altera fórmulas, metas ou regras de cálculo.

Não é aplicada média como regra geral para o resultado oficial. A posição exibida respeita a consolidação individual do indicador.

## Ações por perfil

- Administrador e Unidade Apuradora: `Preencher` quando o lançamento for editável.
- Administrador e Diretoria Homologadora: `Homologar` e `Devolver` quando enviado para homologação.
- Administrador e Diretoria Homologadora: `Reabrir` quando homologado.
- Todos os perfis com acesso ao dashboard: `Visualizar`.

Os links abrem diretamente o indicador ou lançamento selecionado.

## Filtros

- Ano.
- Competência.
- Plano.
- Pilar.
- Unidade apuradora.
- Diretoria responsável.
- Status.

## Critérios de aceite

- [x] Exibir PEI antes de PN.
- [x] Agrupar indicadores por plano e pilar.
- [x] Manter indicadores sem dados visíveis.
- [x] Exibir resultado oficial calculado pelo motor existente.
- [x] Exibir situação e status separadamente.
- [x] Aplicar ações conforme perfil e status.
- [x] Manter os filtros gerenciais.
- [x] Oferecer navegação direta para as telas operacionais.
- [x] Preservar as regras de cálculo existentes.
