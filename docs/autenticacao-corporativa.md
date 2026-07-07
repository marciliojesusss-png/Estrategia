# Autenticacao corporativa LDAP

Este documento guarda a analise inicial sobre a adaptacao do sistema CAIXA Loterias - Indicadores Estrategicos para usar o mesmo padrao de acesso do sistema Expediente da CAIXA Loterias.

Nenhuma implementacao deve ser feita antes de validar este desenho.

## 1. Ideia central

O sistema nao deve criar uma tela de login propria.

O padrao esperado e:

```text
Usuario acessa o link do sistema
        |
        v
Servidor corporativo identifica o usuario
        |
        v
LDAP externo retorna os dados do empregado
        |
        v
Sistema grava os dados em sessao PHP
        |
        v
Sistema consulta permissoes no SQL Server
        |
        v
Sistema libera pagina, menu e dados conforme perfil
```

O modulo corporativo esperado e:

```php
require_once('../acessoldap/LDAP.php');
```

Esse arquivo fica fora do projeto e deve existir no ambiente corporativo.

## 2. Dados esperados do LDAP

Pelo padrao observado no sistema Expediente, o LDAP externo deve preencher um array chamado `$dados`.

Campos esperados:

```php
$dados['matricula']
$dados['nome']
$dados['funcao']
$dados['unidade']
$dados['sg_unidade']
$dados['no_unidade']
```

Esses valores devem ser salvos em `$_SESSION`.

## 3. Minha avaliacao

A proposta e boa e combina com o ambiente corporativo.

Pontos positivos:

- evita login paralelo;
- evita senha local no sistema;
- reaproveita o padrao corporativo ja usado no Expediente;
- separa identidade corporativa de permissao operacional;
- permite controlar perfil dentro do banco `Estrategia`;
- permite testar boa parte do comportamento no computador local.

Pontos que precisam de cuidado:

- proteger tambem as APIs, nao apenas as paginas PHP;
- nao confiar apenas em menu oculto;
- nao usar fallback local em producao;
- centralizar o caminho do `LDAP.php`, para evitar caminhos relativos frageis;
- criar as tabelas de acesso no SQL Server, nao no SQLite;
- validar escopo por unidade apuradora e diretoria no backend.

## 4. Banco de dados

Como o projeto esta migrando para SQL Server, as novas tabelas devem ficar no banco:

```text
Servidor: localhost
Banco: Estrategia
Autenticacao: Windows
```

Tabelas sugeridas:

```text
dbo.usuarios_acesso
dbo.acessos_log
```

## 5. Tabela usuarios_acesso

Tabela responsavel por dizer qual perfil cada matricula possui.

Campos sugeridos:

```sql
CREATE TABLE dbo.usuarios_acesso (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    matricula NVARCHAR(50) NOT NULL UNIQUE,
    nome NVARCHAR(255) NULL,
    email NVARCHAR(255) NULL,
    sg_unidade NVARCHAR(50) NULL,
    no_unidade NVARCHAR(255) NULL,
    perfil NVARCHAR(50) NOT NULL,
    unidade_apuradora NVARCHAR(255) NULL,
    diretoria_responsavel NVARCHAR(255) NULL,
    ativo BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NULL,
    updated_at DATETIME2 NULL
);
```

Perfis previstos:

```text
usuario_companhia
unidade_apuradora
homologador
administrador
```

Regra recomendada:

- se a matricula existir em `usuarios_acesso` e `ativo = 1`, usar o perfil cadastrado;
- se nao existir, usar `usuario_companhia`;
- usuario comum acessa apenas a visao institucional.

## 6. Tabela acessos_log

Tabela para registrar acessos ao sistema.

Campos sugeridos:

```sql
CREATE TABLE dbo.acessos_log (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    matricula NVARCHAR(50) NULL,
    nome NVARCHAR(255) NULL,
    perfil NVARCHAR(50) NULL,
    sg_unidade NVARCHAR(50) NULL,
    ip NVARCHAR(100) NULL,
    user_agent NVARCHAR(MAX) NULL,
    data_acesso DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
```

## 7. Sessao PHP

Salvar na sessao:

```php
$_SESSION['matricula']
$_SESSION['nome']
$_SESSION['funcao']
$_SESSION['unidade']
$_SESSION['sg_unidade']
$_SESSION['no_unidade']
$_SESSION['perfil']
$_SESSION['unidade_apuradora']
$_SESSION['diretoria_responsavel']
```

## 8. Redirecionamento por perfil

Regras sugeridas:

```text
usuario_companhia  -> /resumo-executivo.php
unidade_apuradora  -> /lancamentos.php
homologador        -> /homologacao.php
administrador      -> /resumo-executivo.php
```

## 9. Protecao de paginas

Cada pagina PHP deve validar permissao no backend.

Exemplo conceitual:

```php
function exigirPerfilPermitido(array $perfisPermitidos): void
{
    $perfil = $_SESSION['perfil'] ?? 'usuario_companhia';

    if (!in_array($perfil, $perfisPermitidos, true)) {
        header('Location: /resumo-executivo.php?acesso=restrito');
        exit;
    }
}
```

Regras iniciais:

```text
resumo-executivo.php  -> todos
visao-trimestral.php  -> todos
lancamentos.php       -> unidade_apuradora, administrador
homologacao.php       -> homologador, administrador
indicadores.php       -> administrador e perfis autorizados
relatorios.php        -> administrador e perfis autorizados
administracao.php     -> administrador
```

## 10. Protecao de APIs

As APIs tambem precisam validar sessao, perfil e escopo.

Isso e essencial porque esconder menu nao impede acesso direto por URL.

Exemplos:

```text
/api/indicadores.php
/api/lancamentos.php
/api/homologacoes.php
/api/database.php
```

Cada API deve verificar:

- se existe sessao valida;
- qual e o perfil do usuario;
- se o usuario pode acessar aquela operacao;
- se o usuario pode ver aquela unidade ou diretoria.

## 11. Escopo por perfil

Unidade apuradora:

- ve apenas indicadores da sua `unidade_apuradora`;
- lanca apenas indicadores da sua unidade;
- a unidade deve vir preferencialmente de `usuarios_acesso.unidade_apuradora`.

Homologador:

- ve apenas indicadores da sua `diretoria_responsavel`;
- homologa apenas indicadores da sua diretoria;
- a diretoria deve vir de `usuarios_acesso.diretoria_responsavel`.

Administrador:

- tem visao completa;
- acessa todas as telas;
- administra permissoes;
- consulta auditoria.

## 12. Teste fora do ambiente CAIXA

No computador local, nao da para testar o LDAP corporativo real se o ambiente nao tiver acesso ao arquivo externo e ao servidor corporativo.

Mas da para testar quase todo o comportamento do sistema:

- sessao PHP;
- usuario simulado;
- busca de perfil no SQL Server;
- redirecionamento;
- menus;
- protecao de paginas;
- protecao de APIs;
- escopo por unidade;
- escopo por diretoria;
- log de acesso.

## 13. Fallback local controlado

O fallback local deve existir apenas para desenvolvimento.

Sugestao:

```php
$appEnv = getenv('APP_ENV') ?: 'production';

if (file_exists($ldapPath)) {
    require_once $ldapPath;
} elseif ($appEnv === 'local') {
    $dados = [
        'matricula' => 'C000000',
        'nome' => 'Usuario Local',
        'funcao' => 'Desenvolvimento',
        'unidade' => 'LOCAL',
        'sg_unidade' => 'LOCAL',
        'no_unidade' => 'Ambiente Local',
    ];
} else {
    http_response_code(401);
    exit('Autenticacao corporativa indisponivel.');
}
```

Importante:

- em producao, se o LDAP nao existir, o acesso deve falhar;
- em local, pode usar usuario simulado;
- nunca deixar usuario fake liberado em producao.

## 14. Usuarios locais para teste

Sugestao de dados para testes locais na tabela `usuarios_acesso`:

```text
C000001 -> administrador
C000002 -> unidade_apuradora / SUCOL
C000003 -> homologador / DIFIR
C000004 -> usuario_companhia
```

Com isso, e possivel testar cada tipo de acesso sem depender do LDAP corporativo real.

## 15. Criterios de aceite adaptados

Antes de considerar a autenticacao pronta:

- o sistema carrega `../acessoldap/LDAP.php` no ambiente corporativo;
- o sistema grava os dados do empregado em `$_SESSION`;
- o perfil vem da tabela `dbo.usuarios_acesso`;
- usuario nao cadastrado entra como `usuario_companhia`;
- paginas PHP validam permissao no backend;
- APIs validam permissao no backend;
- menus mudam conforme perfil;
- unidade apuradora nao acessa outra unidade;
- homologador nao acessa outra diretoria;
- administrador tem acesso completo;
- fallback local so funciona com `APP_ENV=local`;
- nenhum dado existente e apagado;
- regras de calculo dos indicadores nao sao alteradas;
- tema visual atual permanece.

## 16. Decisao recomendada

Minha recomendacao e implementar esse fluxo em etapas:

1. Criar tabelas `usuarios_acesso` e `acessos_log` no SQL Server.
2. Criar autenticacao central com fallback local controlado.
3. Proteger paginas PHP.
4. Proteger APIs.
5. Ajustar menus por perfil.
6. Criar tela administrativa para manter matriculas em `usuarios_acesso`.
7. Aplicar escopo por unidade e diretoria.
8. Testar localmente com usuarios simulados.
9. Validar no ambiente CAIXA com o LDAP real.

Essa ordem reduz risco e permite testar bastante coisa no computador local antes de depender do ambiente corporativo.

## 17. Status da implementacao local

Implementado no projeto:

- autenticacao central em `app/auth/Auth.php`;
- carregamento do LDAP externo por `LDAP_PATH`;
- fallback local controlado para testes em `localhost`;
- criacao automatica das tabelas `usuarios_acesso` e `acessos_log` no banco ativo;
- usuarios locais de teste `C000001`, `C000002`, `C000003` e `C000004`;
- tela `Configuracoes > Acessos` para cadastrar e editar matriculas em `usuarios_acesso`;
- API administrativa `api/usuarios-acesso.php` para gravar os acessos no banco ativo;
- protecao de paginas PHP por perfil;
- protecao de APIs por sessao;
- bloqueio de escrita em APIs para usuario comum;
- injecao do usuario autenticado no frontend via `window.CAIXA_LOTERIAS_AUTH_USER`;
- logout PHP em `public/logout.php`;
- filtros de escopo para unidade apuradora e homologador nas APIs principais.

## 18. Testes locais

Para testar fora do ambiente CAIXA:

```powershell
php -S 127.0.0.1:8010 -t public
```

Por padrao, o sistema PHP usa o SQLite local.

Para testar gravando no SQL Server `Estrategia`, abra o PowerShell na pasta do projeto e execute antes de iniciar o servidor:

```powershell
$env:DB_CONNECTION="sqlsrv"
$env:SQLSERVER_HOST="localhost"
$env:SQLSERVER_DATABASE="Estrategia"
$env:SQLSERVER_ENCRYPT="no"
php -S 127.0.0.1:8010 -t public
```

Nesse modo, a tela `Configuracoes > Acessos` grava na tabela `dbo.usuarios_acesso`.

Depois acesse:

```text
http://127.0.0.1:8010/index.php?dev_user=C000001
http://127.0.0.1:8010/index.php?dev_user=C000002
http://127.0.0.1:8010/index.php?dev_user=C000003
http://127.0.0.1:8010/index.php?dev_user=C000004
```

Usuarios locais:

```text
C000001 -> administrador
C000002 -> unidade_apuradora / SUCOL
C000003 -> homologador / DIFIR
C000004 -> usuario_companhia
```

Resultados esperados:

- `C000001` acessa tudo;
- `C000002` cai em `lancamentos.php`;
- `C000003` cai em `homologacao.php`;
- `C000004` cai em `resumo-executivo.php` e nao acessa telas operacionais;
- tentativa de escrita por `C000004` nas APIs retorna HTTP 403.
- ao clicar em Sair no teste local, a sessao e limpa e o sistema volta como `C000004`, usuario comum.
