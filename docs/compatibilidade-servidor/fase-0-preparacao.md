# FASE 0 — PREPARAÇÃO DO PROJETO

## Objetivo

Garantir que qualquer alteração possa ser revertida sem comprometer a versão atual.

## Ações

* [ ] Criar uma branch específica:

```text
compatibilidade-servidor-php71
```

* [ ] Criar uma tag da versão atual:

```text
antes-compatibilidade-servidor
```

* [ ] Fazer backup do banco SQLite utilizado localmente.
* [ ] Fazer backup do banco SQL Server, caso ele já tenha sido criado.
* [ ] Fazer backup da configuração atual do IIS.
* [ ] Registrar qual Application Pool executa o Sistema-Expedientes.
* [ ] Registrar qual executável PHP está configurado no FastCGI.
* [ ] Registrar qual `php.ini` é carregado pelo IIS.
* [ ] Não copiar credenciais do Sistema-Expedientes para o novo repositório.

## Arquivo a criar

```text
docs/plano-compatibilidade-servidor.md
```

Este documento deverá acompanhar a execução das fases e registrar os resultados.

## Critério de conclusão

A fase estará concluída quando houver:

* branch criada;
* backups realizados;
* configuração do servidor documentada;
* possibilidade de retornar à versão anterior.

---

