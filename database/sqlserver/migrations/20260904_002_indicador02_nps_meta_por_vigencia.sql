SET NOCOUNT ON;
SET XACT_ABORT ON;

/*
  Indicador 2 — Índice de Satisfação de Clientes (NPS)
  Meta aprovada: 60 pontos, vigente a partir do 3TRI/2026.

  Esta migration:
  - preserva integralmente Jan-Mar/2026 e apenas os exibe para diagnóstico;
  - mantém Abr-Jun/2026 na referência histórica 58;
  - aplica 60 a Jul-Dez/2026 somente em posições seguras;
  - preserva status, homologações, evidências, usuários e datas;
  - não insere resultado de pesquisa e não altera estrutura do banco;
  - é idempotente e NÃO deve ser executada automaticamente pela aplicação.
*/

IF DB_NAME() <> N'Estrategia'
    THROW 50001, 'Execute esta migration somente no banco Estrategia.', 1;

IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL
    THROW 50002, 'A tabela dbo.indicadores nao existe.', 1;

IF OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
    THROW 50003, 'A tabela dbo.lancamentos nao existe.', 1;

IF OBJECT_ID(N'dbo.configuracoes', N'U') IS NULL
    THROW 50004, 'A tabela dbo.configuracoes nao existe.', 1;

DECLARE @indicador_id NVARCHAR(100);
DECLARE @quantidade INT;

SELECT
    @indicador_id = MAX(CONVERT(NVARCHAR(100), i.id)),
    @quantidade = COUNT(*)
FROM dbo.indicadores AS i
WHERE i.numero = 2;

IF @quantidade <> 1 OR @indicador_id IS NULL
    THROW 50005, 'O indicador 2 nao foi localizado de forma univoca.', 1;

DECLARE @referencias TABLE (
    mes INT NOT NULL PRIMARY KEY,
    competencia NVARCHAR(7) NOT NULL UNIQUE,
    meta DECIMAL(10,4) NOT NULL
);

INSERT INTO @referencias (mes, competencia, meta)
VALUES
    (1, N'2026-01', 55), (2, N'2026-02', 55), (3, N'2026-03', 55),
    (4, N'2026-04', 58), (5, N'2026-05', 58), (6, N'2026-06', 58),
    (7, N'2026-07', 60), (8, N'2026-08', 60), (9, N'2026-09', 60),
    (10, N'2026-10', 60), (11, N'2026-11', 60), (12, N'2026-12', 60);

DECLARE @regras NVARCHAR(MAX);
DECLARE @regra_indice INT;
DECLARE @regra_path NVARCHAR(100);
DECLARE @campo_meta_indice INT;

SELECT @regras = valor_json
FROM dbo.configuracoes
WHERE chave = N'regrasIndicadores';

IF ISJSON(@regras) <> 1
    THROW 50006, 'A configuracao regrasIndicadores nao contem JSON valido.', 1;

SELECT TOP (1) @regra_indice = TRY_CONVERT(INT, [key])
FROM OPENJSON(@regras)
WHERE TRY_CONVERT(INT, JSON_VALUE([value], '$.indicadorId')) = 2;

IF @regra_indice IS NULL
    THROW 50007, 'A regra do indicador 2 nao foi localizada em regrasIndicadores.', 1;

SET @regra_path = N'$[' + CONVERT(NVARCHAR(10), @regra_indice) + N']';

SELECT TOP (1) @campo_meta_indice = TRY_CONVERT(INT, [key])
FROM OPENJSON(@regras, @regra_path + N'.camposEntrada')
WHERE JSON_VALUE([value], '$.nome') = N'metaReferenciaCompetenciaNPS';

/* Diagnóstico anterior. Jan-Mar são deliberadamente somente leitura. */
SELECT
    i.id,
    i.numero,
    i.nome,
    i.meta_anual,
    i.formula_referencia,
    i.periodicidade,
    i.tipo_calculo,
    i.tipo_consolidacao
FROM dbo.indicadores AS i
WHERE i.id = @indicador_id;

SELECT
    l.id,
    l.competencia,
    l.meta_referencia,
    l.resultado_calculado,
    l.resultado_oficial,
    l.percentual_atingido,
    l.situacao,
    l.status,
    l.dados_entrada_json,
    CASE
        WHEN l.competencia BETWEEN N'2026-01' AND N'2026-03'
         AND ISNULL(TRY_CONVERT(DECIMAL(10,4), l.meta_referencia), -1) <> 55
        THEN N'DIVERGENCIA HISTORICA — revisar manualmente; esta migration nao altera o 1TRI'
        ELSE N'OK/fora da validacao historica'
    END AS diagnostico_1tri
FROM dbo.lancamentos AS l
WHERE CONVERT(NVARCHAR(100), l.indicador_id) = @indicador_id
  AND l.ano = 2026
ORDER BY l.mes;

BEGIN TRANSACTION;

/* A coluna é descritiva; o valor numérico vigente fica na configuração. */
UPDATE dbo.indicadores
SET meta_anual = N'Meta vigente: NPS 60 pontos a partir do 3TRI/2026.',
    formula_referencia = N'NPS = % promotores - % detratores. Historico 2026: 1TRI referencia 55; 2TRI referencia 58; a partir do 3TRI meta absoluta 60.'
WHERE id = @indicador_id
  AND (
      ISNULL(meta_anual, N'') <> N'Meta vigente: NPS 60 pontos a partir do 3TRI/2026.'
      OR ISNULL(formula_referencia, N'') <> N'NPS = % promotores - % detratores. Historico 2026: 1TRI referencia 55; 2TRI referencia 58; a partir do 3TRI meta absoluta 60.'
  );

/* Atualiza somente propriedades da regra 2 e preserva as demais regras. */
SET @regras = JSON_MODIFY(@regras, @regra_path + N'.metaAnualValor', CAST(60 AS INT));
SET @regras = JSON_MODIFY(@regras, @regra_path + N'.parametrosCalculo.metaTipo', N'meta_absoluta_por_competencia');
SET @regras = JSON_MODIFY(@regras, @regra_path + N'.parametrosCalculo.baselineNPS', CAST(55 AS INT));
SET @regras = JSON_MODIFY(@regras, @regra_path + N'.parametrosCalculo.notaReferenciaNPS', CAST(70 AS INT));
SET @regras = JSON_MODIFY(@regras, @regra_path + N'.parametrosCalculo.percentualReducaoGap', CAST(0.20 AS DECIMAL(10,4)));
SET @regras = JSON_MODIFY(@regras, @regra_path + N'.parametrosCalculo.metaAnualMetodologica', CAST(60 AS INT));
SET @regras = JSON_MODIFY(@regras, @regra_path + N'.parametrosCalculo.metaVigenteNPS2026', CAST(60 AS INT));
SET @regras = JSON_MODIFY(
    @regras,
    @regra_path + N'.parametrosCalculo.referenciasPorCompetencia',
    JSON_QUERY(N'{
      "2026-01":55,"2026-02":55,"2026-03":55,
      "2026-04":58,"2026-05":58,"2026-06":58,
      "2026-07":60,"2026-08":60,"2026-09":60,
      "2026-10":60,"2026-11":60,"2026-12":60
    }')
);

IF @campo_meta_indice IS NOT NULL
BEGIN
    SET @regras = JSON_MODIFY(
        @regras,
        @regra_path + N'.camposEntrada[' + CONVERT(NVARCHAR(10), @campo_meta_indice) + N'].somenteLeitura',
        CAST(1 AS BIT)
    );
END;

UPDATE dbo.configuracoes
SET valor_json = @regras,
    updated_at = CONVERT(NVARCHAR(50), SYSDATETIMEOFFSET(), 127)
WHERE chave = N'regrasIndicadores'
  AND valor_json <> @regras;

/*
  Registros pré-criados sem apuração: Abr-Jun = 58; Jul-Dez = 60.
  Jan-Mar não participam deste UPDATE.
*/
UPDATE l
SET l.meta_referencia = CONVERT(NVARCHAR(50), r.meta),
    l.dados_entrada_json = JSON_MODIFY(
        CASE WHEN ISJSON(l.dados_entrada_json) = 1 THEN l.dados_entrada_json ELSE N'{}' END,
        '$.metaReferenciaCompetenciaNPS',
        r.meta
    )
FROM dbo.lancamentos AS l
INNER JOIN @referencias AS r
    ON r.competencia = l.competencia
   AND r.mes = l.mes
WHERE CONVERT(NVARCHAR(100), l.indicador_id) = @indicador_id
  AND l.ano = 2026
  AND l.mes BETWEEN 4 AND 12
  AND l.status = N'Não iniciado'
  AND l.resultado_calculado IS NULL
  AND l.resultado_oficial IS NULL
  AND (
      ISNULL(TRY_CONVERT(DECIMAL(10,4), l.meta_referencia), -1) <> r.meta
      OR ISJSON(l.dados_entrada_json) <> 1
      OR ISNULL(TRY_CONVERT(DECIMAL(10,4), JSON_VALUE(l.dados_entrada_json, '$.metaReferenciaCompetenciaNPS')), -1) <> r.meta
  );

/* Acompanhamentos existentes: altera somente a meta contextual, sem apagar o JSON. */
UPDATE l
SET l.meta_referencia = N'60',
    l.dados_entrada_json = JSON_MODIFY(l.dados_entrada_json, '$.metaReferenciaCompetenciaNPS', CAST(60 AS INT))
FROM dbo.lancamentos AS l
WHERE CONVERT(NVARCHAR(100), l.indicador_id) = @indicador_id
  AND l.ano = 2026
  AND l.mes BETWEEN 7 AND 12
  AND l.resultado_calculado IS NULL
  AND l.resultado_oficial IS NULL
  AND ISJSON(l.dados_entrada_json) = 1
  AND (
      JSON_VALUE(CASE WHEN ISJSON(l.dados_entrada_json) = 1 THEN l.dados_entrada_json ELSE N'{}' END, '$.tipoPosicaoNPS') LIKE N'Acompanhamento%'
      OR JSON_VALUE(CASE WHEN ISJSON(l.dados_entrada_json) = 1 THEN l.dados_entrada_json ELSE N'{}' END, '$.tipoPosicaoNPS') = N'Revisão metodológica'
  )
  AND (
      ISNULL(TRY_CONVERT(DECIMAL(10,4), l.meta_referencia), -1) <> 60
      OR ISNULL(TRY_CONVERT(DECIMAL(10,4), JSON_VALUE(l.dados_entrada_json, '$.metaReferenciaCompetenciaNPS')), -1) <> 60
  );

/*
  Caso junho já contenha exatamente o resultado oficial 59,2, preserva o
  fechamento histórico contra 58. Nenhum resultado é criado por esta regra.
*/
UPDATE l
SET l.meta_referencia = N'58',
    l.percentual_atingido = CONVERT(NVARCHAR(100), CAST(59.2 / 58.0 AS DECIMAL(19,12))),
    l.situacao = N'Atingido',
    l.dados_entrada_json = CASE
        WHEN ISJSON(l.dados_entrada_json) = 1
        THEN JSON_MODIFY(l.dados_entrada_json, '$.metaReferenciaCompetenciaNPS', CAST(58 AS INT))
        ELSE l.dados_entrada_json
    END
FROM dbo.lancamentos AS l
WHERE CONVERT(NVARCHAR(100), l.indicador_id) = @indicador_id
  AND l.ano = 2026
  AND l.mes = 6
  AND COALESCE(
      TRY_CONVERT(DECIMAL(10,4), l.resultado_oficial),
      TRY_CONVERT(DECIMAL(10,4), l.resultado_calculado),
      TRY_CONVERT(DECIMAL(10,4), JSON_VALUE(CASE WHEN ISJSON(l.dados_entrada_json) = 1 THEN l.dados_entrada_json ELSE N'{}' END, '$.npsApurado'))
  ) = CAST(59.2 AS DECIMAL(10,4))
  AND (
      ISNULL(TRY_CONVERT(DECIMAL(10,4), l.meta_referencia), -1) <> 58
      OR ISNULL(TRY_CONVERT(DECIMAL(19,12), l.percentual_atingido), -1) <> CAST(59.2 / 58.0 AS DECIMAL(19,12))
      OR ISNULL(l.situacao, N'') <> N'Atingido'
      OR (ISJSON(l.dados_entrada_json) = 1 AND ISNULL(TRY_CONVERT(DECIMAL(10,4), JSON_VALUE(l.dados_entrada_json, '$.metaReferenciaCompetenciaNPS')), -1) <> 58)
  );

COMMIT TRANSACTION;

/* Validação posterior. A consulta evidencia novamente qualquer divergência do 1TRI. */
SELECT
    l.id,
    l.competencia,
    l.meta_referencia,
    l.resultado_calculado,
    l.resultado_oficial,
    l.percentual_atingido,
    l.situacao,
    l.status,
    l.dados_entrada_json,
    CASE
        WHEN l.competencia BETWEEN N'2026-01' AND N'2026-03'
         AND ISNULL(TRY_CONVERT(DECIMAL(10,4), l.meta_referencia), -1) <> 55
        THEN N'DIVERGENCIA HISTORICA NAO ALTERADA'
        WHEN ISNULL(TRY_CONVERT(DECIMAL(10,4), l.meta_referencia), -1) <> r.meta
        THEN N'META DIVERGENTE DA VIGENCIA'
        ELSE N'OK'
    END AS validacao
FROM dbo.lancamentos AS l
INNER JOIN @referencias AS r
    ON r.competencia = l.competencia
WHERE CONVERT(NVARCHAR(100), l.indicador_id) = @indicador_id
  AND l.ano = 2026
ORDER BY l.mes;
