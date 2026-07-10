# Plano de implantação e rollback

## Critérios de entrada

- Suíte local verde e relatório anexado.
- Migração ensaiada em cópia controlada, sem alertas de reconciliação.
- Preflight aprovado em PHP 7.1.19/IIS/SQL Server.
- Aceites técnico, segurança e negócio registrados no checklist de go-live.

## Janela

1. Comunicar início e congelar alterações.
2. Registrar versões e efetuar backup completo do banco e da versão instalada.
3. Aplicar schema/migração com usuário controlado e guardar relatório.
4. Publicar o pacote em diretório versionado e trocar o apontamento do site.
5. Reciclar o pool e executar smoke tests públicos e autenticados por perfil.
6. Reconciliar contagens e valores críticos; liberar ou acionar rollback.

## Rollback

Interrompa a publicação em erro crítico, perda de dados, falha de autenticação/autorização ou reconciliação divergente. Retire o site de tráfego, restaure o apontamento e banco anteriores, execute smoke tests, comunique o resultado e preserve logs. Não tente corrigir dados manualmente durante a janela.

## Monitoramento inicial

Por pelo menos uma janela operacional, acompanhar erros HTTP, latência, conexões SQL, falhas de login, uploads, filas de homologação e divergências de totais. Registre responsável, horário, evidência e decisão de encerramento.
