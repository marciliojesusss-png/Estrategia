# Fase 5 - Homologação pela diretoria

## Objetivo

Implementar o fluxo de análise da Diretoria Homologadora, permitindo homologar lançamentos enviados pela unidade apuradora ou devolvê-los para ajuste com observação obrigatória.

## Descrição técnica

A fase 5 evolui a tela `Homologação` para exibir lançamentos dentro do escopo da diretoria responsável. A diretoria pode selecionar um lançamento, consultar os dados do indicador, revisar meta, realizado, percentuais, justificativa e observação da área, registrar observação da diretoria e executar a decisão.

As decisões são persistidas em `localStorage` nos conjuntos `lancamentos` e `homologacoes`. O histórico local registra a ação executada, o usuário, a data/hora, o valor anterior e o novo estado do lançamento.

## Arquivos envolvidos

- `homologacao.html`
- `assets/js/approvals.js`
- `assets/js/calculations.js`
- `assets/js/dataStore.js`
- `assets/css/styles.css`
- `docs/00-plano-de-fases.md`
- `docs/05-fase-homologacao-diretoria.md`

## Regras de negócio

- Diretoria Homologadora visualiza apenas lançamentos vinculados à sua diretoria.
- Administrador visualiza lançamentos de todos os indicadores para simulação e suporte.
- A análise é permitida apenas para lançamentos com status `Enviado para homologação`.
- Ao homologar, o status muda para `Homologado`.
- Ao homologar, o sistema registra usuário e data de homologação.
- Ao devolver, o status muda para `Devolvido para ajuste`.
- Toda devolução exige observação da diretoria.
- Ao devolver, o sistema registra usuário e data de devolução.
- Lançamentos homologados ficam bloqueados para nova edição pela unidade apuradora.
- Lançamentos devolvidos voltam a ficar editáveis para a unidade apuradora na tela de lançamento mensal.
- A observação da área e a justificativa são exibidas como referência de análise.
- A observação da diretoria é gravada no lançamento e no registro de homologação.
- Toda decisão deve registrar histórico.

## Checklist de ações

- [x] Criar painel de análise de homologação.
- [x] Exibir dados referenciais do indicador.
- [x] Exibir meta mensal, realizado mensal e percentuais.
- [x] Exibir justificativa da unidade.
- [x] Exibir observação da área.
- [x] Criar campo de observação da diretoria.
- [x] Implementar ação de homologar.
- [x] Implementar ação de devolver para ajuste.
- [x] Exigir observação da diretoria na devolução.
- [x] Atualizar status para `Homologado`.
- [x] Atualizar status para `Devolvido para ajuste`.
- [x] Registrar usuário e data da homologação.
- [x] Registrar usuário e data da devolução.
- [x] Persistir alterações em `localStorage`.
- [x] Atualizar registros simulados de homologação.
- [x] Registrar histórico da decisão.

## Critérios de aceite

- [x] Diretoria Homologadora acessa a tela de homologação.
- [x] Diretoria Homologadora visualiza apenas lançamentos de sua diretoria.
- [x] Lançamento enviado para homologação pode ser selecionado para análise.
- [x] Lançamento homologado recebe status `Homologado`.
- [x] Lançamento devolvido recebe status `Devolvido para ajuste`.
- [x] Devolução sem observação da diretoria é bloqueada.
- [x] Homologação registra usuário e data.
- [x] Devolução registra usuário e data.
- [x] Alterações persistem após recarregar a página.
- [x] Histórico local recebe registro da decisão.
- [x] Lançamentos com status diferente de `Enviado para homologação` ficam em modo consulta.

## Observações técnicas

- A fase 5 fecha o ciclo de análise da diretoria, mas a reabertura administrativa permanece prevista para a fase 8.
- A decisão é armazenada localmente, respeitando a premissa de sistema sem backend.
- A tabela mantém filtros por mês e status para facilitar a gestão da fila de homologação.
- A tela usa o motor de cálculo apenas para formatação consistente dos valores e percentuais apresentados na análise.
