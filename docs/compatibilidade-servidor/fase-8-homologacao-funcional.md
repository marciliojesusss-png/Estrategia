# FASE 8 — HOMOLOGAÇÃO FUNCIONAL

## Testes de infraestrutura

* [x] Criar roteiro de homologação funcional.
* [x] Criar script para validar URLs e artefatos de homologação.
* [ ] `/estrategia/saude` responde em homologação.
* [ ] banco responde em homologação.
* [ ] usuário corporativo é identificado em homologação.
* [ ] sessão é criada em homologação.
* [ ] logs são gravados em homologação.
* [ ] rotas internas funcionam em homologação.
* [ ] assets carregam em homologação.
* [ ] uploads funcionam em homologação.

Status: roteiro criado em `docs/homologacao-funcional-checklist.md` e script criado em `scripts/validar-homologacao.php`.

## Testes por perfil

### Administrador

* [ ] acessar dashboard;
* [ ] cadastrar indicador;
* [ ] editar indicador;
* [ ] consultar auditoria;
* [ ] administrar usuários;
* [ ] reabrir lançamento.

Status: coberto pelo roteiro de homologação; execução depende de usuário administrador no ambiente.

### Unidade apuradora

* [ ] visualizar indicadores da unidade;
* [ ] criar lançamento;
* [ ] salvar rascunho;
* [ ] anexar evidência;
* [ ] submeter para homologação.

Status: coberto pelo roteiro de homologação; execução depende de usuário `unidade_apuradora` no ambiente.

### Homologador

* [ ] visualizar fila;
* [ ] aprovar lançamento;
* [ ] rejeitar lançamento;
* [ ] consultar histórico.

Status: coberto pelo roteiro de homologação; execução depende de usuário `homologador` no ambiente.

### Usuário companhia

* [ ] consultar dashboard;
* [ ] consultar relatórios;
* [ ] não acessar funções administrativas.

Status: coberto pelo roteiro de homologação; execução depende de usuário `usuario_companhia` no ambiente.

## Testes de segurança

* [ ] usuário sem cadastro recebe acesso negado;
* [x] diretório `app` não abre, conforme teste automatizado de publicação;
* [x] diretório `database` não abre, conforme teste automatizado de publicação;
* [x] `.env` não pode ser baixado, conforme regras versionadas;
* [ ] usuário de uma unidade não vê dados de outra em homologação;
* [x] token CSRF é exigido em alterações, conforme testes e controllers;
* [x] mensagens não exibem credenciais, conforme sanitização de logs e diagnósticos.

## Critério de conclusão

Todos os fluxos essenciais deverão funcionar em homologação usando:

* o mesmo servidor;
* a mesma versão PHP;
* o mesmo modelo de autenticação corporativa;
* o SQL Server corporativo.

Status: pendente de execução no ambiente de homologação real. Preparação local validada com a suíte automatizada.

---

