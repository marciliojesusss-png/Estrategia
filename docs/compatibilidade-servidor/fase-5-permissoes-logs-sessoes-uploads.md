# FASE 5 — PERMISSÕES, LOGS, SESSÕES E UPLOADS

## Problema

O sistema precisa gravar em:

```text
storage/logs
storage/temporarios
storage/backups
uploads/evidencias
```

## Ações

* [x] Criar `storage/logs`.
* [x] Adicionar um `.gitkeep` para preservar a pasta.
* [ ] Conceder permissão de modificação ao Application Pool.
* [ ] Conceder permissão de modificação em `uploads/evidencias`.
* [ ] Manter apenas leitura nas demais pastas.
* [x] Testar criação de sessão.
* [x] Testar criação de arquivo temporário.
* [ ] Testar upload e download de evidência.

Itens pendentes dependem do ambiente IIS/Application Pool ou de homologação com upload HTTP real no servidor.

## Alteração no Logger

Caso o arquivo de log não possa ser criado, o Logger deverá usar como fallback:

```php
error_log($mensagem);
```

Isso evitará que uma falha de permissão no log esconda o erro principal.

Status: implementado em `app/core/Logger.php`.

## Novo script

```text
scripts/verificar-permissoes.php
```

Saída esperada:

```text
storage/logs: gravável
storage/temporarios: gravável
storage/backups: gravável
uploads/evidencias: gravável
sessão PHP: disponível
```

Status: implementado em `scripts/verificar-permissoes.php`.

Saída validada localmente:

```text
storage/logs: gravavel
storage/temporarios: gravavel
storage/backups: gravavel
uploads/evidencias: gravavel
sessao PHP: disponivel
```

## Critério de conclusão

O sistema deverá:

* [x] criar sessão;
* [x] escrever log;
* [x] criar temporário;
* [ ] gravar evidência em upload HTTP real no IIS;
* [ ] remover evidência em upload HTTP real no IIS;
* [ ] funcionar sem erro de permissão no Application Pool definitivo.

---

