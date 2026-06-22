# Fase 2 - Login simulado e autorização por perfil

## Objetivo

Consolidar o controle de acesso simulado por perfil, garantindo que cada usuário visualize apenas os menus, telas e dados permitidos pelo seu papel no fluxo dos indicadores.

## Descrição técnica

A fase 2 centraliza a matriz de permissões no módulo `auth.js`, usa `localStorage` para manter a sessão simulada e aplica restrições de tela antes da inicialização dos módulos. Também ajusta as telas para exibirem mensagens de escopo e para filtrarem dados conforme o perfil do usuário logado.

Os perfis tratados são:

- Administrador.
- Unidade Apuradora.
- Diretoria Homologadora.
- Consulta/Gestão.
- Usuário Companhia.

## Arquivos envolvidos

- `assets/js/auth.js`
- `assets/js/app.js`
- `assets/js/dashboard.js`
- `assets/js/indicators.js`
- `assets/js/launches.js`
- `assets/js/approvals.js`
- `assets/js/reports.js`
- `assets/css/styles.css`
- `dashboard.html`
- `lancamentos.html`
- `homologacao.html`
- `relatorios.html`
- `docs/00-plano-de-fases.md`
- `docs/02-fase-login-autorizacao.md`

## Regras de negócio

- Usuário sem sessão ativa deve ser redirecionado para `index.html`.
- Administrador acessa todas as telas.
- Unidade Apuradora acessa Dashboard, Indicadores e Lançamentos.
- Diretoria Homologadora acessa Dashboard, Indicadores e Homologação.
- Consulta/Gestão acessa Dashboard, Indicadores e Relatórios.
- Usuário Companhia acessa Dashboard, Indicadores e Relatórios.
- A tela Administração é exclusiva do Administrador.
- A tela Lançamento Mensal é restrita ao Administrador e à Unidade Apuradora.
- A tela Homologação é restrita ao Administrador e à Diretoria Homologadora.
- A Unidade Apuradora visualiza apenas indicadores e lançamentos de sua unidade.
- A Diretoria Homologadora visualiza apenas indicadores e lançamentos de sua diretoria.
- O perfil Consulta/Gestão não executa edição, homologação ou administração.
- O perfil Usuário Companhia não executa preenchimento, homologação, edição cadastral ou administração.
- Tentativa de acesso a tela não permitida redireciona para o Dashboard com mensagem de bloqueio.

## Checklist de ações

- [x] Centralizar matriz de acesso por perfil.
- [x] Manter sessão simulada em `localStorage`.
- [x] Restringir menus conforme perfil logado.
- [x] Bloquear acesso direto por URL quando o perfil não possuir permissão.
- [x] Exibir mensagem de bloqueio no redirecionamento.
- [x] Exibir mensagem de escopo do usuário logado.
- [x] Aplicar filtro por unidade apuradora.
- [x] Aplicar filtro por diretoria responsável.
- [x] Tornar filtros do Dashboard funcionais.
- [x] Tornar filtros da Consulta de Indicadores funcionais.
- [x] Tornar filtros de Lançamentos funcionais.
- [x] Tornar filtros de Homologação funcionais.
- [x] Tornar filtros de Relatórios funcionais.
- [x] Criar perfil Usuário Companhia para consulta institucional.
- [x] Restringir Usuário Companhia a Dashboard, Indicadores e Relatórios.

## Critérios de aceite

- [x] Login simulado persiste o usuário atual no `localStorage`.
- [x] Usuário sem sessão não acessa páginas internas.
- [x] Menu exibe apenas telas permitidas ao perfil.
- [x] Acesso direto à Administração é bloqueado para perfis não administradores.
- [x] Acesso direto a Lançamentos é bloqueado para Diretoria Homologadora e Consulta/Gestão.
- [x] Acesso direto a Homologação é bloqueado para Unidade Apuradora e Consulta/Gestão.
- [x] Unidade Apuradora visualiza apenas indicadores de sua unidade.
- [x] Diretoria Homologadora visualiza apenas indicadores de sua diretoria.
- [x] Usuário Companhia visualiza a consulta institucional sem botões operacionais.
- [x] Dashboard recalcula cards e gráficos conforme filtros.
- [x] Relatório exporta CSV com os filtros aplicados.

## Observações técnicas

- As ações de edição, envio, homologação e devolução ainda não foram implementadas nesta fase. Elas permanecem previstas para as fases 4 e 5.
- O bloqueio atual é front-end e simulado, adequado à premissa de sistema sem backend.
- A matriz de permissões foi colocada em `auth.js` para evitar regras espalhadas por cada tela.
- Os filtros operam sobre os dados já reduzidos pelo escopo do usuário, evitando que perfis restritos recuperem dados fora do seu vínculo.
