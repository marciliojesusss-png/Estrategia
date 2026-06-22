# Matriz consolidada de regras dos indicadores

## Objetivo

Implementar a Matriz Consolidada de Regras dos Indicadores da CAIXA Loterias no sistema, substituindo o fallback de percentual simples por regras específicas para os 23 indicadores.

## Arquivos atualizados

- `data/regras-indicadores.json`
- `assets/js/formulas.js`
- `assets/js/launches.js`
- `tests/formulas.test.js`

## Regras configuradas

O arquivo `data/regras-indicadores.json` contém 23 regras, uma para cada indicador cadastrado.

Tipos de cálculo contemplados:

- `percentual_direto`
- `reducao_de_gap`
- `crescimento_media_mensal`
- `percentual_acumulado`
- `valor_financeiro_acumulado`
- `indice_inverso_ajustado`
- `incremento_pontos_percentuais`
- `projeto_marco_entrega`
- `pontuacao_minima`
- `quantidade_acumulada`
- `plano_acao_por_elementos`
- `investimento_percentual_lucro`
- `percentual_execucao_plano_acao`
- `crescimento_relativo_participacao`
- `crescimento_relativo_valor`
- `cobertura_capacitacao_minima`

## Motor central

O motor `assets/js/formulas.js` expõe a função:

```javascript
calcularIndicador(indicador, regra, lancamentoAtual, lancamentosDoAno)
```

Ela retorna:

```javascript
{
  resultadoMensal,
  resultadoAcumulado,
  resultadoOficialAnual,
  percentualAtingidoMensal,
  percentualAtingidoAcumulado,
  percentualAtingidoAnual,
  unidadeMedida,
  statusCalculo,
  mensagem
}
```

## Tela de lançamento

A tela de lançamento lê a regra do indicador selecionado e renderiza campos dinâmicos.

Campos numéricos, textos e datas são tratados conforme o tipo configurado em `camposEntrada`.

Campos calculados permanecem bloqueados para edição manual.

## Validação

Os testes em `tests/formulas.test.js` validam:

- regras específicas dos quatro primeiros indicadores;
- existência das 23 regras;
- execução de cálculo para todos os 23 indicadores com dados sintéticos válidos.

## Observações

Indicadores sem dados continuam como `Não iniciado` e não entram em médias ou rankings de desempenho.

O reset operacional permanece preservado: a configuração de regras não preenche dados operacionais.

