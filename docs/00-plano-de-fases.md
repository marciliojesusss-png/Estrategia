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

## Evolução incremental - Persistência em banco JSON local

Status: concluída.

Objetivo: persistir as alterações do sistema nos arquivos JSON locais por meio de um servidor HTTP leve, mantendo o `localStorage` como fallback.

Entregas principais:

- Servidor local `json-db-server.js`.
- Inicializador `iniciar-banco-json.bat`.
- API de leitura e gravação para as coleções conhecidas.
- Migração única dos dados operacionais existentes no navegador.
- Filas de gravação no cliente e no servidor.
- Escrita atômica dos arquivos JSON.
- Proteção contra acesso estático fora da pasta do sistema.
- Documentação em `docs/14-persistencia-banco-json.md`.

## Evolução incremental - Dashboard por Plano, Pilar e Indicador

Status: concluída.

Objetivo: reorganizar a visão gerencial de desempenho conforme a hierarquia `Plano > Pilar > Indicador`, inspirada na lógica visual do SIMFE.

Entregas principais:

- Blocos de plano com PEI antes de PN.
- Faixas próprias para cada pilar.
- Tabelas completas de indicadores por pilar.
- Indicadores sem dados preservados na estrutura.
- Resultado oficial baseado no motor e na consolidação configurada.
- Ações contextuais por perfil e status.
- Navegação direta para indicador, lançamento e homologação.
- Filtros por ano, competência, plano, pilar, unidade, diretoria e status.
- Documentação em `docs/15-dashboard-plano-pilar-indicador.md`.

## Evolução incremental - Correção de encoding e ortografia

Status: concluída.

Objetivo: eliminar caracteres quebrados, padronizar a redação institucional e migrar textos antigos do navegador sem excluir dados operacionais.

Entregas principais:

- Padronização UTF-8 em HTML, JavaScript, JSON, CSS e Markdown.
- `<meta charset="UTF-8">` em todas as páginas.
- Correção dos nomes dos 23 indicadores e 6 pilares.
- Correção dos símbolos `≥` e `≤`.
- Revisão de status, situações, rótulos e mensagens.
- Migração textual recursiva e não destrutiva do `localStorage`.
- Script idempotente `scripts/corrigir-encoding.js`.
- Teste automatizado `tests/encoding.test.js`.
- Documentação em `docs/16-correcao-encoding-ortografia.md`.

## Evolução incremental - Resumo Executivo

Status: concluída.

Objetivo: criar uma visão gerencial para leitura rápida do desempenho oficial antes do dashboard detalhado.

Entregas principais:

- Nova página `resumo-executivo.html`.
- Sete cards gerais de desempenho e homologação.
- Destaques do pilar mais crítico e do plano com melhor desempenho.
- Cards gerenciais para os seis pilares.
- Gráfico empilhado e tabela de situações por pilar.
- Tabela executiva consolidada.
- Filtros por plano, pilar, unidade, diretoria, status, situação e competência.
- Reutilização do motor de resultado oficial existente.
- Integração ao menu e ao fluxo inicial de login.
- Documentação em `docs/17-resumo-executivo.md`.

## Evolução incremental - Homologação mensal e consolidação trimestral

Status: concluída.

Objetivo: manter a homologação independente de cada competência e calcular automaticamente os trimestres somente com meses homologados.

Entregas principais:

- Constantes de status mensal.
- Campos derivados de competência e trimestre.
- Motor central `assets/js/quarterly.js`.
- Consolidados Sem dados, Parciais e Fechados.
- Regras trimestrais de soma, razão, última posição e acumulados.
- Nova página `visao-trimestral.html`.
- Alertas de trimestre incompleto e mês devolvido.
- Composição mensal e trimestral no detalhe do indicador.
- Solicitação de reabertura pela unidade apuradora.
- Filtro Mensal, Trimestral e Anual no Resumo Executivo.
- Testes automatizados da consolidação trimestral.
- Documentação em `docs/18-homologacao-mensal-consolidacao-trimestral.md`.

## Evolução incremental - Ajuste do indicador PIX

Status: concluída.

Objetivo: adequar o indicador `Vendas com Meio de Pagamento PIX` ao padrão percentual do informe trimestral do Conselho de Administração.

Entregas principais:

- Dois campos financeiros mensais para numerador e denominador.
- Cálculo mensal por razão.
- Consolidação trimestral pela soma dos valores homologados.
- Curva oficial de 61%, 62%, 63% e 65%.
- Resultado calculado e resultado oficial arredondado.
- Exibição específica na composição mensal e trimestral.
- Migração compatível com lançamentos antigos.
- Testes da memória de cálculo do 1TRI.
- Documentação em `docs/19-ajuste-indicador-pix.md`.
