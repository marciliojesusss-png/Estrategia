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

## Configurações do IIS

* [ ] Converter `/estrategia` em aplicação.
* [ ] Associar ao Application Pool correto.
* [ ] Configurar PHP 7.1.19 pelo FastCGI.
* [ ] Habilitar documento padrão `index.php`.
* [ ] Confirmar instalação do URL Rewrite.
* [ ] Habilitar autenticação Windows.
* [ ] Desabilitar autenticação anônima quando exigido.
* [ ] Confirmar preenchimento de `REMOTE_USER`.
* [ ] Configurar `APP_BASE_PATH=/estrategia`.

## Testes obrigatórios

```text
/estrategia/
/estrategia/saude
/estrategia/dashboard
/estrategia/indicadores
/estrategia/assets/
```

## Plano alternativo

Caso a infraestrutura não permita apontar o IIS diretamente para `public`, criar:

```text
/index.php
/web.config
```

O `index.php` da raiz apenas carregará:

```php
require __DIR__ . '/public/index.php';
```

O `web.config` da raiz deverá:

* bloquear acesso a `app`;
* bloquear acesso a `database`;
* bloquear acesso a `storage`;
* bloquear acesso a `uploads`;
* bloquear acesso ao `.env`;
* encaminhar todas as requisições para `public/index.php`.

Esse modo será apenas uma compatibilidade. O caminho físico apontando para `public` permanece a solução preferencial.

## Critério de conclusão

* página inicial responde;
* CSS e JavaScript carregam;
* rotas internas não retornam 404;
* diretórios internos não podem ser acessados pelo navegador.

---

