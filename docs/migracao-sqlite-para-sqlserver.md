# Guia simples de migração do SQLite para SQL Server

Este guia explica, passo a passo, como sair do banco local SQLite e levar os dados para um banco SQL Server.

A ideia é fazer a migração com calma, primeiro em ambiente de teste ou homologação, e só depois repetir o processo em produção.

## 1. O que será migrado

O banco atual fica neste arquivo:

```text
database/indicadores.sqlite
```

Esse arquivo é o banco SQLite. Ele guarda as tabelas e os dados usados pelo sistema.

O destino será este banco no SQL Server:

```text
Estrategia
```

Neste guia, vamos considerar que o SQL Server está no próprio computador, usando:

```text
Servidor: localhost
Banco: Estrategia
Autenticação: Windows
```

## 2. Como pensar nessa migração

De forma simples, a migração tem 3 partes:

1. Fazer uma cópia de segurança do SQLite atual.
2. Enviar os dados do SQLite para o SQL Server.
3. Conferir se tudo chegou corretamente.

O fluxo é este:

```text
SQLite atual
database/indicadores.sqlite
        |
        | script de migração
        v
SQL Server
```

Os scripts ficam na pasta:

```text
scripts/
```

Os scripts principais são:

```text
scripts/migrar-sqlite-para-sqlserver.py
scripts/verificar-sqlserver.py
```

## 3. Antes de começar

Antes de executar qualquer migração, confira estes pontos:

1. O sistema atual está funcionando com SQLite.
2. O arquivo `database/indicadores.sqlite` existe.
3. Você tem acesso ao SQL Server.
4. O SQL Server local está acessível em `localhost`.
5. O banco `Estrategia` existe no SQL Server, ou seu usuário Windows tem permissão para criá-lo.
6. Seu usuário do Windows tem permissão para acessar o banco SQL Server.
7. O computador tem Python instalado.
8. O pacote `pyodbc` está instalado no Python.
9. O driver ODBC do SQL Server está instalado.

Se algum desses itens estiver faltando, pare aqui e resolva antes de continuar.

## 4. Fazer backup do SQLite atual

Backup é uma cópia de segurança.

Ele serve para voltar ao estado anterior caso algo dê errado.

O arquivo original é:

```text
database/indicadores.sqlite
```

Crie o backup dentro da pasta:

```text
database/backups/
```

Exemplo de nome para o backup:

```text
database/backups/indicadores-20260705-094112.sqlite
```

No PowerShell, você pode fazer assim:

```powershell
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item .\database\indicadores.sqlite ".\database\backups\indicadores-$timestamp.sqlite"
```

Depois do backup, confira se o arquivo apareceu na pasta `database/backups`.

Importante: não apague o backup.

## 5. Conferir as tabelas que serão migradas

As tabelas principais são:

```text
indicadores
lancamentos
homologacoes
solicitacoes_reabertura
retificacoes
evidencias
auditoria
configuracoes
usuarios_validacao
backups_importacao
```

Você não precisa migrar tabela por tabela manualmente.

O script de migração faz isso automaticamente, na ordem correta.

Além dessas tabelas antigas, o script também prepara duas tabelas novas no SQL Server para a autenticação corporativa:

```text
usuarios_acesso
acessos_log
```

Essas duas tabelas não vêm do SQLite antigo.

Elas servem para controlar o perfil de acesso de cada matrícula e registrar os acessos ao sistema.

## 6. Preparar o acesso ao SQL Server

O script precisa saber como conectar no SQL Server.

Neste projeto, o acesso ao SQL Server será feito por Autenticação do Windows.

Isso significa que você não precisa informar usuário e senha no script.

O SQL Server vai usar o mesmo usuário Windows que está executando o PowerShell.

Antes de continuar, confirme com a equipe de infraestrutura se esse usuário Windows tem permissão no banco.

Os scripts já usam estes valores por padrão:

```text
Servidor: localhost
Banco: Estrategia
Driver: ODBC Driver 18 for SQL Server
```

Por isso, na maioria dos casos você não precisa configurar `SQLSERVER_HOST` nem `SQLSERVER_DATABASE`.

Se quiser deixar explícito no PowerShell, use:

```powershell
$env:SQLSERVER_HOST="localhost"
$env:SQLSERVER_DATABASE="Estrategia"
$env:SQLSERVER_DRIVER="ODBC Driver 18 for SQL Server"
```

Os scripts usam internamente esta configuração:

```text
Trusted_Connection=yes
```

Esse é o ponto que ativa a Autenticação do Windows na conexão com o SQL Server.

## 7. Instalar a dependência Python

Os scripts usam o pacote `pyodbc` para conversar com o SQL Server.

Para instalar:

```powershell
python -m pip install pyodbc
```

Se esse comando falhar, peça ajuda para instalar:

```text
Microsoft ODBC Driver for SQL Server
```

Sem o driver ODBC, o Python não consegue conectar no SQL Server.

## 8. Fazer primeiro em homologação

Não comece pela produção.

O caminho mais seguro é:

1. Criar um banco de homologação no SQL Server.
2. Fazer backup do SQLite.
3. Rodar a migração para homologação.
4. Rodar a verificação.
5. Testar o sistema.
6. Só depois repetir em produção.

Homologação é um ambiente de teste parecido com o real.

Ele serve para descobrir problemas sem afetar usuários finais.

## 9. Rodar a migração

Com as variáveis de ambiente configuradas, execute:

```powershell
python .\scripts\migrar-sqlite-para-sqlserver.py
```

Esse comando faz o seguinte:

1. Abre o banco SQLite.
2. Conecta no SQL Server.
3. Se o banco `Estrategia` ainda não existir, tenta criá-lo.
4. Cria as tabelas no SQL Server, se ainda não existirem.
5. Cria também as tabelas de autenticação `usuarios_acesso` e `acessos_log`.
6. Copia os dados antigos do SQLite.
7. Preserva os IDs atuais.
8. Converte campos booleanos para `BIT`.
9. Mantém campos JSON como texto.
10. Gera um relatório.

O relatório será salvo em:

```text
database/sqlserver/migration-report.json
```

### Criar somente as tabelas que faltam

Se os dados antigos já foram migrados e você só precisa criar tabelas novas, use:

```powershell
python .\scripts\migrar-sqlite-para-sqlserver.py --schema-only
```

Esse comando prepara a estrutura do SQL Server sem copiar novamente os dados do SQLite.

Isso é útil no seu caso quando o banco `Estrategia` já existe e já tem as tabelas principais.

### Usuários locais de teste

Em ambiente local ou homologação, você pode pedir para o script criar usuários fictícios de teste na tabela `usuarios_acesso`.

Use somente para teste:

```powershell
python .\scripts\migrar-sqlite-para-sqlserver.py --schema-only --seed-auth-users
```

Esse comando cria perfis locais como administrador, unidade apuradora, homologador e usuário comum.

Não use essa opção em produção sem autorização.

## 10. Quando usar a opção --truncate

A opção `--truncate` limpa as tabelas do SQL Server antes de inserir os dados novamente.

Use somente quando você tiver certeza de que pode apagar os dados atuais do banco SQL Server de destino.

Exemplo:

```powershell
python .\scripts\migrar-sqlite-para-sqlserver.py --truncate
```

Essa opção é útil em homologação, quando você está testando a migração várias vezes.

Não use `--truncate` em produção sem autorização.

## 11. Verificar se a migração deu certo

Depois de migrar, rode:

```powershell
python .\scripts\verificar-sqlserver.py
```

Esse script confere:

1. Quantidade de registros por tabela.
2. IDs principais.
3. Chaves estrangeiras.
4. Quantidade de lançamentos por indicador.
5. Quantidade de homologações por lançamento.
6. Se os campos JSON continuam legíveis.

Ele também salva o resultado em:

```text
database/sqlserver/migration-report.json
```

Se o status do relatório for:

```json
"status": "ok"
```

isso indica que a verificação passou.

Se aparecer:

```json
"status": "alertas"
```

pare e investigue antes de seguir.

## 12. Conferir o sistema em homologação

Depois que a migração passar na verificação, teste o sistema.

Telas importantes:

```text
index.php
resumo-executivo.php
visao-trimestral.php
indicadores.php
lancamentos.php
homologacao.php
relatorios.php
administracao.php
```

APIs importantes:

```text
/api/database.php?ping=1
/api/database.php?all=1
/api/indicadores.php
/api/lancamentos.php
/api/homologacoes.php
```

O objetivo é confirmar que o sistema abre, lista dados, salva informações e não mostra erros.

## 13. Migração em produção

Faça a produção somente depois que a homologação estiver validada.

Roteiro recomendado:

1. Avisar os usuários sobre a janela de migração.
2. Bloquear alterações no sistema atual.
3. Fazer um backup final do SQLite.
4. Configurar as variáveis do SQL Server de produção.
5. Rodar o script de migração.
6. Rodar o script de verificação.
7. Apontar o sistema PHP para o SQL Server.
8. Testar login e telas críticas.
9. Liberar o uso para os usuários.
10. Guardar o backup SQLite original.

Não pule o backup final.

Ele é a forma mais simples de voltar atrás se algo inesperado acontecer.

## 14. Plano de rollback

Rollback é o plano para voltar ao estado anterior.

Se algo der errado:

1. Pare a migração.
2. Não continue tentando em produção.
3. Volte o sistema para usar SQLite.
4. Use o backup feito antes da migração.
5. Registre o erro encontrado.
6. Corrija o problema em homologação.
7. Só tente novamente depois de validar.

O mais importante é não improvisar em produção.

## 15. Erros comuns

Erro: `Dependencia ausente: instale o pacote 'pyodbc'`

Solução:

```powershell
python -m pip install pyodbc
```

Erro de conexão com o banco:

Solução: confira se o SQL Server está ativo em `localhost`.

Se aparecer a mensagem dizendo que não foi possível abrir ou criar o banco `Estrategia`, crie o banco manualmente no SQL Server ou peça permissão para o usuário Windows atual.

Erro de login no SQL Server:

Solução: confira se o seu usuário Windows tem permissão no banco SQL Server.

Erro de driver ODBC:

Solução: instale o Microsoft ODBC Driver for SQL Server.

Erro de tabelas já preenchidas:

Solução: em homologação, rode novamente com `--truncate`. Em produção, pare e peça validação antes.

## 16. Checklist simples

Use esta lista para controlar o processo:

- [ ] Backup do SQLite feito
- [ ] Acesso ao SQL Server confirmado
- [ ] Variáveis de ambiente configuradas
- [ ] `pyodbc` instalado
- [ ] Driver ODBC instalado
- [ ] Migração feita em homologação
- [ ] Verificação passou em homologação
- [ ] Tabelas `usuarios_acesso` e `acessos_log` existem no SQL Server
- [ ] Sistema testado em homologação
- [ ] Janela de produção comunicada
- [ ] Backup final de produção feito
- [ ] Migração feita em produção
- [ ] Verificação passou em produção
- [ ] Sistema testado em produção
- [ ] Usuários liberados

## 17. Resultado esperado

Ao final, o sistema deixa de depender do SQLite como banco principal.

O funcionamento esperado passa a ser:

```text
Sistema PHP
        |
        v
SQL Server
```

O SQLite antigo deve ser guardado como backup histórico e também pode continuar servindo para testes locais.
