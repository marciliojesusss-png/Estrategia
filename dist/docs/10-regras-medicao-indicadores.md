# Evolução - Regras de medição dos indicadores

## Objetivo

Adicionar uma camada configurável de regras de medição por indicador, evitando que todos os indicadores sejam calculados pela lógica genérica `realizado / meta`.

## Arquivos criados

- `data/regras-indicadores.json`
- `assets/js/formulas.js`
- `tests/formulas.test.js`

## Arquivos alterados

- `assets/js/dataStore.js`
- `assets/js/launches.js`
- `assets/js/reports.js`
- `assets/js/approvals.js`
- `lancamentos.html`
- `homologacao.html`

## Regras implementadas

Foram configuradas regras específicas para os quatro indicadores analisados:

- Indicador 1 - Índice de Ofertas Personalizadas aos Clientes Ativos.
- Indicador 2 - Índice de Satisfação de Clientes - NPS.
- Indicador 3 - Índice de Clientes Ativos em Canais Digitais.
- Indicador 4 - Aprimoramento da Experiência do Cliente.

Os demais indicadores permanecem com fallback `percentual_direto` e aviso interno:

```text
Regra específica ainda não configurada para este indicador.
```

## Tipos de cálculo suportados

- `percentual_direto`
- `reducao_de_gap`
- `crescimento_media_mensal`
- `percentual_acumulado`
- `ultima_posicao`
- `manual_homologado`

## Tipos de consolidação reconhecidos

- `ultima_posicao`
- `media_mensal_acumulada`
- `acumulado_no_ano`
- `curva_de_evolucao`
- `manual_homologado`

## Ajustes na tela de lançamento

A tela de lançamento mensal passou a montar os campos de entrada conforme a regra do indicador selecionado.

Exemplos:

- Ofertas Personalizadas: base de clientes ativos e clientes com oferta personalizada.
- NPS: NPS realizado no período.
- Clientes Ativos Digitais: clientes ativos digitais no mês.
- Aprimoramento da Experiência do Cliente: melhorias implementadas no mês.

## Validações implementadas

- Campos obrigatórios vazios.
- Divisão por zero.
- Meta não configurada.
- Parâmetro de cálculo ausente.
- Tipo de cálculo inexistente.
- Indicador sem regra cadastrada.
- Lançamento bloqueado por status.
- Evidência obrigatória quando configurada.
- Resultado manual sem justificativa quando configurado.

## Testes simulados

Foram adicionados testes em `tests/formulas.test.js` para:

- NPS com resultado esperado de 50%.
- Clientes ativos digitais com crescimento de 30% e atingimento de 107,14%.
- Aprimoramento da Experiência do Cliente com resultado de 25% e atingimento de 100%.
- Ofertas personalizadas com resultado de 12% e atingimento de 120%.

## Observações técnicas

- O dashboard e os relatórios continuam consumindo os resultados já gravados nos lançamentos.
- A tela de lançamento é o ponto central de execução do motor de cálculo.
- O arquivo `regras-indicadores.json` permite evoluir os outros 19 indicadores sem refazer a estrutura do sistema.
