# Autenticação restrita às unidades da CAIXA Loterias

## Objetivo

O acesso ao Estratégia deve ser permitido somente a empregados cuja lotação
corporativa pertença à lista ativa de unidades da CAIXA Loterias.

Essa regra foi reproduzida a partir do fluxo do sistema **Sistema-Expedientes**.
Embora seja frequentemente chamada de “restrição do LDAP”, ela é composta por
duas etapas diferentes:

1. o LDAP identifica o empregado e fornece matrícula, nome, função e unidade;
2. o SQL Server verifica se o código numérico da unidade está ativo na tabela
   corporativa `BASEDB001.dbo.SIREDTB_Unidade_Caixa_Loterias`.

Portanto, pertencer ao domínio e ser reconhecido pelo LDAP não é suficiente para
entrar no sistema.

## Como o Sistema-Expedientes realiza a validação

Depois de carregar `../acessoldap/LDAP.php`, o Sistema-Expedientes copia o campo
`unidade` para a sessão e consulta:

```sql
SELECT TOP 1 NU_Unidade
FROM BASEDB001.dbo.SIREDTB_Unidade_Caixa_Loterias
WHERE NU_Unidade = @unidade
  AND IC_Ativo = 1;
```

Se a consulta não retornar uma linha, o acesso é interrompido. O sistema antigo
possui uma exceção individual codificada no arquivo; essa exceção não foi
transportada para o Estratégia, pois não representa uma regra institucional.

## Fluxo implementado no Estratégia

O fluxo agora é:

```text
IIS / REMOTE_USER
        |
        v
LDAP corporativo (identidade e lotação)
        |
        v
Unidade numérica está ativa na lista da CAIXA Loterias?
        | não                         | sim
        v                             v
HTTP 401 / acesso negado       Perfil em usuarios_acesso
                                      |
                                      v
                               Sessão da aplicação
```

A barreira está em `app/auth/CaixaLoteriasAccessGate.php` e é executada antes
da consulta de perfil em `dbo.usuarios_acesso`. Assim:

- a lista corporativa decide **quem pertence à CAIXA Loterias**;
- `usuarios_acesso` continua decidindo **qual perfil especial** o empregado
  possui no Estratégia;
- quem pertence a uma unidade válida e não possui perfil especial recebe o
  perfil institucional `usuario_companhia`;
- uma unidade ausente, não numérica ou inativa resulta em acesso negado;
- falha ao consultar a lista corporativa também resulta em acesso negado
  (*fail closed*) e é registrada em `storage/logs/aplicacao.log`.

A consulta usa parâmetro preparado. O código da unidade retornado pelo LDAP não
é concatenado ao SQL.

## Configuração do servidor da CAIXA

Em `app/config/servidor.local.php`, mantenha:

```php
'app_env' => 'production',
'auth_provider' => 'legacy_file',
'ldap_legacy_path' => dirname(APP_ROOT) . '/acessoldap/LDAP.php',
'auth_require_caixa_loterias_unit' => true,
```

Em `production`, a barreira também é habilitada por padrão quando a chave não
for informada. Recomenda-se declarar a chave explicitamente para que a regra
fique visível na configuração do ambiente.

Em desenvolvimento local, o valor pode ser `false`, pois normalmente a estação
não alcança `BASEDB001`. Nunca use `false` no ambiente publicado da CAIXA.

## Permissão necessária no SQL Server

A conexão já utilizada pelo Estratégia precisa conseguir ler a tabela
corporativa. O DBA deve validar o mapeamento do login técnico no banco
`BASEDB001` e conceder somente a permissão necessária.

Exemplo para o DBA, substituindo o nome do login:

```sql
USE [BASEDB001];
GO

-- Execute apenas se o usuário ainda não existir neste banco.
CREATE USER [LOGIN_TECNICO_ESTRATEGIA]
    FOR LOGIN [LOGIN_TECNICO_ESTRATEGIA];
GO

GRANT SELECT
    ON OBJECT::dbo.SIREDTB_Unidade_Caixa_Loterias
    TO [LOGIN_TECNICO_ESTRATEGIA];
GO
```

Se o usuário já existir, não execute novamente o `CREATE USER`; valide primeiro
se o SID do usuário corresponde ao SID do login da instância. Essa conferência
é especialmente importante após restaurações de backup.

Teste de leitura com a mesma credencial usada pela aplicação:

```sql
SELECT TOP 1 NU_Unidade, IC_Ativo
FROM BASEDB001.dbo.SIREDTB_Unidade_Caixa_Loterias
WHERE IC_Ativo = 1;
```

O diagnóstico da aplicação executa essa validação automaticamente quando a
barreira está habilitada:

```powershell
php .\scripts\diagnostico-sqlserver.php
```

## Diagnóstico

Quando um empregado válido no LDAP receber HTTP 401, verifique nesta ordem:

1. o campo `unidade` retornado pelo arquivo LDAP é um código numérico;
2. o código existe na tabela corporativa com `IC_Ativo = 1`;
3. o login técnico do Estratégia possui `SELECT` na tabela;
4. `storage/logs/aplicacao.log` contém uma mensagem de unidade não autorizada ou
   de falha na consulta corporativa;
5. `app_env` está como `production` e
   `auth_require_caixa_loterias_unit` está como `true`.

Não inclua matrículas como exceções no código. Se houver necessidade de acesso
temporário, a autorização deve ser formalizada na fonte corporativa ou definida
por uma regra institucional aprovada.
