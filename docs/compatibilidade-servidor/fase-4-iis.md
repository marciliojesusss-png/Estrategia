# FASE 4 — COMPATIBILIZAR A PUBLICAÇÃO NO IIS

## Estrutura preferencial

Criar uma aplicação virtual no IIS:

```text
Alias: estrategia
Caminho físico: C:\Sistemas\Estrategia\public
```

A URL será:

```text
/estrategia/
```

O projeto já possui um `web.config` dentro da pasta `public`, com documento padrão e regra de front controller.

Status no repositório: validado. A solução preferencial continua sendo publicar o caminho físico apontando para `public`.

## Configurações do IIS

* [ ] Converter `/estrategia` em aplicação.
* [ ] Associar ao Application Pool correto.
* [ ] Configurar PHP 7.1.19 pelo FastCGI.
* [x] Habilitar documento padrão `index.php`.
* [ ] Confirmar instalação do URL Rewrite.
* [ ] Habilitar autenticação Windows.
* [ ] Desabilitar autenticação anônima quando exigido.
* [ ] Confirmar preenchimento de `REMOTE_USER`.
* [x] Configurar `APP_BASE_PATH=/estrategia`.

Itens pendentes dependem da configuração real do IIS. O documento padrão e o caminho-base já estão cobertos pelos arquivos do projeto/configuração.

## Testes obrigatórios

```text
/estrategia/
/estrategia/saude
/estrategia/dashboard
/estrategia/indicadores
/estrategia/assets/
```

Status: pendente de execução no IIS. Localmente, os testes automatizados validam regras de publicação, bloqueio de diretórios internos e compatibilidade do front controller.

## Plano alternativo

Caso a infraestrutura não permita apontar o IIS diretamente para `public`, criar:

```text
/index.php
/web.config
```

Status: implementado no repositório.

O `index.php` da raiz apenas carregará:

```php
require __DIR__ . '/public/index.php';
```

Status: implementado em `/index.php`.

O `web.config` da raiz deverá:

* [x] bloquear acesso a `app`;
* [x] bloquear acesso a `database`;
* [x] bloquear acesso a `storage`;
* [x] bloquear acesso a `uploads`;
* [x] bloquear acesso ao `.env`;
* [x] encaminhar todas as requisições para `public/index.php`.

Esse modo será apenas uma compatibilidade. O caminho físico apontando para `public` permanece a solução preferencial.

## Critério de conclusão

* [ ] página inicial responde no IIS;
* [ ] CSS e JavaScript carregam no IIS;
* [ ] rotas internas não retornam 404 no IIS;
* [x] diretórios internos não podem ser acessados pelo navegador, conforme regras versionadas e teste automatizado.

Validação local realizada com `tests/security-publication.test.php`.

---

