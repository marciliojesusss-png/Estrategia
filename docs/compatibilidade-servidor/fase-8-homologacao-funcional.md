# FASE 8 — HOMOLOGAÇÃO FUNCIONAL

## Testes de infraestrutura

* [ ] `/estrategia/saude` responde.
* [ ] banco responde.
* [ ] usuário corporativo é identificado.
* [ ] sessão é criada.
* [ ] logs são gravados.
* [ ] rotas internas funcionam.
* [ ] assets carregam.
* [ ] uploads funcionam.

## Testes por perfil

### Administrador

* [ ] acessar dashboard;
* [ ] cadastrar indicador;
* [ ] editar indicador;
* [ ] consultar auditoria;
* [ ] administrar usuários;
* [ ] reabrir lançamento.

### Unidade apuradora

* [ ] visualizar indicadores da unidade;
* [ ] criar lançamento;
* [ ] salvar rascunho;
* [ ] anexar evidência;
* [ ] submeter para homologação.

### Homologador

* [ ] visualizar fila;
* [ ] aprovar lançamento;
* [ ] rejeitar lançamento;
* [ ] consultar histórico.

### Usuário companhia

* [ ] consultar dashboard;
* [ ] consultar relatórios;
* [ ] não acessar funções administrativas.

## Testes de segurança

* [ ] usuário sem cadastro recebe acesso negado;
* [ ] diretório `app` não abre;
* [ ] diretório `database` não abre;
* [ ] `.env` não pode ser baixado;
* [ ] usuário de uma unidade não vê dados de outra;
* [ ] token CSRF é exigido em alterações;
* [ ] mensagens não exibem credenciais.

## Critério de conclusão

Todos os fluxos essenciais deverão funcionar em homologação usando:

* o mesmo servidor;
* a mesma versão PHP;
* o mesmo modelo de autenticação corporativa;
* o SQL Server corporativo.

---

