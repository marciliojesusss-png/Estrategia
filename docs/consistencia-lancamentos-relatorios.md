# Consistência entre Lançamentos e Relatórios

## Objetivo

O sistema passou a conferir no backend os valores derivados antes do envio e da
homologação. A medida evita que um valor recalculado na tela de Lançamentos seja
homologado com meta, resultado, atingimento ou situação diferentes dos que serão
consumidos pelos Relatórios.

## Fluxo de proteção

1. Ao salvar, os indicadores cobertos são recalculados pelo backend.
2. Ao enviar para homologação, os valores persistidos são novamente conferidos.
3. Na tela de Homologação, a aprovação fica desabilitada enquanto a conferência
   não terminar ou quando houver divergência.
4. No ato da homologação, a conferência é repetida dentro da mesma transação.
5. O resultado aprovado é gravado em
   `dbo.lancamentos_resultados_homologados`, identificado pelo lançamento e pela
   versão.
6. Os Relatórios detalhado e consolidado usam esse snapshot imutável da versão
   homologada.

Os indicadores sem calculador PHP equivalente continuam usando o comportamento
legado e não recebem snapshot até que sua regra seja portada e testada. Isso
evita substituir uma apresentação documental oficial por uma projeção incompleta.

## Precisão numérica

As colunas legadas de `dbo.lancamentos` são textuais. Por isso, o repositório
serializa números em formato decimal comum, sem notação científica. Valores
financeiros grandes são persistidos com centavos; o snapshot usa
`DECIMAL(38,12)`.

## Auditoria operacional

Auditoria somente leitura:

```powershell
php scripts\auditar-consistencia-lancamentos.php --summary
```

Simulação de regularização:

```powershell
php scripts\regularizar-consistencia-lancamentos.php --scope=preventive --dry-run
php scripts\regularizar-consistencia-lancamentos.php --scope=historical --indicators=7,17 --dry-run
```

Nunca execute `--apply` sem backup verificado, revisão do dry-run e validação da
quantidade de alvos. As operações gravam auditoria e preservam status e campos de
entrada.

## Publicação

A migration
`database/sqlserver/migrations/20261108_001_snapshot_resultados_homologados.sql`
deve ser aplicada antes de publicar o código que consulta snapshots.
