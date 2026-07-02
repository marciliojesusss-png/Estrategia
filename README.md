# CAIXA Loterias - Indicadores Estrategicos

Aplicacao web local para acompanhamento de indicadores estrategicos, lancamentos mensais, homologacoes, visao trimestral, dashboard, relatorios e administracao de cadastros.

O sistema foi construido em HTML, CSS e JavaScript puro. A aplicacao pode ser aberta diretamente pelo `index.html`, sem necessidade de iniciar servidor.

Na fase atual, o projeto tambem possui uma base SQL local versionavel em SQLite:

```text
database/indicadores.sqlite
```

Esse arquivo acompanha o projeto no GitHub para validacao e portabilidade. O navegador continua usando a camada local segura para operacao da interface; a atualizacao fisica do SQLite versionado e feita pelo script `scripts\migrar-json-para-sqlite.py`.

## Como Usar

### Modo recomendado

Abra o arquivo:

```text
index.html
```

Os dados sao carregados a partir de `assets/js/bootstrap-data.js` e da base local de validacao. O banco SQLite versionado em `database/indicadores.sqlite` representa a base SQL local portavel do projeto. Quando a versao de dados do projeto muda, bases antigas salvas em perfis do navegador sao substituidas automaticamente pela base versionada.

Para compartilhar a mesma base entre computadores, versionar o arquivo SQLite com Git. Perfis diferentes do Chrome mantem armazenamentos locais separados.

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
- **Indicadores:** consulta e manutencao dos indicadores.
- **Lancamentos:** preenchimento mensal pelas unidades apuradoras.
- **Homologacao:** analise, aprovacao, devolucao e reabertura pela diretoria.
- **Relatorios:** consulta dos dados operacionais.
- **Configuracoes:** cadastros, perfis simulados, permissoes, integridade da base e parametros locais.

## Persistencia Dos Dados

A aplicacao trabalha com tres camadas:

1. **Semente inicial:** `assets/js/bootstrap-data.js`, mantido como fallback embutido da aplicacao.
2. **Base de validacao local:** chave `central_indicadores_base_validacao` no navegador atual.
3. **Banco SQL local versionavel:** `database/indicadores.sqlite`, gerado a partir dos JSON atuais.

O antigo banco JSON em arquivos foi removido apos a verificacao de migracao para SQLite. O relatorio da migracao fica em `database/migration-report.json`.

No modo recomendado, os dados ficam salvos no navegador/perfil atual e a base SQL portavel fica no arquivo SQLite versionado. Perfis diferentes do Google Chrome possuem armazenamentos locais separados; portanto, alteracoes feitas manualmente em um perfil nao aparecem em outro perfil sem um backend/local server gravando em uma base comum.

### Base De Validacao Local

A secao **Base de Validacao Local** oferece:

- Verificar integridade da base.
- Limpar dados locais com confirmacao.

A chave oficial da base local e:

```text
central_indicadores_base_validacao
```

### Banco SQL Local

O banco local SQLite fica em:

```text
database/indicadores.sqlite
```

Arquivos relacionados:

```text
database/schema.sql
database/README.md
scripts/migrar-json-para-sqlite.py
```

Para regenerar o SQLite a partir da semente embutida atual:

```bat
python scripts\migrar-json-para-sqlite.py
```

O script cria um backup automatico do banco anterior em `database/backups/` antes de sobrescrever `database/indicadores.sqlite`.

Fluxo para atualizar a base local no GitHub:

```bat
git add database/indicadores.sqlite
git commit -m "Atualiza base local de validacao dos indicadores"
git push
```

Fluxo para outro computador receber a base:

```bat
git pull
```

Depois, basta abrir o sistema. Os dados versionados estarao no projeto.

Aviso: este banco SQL local e adequado para validacao e portabilidade do projeto. Ele nao substitui o banco corporativo multiusuario. Alteracoes feitas em computadores diferentes precisam ser sincronizadas via Git.

## Execucao Em PHP

A migracao para PHP preserva o banco SQLite existente em `database/indicadores.sqlite` e expoe APIs locais em `/api`. Antes da migracao foi criado o backup:

```text
database/backups/indicadores-antes-php-2026-07-02-1003.sqlite
```

Para rodar a aplicacao pelo PHP 8:

```bat
php -S 127.0.0.1:8000 -t public
```

Depois acesse:

```text
http://127.0.0.1:8000/index.php
```

As paginas `.php` em `public/` reaproveitam o layout atual e o frontend passa a carregar as colecoes pelo backend PHP/SQLite. Os arquivos `.html` continuam disponiveis para consulta estatica local.

Chaves de sessao/perfil simuladas:

```text
central_indicadores_usuario_atual
central_indicadores_perfil_atual
central_indicadores_permissoes_atual
```

Trocar perfil simulado altera apenas permissoes e visualizacao. A troca de perfil nao cria nova base, nao limpa dados e nao carrega a semente inicial quando ja existe base local.

## Estrutura Principal

```text
.
|-- index.html
|-- indicadores.html
|-- lancamentos.html
|-- homologacao.html
|-- relatorios.html
|-- resumo-executivo.html
|-- visao-trimestral.html
|-- administracao.html
|-- dashboard.html          # legado; redireciona para resumo-executivo.html
|-- app/
|   |-- config/
|   |-- core/
|   |-- repositories/
|   `-- services/
|-- api/
|   |-- database.php
|   |-- indicadores.php
|   |-- lancamentos.php
|   |-- homologacoes.php
|   |-- configuracoes.php
|   |-- resumo-executivo.php
|   |-- visao-trimestral.php
|   `-- relatorios.php
|-- public/
|   |-- index.php
|   |-- resumo-executivo.php
|   |-- visao-trimestral.php
|   |-- indicadores.php
|   |-- lancamentos.php
|   |-- homologacao.php
|   |-- relatorios.php
|   |-- administracao.php
|   |-- api/
|   `-- assets/
|-- templates/
|-- assets/
|   |-- css/
|   `-- js/
|-- database/
|   |-- indicadores.sqlite
|   |-- migration-report.json
|   |-- schema.sql
|   `-- README.md
|-- tests/
`-- scripts/
    |-- migrar-json-para-sqlite.py
    `-- verificar-migracao-json-sqlite.py
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
node tests\local-validation.test.js
node tests\sqlite-database.test.js
```

## Observacoes

- O banco JSON em arquivos foi removido depois da migracao confirmada para SQLite.
- Ao abrir direto pelo `index.html`, nao ha processo local para finalizar.
- Os dados operacionais principais sao `lancamentos`, `homologacoes` e `historico`.
