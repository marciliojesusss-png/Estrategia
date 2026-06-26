# CAIXA Loterias - Indicadores Estrategicos

Aplicacao web local para acompanhamento de indicadores estrategicos, lancamentos mensais, homologacoes, visao trimestral, dashboard, relatorios e administracao de cadastros.

O sistema foi construido em HTML, CSS e JavaScript puro, com persistencia local em JSON no navegador. A aplicacao pode ser aberta diretamente pelo `index.html`, sem necessidade de iniciar servidor.

## Como Usar

### Modo recomendado

Abra o arquivo:

```text
index.html
```

Os dados sao carregados a partir de `assets/js/bootstrap-data.js` e salvos automaticamente no banco local do navegador usando IndexedDB, com fallback para `localStorage`.

### Modo servidor JSON opcional

Se quiser usar a base JSON central por arquivo, execute:

```bat
scripts\iniciar-banco-json.bat
```

Depois acesse o endereco exibido no terminal, normalmente:

```text
http://127.0.0.1:5500/
```

Para encerrar esse servidor opcional, execute:

```bat
scripts\finalizar-aplicacao.bat
```

## Perfis Simulados

A tela inicial permite selecionar usuarios simulados com diferentes perfis:

- Administrador
- Consulta/Gestao
- Usuario Companhia
- Unidade Apuradora
- Diretoria Homologadora

As permissoes de navegacao e visualizacao sao controladas no front-end pelo modulo de autenticacao simulado.

## Modulos

- **Resumo Executivo:** visao gerencial consolidada.
- **Visao Trimestral:** consolidacao trimestral dos indicadores.
- **Dashboard:** acompanhamento geral de resultados e status.
- **Indicadores:** consulta e manutencao dos indicadores.
- **Lancamentos:** preenchimento mensal pelas unidades apuradoras.
- **Homologacao:** analise, aprovacao, devolucao e reabertura pela diretoria.
- **Relatorios:** exportacao e consulta dos dados operacionais.
- **Administracao:** cadastros, metas, tipos de calculo, historico e reset operacional.

## Persistencia Dos Dados

A aplicacao trabalha com tres camadas:

1. **Semente inicial:** `assets/js/bootstrap-data.js`, gerado a partir dos arquivos em `data/`.
2. **Banco local do navegador:** IndexedDB, com fallback para `localStorage`.
3. **Servidor JSON opcional:** `scripts/json-db-server.js`, usado apenas quando iniciado manualmente.

No modo recomendado, os dados ficam salvos no navegador/perfil atual. Para usar em outro navegador ou outro perfil, sera necessario exportar/importar ou usar o servidor JSON opcional.

## Estrutura Principal

```text
.
|-- index.html
|-- dashboard.html
|-- indicadores.html
|-- lancamentos.html
|-- homologacao.html
|-- relatorios.html
|-- resumo-executivo.html
|-- visao-trimestral.html
|-- administracao.html
|-- assets/
|   |-- css/
|   `-- js/
|-- data/
|-- tests/
`-- scripts/
    |-- corrigir-encoding.js
    |-- json-db-server.js
    |-- iniciar-banco-json.bat
    `-- finalizar-aplicacao.bat
```

## Comandos De Teste

Execute os testes individualmente com Node.js:

```bat
node tests\persistence.test.js
node tests\encoding.test.js
node tests\formulas.test.js
node tests\quarterly.test.js
node tests\executive-summary.test.js
node tests\currency.test.js
```

## Observacoes

- O arquivo `scripts/iniciar-banco-json.bat` e opcional.
- O comando `scripts/finalizar-aplicacao.bat` encerra apenas processos Node que estejam executando `scripts/json-db-server.js`.
- Ao abrir direto pelo `index.html`, nao ha processo local para finalizar.
- Os dados operacionais principais sao `lancamentos`, `homologacoes` e `historico`.
