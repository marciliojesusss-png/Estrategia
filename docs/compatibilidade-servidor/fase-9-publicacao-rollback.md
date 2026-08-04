# FASE 9 — PUBLICAÇÃO E ROLLBACK

## Preparação

Organizar as pastas:

```text
C:\Sistemas\Estrategia_nova
C:\Sistemas\Estrategia_anterior
```

## Antes da publicação

* [ ] backup do banco;
* [ ] backup da aplicação;
* [ ] backup do arquivo de configuração local;
* [ ] execução do preflight;
* [ ] teste da URL de saúde;
* [ ] validação com usuário administrador;
* [ ] validação com unidade apuradora;
* [ ] validação com homologador.

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

## Rollback

Se houver falha:

1. retornar o caminho físico do IIS para a pasta anterior;
2. restaurar o banco, caso tenha ocorrido alteração incompatível;
3. reciclar o Application Pool;
4. confirmar a versão anterior;
5. preservar os logs da tentativa para diagnóstico.

## Critério de conclusão

A implantação estará concluída quando:

* usuários acessarem o sistema;
* banco permitir leitura e gravação;
* autenticação funcionar;
* perfis forem respeitados;
* logs não apresentarem erros críticos.

---

