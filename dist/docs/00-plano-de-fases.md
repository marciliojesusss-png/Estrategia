# Plano de fases do projeto

Este plano organiza o desenvolvimento progressivo do Sistema de Acompanhamento de Indicadores CAIXA Loterias. Cada fase deve ser validada antes do avanço para a fase seguinte.

## Fase 1 - Estrutura inicial e dados base

Status: concluída.

Objetivo: criar a estrutura estática do projeto, páginas principais, arquivos JavaScript e CSS base, documentação inicial e JSON simulados importados da aba `PEI_PN`.

Entregas principais:

- Estrutura de pastas.
- Telas HTML iniciais.
- CSS corporativo base.
- Módulos JavaScript iniciais.
- JSON com 23 indicadores, metas e lançamentos de janeiro a março.
- Documentação da fase.

## Fase 2 - Login simulado e autorização por perfil

Status: concluída.

Objetivo: consolidar as regras de acesso simuladas para Administrador, Unidade Apuradora, Diretoria Homologadora e Consulta/Gestão.

Entregas principais:

- Controle de sessão em `localStorage`.
- Restrições de menu e telas por perfil.
- Filtros de dados por unidade apuradora e diretoria responsável.
- Mensagens de bloqueio quando o perfil não puder executar uma ação.
- Perfil adicional `Usuário Companhia` para consulta institucional sem ações operacionais.

## Fase 3 - Consulta e cadastro de indicadores

Status: concluída.

Objetivo: evoluir a listagem de indicadores para consulta completa e edição administrativa.

Entregas principais:

- Filtros funcionais por plano, pilar, unidade e diretoria.
- Visualização detalhada de métrica, meta anual e tipo de cálculo.
- Edição de cadastro apenas para Administrador.
- Persistência local temporária via `localStorage`.

## Fase 4 - Motor de cálculo e lançamento mensal

Status: concluída.

Objetivo: implementar o preenchimento mensal pela unidade apuradora e o cálculo automático dos percentuais.

Entregas principais:

- Formulário de lançamento mensal.
- Funções do motor de cálculo.
- Validação de indicadores manuais, qualitativos e personalizados.
- Salvar rascunho e enviar para homologação.
- Bloqueio de lançamentos homologados.

## Fase 5 - Homologação pela diretoria

Status: concluída.

Objetivo: implementar o fluxo de homologação e devolução para ajuste.

Entregas principais:

- Lista de lançamentos enviados para homologação.
- Filtro por diretoria responsável.
- Homologar lançamento.
- Devolver para ajuste com observação obrigatória.
- Registro de data, usuário e status.

## Fase 6 - Dashboard com gráficos

Status: concluída.

Objetivo: criar a visão executiva com cards, filtros e gráficos em Chart.js.

Entregas principais:

- Cards de resumo.
- Indicadores por plano e pilar.
- Status dos lançamentos.
- Desempenho médio por pilar.
- Evolução mensal.
- Rankings de maior e menor atingimento.

## Fase 7 - Relatórios e exportação CSV

Status: concluída.

Objetivo: implementar relatórios filtráveis e exportação em CSV.

Entregas principais:

- Relatório geral dos indicadores.
- Relatórios por plano, pilar, unidade e diretoria.
- Relatórios de pendências, homologações e devoluções.
- Relatório acumulado anual.
- Exportação CSV.

## Fase 8 - Administração e histórico

Status: concluída.

Objetivo: finalizar a área administrativa e o registro de auditoria local.

Entregas principais:

- Gestão de usuários simulados.
- Gestão de planos, pilares, unidades, diretorias, indicadores, metas e tipos de cálculo.
- Reabertura de lançamento homologado.
- Histórico de alterações.
- Critérios finais de aceite do sistema.

## Evolução incremental - Regras de medição dos indicadores

Status: concluída.

Objetivo: adicionar camada configurável de regras por indicador, com campos de entrada dinâmicos e motor central de cálculo.

Entregas principais:

- Arquivo `data/regras-indicadores.json`.
- Motor central `assets/js/formulas.js`.
- Campos dinâmicos na tela de lançamento.
- Regras específicas para os indicadores 1, 2, 3 e 4.
- Fallback para os demais indicadores.
- Testes simulados das quatro metodologias analisadas.

## Evolução incremental - Limpeza dos dados operacionais iniciais

Status: concluída.

Objetivo: remover da carga inicial os dados operacionais importados da planilha, mantendo a planilha apenas como referência cadastral, de metas, regras e parâmetros.

Entregas principais:

- `data/lancamentos.json` reiniciado com todos os lançamentos em status `Não iniciado`.
- Base operacional regenerada globalmente com 276 lançamentos limpos, cobrindo 23 indicadores em 12 meses.
- Campos de realizado, percentuais, resultados, justificativas, observações, evidências e homologação limpos.
- `data/homologacoes.json` e `data/historico.json` reiniciados como listas vazias.
- Remoção de arquivo sample operacional com valores antigos da planilha.
- Rotina `resetarLancamentosIniciais()` para limpar dados operacionais antigos no `localStorage`.
- Função central `resetarDadosOperacionais()` para reinício controlado dos lançamentos.
- Ação administrativa `Reiniciar lançamentos`.
- Estados vazios no Dashboard, Homologação e Relatórios quando ainda não houver preenchimento.
- Função `calcularDashboard()` para cards, gráficos e rankings sem dados mockados ou percentuais antigos.
- Nova versão de storage `RESET-GLOBAL-OPERACIONAL-004` para limpar cache operacional antigo de Dashboard, Relatórios, rankings e lançamentos.

## Evolução incremental - Matriz consolidada de regras dos indicadores

Status: concluída.

Objetivo: implementar a matriz de regras dos 23 indicadores no arquivo de configuração e no motor central de cálculo.

Entregas principais:

- `data/regras-indicadores.json` atualizado com 23 regras específicas.
- `assets/js/formulas.js` ampliado para os tipos de cálculo da matriz.
- Campos dinâmicos de lançamento com suporte a número, texto e data.
- Campos calculados preservados como somente leitura.
- Testes cobrindo a execução das 23 regras com dados sintéticos.
- Versionamento de scripts `MATRIZ-REGRAS-001` para evitar cache de motor antigo no navegador.
