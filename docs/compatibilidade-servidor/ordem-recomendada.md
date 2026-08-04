# ORDEM RECOMENDADA DE EXECUÇÃO

A sequência obrigatória será:

```text
Fase 0 — proteção e backups
Fase 1 — configuração local
Fase 2 — banco
Fase 7 — diagnóstico
Fase 5 — permissões
Fase 3 — autenticação
Fase 4 — IIS e rotas
Fase 6 — schema e usuários
Fase 8 — homologação
Fase 9 — publicação
```

O projeto não deverá avançar para autenticação e telas enquanto o teste de banco não estiver funcionando. Da mesma forma, não deverá ser publicado enquanto o preflight apresentar falhas.

