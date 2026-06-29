# Banco SQL Local

O banco local de validacao da Central de Indicadores Estrategicos fica em:

```text
database/indicadores.sqlite
```

Ele e um banco SQLite versionavel junto do projeto. Ao clonar o repositorio em outro computador, o arquivo acompanha a aplicacao e pode ser usado como base local de validacao.

## Arquivos

- `schema.sql`: estrutura das tabelas SQL.
- `indicadores.sqlite`: banco SQLite local versionado.
- `migration-report.json`: evidencia da comparacao entre o antigo banco JSON e o SQLite.
- `backups/`: copias de seguranca criadas antes de regenerar o banco.

## Atualizar A Base No GitHub

Depois de alteracoes relevantes na base SQLite:

```bat
git add database/indicadores.sqlite
git commit -m "Atualiza base local de validacao dos indicadores"
git push
```

Em outro computador:

```bat
git pull
```

Ao abrir o sistema, os dados versionados estarao no projeto.

## Regenerar O SQLite A Partir Da Semente Embutida

```bat
python scripts\migrar-json-para-sqlite.py
```

Antes de sobrescrever `database/indicadores.sqlite`, o script cria backup em `database/backups/`. Se a pasta `data/` nao existir, o script usa `assets/js/bootstrap-data.js` como fonte.

## Aviso Sobre Concorrencia

Este banco SQL local e adequado para validacao e portabilidade do projeto. Ele nao substitui o banco corporativo multiusuario. Alteracoes feitas em computadores diferentes precisam ser sincronizadas via Git.
