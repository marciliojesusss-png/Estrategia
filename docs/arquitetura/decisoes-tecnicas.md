# Registro de decisões técnicas

| Decisão | Motivo | Consequência |
|---|---|---|
| PHP 7.1.19 como alvo | Restrição do ambiente corporativo | Evitar recursos adicionados após 7.1 e validar no runtime real |
| IIS com `public` como raiz | Reduzir exposição de código e dados | Requer URL Rewrite/FastCGI e ACLs explícitas |
| SQL Server via PDO | Plataforma corporativa e consultas preparadas | Exige ODBC e `pdo_sqlsrv` compatíveis |
| Camadas controller/service/repository | Separar HTTP, regras e persistência | Facilita testes e manutenção |
| Autorização por perfil e escopo | Privilégio mínimo e isolamento por unidade | Toda consulta e transição deve aplicar escopo no servidor |
| Migração reexecutável com relatório | Permitir ensaio e reconciliação | Alertas impedem go-live até resolução |
| Upload fora do diretório público | Bloquear execução e acesso direto | Download deve passar por autorização |
