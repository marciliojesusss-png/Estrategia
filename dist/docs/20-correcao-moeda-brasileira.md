# Correção de moeda brasileira

Os campos financeiros usam o utilitário único `assets/js/currency.js`.

## Entrada e armazenamento

- aceita `411.428.638,26`, `R$ 411.428.638,26` e `625.000.000,00`;
- converte os valores para números JavaScript antes do cálculo e do salvamento;
- mantém `R$` e separadores brasileiros apenas na apresentação;
- os campos PIX foram classificados como `moeda`, com teclado decimal em dispositivos móveis.

## Indicador PIX

O numerador e o denominador mensais são convertidos antes da razão. Os acumulados trimestrais somam os números convertidos, sem média dos percentuais.

Exemplos validados:

```text
R$ 411.428.638,26 / R$ 625.000.000,00 = 65,83%
R$ 359.270.143,40 / R$ 536.100.000,00 = 67,02%
```

## Migração segura

Textos monetários reconhecíveis no `localStorage` são convertidos automaticamente para número puro.

Valores que já tenham sido gravados como números reduzidos não são multiplicados por estimativa, pois o montante original não pode ser recuperado com segurança. Registros PIX positivos inferiores a R$ 1 milhão são sinalizados com `revisaoMoedaPendente` e liberados para conferência e nova edição, inclusive quando o status anterior bloqueava alterações.
