# Checklist De Homologacao Funcional

Use este roteiro em homologacao depois que banco, IIS, autenticacao e permissoes estiverem configurados.

## Evidencias

- Ambiente:
- Data:
- Responsavel:
- URL:
- Versao/branch:
- Banco:
- Application Pool:

## Infraestrutura

- [ ] `scripts/preflight-servidor.php` executado sem falhas criticas.
- [ ] `scripts/verificar-permissoes.php` executado sem falhas.
- [ ] `scripts/validar-banco-schema-usuarios.php` executado contra SQL Server.
- [ ] `/estrategia/saude` responde.
- [ ] Banco responde.
- [ ] Usuario corporativo e identificado.
- [ ] Sessao e criada.
- [ ] Logs sao gravados.
- [ ] Rotas internas funcionam.
- [ ] Assets carregam.
- [ ] Upload e download funcionam.

## Perfis

- [ ] Administrador acessa dashboard.
- [ ] Administrador cadastra indicador.
- [ ] Administrador edita indicador.
- [ ] Administrador consulta auditoria.
- [ ] Administrador administra usuarios.
- [ ] Administrador reabre lancamento.
- [ ] Unidade apuradora visualiza indicadores da unidade.
- [ ] Unidade apuradora cria lancamento.
- [ ] Unidade apuradora salva rascunho.
- [ ] Unidade apuradora anexa evidencia.
- [ ] Unidade apuradora submete para homologacao.
- [ ] Homologador visualiza fila.
- [ ] Homologador aprova lancamento.
- [ ] Homologador rejeita lancamento.
- [ ] Homologador consulta historico.
- [ ] Usuario companhia consulta dashboard.
- [ ] Usuario companhia consulta relatorios.
- [ ] Usuario companhia nao acessa funcoes administrativas.

## Seguranca

- [ ] Usuario sem cadastro recebe acesso negado.
- [ ] Diretorio `app` nao abre.
- [ ] Diretorio `database` nao abre.
- [ ] `.env` nao pode ser baixado.
- [ ] Usuario de uma unidade nao ve dados de outra.
- [ ] Token CSRF e exigido em alteracoes.
- [ ] Mensagens nao exibem credenciais.

## Resultado

- [ ] Homologado.
- [ ] Homologado com ressalvas.
- [ ] Reprovado.

Observacoes:
