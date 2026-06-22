# Limpeza dos dados operacionais iniciais

## Objetivo

Separar os dados cadastrais importados da planilha dos dados operacionais de preenchimento mensal.

A planilha continua sendo usada como referência para indicadores, metas, áreas, diretorias, fórmulas, regras e parâmetros. Os lançamentos mensais, porém, passam a iniciar sem execução registrada.

## Dados preservados

- Cadastro dos indicadores.
- Planos, pilares, unidades apuradoras e diretorias responsáveis.
- Metas mensais e anuais.
- Regras específicas dos indicadores.
- Campos de entrada configurados.
- Parâmetros de cálculo das regras.

## Dados reiniciados

- `data/lancamentos.json` foi regenerado de forma global, com 12 meses para cada indicador.
- Todos os 276 lançamentos passaram para status `Não iniciado`.
- Campos de realizado, percentual, resultado mensal, acumulado e anual foram limpos.
- Justificativas, observações, evidências, datas e usuários de preenchimento/homologação foram limpos.
- Campos dinâmicos de entrada foram reiniciados em `camposEntrada: {}`.
- `data/homologacoes.json` foi reiniciado como lista vazia.
- `data/historico.json` foi reiniciado como lista vazia.

## LocalStorage

O carregador central `assets/js/dataStore.js` ganhou a função `resetarLancamentosIniciais()`.

Ela remove do navegador apenas os dados operacionais:

- `lancamentos`
- `homologacoes`
- `historico`

Cadastros, metas e regras não são removidos por essa rotina.

Também foi criada uma chave de versão operacional. Na primeira abertura após esta correção, dados antigos salvos no navegador são descartados e a aplicação volta a carregar os JSONs limpos.

## Administração

A tela de Administração possui a ação `Reiniciar lançamentos`, disponível para o perfil administrador.

Essa ação limpa lançamentos, homologações e histórico do armazenamento local do navegador, preservando os cadastros e parâmetros.

## Limpeza global das telas

Dashboard, Homologação e Relatórios passam a consumir os lançamentos limpos da fonte central do sistema.

Na carga inicial:

- O Dashboard mostra `Homologados = 0`, `Pendentes = 0`, `Devolvidos = 0` e `Atingimento médio = -`.
- O Dashboard calcula `Total de indicadores`, `Indicadores PEI` e `Indicadores PN` apenas a partir do cadastro filtrado.
- Os gráficos cadastrais de plano e pilar continuam visíveis.
- Os gráficos de desempenho exibem mensagens específicas enquanto não houver preenchimento operacional.
- Os rankings de maior e menor atingimento exibem `Sem dados de atingimento.` até existir apuração calculada.
- A Homologação lista apenas lançamentos com status `Enviado para homologação`.
- Os relatórios de homologação, devolução e acumulado não exibem resultados antigos.

## Dashboard

Foi criada a função central `calcularDashboard()` em `assets/js/dashboard.js`.

Ela separa:

- dados cadastrais, usados para total de indicadores, PEI, PN, plano e pilar;
- dados operacionais preenchidos, usados para atingimento médio, abaixo de 80%, evolução, desempenho e rankings;
- status dos lançamentos, usados para homologados, pendentes, devolvidos e não iniciados.

Lançamentos com status `Não iniciado` não entram em cálculo de atingimento nem em ranking.

A versão de armazenamento local foi atualizada para:

```text
RESET-GLOBAL-OPERACIONAL-004
```

Com isso, dados antigos de `lancamentos`, `homologacoes`, `historico`, Dashboard, Relatórios e rankings são removidos automaticamente.

As páginas HTML também carregam os scripts com a versão `RESET-GLOBAL-OPERACIONAL-004`, evitando cache de JavaScript antigo no navegador.

## Reset Global

O carregador central possui as funções:

- `gerarLancamentosLimpos()`
- `resetarDadosOperacionais()`
- `resetarBaseOperacionalGlobal()`

O reset global não depende do perfil logado nem dos filtros da tela. Ele contempla todas as unidades, diretorias, indicadores e meses do ano de referência.

Na base limpa atual:

- Total de indicadores: 23.
- Total de lançamentos: 276.
- Homologados: 0.
- Enviados para homologação: 0.
- Devolvidos: 0.
- Não iniciados: 276.

## Dados de exemplo

Não há arquivo sample operacional com dados preenchidos no pacote padrão.

O sistema usa:

```text
data/lancamentos.json
```

com todos os lançamentos em estado inicial.
