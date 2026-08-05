# FASE 9 — PUBLICAÇÃO E ROLLBACK

## Preparação

Organizar as pastas:

```text
C:\Sistemas\Estrategia_nova
C:\Sistemas\Estrategia_anterior
```

Status: roteiro criado em `docs/publicacao-rollback-runbook.md`. A criação real das pastas depende do servidor.

## Antes da publicação

* [ ] backup do banco;
* [ ] backup da aplicação;
* [ ] backup do arquivo de configuração local;
* [x] script de checklist de publicação criado;
* [x] roteiro de publicação e rollback criado;
* [ ] execução do preflight no servidor;
* [ ] teste da URL de saúde no servidor;
* [ ] validação com usuário administrador;
* [ ] validação com unidade apuradora;
* [ ] validação com homologador.

Status: script criado em `scripts/checklist-publicacao.php`.

## Publicação

* [ ] colocar a aplicação em modo de manutenção;
* [ ] copiar a versão homologada;
* [ ] preservar `servidor.local.php`;
* [ ] preservar uploads existentes;
* [ ] aplicar scripts SQL pendentes;
* [ ] alterar o caminho físico no IIS;
* [ ] reciclar o Application Pool;
* [ ] acessar `/estrategia/saude`;
* [ ] executar teste de login;
* [ ] executar teste de consulta;
* [ ] executar teste de gravação.

Status: passos documentados no runbook. Execução depende da janela de publicação.

## Rollback

Se houver falha:

1. retornar o caminho físico do IIS para a pasta anterior;
2. restaurar o banco, caso tenha ocorrido alteração incompatível;
3. reciclar o Application Pool;
4. confirmar a versão anterior;
5. preservar os logs da tentativa para diagnóstico.

Status: procedimento documentado em `docs/publicacao-rollback-runbook.md`.

## Critério de conclusão

A implantação estará concluída quando:

* [ ] usuários acessarem o sistema em produção;
* [ ] banco permitir leitura e gravação em produção;
* [ ] autenticação funcionar em produção;
* [ ] perfis forem respeitados em produção;
* [ ] logs não apresentarem erros críticos em produção.

Status: publicação e rollback não foram executados localmente. A fase está preparada com roteiro e checklist, mas sua conclusão depende da implantação real.

---

