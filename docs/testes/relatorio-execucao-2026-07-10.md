# Relatório de execução — 10/07/2026

## Resultado local

- PHP 8.3.31: lint de todos os PHP aprovado.
- 9 testes PHP aprovados, incluindo módulos, contratos, autorização e segurança de publicação.
- 12 testes JavaScript aprovados, incluindo cálculos, persistência, escopo, interface e SQLite.
- Migrador Python compilado sem erro.
- O executor `scripts/testar-projeto.ps1` terminou com sucesso em 15,2 segundos.

## Migração

O relatório existente confirma contagens e IDs entre SQLite e SQL Server, mas permanece como evidência histórica com status `alertas`: três escalares JSON de `configuracoes.valor_json` não foram reconhecidos pelo `ISJSON`. O migrador `2026.07-php-views` corrige essa interpretação; a reconciliação precisa ser repetida no SQL Server antes do aceite.

## Limites desta evidência

O computador de desenvolvimento não possui o runtime PHP 7.1.19 nem comprovação de IIS/FastCGI e SQL Server-alvo. Portanto, compatibilidade real, integração, carga, concorrência, navegadores corporativos, restauração/rollback e smoke pós-publicação continuam pendentes de homologação. O preflight local falha corretamente pela versão PHP diferente e ausência de `pdo_sqlsrv`.

Conclusão: regressão local aprovada; entrada em produção ainda não autorizada.
