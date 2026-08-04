# FASE 3 — TORNAR A AUTENTICAÇÃO SEMELHANTE AO SISTEMA-EXPEDIENTES

## Problema atual

O Estrategia exige:

* `REMOTE_USER`;
* extensão LDAP;
* endereço LDAP;
* Base DN;
* usuário de bind;
* senha de bind;
* conexão TLS.

Se qualquer parte estiver ausente, a autenticação é interrompida.

O Sistema-Expedientes utiliza um arquivo corporativo externo que fornece os dados do empregado.

## Objetivo

Permitir dois provedores de autenticação:

```text
legacy_file
native_ldap
```

## Novos arquivos

```text
app/auth/providers/LegacyIdentityProvider.php
app/auth/providers/NativeLdapIdentityProvider.php
app/auth/providers/IdentityProviderFactory.php
```

## Provedor 1 — `legacy_file`

Será o primeiro modo utilizado no servidor.

Ele deverá:

1. carregar o arquivo LDAP corporativo já utilizado pelo servidor;
2. receber o array `$dados`;
3. validar os campos;
4. devolver uma estrutura padronizada.

Estrutura esperada:

```php
array(
    'matricula' => '',
    'nome' => '',
    'funcao' => '',
    'unidade' => '',
    'sg_unidade' => '',
    'no_unidade' => ''
);
```

Configuração:

```text
AUTH_PROVIDER=legacy_file
LDAP_LEGACY_PATH=C:/caminho/corporativo/acessoldap/LDAP.php
```

## Provedor 2 — `native_ldap`

Preservará a implementação atualmente existente em `CorporateIdentity.php`.

Configuração:

```text
AUTH_PROVIDER=native_ldap
```

## Alteração em `CorporateIdentity.php`

O arquivo deixará de executar diretamente o LDAP e passará a selecionar um provedor:

```php
$provider = IdentityProviderFactory::create(AUTH_PROVIDER);
return $provider->load();
```

## Regra importante

O LDAP identifica o empregado, mas o perfil continuará sendo controlado pela tabela:

```text
dbo.usuarios_acesso
```

Portanto:

* LDAP informa quem é o empregado;
* `usuarios_acesso` informa o que ele pode fazer.

## Critério de conclusão

Ao acessar o sistema, deverão ser preenchidos:

```text
matricula
nome
função
unidade
sigla da unidade
nome da unidade
perfil da aplicação
```

O usuário deverá ser direcionado para a tela correspondente ao perfil.

---

