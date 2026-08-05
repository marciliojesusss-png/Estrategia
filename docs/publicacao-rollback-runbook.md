# Runbook De Publicacao E Rollback

Este roteiro deve ser preenchido antes da implantacao em producao.

## Identificacao

- Data:
- Responsavel:
- Versao/commit:
- Pasta nova:
- Pasta anterior:
- Banco:
- Application Pool:
- Caminho IIS anterior:
- Caminho IIS novo:

## Antes Da Publicacao

- [ ] Backup do banco realizado.
- [ ] Backup da aplicacao anterior realizado.
- [ ] Backup de `app/config/servidor.local.php` realizado.
- [ ] Uploads existentes preservados.
- [ ] `scripts/preflight-servidor.php` executado.
- [ ] `scripts/validar-banco-schema-usuarios.php` executado.
- [ ] `scripts/validar-homologacao.php --base-url=...` executado.
- [ ] Validacao com administrador.
- [ ] Validacao com unidade apuradora.
- [ ] Validacao com homologador.

## Publicacao

- [ ] Colocar aplicacao em modo de manutencao, se aplicavel.
- [ ] Copiar versao homologada para a pasta nova.
- [ ] Preservar `servidor.local.php`.
- [ ] Preservar uploads existentes.
- [ ] Aplicar scripts SQL pendentes.
- [ ] Alterar caminho fisico no IIS.
- [ ] Reciclar Application Pool.
- [ ] Acessar `/estrategia/saude`.
- [ ] Executar teste de login.
- [ ] Executar teste de consulta.
- [ ] Executar teste de gravacao.
- [ ] Verificar logs criticos.

## Rollback

Executar se houver falha impeditiva:

1. Retornar caminho fisico do IIS para a pasta anterior.
2. Restaurar banco, caso tenha ocorrido alteracao incompativel.
3. Reciclar Application Pool.
4. Confirmar versao anterior.
5. Preservar logs da tentativa para diagnostico.

## Resultado

- [ ] Publicacao concluida.
- [ ] Rollback executado.
- [ ] Publicacao cancelada antes da troca.

Observacoes:
