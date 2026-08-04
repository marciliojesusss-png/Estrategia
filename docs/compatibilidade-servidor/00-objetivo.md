# PLANO DE COMPATIBILIZAÇÃO DO SISTEMA ESTRATEGIA

## 1. Objetivo

Adaptar o projeto **Estrategia** para funcionar no mesmo ambiente corporativo em que o **Sistema-Expedientes** já está publicado, considerando:

* PHP 7.1.19;
* IIS com FastCGI;
* SQL Server;
* extensão `sqlsrv` já utilizada pelo Sistema-Expedientes;
* autenticação corporativa já existente no servidor;
* publicação em um caminho como `/estrategia`;
* restrições de instalação e configuração do servidor.

O projeto Estrategia continuará organizado em camadas, mas receberá mecanismos de compatibilidade para funcionar mesmo quando o servidor não possuir todas as configurações originalmente previstas.

---

