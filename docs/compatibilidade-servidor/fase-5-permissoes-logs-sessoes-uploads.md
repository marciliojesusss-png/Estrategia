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

* [ ] Criar `storage/logs`.
* [ ] Adicionar um `.gitkeep` para preservar a pasta.
* [ ] Conceder permissão de modificação ao Application Pool.
* [ ] Conceder permissão de modificação em `uploads/evidencias`.
* [ ] Manter apenas leitura nas demais pastas.
* [ ] Testar criação de sessão.
* [ ] Testar criação de arquivo temporário.
* [ ] Testar upload e download de evidência.

## Alteração no Logger

Caso o arquivo de log não possa ser criado, o Logger deverá usar como fallback:

```php
error_log($mensagem);
```

Isso evitará que uma falha de permissão no log esconda o erro principal.

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

## Critério de conclusão

O sistema deverá:

* criar sessão;
* escrever log;
* criar temporário;
* gravar evidência;
* remover evidência;
* funcionar sem erro de permissão.

---

