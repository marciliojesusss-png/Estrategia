# SQL Server no ambiente local

Este guia configura a aplicacao local para usar o mesmo SQL Server consultado no SQL Server Management Studio (SSMS).

## 1. Criar a configuracao local

Na raiz do projeto, copie:

```powershell
Copy-Item app\config\servidor.local.php.example app\config\servidor.local.php
```

Edite apenas `app/config/servidor.local.php`.

Exemplo com autenticacao integrada do Windows:

```php
<?php
return array(
    'app_env' => 'development',
    'app_base_path' => '/estrategia',
    'db_driver' => 'sqlsrv',
    'db_host' => 'localhost',
    'db_database' => 'NOME_DO_BANCO',
    'db_auth_mode' => 'integrated',
    'auth_provider' => 'legacy_file',
    'diagnostico_php_version' => '',
);
```

Para instancia nomeada, `db_host` pode ser, por exemplo:

```php
'db_host' => '.\\SQLEXPRESS',
```

ou:

```php
'db_host' => 'NOME-PC\\SQLEXPRESS',
```

Se o SQL Server usa autenticacao SQL:

```php
'db_auth_mode' => 'sql',
'db_username' => 'USUARIO_SQL',
'db_password' => 'SENHA_SQL',
```

Nunca versione `app/config/servidor.local.php`.

## 2. Confirmar o driver PHP

O PHP usado para iniciar a aplicacao precisa ter a extensao `sqlsrv` habilitada.

Execute:

```powershell
php -m | Select-String sqlsrv
```

ou o diagnostico do projeto:

```powershell
.\scripts\cmd\diagnostico-sqlserver.ps1
```

## 3. Reiniciar a aplicacao

```powershell
.\scripts\servidor.ps1 reiniciar
```

ou pelo iniciador habitual:

```powershell
.\scripts\cmd\iniciar-local.ps1
```

O script local nao define mais `DB_CONNECTION=sqlite`. Em desenvolvimento, sem `servidor.local.php`, o fallback continua sendo SQLite. Quando `db_driver=sqlsrv` estiver no arquivo local, a aplicacao usa SQL Server.

## 4. Confirmar qual banco esta ativo

Com a aplicacao aberta e autenticada, acesse:

```text
http://127.0.0.1:8000/estrategia/index.php?route=api/database&ping=1
```

Esperado para SQL Server:

```json
{"ok":true,"mode":"php_sqlserver","database":"sqlsrv"}
```

Se aparecer `php_sqlite_local` / `sqlite`, a configuracao local ainda nao foi aplicada.

## 5. Teste controlado do IEO

Antes do teste, consulte no SSMS o registro do IEO. Depois:

1. reabra somente uma competencia;
2. salve o lancamento;
3. consulte novamente o SQL Server;
4. confirme `meta_referencia`, `percentual_atingido`, `situacao`, `status` e `updated_at`;
5. somente depois teste envio para homologacao e homologacao.

Nao e necessario alterar schema, recriar banco ou executar `ALTER TABLE` para configurar o ambiente local.
