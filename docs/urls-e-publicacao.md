# URLs e publicação da aplicação

## Endereço principal

A aplicação deve ser publicada no seguinte endereço:

```text
https://www.gelot.mz.caixa/estrategia/
```

Esse é o ponto de entrada oficial. Quando a autenticação local estiver habilitada, o formulário de login será apresentado diretamente nesse endereço. Não deve ser utilizado `login.php` na URL.

## Estrutura dos endereços

Tudo que aparece depois de `/estrategia/` é uma **rota** ou **caminho da aplicação**. Por exemplo, em:

```text
https://www.gelot.mz.caixa/estrategia/indicadores
```

- `www.gelot.mz.caixa` é o host;
- `/estrategia` é o caminho-base da aplicação;
- `/indicadores` é uma rota da aplicação.

Essas rotas não são subdomínios. Um subdomínio teria outra estrutura, como `indicadores.gelot.mz.caixa`.

## Principais URLs

| Funcionalidade | URL |
|---|---|
| Entrada e login | `https://www.gelot.mz.caixa/estrategia/` |
| Dashboard | `https://www.gelot.mz.caixa/estrategia/dashboard` |
| Resumo executivo | `https://www.gelot.mz.caixa/estrategia/resumo-executivo` |
| Visão trimestral | `https://www.gelot.mz.caixa/estrategia/visao-trimestral` |
| Indicadores | `https://www.gelot.mz.caixa/estrategia/indicadores` |
| Novo indicador | `https://www.gelot.mz.caixa/estrategia/indicadores/novo` |
| Lançamentos | `https://www.gelot.mz.caixa/estrategia/lancamentos` |
| Novo lançamento | `https://www.gelot.mz.caixa/estrategia/lancamentos/novo` |
| Homologações | `https://www.gelot.mz.caixa/estrategia/homologacoes` |
| Relatórios | `https://www.gelot.mz.caixa/estrategia/relatorios` |
| Administração | `https://www.gelot.mz.caixa/estrategia/administracao` |
| Auditoria | `https://www.gelot.mz.caixa/estrategia/auditoria` |
| Logout | `https://www.gelot.mz.caixa/estrategia/logout` |

Algumas dessas rotas dependem do perfil e das permissões do usuário autenticado.

## Registros específicos

As páginas de detalhe utilizam um identificador após a rota principal:

```text
https://www.gelot.mz.caixa/estrategia/indicadores/123
https://www.gelot.mz.caixa/estrategia/indicadores/123/editar
https://www.gelot.mz.caixa/estrategia/lancamentos/456
https://www.gelot.mz.caixa/estrategia/lancamentos/456/editar
https://www.gelot.mz.caixa/estrategia/homologacoes/456
```

Os números `123` e `456` são apenas exemplos. Na aplicação, serão substituídos pelo identificador real do registro.

## Endpoints técnicos

As verificações de disponibilidade ficam em:

```text
https://www.gelot.mz.caixa/estrategia/saude
https://www.gelot.mz.caixa/estrategia/saude/banco
```

O endpoint de banco exige autenticação e perfil autorizado. Esses endereços são destinados a monitoramento e diagnóstico, não à navegação comum dos usuários.

As APIs seguem o mesmo caminho-base:

```text
https://www.gelot.mz.caixa/estrategia/api/indicadores
https://www.gelot.mz.caixa/estrategia/api/lancamentos
https://www.gelot.mz.caixa/estrategia/api/homologacoes
https://www.gelot.mz.caixa/estrategia/api/relatorios
```

## Organização física no servidor

O projeto pode ficar fisicamente em uma pasta chamada `Estrategia`, por exemplo:

```text
D:\Aplicacoes\Estrategia
```

A raiz pública, entretanto, deve ser exclusivamente:

```text
D:\Aplicacoes\Estrategia\public
```

O IIS não deve apontar para `D:\Aplicacoes\Estrategia`, pois isso poderia expor diretórios internos como `app`, `database`, `docs`, `storage` e scripts administrativos.

## Configuração no IIS

Dentro do site HTTPS `www.gelot.mz.caixa`, deve ser criada uma aplicação com as seguintes propriedades:

```text
Alias: estrategia
Physical Path: D:\Aplicacoes\Estrategia\public
Application Pool: No Managed Code
Pipeline: Integrated
```

Também são necessários:

- IIS com CGI/FastCGI habilitado;
- URL Rewrite instalado;
- Handler Mapping de `*.php` para o `php-cgi.exe`;
- certificado HTTPS válido para `www.gelot.mz.caixa`;
- permissões de leitura no código;
- permissões de escrita somente nos diretórios operacionais necessários.

## Variável de caminho-base

O processo FastCGI deve receber:

```text
APP_BASE_PATH=/estrategia
```

Esse também é o valor padrão atual do projeto. A variável faz com que links, redirecionamentos, formulários, assets, logout e chamadas de API permaneçam dentro de `/estrategia`.

Se o alias for alterado no futuro, o valor de `APP_BASE_PATH` deve ser alterado para o mesmo caminho.

## URL Rewrite

O arquivo `public/web.config` encaminha as rotas que não correspondem a arquivos físicos para `public/index.php`. Isso permite endereços limpos como:

```text
/estrategia/dashboard
/estrategia/indicadores
/estrategia/lancamentos
```

Sem o módulo URL Rewrite, essas rotas poderão retornar HTTP 404. Portanto, ele é requisito para a publicação.

## URLs que não devem ser utilizadas

Não devem ser divulgados ou utilizados como entrada oficial:

```text
https://www.gelot.mz.caixa/estrategia/login.php
https://www.gelot.mz.caixa/Estrategia/public/
https://www.gelot.mz.caixa/Estrategia/app/
https://www.gelot.mz.caixa/Estrategia/database/
```

A diferença entre letras maiúsculas e minúsculas pode variar conforme servidor e proxy. O padrão oficial deve ser sempre `/estrategia`, em letras minúsculas.

## Validação após a publicação

Após configurar o IIS, devem ser validados pelo menos os seguintes pontos:

1. `https://www.gelot.mz.caixa/estrategia/` apresenta a entrada da aplicação.
2. CSS, JavaScript, imagens e fontes são carregados sem HTTP 404.
3. O login direciona para uma rota dentro de `/estrategia`.
4. Todas as opções do menu mantêm o prefixo `/estrategia`.
5. O logout abre a confirmação e encerra a sessão corretamente.
6. As APIs respondem dentro de `/estrategia/api/`.
7. Atualizar diretamente uma página interna não produz HTTP 404.
8. Diretórios internos do projeto não podem ser acessados pela internet ou intranet.

