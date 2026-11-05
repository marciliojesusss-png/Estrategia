# Configuração do IIS e dos web.config na CAIXA

## Objetivo

Este documento descreve como publicar o projeto `Estrategia` no IIS da CAIXA
sem quebrar as rotas PHP nem o carregamento de CSS, JavaScript, imagens e
fontes.

O endereço considerado neste guia é:

```text
https://www.gelot.mz.caixa/estrategia/
```

Na configuração observada na CAIXA, o diretório físico da aplicação aponta
para a raiz do projeto. Por isso, os arquivos estáticos são publicados sob:

```text
/estrategia/public/assets/
```

## Estrutura física esperada

O caminho configurado no IIS deve conter, no mínimo:

```text
Estrategia/
+-- index.php
+-- web.config
+-- app/
+-- assets/
+-- public/
|   +-- index.php
|   +-- web.config
|   +-- assets/
|       +-- css/
|       +-- js/
|       +-- img/
+-- database/
+-- storage/
+-- uploads/
+-- views/
```

No modo usado atualmente, o `index.php` da raiz encaminha a execução para
`public/index.php` e define o prefixo público `/public` para os assets.

Não publique somente parte da pasta `public/assets`. O conteúdo de `assets/` e
`public/assets/` é mantido em duplicidade pelo projeto e os testes verificam que
os arquivos correspondentes continuam sincronizados.

## Modos de implantação

Existem dois modos possíveis. Eles não devem ser misturados.

### Modo A — raiz do projeto

É o modo compatível com as URLs observadas na CAIXA.

- Caminho físico do aplicativo IIS: pasta `Estrategia`.
- Documento padrão: `index.php` da raiz.
- URL do CSS: `/estrategia/public/assets/css/styles.css`.
- URL do JavaScript: `/estrategia/public/assets/js/app.js`.
- São aplicados o `web.config` da raiz e o `public/web.config` herdado.

### Modo B — pasta public

Pode ser usado em uma instalação nova, desde que toda a configuração seja
adaptada e testada.

- Caminho físico do aplicativo IIS: pasta `Estrategia/public`.
- Documento padrão: `public/index.php`.
- URL do CSS: `/estrategia/assets/css/styles.css`.
- URL do JavaScript: `/estrategia/assets/js/app.js`.

O erro ocorrido na CAIXA foi no Modo A. Este guia recomenda manter esse modo
durante a correção para não alterar simultaneamente o caminho físico e as URLs.

## Configuração da aplicação no IIS

No IIS Manager:

1. Crie ou selecione a aplicação com alias `estrategia`.
2. Aponte o caminho físico para a raiz da pasta `Estrategia`.
3. Associe o Application Pool utilizado pelo PHP/FastCGI homologado.
4. Confirme que `index.php` está habilitado como documento padrão.
5. Confirme que o Handler Mapping do PHP atende arquivos `.php`, não todos os
   arquivos por curinga.
6. Confirme que o recurso **Static Content** do IIS está instalado.
7. Conceda leitura e execução ao Application Pool na aplicação.
8. Conceda escrita somente nas pastas operacionais que realmente precisam dela,
   como `storage`, `uploads/evidencias` e diretórios temporários definidos pelo
   projeto.

O arquivo `app/config/servidor.local.php` do servidor deve usar:

```php
'app_env' => 'production',
'app_base_path' => '/estrategia',
```

Não copie o `servidor.local.php` da estação de desenvolvimento sobre o arquivo
corporativo, pois banco, autenticação e caminhos podem ser diferentes.

## web.config da raiz

O arquivo `Estrategia/web.config` deve permanecer assim:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <defaultDocument>
      <files>
        <clear />
        <add value="index.php" />
      </files>
    </defaultDocument>
    <security>
      <requestFiltering>
        <hiddenSegments>
          <add segment="storage" />
          <add segment="uploads" />
          <add segment="database" />
          <add segment="app" />
          <add segment=".env" />
        </hiddenSegments>
      </requestFiltering>
    </security>
  </system.webServer>
</configuration>
```

Esse arquivo define `index.php` como documento padrão e impede acesso HTTP
direto às pastas internas.

## web.config da pasta public

O arquivo `Estrategia/public/web.config` deve permanecer assim:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <defaultDocument>
      <files>
        <clear />
        <add value="index.php" />
      </files>
    </defaultDocument>
    <httpErrors errorMode="Custom" existingResponse="PassThrough" />
    <security>
      <requestFiltering>
        <hiddenSegments>
          <remove segment="storage" />
          <remove segment="uploads" />
          <remove segment="database" />
          <remove segment="app" />
          <add segment="storage" />
          <add segment="uploads" />
          <add segment="database" />
          <add segment="app" />
        </hiddenSegments>
      </requestFiltering>
    </security>
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="SAMEORIGIN" />
        <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
        <add name="Permissions-Policy" value="camera=(), microphone=(), geolocation=()" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
```

As tags `<remove>` são obrigatórias no Modo A. O IIS combina configurações de
diretórios pais e filhos. Como os segmentos já foram adicionados no
`web.config` da raiz, tentar adicioná-los novamente diretamente pode gerar:

```text
HTTP 500.19
HRESULT 0x800700b7
```

Depois de remover as entradas herdadas, o arquivo volta a adicioná-las no nível
de `public`, preservando a proteção sem criar duplicidade.

Não substitua o arquivo ativo por `web.config2`. Esse arquivo não é carregado
automaticamente pelo IIS e não representa a configuração final homologada.

## MIME de CSS e JavaScript

O projeto não deve desabilitar o cabeçalho:

```text
X-Content-Type-Options: nosniff
```

Esse cabeçalho impede que o navegador execute uma resposta com tipo incorreto.
Quando o console informa erro de MIME junto com HTTP `500`, o MIME normalmente
é apenas a consequência: o IIS devolveu uma página de erro em vez do arquivo
estático.

Com a resposta correta:

| Recurso | Status | Content-Type esperado |
| --- | --- | --- |
| `.css` | `200` | `text/css` |
| `.js` | `200` | `application/javascript`, `text/javascript` ou `application/x-javascript` |

Não adicione novos `mimeMap` no `web.config` sem antes conferir os mapeamentos
do servidor. Adicionar uma extensão que já existe em nível superior também pode
causar erro de configuração duplicada.

## Validação depois da publicação

### Conferência dos arquivos físicos

No servidor, confirme que os arquivos existem:

```powershell
Test-Path 'E:\WEBSITES\CAMINHO\Estrategia\public\assets\css\styles.css'
Test-Path 'E:\WEBSITES\CAMINHO\Estrategia\public\assets\js\app.js'
```

Os dois comandos devem retornar `True`.

### Conferência HTTP

Execute de uma máquina que tenha acesso ao endereço interno:

```powershell
$css = Invoke-WebRequest `
  -Uri 'https://www.gelot.mz.caixa/estrategia/public/assets/css/styles.css' `
  -UseBasicParsing

$js = Invoke-WebRequest `
  -Uri 'https://www.gelot.mz.caixa/estrategia/public/assets/js/app.js' `
  -UseBasicParsing

$css | Select-Object StatusCode, Headers
$js | Select-Object StatusCode, Headers
```

Confirme HTTP `200` e os tipos MIME descritos anteriormente.

### Validador do projeto

Na raiz do projeto implantado:

```powershell
php scripts\validar-homologacao.php `
  --base-url=https://www.gelot.mz.caixa/estrategia
```

O validador consulta as rotas por `index.php?route=...`, testa o CSS e o
JavaScript publicados e reprova respostas sem MIME compatível.

### Teste automatizado antes da publicação

```powershell
php tests\security-publication.test.php
```

Esse teste verifica, entre outros itens, que os segmentos herdados são removidos
antes de serem adicionados no `public/web.config`.

## Diagnóstico de falhas

Consulte o log do IIS e registre pelo menos:

```text
sc-status
sc-substatus
sc-win32-status
cs-uri-stem
```

| Sintoma | Causa provável | Ação |
| --- | --- | --- |
| `500.19` / `0x800700b7` | Entrada duplicada herdada | Confirmar as tags `<remove>` antes de `<add>` |
| `500.19` / `0x80070021` | Seção bloqueada no IIS | Solicitar ao administrador a liberação da seção ou manter a configuração no nível permitido |
| `500.19` / `0x8007000d` | XML inválido ou elemento não reconhecido | Validar XML e recursos instalados no IIS |
| `404.3` em `.css` ou `.js` | Static Content ou MIME ausente | Habilitar Static Content e revisar MIME no IIS |
| `500` somente em `.php` | Falha no FastCGI/PHP | Verificar Handler Mapping, PHP e log da aplicação |
| `500` em todo `/public` | Erro no `public/web.config` | Abrir diretamente um asset e consultar substatus/HRESULT |
| `200` com `text/html` para asset | Roteamento incorreto | Confirmar caminho físico, URL e Handler Mapping |

O IIS documenta que entradas duplicadas em níveis diferentes da hierarquia de
configuração podem produzir `500.19` com `0x800700b7`:

```text
https://learn.microsoft.com/troubleshoot/developer/webapps/iis/site-behavior-performance/http-error-500-19-webpage
```

A coleção `hiddenSegments` aceita os elementos `add`, `remove` e `clear`:

```text
https://learn.microsoft.com/iis/configuration/system.webServer/security/requestFiltering/hiddenSegments/
```

## Checklist para a CAIXA

Antes de liberar a versão:

- [ ] O aplicativo IIS usa o alias `estrategia`.
- [ ] O caminho físico corresponde ao modo de implantação escolhido.
- [ ] `app_base_path` está configurado como `/estrategia`.
- [ ] O `web.config` da raiz foi publicado.
- [ ] O `public/web.config` contém `<remove>` antes dos `<add>` repetidos.
- [ ] O Handler Mapping do PHP não captura `.css`, `.js`, imagens ou fontes.
- [ ] Static Content está habilitado.
- [ ] CSS e JavaScript retornam HTTP `200`.
- [ ] O CSS retorna `text/css`.
- [ ] O JavaScript retorna um MIME executável.
- [ ] `X-Content-Type-Options: nosniff` continua habilitado.
- [ ] `php tests\security-publication.test.php` foi aprovado.
- [ ] `scripts\validar-homologacao.php` foi executado contra a URL corporativa.
- [ ] O navegador foi atualizado sem cache depois da publicação.

## Rollback

Antes de publicar, guarde cópias dos dois arquivos ativos:

```text
Estrategia/web.config
Estrategia/public/web.config
```

Se a nova publicação falhar, restaure os dois arquivos como um conjunto. Não
restaure somente um deles, pois a relação de herança entre raiz e `public` faz
parte da configuração.
