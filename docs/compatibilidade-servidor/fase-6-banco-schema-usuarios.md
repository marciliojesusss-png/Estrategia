# FASE 6 — VALIDAR BANCO, SCHEMA E USUÁRIOS

## Ações

* [ ] Confirmar que o banco do Estrategia existe no SQL Server corporativo.
* [ ] Executar o `database/sqlserver/schema.sql` no SQL Server corporativo.
* [x] Criar script para confirmar criação das tabelas.
* [x] Criar script para confirmar chaves estrangeiras.
* [x] Criar script para confirmar índices.
* [ ] Migrar os dados do SQLite para o SQL Server corporativo.
* [x] Criar script para comparar quantidade de registros.
* [x] Criar modelo de cadastro de administrador inicial.
* [x] Criar modelo de cadastro de usuários de homologação.
* [x] Criar validação do padrão das matrículas.

Status: implementado o validador `scripts/validar-banco-schema-usuarios.php` e o modelo fictício `database/sqlserver/usuarios-acesso.example.sql`. A execução real contra SQL Server segue pendente do ambiente corporativo.

## Consultas de validação

```sql
SELECT COUNT(*) FROM dbo.indicadores;
SELECT COUNT(*) FROM dbo.lancamentos;
SELECT COUNT(*) FROM dbo.usuarios_acesso;
SELECT COUNT(*) FROM dbo.acessos_log;
```

Status: coberto por `scripts/validar-banco-schema-usuarios.php`.

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

Status: modelo fictício disponível em `database/sqlserver/usuarios-acesso.example.sql`. O cadastro real deve usar matrículas confirmadas pelo LDAP corporativo.

## Perfis a validar

```text
administrador
unidade_apuradora
homologador
usuario_companhia
```

Status: o validador confirma a existência de ao menos um usuário ativo para cada perfil.

## Critério de conclusão

* [ ] conexão funcionando no SQL Server corporativo;
* [ ] tabelas disponíveis no SQL Server corporativo;
* [ ] dados migrados para o SQL Server corporativo;
* [ ] usuário administrador autenticado no ambiente corporativo;
* [ ] perfil e escopo aplicados corretamente em homologação.

Validação local realizada com SQLite para conferir a lógica do script. A conclusão da fase depende da execução no banco SQL Server final.

---

