# Correção - Índice de Ofertas Personalizadas aos Clientes Ativos

## Objetivo

Corrigir a tela de lançamento e a lógica de cálculo do indicador `Índice de Ofertas Personalizadas aos Clientes Ativos`.

## Ajustes realizados

- O campo editável `Realizado mensal` não é usado como entrada para esse indicador.
- A tela exibe somente os campos brutos obrigatórios:
  - Base de clientes ativos no mês.
  - Clientes com oferta personalizada no mês.
- A tela exibe os resultados calculados como somente leitura:
  - Resultado mensal.
  - Percentual atingido mensal.
  - Resultado oficial anual.
  - Percentual atingido anual.
- Valores antigos importados em `realizadoMensal`, como `2.084`, não são usados como entrada para o cálculo.
- Quando os campos brutos não estão preenchidos, o sistema exibe mensagem de preenchimento pendente.

## Validações

- `baseClientesAtivos > 0`.
- `clientesComOfertaPersonalizada >= 0`.
- `clientesComOfertaPersonalizada <= baseClientesAtivos`.
- `metaMensal > 0`.

## Exemplo validado

Entrada:

```text
baseClientesAtivos = 100000
clientesComOfertaPersonalizada = 20840
metaMensal = 10%
```

Resultado:

```text
resultadoMensal = 20,84%
percentualAtingidoMensal = 208,4%
resultadoOficialAnual = 20,84%
percentualAtingidoAnual = 208,4%
```

## Arquivos alterados

- `lancamentos.html`
- `assets/js/launches.js`
- `assets/js/formulas.js`
- `tests/formulas.test.js`
- `data/testes-regras-indicadores.json`
