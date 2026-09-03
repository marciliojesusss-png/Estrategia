SET NOCOUNT ON;
SET XACT_ABORT ON;

/*
  Indicador 7 — Lucro Líquido Recorrente
  Reparametrização institucional de 2026: acompanhamento oficial mensal.

  - Não cria estrutura e não insere lançamentos.
  - Preserva lucroLiquidoRecorrenteAcumulado no JSON.
  - Não altera status, evidências, homologações, observações, usuários ou datas históricas.
  - Registros com lacuna na sequência são apenas reportados como não migráveis.
  - A execução repetida produz os mesmos valores (idempotente).
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
    @indicador_id = MAX(i.id),
    @quantidade = COUNT(*)
FROM dbo.indicadores AS i
WHERE i.numero = 7
  AND i.nome = N'Lucro Líquido Recorrente';

IF @quantidade <> 1 OR @indicador_id IS NULL
    THROW 50004, 'O indicador 7 nao foi localizado de forma univoca.', 1;

DECLARE @metas TABLE (
    mes INT NOT NULL PRIMARY KEY,
    competencia NVARCHAR(7) NOT NULL,
    meta_mensal DECIMAL(19,2) NOT NULL
);

INSERT INTO @metas (mes, competencia, meta_mensal)
VALUES
    (1,  N'2026-01',  90811101.33),
    (2,  N'2026-02',  77462728.16),
    (3,  N'2026-03',  90084434.66),
    (4,  N'2026-04',  96068372.33),
    (5,  N'2026-05',  94438480.16),
    (6,  N'2026-06', 106104677.05),
    (7,  N'2026-07',  98144245.44),
    (8,  N'2026-08',  94094264.37),
    (9,  N'2026-09', 128614993.92),
    (10, N'2026-10', 101071987.08),
    (11, N'2026-11',  91522592.68),
    (12, N'2026-12', 236900370.02);

IF (SELECT SUM(meta_mensal) FROM @metas) <> CAST(1305318247.20 AS DECIMAL(19,2))
    THROW 50005, 'A curva mensal nao fecha na meta anual aprovada.', 1;

/* Validação prévia: mostra somente as competências realmente existentes. */
SELECT
    l.id,
    l.competencia,
    l.status,
    JSON_VALUE(l.dados_entrada_json, '$.lucroLiquidoRecorrenteAcumulado') AS acumulado_legado,
    JSON_VALUE(l.dados_entrada_json, '$.lucroLiquidoRecorrenteCompetencia') AS resultado_mensal_atual,
    l.meta_referencia,
    l.resultado_calculado,
    l.resultado_oficial,
    l.percentual_atingido,
    l.situacao
FROM dbo.lancamentos AS l
WHERE l.indicador_id = @indicador_id
  AND l.ano = 2026
ORDER BY l.mes;

BEGIN TRANSACTION;

UPDATE dbo.indicadores
SET periodicidade = N'Mensal',
    tipo_calculo = N'lucro_recorrente_mensal',
    tipo_consolidacao = N'ultima_posicao_mensal_homologada',
    meta_anual = N'R$ 1.305.318.247,20',
    formula_referencia = N'Lucro líquido recorrente da competência / Meta da competência'
WHERE id = @indicador_id
  AND (
      ISNULL(periodicidade, N'') <> N'Mensal'
      OR ISNULL(tipo_calculo, N'') <> N'lucro_recorrente_mensal'
      OR ISNULL(tipo_consolidacao, N'') <> N'ultima_posicao_mensal_homologada'
      OR ISNULL(meta_anual, N'') <> N'R$ 1.305.318.247,20'
      OR ISNULL(formula_referencia, N'') <> N'Lucro líquido recorrente da competência / Meta da competência'
  );

/* A meta_referencia passa a representar exclusivamente a meta mensal. */
UPDATE l
SET l.meta_referencia = CONVERT(NVARCHAR(50), m.meta_mensal)
FROM dbo.lancamentos AS l
INNER JOIN @metas AS m
    ON m.mes = l.mes
   AND m.competencia = l.competencia
WHERE l.indicador_id = @indicador_id
  AND l.ano = 2026
  AND ISNULL(TRY_CONVERT(DECIMAL(19,2), l.meta_referencia), -1) <> m.meta_mensal;

;WITH origem AS (
    SELECT
        l.id,
        l.mes,
        l.dados_entrada_json,
        TRY_CONVERT(DECIMAL(19,2), JSON_VALUE(l.dados_entrada_json, '$.lucroLiquidoRecorrenteCompetencia')) AS mensal_existente,
        TRY_CONVERT(DECIMAL(19,2), JSON_VALUE(l.dados_entrada_json, '$.lucroLiquidoRecorrenteAcumulado')) AS acumulado_atual,
        TRY_CONVERT(DECIMAL(19,2), JSON_VALUE(anterior.dados_entrada_json, '$.lucroLiquidoRecorrenteAcumulado')) AS acumulado_anterior
    FROM dbo.lancamentos AS l
    LEFT JOIN dbo.lancamentos AS anterior
      ON anterior.indicador_id = l.indicador_id
     AND anterior.ano = l.ano
     AND anterior.mes = l.mes - 1
     AND anterior.competencia = CONCAT(l.ano, N'-', RIGHT(N'0' + CONVERT(NVARCHAR(2), l.mes - 1), 2))
    WHERE l.indicador_id = @indicador_id
      AND l.ano = 2026
      AND ISJSON(l.dados_entrada_json) = 1
), conversao AS (
    SELECT
        o.id,
        o.dados_entrada_json,
        COALESCE(
            o.mensal_existente,
            CASE
                WHEN o.mes = 1 AND o.acumulado_atual IS NOT NULL THEN o.acumulado_atual
                WHEN o.mes > 1 AND o.acumulado_atual IS NOT NULL AND o.acumulado_anterior IS NOT NULL
                    THEN o.acumulado_atual - o.acumulado_anterior
                ELSE NULL
            END
        ) AS resultado_mensal
    FROM origem AS o
), valores AS (
    SELECT
        c.id,
        c.dados_entrada_json,
        c.resultado_mensal,
        m.meta_mensal,
        CAST(c.resultado_mensal / m.meta_mensal AS DECIMAL(19,12)) AS percentual_mensal,
        CASE WHEN c.resultado_mensal >= m.meta_mensal THEN N'Atingido' ELSE N'Abaixo da meta' END AS situacao_mensal
    FROM conversao AS c
    INNER JOIN dbo.lancamentos AS l ON l.id = c.id
    INNER JOIN @metas AS m ON m.mes = l.mes AND m.competencia = l.competencia
    WHERE c.resultado_mensal IS NOT NULL
      AND c.resultado_mensal >= 0
)
UPDATE l
SET l.dados_entrada_json = JSON_MODIFY(
        v.dados_entrada_json,
        '$.lucroLiquidoRecorrenteCompetencia',
        v.resultado_mensal
    ),
    l.resultado_calculado = CONVERT(NVARCHAR(50), v.resultado_mensal),
    l.resultado_oficial = CONVERT(NVARCHAR(50), v.resultado_mensal),
    l.meta_referencia = CONVERT(NVARCHAR(50), v.meta_mensal),
    l.percentual_atingido = CONVERT(NVARCHAR(100), v.percentual_mensal),
    l.situacao = v.situacao_mensal
FROM dbo.lancamentos AS l
INNER JOIN valores AS v ON v.id = l.id
WHERE l.indicador_id = @indicador_id
  AND l.ano = 2026
  AND (
      TRY_CONVERT(DECIMAL(19,2), JSON_VALUE(l.dados_entrada_json, '$.lucroLiquidoRecorrenteCompetencia')) <> v.resultado_mensal
      OR JSON_VALUE(l.dados_entrada_json, '$.lucroLiquidoRecorrenteCompetencia') IS NULL
      OR ISNULL(TRY_CONVERT(DECIMAL(19,2), l.resultado_calculado), -1) <> v.resultado_mensal
      OR ISNULL(TRY_CONVERT(DECIMAL(19,2), l.resultado_oficial), -1) <> v.resultado_mensal
      OR ISNULL(TRY_CONVERT(DECIMAL(19,2), l.meta_referencia), -1) <> v.meta_mensal
      OR ISNULL(TRY_CONVERT(DECIMAL(19,12), l.percentual_atingido), -1) <> v.percentual_mensal
      OR ISNULL(l.situacao, N'') <> v.situacao_mensal
  );

COMMIT TRANSACTION;

/* Registros legados que não puderam ser convertidos sem atravessar lacuna. */
SELECT
    l.id,
    l.competencia,
    N'Competência anterior ausente ou sem acumulado legado; conversão automática não realizada.' AS motivo
FROM dbo.lancamentos AS l
LEFT JOIN dbo.lancamentos AS anterior
  ON anterior.indicador_id = l.indicador_id
 AND anterior.ano = l.ano
 AND anterior.mes = l.mes - 1
WHERE l.indicador_id = @indicador_id
  AND l.ano = 2026
  AND l.mes > 1
  AND TRY_CONVERT(DECIMAL(19,2), JSON_VALUE(l.dados_entrada_json, '$.lucroLiquidoRecorrenteAcumulado')) IS NOT NULL
  AND TRY_CONVERT(DECIMAL(19,2), JSON_VALUE(l.dados_entrada_json, '$.lucroLiquidoRecorrenteCompetencia')) IS NULL
  AND TRY_CONVERT(DECIMAL(19,2), JSON_VALUE(anterior.dados_entrada_json, '$.lucroLiquidoRecorrenteAcumulado')) IS NULL
ORDER BY l.mes;

/* Validação pós-execução. Nenhuma coluna de status é atualizada pela migration. */
SELECT
    l.id,
    l.competencia,
    l.status,
    JSON_VALUE(l.dados_entrada_json, '$.lucroLiquidoRecorrenteAcumulado') AS acumulado_legado_preservado,
    JSON_VALUE(l.dados_entrada_json, '$.lucroLiquidoRecorrenteCompetencia') AS resultado_mensal,
    l.meta_referencia,
    l.resultado_calculado,
    l.resultado_oficial,
    l.percentual_atingido,
    l.situacao
FROM dbo.lancamentos AS l
WHERE l.indicador_id = @indicador_id
  AND l.ano = 2026
ORDER BY l.mes;
