# FASE 1 — CRIAR UMA CONFIGURAÇÃO COMPATÍVEL COM O SERVIDOR

## Problema atual

O Estrategia depende principalmente de variáveis de ambiente e de um arquivo `.env`. Esse arquivo não é enviado pelo GitHub e pode não ser carregado corretamente pelo FastCGI do IIS.

O carregador atual tenta ler o `.env` da raiz do projeto e, caso não encontre, utiliza valores padrão.

## Objetivo

Permitir que o sistema seja configurado de três formas, nesta ordem:

1. variáveis do IIS;
2. arquivo local de configuração;
3. valores padrão seguros.

## Novos arquivos

```text
app/config/servidor.example.php
app/config/servidor.local.php
```

O arquivo `servidor.local.php` deverá ser ignorado pelo Git.

## Estrutura sugerida

```php
<?php

return array(
    'app_env' => 'production',
    'app_base_path' => '/estrategia',

    'db_driver' => 'pdo_sqlsrv',
    'db_host' => 'SERVIDOR_SQL',
    'db_database' => 'BANCO_ESTRATEGIA',
    'db_auth_mode' => 'sql',
    'db_username' => '',
    'db_password' => '',

    'auth_provider' => 'legacy_file',
    'ldap_legacy_path' => 'C:/caminho/acessoldap/LDAP.php'
);
```

## Alterações necessárias

### `app/config/config.php`

Modificar o carregamento para obedecer à seguinte prioridade:

```text
Variável do IIS
        ↓
servidor.local.php
        ↓
.env
        ↓
valor padrão
```

Criar configurações específicas:

```text
DB_DRIVER
DB_AUTH_MODE
AUTH_PROVIDER
LDAP_LEGACY_PATH
APP_BASE_PATH
```

## Regras

* `servidor.local.php` não poderá ser versionado.
* Senhas não poderão ser gravadas em arquivos públicos.
* O sistema não deverá exibir credenciais em mensagens de erro.
* O arquivo de exemplo deverá conter apenas valores fictícios.

## Alteração no `.gitignore`

Adicionar:

```text
/app/config/servidor.local.php
```

## Critério de conclusão

Criar um script que mostre apenas configurações não sensíveis:

```text
Ambiente: production
Caminho-base: /estrategia
Driver: pdo_sqlsrv
Servidor SQL: configurado
Banco: configurado
Autenticação: legacy_file
```

Nenhuma senha deverá ser exibida.

---

