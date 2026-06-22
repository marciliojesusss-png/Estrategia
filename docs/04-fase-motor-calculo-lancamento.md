# Fase 4 - Motor de cálculo e lançamento mensal

## Objetivo

Implementar o preenchimento mensal dos indicadores pela Unidade Apuradora, com cálculo automático do percentual atingido, resultado acumulado, percentual acumulado, salvamento de rascunho e envio para homologação.

## Descrição técnica

A fase 4 evolui a tela `Lançamento Mensal` para permitir seleção de um lançamento, consulta de seus dados referenciais e preenchimento dos campos operacionais. A unidade apuradora informa o realizado mensal, enquanto o sistema calcula os percentuais com base no tipo de cálculo configurado para o indicador.

Os dados alterados são persistidos em `localStorage`, mantendo os arquivos JSON como carga inicial. Cada salvamento relevante registra histórico local por meio da camada `DataStore`.

## Arquivos envolvidos

- `lancamentos.html`
- `assets/js/launches.js`
- `assets/js/calculations.js`
- `assets/js/dataStore.js`
- `assets/css/styles.css`
- `docs/00-plano-de-fases.md`
- `docs/04-fase-motor-calculo-lancamento.md`

## Regras de negócio

- Unidade Apuradora visualiza apenas lançamentos dos indicadores vinculados à sua unidade.
- Administrador visualiza lançamentos de todos os indicadores.
- Diretoria Homologadora e Consulta/Gestão não acessam a tela de lançamentos, conforme definido na fase 2.
- A unidade apuradora preenche o realizado mensal.
- A meta mensal é carregada do lançamento e exibida em campo não editável.
- A métrica/fórmula é exibida apenas como referência, em campo não editável.
- Percentual atingido mensal é calculado automaticamente.
- Resultado acumulado e percentual acumulado são calculados automaticamente.
- Ao salvar rascunho, o status muda para `Em preenchimento`.
- Ao enviar para homologação, o status muda para `Enviado para homologação`.
- Lançamentos com status `Homologado` ficam bloqueados para edição.
- Lançamentos com status `Enviado para homologação` ficam bloqueados para edição até devolução ou reabertura.
- Lançamentos com status `Não iniciado`, `Em preenchimento`, `Devolvido para ajuste` ou `Reaberto` podem ser editados.
- Indicadores manuais ou qualitativos exigem percentual manual, justificativa e observação da área.
- Toda alteração relevante deve registrar histórico.

## Checklist de ações

- [x] Criar painel de preenchimento de lançamento mensal.
- [x] Exibir dados referenciais do indicador selecionado.
- [x] Exibir meta mensal em campo não editável.
- [x] Exibir métrica/fórmula em campo não editável.
- [x] Permitir preenchimento de realizado mensal.
- [x] Calcular percentual atingido mensal automaticamente.
- [x] Calcular resultado acumulado automaticamente.
- [x] Calcular percentual acumulado automaticamente.
- [x] Suportar indicador manual ou qualitativo com percentual manual.
- [x] Validar justificativa e observação em indicadores manuais ou qualitativos.
- [x] Salvar rascunho com status `Em preenchimento`.
- [x] Enviar lançamento com status `Enviado para homologação`.
- [x] Bloquear edição de lançamentos homologados.
- [x] Bloquear edição de lançamentos enviados para homologação.
- [x] Persistir alterações em `localStorage`.
- [x] Registrar histórico de rascunho e envio para homologação.

## Critérios de aceite

- [x] Usuário Unidade Apuradora acessa a tela e vê apenas seu escopo.
- [x] Administrador acessa a tela e vê todos os lançamentos.
- [x] Usuário pode selecionar um lançamento da tabela.
- [x] Sistema exibe indicador, plano, pilar, periodicidade, unidade, diretoria, meta anual e tipo de cálculo.
- [x] Sistema calcula percentual mensal após preencher realizado.
- [x] Sistema recalcula acumulado do indicador no ano.
- [x] Salvar rascunho altera o status para `Em preenchimento`.
- [x] Enviar para homologação altera o status para `Enviado para homologação`.
- [x] Alterações persistem após recarregar a página.
- [x] Histórico local registra a alteração.
- [x] Lançamentos bloqueados não permitem edição.

## Observações técnicas

- A homologação, devolução para ajuste e observação da diretoria serão implementadas na fase 5.
- O cálculo acumulado é recalculado para os lançamentos do mesmo indicador e ano após alteração.
- O campo `percentualManual` é salvo apenas para indicadores manuais ou qualitativos.
- A implementação permanece 100% front-end e usa `localStorage` como persistência temporária.
