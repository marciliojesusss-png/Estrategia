# Etapa 10 — Testes e publicação

## Checklist de execução

- [ ] Consolidar matriz de rastreabilidade entre requisitos, implementação e testes.
- [ ] Executar análise sintática de todos os arquivos com PHP 7.1.19 real.
- [ ] Revisar manualmente recursos de linguagem e bibliotecas quanto à compatibilidade com PHP 7.1.19.
- [ ] Executar testes unitários de cálculos, validações, services e transições de estado.
- [ ] Executar testes de integração com uma base SQL Server controlada e esquema equivalente ao real.
- [ ] Executar testes funcionais de todos os módulos e perfis.
- [ ] Testar isolamento por unidade e tentativas de acesso horizontal e vertical indevido.
- [ ] Testar CSRF, XSS, SQL injection, sessão, exposição de erros e cabeçalhos HTTP.
- [ ] Testar uploads válidos, extensões duplas, MIME divergente, tamanho, nomes maliciosos e execução bloqueada.
- [ ] Testar concorrência em submissão, aprovação, rejeição, reabertura e retificação.
- [ ] Testar migração, contagens, chaves, valores críticos e reconciliação dos dados existentes.
- [ ] Executar testes de regressão do frontend, responsividade e navegadores corporativos suportados.
- [ ] Executar testes de desempenho com volume representativo e registrar gargalos.
- [ ] Validar instalação limpa em IIS, FastCGI, URL Rewrite e fallback de rota.
- [ ] Validar `pdo_sqlsrv`, `php.ini`, Application Pool, permissões e `web.config` no ambiente-alvo.
- [ ] Confirmar que credenciais, logs, backups, temporários, uploads e arquivos internos não são públicos.
- [ ] Preparar plano de implantação, janela, backup, rollback e validação pós-publicação.
- [ ] Produzir manual de instalação no IIS e diagnóstico de erros comuns.
- [ ] Produzir manual técnico com arquitetura, banco, APIs, segurança, auditoria, logs e manutenção.
- [ ] Produzir manual do administrador e fluxogramas das funcionalidades.
- [ ] Atualizar README, inventário de versões e registro de decisões técnicas.
- [ ] Obter aceite técnico, de segurança e da área de negócio antes da publicação.
- [ ] Publicar no ambiente autorizado e executar smoke tests pós-implantação.
- [ ] Monitorar erros e métricas iniciais e registrar o encerramento ou plano de correções.

## Critérios de aceite

- [ ] Todos os requisitos críticos possuem evidência de teste e aceite.
- [ ] A aplicação foi validada no ambiente-alvo com PHP 7.1.19, IIS e SQL Server.
- [ ] Migração e rollback foram ensaiados com sucesso e dados reconciliados.
- [ ] Manuais, diagramas, scripts necessários e pacote de publicação estão completos.
- [ ] Não há falhas críticas ou altas abertas para a entrada em produção.

## Acompanhamento

- Decisões:
- Evidências:
- Pendências:

