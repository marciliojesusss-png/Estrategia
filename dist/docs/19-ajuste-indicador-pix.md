# Ajuste do indicador Vendas com Meio de Pagamento PIX

## Objetivo

Adequar o indicador ao padrão do informe trimestral encaminhado ao Conselho de Administração, mantendo a composição mensal como origem dos dados.

## Campos mensais

- Arrecadação com PIX no mês.
- Arrecadação total nos canais eletrônicos no mês.

O numerador pode ser salvo em rascunho sem o denominador. Nesse caso, o sistema informa que o cálculo aguarda dados. O envio para homologação exige o denominador.

## Cálculo mensal

```text
Arrecadação com PIX no mês /
Arrecadação total nos canais eletrônicos no mês
```

## Consolidação trimestral

Somente meses homologados são considerados:

```text
Soma da arrecadação PIX homologada /
Soma da arrecadação total dos canais eletrônicos homologada
```

Não é calculada média simples dos percentuais mensais.

## Curva oficial

- 1TRI/2026: 61%.
- 2TRI/2026: 62%.
- 3TRI/2026: 63%.
- 4TRI/2026: 65%.

## Resultado calculado e oficial

O consolidado preserva:

- `resultadoCalculadoTrimestral`: razão exata, exibida com duas casas percentuais;
- `resultadoOficialApresentado`: razão arredondada para percentual inteiro;
- `desempenhoTrimestral`: resultado oficial dividido pela meta trimestral.

No exemplo do 1TRI:

```text
PIX acumulado: R$ 1.127.026.595,61
Canais eletrônicos: R$ 1.686.100.000,00
Resultado calculado: 66,84%
Resultado oficial: 67%
Meta: 61%
```

Observação matemática: `67% / 61%` resulta em aproximadamente `109,84%`. A especificação recebida cita `110,09%`, mas esse valor não corresponde à divisão informada. O sistema utiliza a operação aritmética reproduzível.

## Apresentação

- A composição mensal do detalhe exibe os dois valores financeiros e o resultado mensal.
- O consolidado trimestral exibe meta, resultado calculado, resultado oficial, desempenho e situação.
- A Visão Trimestral e o Resumo Executivo utilizam o resultado oficial arredondado.

## Compatibilidade

Dados antigos que possuam apenas `arrecadacaoPixMes` são preservados. Eles ficam aguardando o preenchimento do denominador, sem exclusão de lançamentos ou histórico.

## Critérios de aceite

- [x] Remover a meta financeira como regra principal.
- [x] Adicionar numerador e denominador mensais.
- [x] Calcular razão mensal.
- [x] Somar numeradores e denominadores homologados no trimestre.
- [x] Aplicar a curva trimestral oficial.
- [x] Preservar resultado calculado e resultado oficial.
- [x] Exibir memória mensal e trimestral.
- [x] Preservar dados antigos.
