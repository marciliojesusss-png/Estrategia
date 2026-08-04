# FASE 6 — VALIDAR BANCO, SCHEMA E USUÁRIOS

## Ações

* [ ] Confirmar que o banco do Estrategia existe.
* [ ] Executar o `database/sqlserver/schema.sql`.
* [ ] Confirmar criação das tabelas.
* [ ] Confirmar chaves estrangeiras.
* [ ] Confirmar índices.
* [ ] Migrar os dados do SQLite.
* [ ] Comparar quantidade de registros.
* [ ] Cadastrar um administrador inicial.
* [ ] Cadastrar usuários de homologação.
* [ ] Confirmar que as matrículas possuem o mesmo padrão retornado pelo LDAP.

## Consultas de validação

```sql
SELECT COUNT(*) FROM dbo.indicadores;
SELECT COUNT(*) FROM dbo.lancamentos;
SELECT COUNT(*) FROM dbo.usuarios_acesso;
SELECT COUNT(*) FROM dbo.acessos_log;
```

## Cadastro inicial

Deverá existir pelo menos um registro ativo em:

```text
dbo.usuarios_acesso
```

com:

```text
matrícula
nome
perfil
unidade ou diretoria
ativo = 1
```

## Perfis a validar

```text
administrador
unidade_apuradora
homologador
usuario_companhia
```

## Critério de conclusão

* conexão funcionando;
* tabelas disponíveis;
* dados migrados;
* usuário administrador autenticado;
* perfil e escopo aplicados corretamente.

---

