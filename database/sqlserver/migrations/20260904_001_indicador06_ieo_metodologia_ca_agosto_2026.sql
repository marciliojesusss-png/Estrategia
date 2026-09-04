SET NOCOUNT ON;
SET XACT_ABORT ON;

/*
  Indicador 6 — IEO Recorrente
  Nova metodologia aprovada pelo Conselho de Administração, vigente a
  partir de agosto/2026.

  Esta migration:
  - atualiza somente meta_referencia de Ago-Dez/2026 para 0.2664;
  - atua apenas em lançamentos "Não iniciado" e sem resultados;
  - não altera situação, status, dados_entrada_json ou updated_at;
  - não altera Jan-Jul/2026 nem qualquer outro indicador;
  - não cria ou altera estrutura do banco;
  - é idempotente e pode ser executada novamente sem mudar o estado final.
*/

IF DB_NAME() <> N'Estrategia'
    THROW 50001, 'Execute esta migration somente no banco Estrategia.', 1;

IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL
    THROW 50002, 'A tabela dbo.indicadores nao existe.', 1;

IF OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
    THROW 50003, 'A tabela dbo.lancamentos nao existe.', 1;

DECLARE @indicador_id NVARCHAR(100);
DECLARE @quantidade INT;

SELECT
    @indicador_id = MAX(CONVERT(NVARCHAR(100), i.id)),
    @quantidade = COUNT(*)
FROM dbo.indicadores AS i
WHERE i.numero = 6;

IF @quantidade <> 1 OR @indicador_id IS NULL
    THROW 50004, 'O indicador 6 nao foi localizado de forma univoca.', 1;

/* Validação anterior: Julho deve permanecer intacto; Ago-Dez são o alvo. */
SELECT
    l.indicador_id,
    l.competencia,
    l.meta_referencia,
    l.resultado_calculado,
    l.resultado_oficial,
    l.percentual_atingido,
    l.situacao,
    l.status,
    l.dados_entrada_json,
    l.updated_at
FROM dbo.lancamentos AS l
WHERE CONVERT(NVARCHAR(100), l.indicador_id) = @indicador_id
  AND l.competencia BETWEEN N'2026-07' AND N'2026-12'
ORDER BY l.competencia;

BEGIN TRANSACTION;

UPDATE l
SET l.meta_referencia = N'0.2664'
FROM dbo.lancamentos AS l
WHERE CONVERT(NVARCHAR(100), l.indicador_id) = @indicador_id
  AND l.competencia IN (N'2026-08', N'2026-09', N'2026-10', N'2026-11', N'2026-12')
  AND l.status = N'Não iniciado'
  AND l.resultado_calculado IS NULL
  AND l.resultado_oficial IS NULL
  AND ISNULL(TRY_CONVERT(DECIMAL(19,10), l.meta_referencia), -1) <> CAST(0.2664 AS DECIMAL(19,10));

COMMIT TRANSACTION;

/* Validação posterior: nenhuma coluna além de meta_referencia é atualizada. */
SELECT
    l.indicador_id,
    l.competencia,
    l.meta_referencia,
    l.resultado_calculado,
    l.resultado_oficial,
    l.percentual_atingido,
    l.situacao,
    l.status,
    l.dados_entrada_json,
    l.updated_at
FROM dbo.lancamentos AS l
WHERE CONVERT(NVARCHAR(100), l.indicador_id) = @indicador_id
  AND l.competencia BETWEEN N'2026-07' AND N'2026-12'
ORDER BY l.competencia;
