/*
  Curva mensal oficial do Lucro Líquido Recorrente — 2026.

  Escopo:
  - identifica o indicador por nome, unidade e diretoria;
  - torna lucro_recorrente_mensal o tipo canônico;
  - atualiza somente metas e meta_referencia das 12 competências;
  - preserva realizados, JSON de entrada, status e homologações;
  - mantém intacta a migration histórica de 2026-09-02.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @indicadores_alvo TABLE (id NVARCHAR(100) NOT NULL PRIMARY KEY);

    INSERT INTO @indicadores_alvo (id)
    SELECT i.id
    FROM dbo.indicadores AS i WITH (UPDLOCK, HOLDLOCK)
    WHERE i.nome = N'Lucro Líquido Recorrente'
      AND i.unidade_apuradora = N'SUCTF'
      AND i.diretoria_responsavel = N'DIFIR'
      AND i.ativo = 1;

    IF (SELECT COUNT(*) FROM @indicadores_alvo) <> 1
        THROW 51000, 'Indicador Lucro Líquido Recorrente/SUCTF/DIFIR ausente ou ambíguo.', 1;

    DECLARE @indicador_id NVARCHAR(100) = (SELECT id FROM @indicadores_alvo);
    DECLARE @curva TABLE (
        mes TINYINT NOT NULL PRIMARY KEY,
        meta_mensal DECIMAL(19,2) NOT NULL,
        meta_acumulada DECIMAL(19,2) NOT NULL
    );

    INSERT INTO @curva (mes, meta_mensal, meta_acumulada)
    VALUES
        (1,  CAST(89555555.56  AS DECIMAL(19,2)), CAST(89555555.56   AS DECIMAL(19,2))),
        (2,  CAST(89555555.55  AS DECIMAL(19,2)), CAST(179111111.11  AS DECIMAL(19,2))),
        (3,  CAST(89555555.56  AS DECIMAL(19,2)), CAST(268666666.67  AS DECIMAL(19,2))),
        (4,  CAST(89555555.55  AS DECIMAL(19,2)), CAST(358222222.22  AS DECIMAL(19,2))),
        (5,  CAST(89555555.56  AS DECIMAL(19,2)), CAST(447777777.78  AS DECIMAL(19,2))),
        (6,  CAST(89555555.55  AS DECIMAL(19,2)), CAST(537333333.33  AS DECIMAL(19,2))),
        (7,  CAST(89555555.56  AS DECIMAL(19,2)), CAST(626888888.89  AS DECIMAL(19,2))),
        (8,  CAST(89555555.55  AS DECIMAL(19,2)), CAST(716444444.44  AS DECIMAL(19,2))),
        (9,  CAST(89555555.56  AS DECIMAL(19,2)), CAST(806000000.00  AS DECIMAL(19,2))),
        (10, CAST(89555555.56  AS DECIMAL(19,2)), CAST(895555555.56  AS DECIMAL(19,2))),
        (11, CAST(89555555.55  AS DECIMAL(19,2)), CAST(985111111.11  AS DECIMAL(19,2))),
        (12, CAST(223888888.89 AS DECIMAL(19,2)), CAST(1209000000.00 AS DECIMAL(19,2)));

    IF (SELECT COUNT(*) FROM @curva) <> 12
       OR (SELECT SUM(meta_mensal) FROM @curva) <> CAST(1209000000.00 AS DECIMAL(19,2))
       OR (SELECT meta_acumulada FROM @curva WHERE mes = 3) <> CAST(268666666.67 AS DECIMAL(19,2))
       OR (SELECT meta_acumulada FROM @curva WHERE mes = 6) <> CAST(537333333.33 AS DECIMAL(19,2))
       OR (SELECT meta_acumulada FROM @curva WHERE mes = 9) <> CAST(806000000.00 AS DECIMAL(19,2))
       OR (SELECT meta_acumulada FROM @curva WHERE mes = 11) <> CAST(985111111.11 AS DECIMAL(19,2))
       OR (SELECT meta_acumulada FROM @curva WHERE mes = 12) <> CAST(1209000000.00 AS DECIMAL(19,2))
        THROW 51001, 'A curva oficial não fecha nos checkpoints definidos.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WHERE indicador_id = @indicador_id AND ano = 2026) <> 12
       OR EXISTS (
            SELECT mes
            FROM dbo.lancamentos
            WHERE indicador_id = @indicador_id AND ano = 2026
            GROUP BY mes
            HAVING COUNT(*) <> 1
       )
        THROW 51002, 'As 12 competências de 2026 não estão completas e únicas.', 1;

    SELECT
        l.id, l.indicador_id, l.competencia, l.ano, l.mes, l.trimestre,
        l.plano, l.pilar, l.unidade_apuradora, l.diretoria_responsavel,
        l.dados_entrada_json, l.resultado_calculado, l.resultado_oficial,
        l.percentual_atingido, l.situacao, l.status, l.observacao_unidade,
        l.referencia_evidencia, l.evidencia_id, l.usuario_responsavel,
        l.created_at, l.updated_at
    INTO #lancamentos_antes
    FROM dbo.lancamentos AS l
    WHERE l.indicador_id = @indicador_id AND l.ano = 2026;

    SELECT h.*
    INTO #homologacoes_antes
    FROM dbo.homologacoes AS h
    INNER JOIN dbo.lancamentos AS l ON l.id = h.lancamento_id
    WHERE l.indicador_id = @indicador_id AND l.ano = 2026;

    DECLARE @metas NVARCHAR(MAX);
    SELECT @metas = valor_json
    FROM dbo.configuracoes WITH (UPDLOCK, HOLDLOCK)
    WHERE chave = N'metas';

    IF @metas IS NULL OR ISJSON(@metas) <> 1
        THROW 51003, 'Configuração metas ausente ou inválida.', 1;

    IF (
        SELECT COUNT(*)
        FROM OPENJSON(@metas) AS j
        WHERE TRY_CONVERT(NVARCHAR(100), JSON_VALUE(j.value, '$.indicadorId')) = @indicador_id
          AND TRY_CONVERT(INT, JSON_VALUE(j.value, '$.ano')) = 2026
    ) <> 12
        THROW 51004, 'A configuração metas não contém exatamente 12 competências do indicador.', 1;

    DECLARE @metas_alteradas INT = (
        SELECT COUNT(*)
        FROM OPENJSON(@metas) AS j
        INNER JOIN @curva AS c
          ON c.mes = TRY_CONVERT(INT, JSON_VALUE(j.value, '$.mes'))
        WHERE TRY_CONVERT(NVARCHAR(100), JSON_VALUE(j.value, '$.indicadorId')) = @indicador_id
          AND TRY_CONVERT(INT, JSON_VALUE(j.value, '$.ano')) = 2026
          AND ISNULL(TRY_CONVERT(DECIMAL(19,2), JSON_VALUE(j.value, '$.metaMensal')), -1) <> c.meta_mensal
    );
    DECLARE @metas_novas NVARCHAR(MAX);

    SELECT @metas_novas = N'[' + STUFF((
        SELECT N',' + CASE
            WHEN c.mes IS NOT NULL
             AND TRY_CONVERT(NVARCHAR(100), JSON_VALUE(j.value, '$.indicadorId')) = @indicador_id
             AND TRY_CONVERT(INT, JSON_VALUE(j.value, '$.ano')) = 2026
            THEN JSON_MODIFY(
                JSON_MODIFY(j.value, '$.metaMensal', c.meta_mensal),
                '$.fonte',
                N'curva_oficial_lucro_liquido_recorrente_2026'
            )
            ELSE j.value
        END
        FROM OPENJSON(@metas) AS j
        LEFT JOIN @curva AS c
          ON c.mes = TRY_CONVERT(INT, JSON_VALUE(j.value, '$.mes'))
        ORDER BY TRY_CONVERT(INT, j.[key])
        FOR XML PATH(''), TYPE
    ).value('.', 'NVARCHAR(MAX)'), 1, 1, N'') + N']';

    SET @metas = @metas_novas;

    IF @metas_alteradas > 0
    BEGIN
        UPDATE dbo.configuracoes
        SET valor_json = @metas,
            updated_at = CONVERT(NVARCHAR(40), SYSDATETIMEOFFSET(), 127)
        WHERE chave = N'metas';
    END;

    DECLARE @regras NVARCHAR(MAX);
    SELECT @regras = valor_json
    FROM dbo.configuracoes WITH (UPDLOCK, HOLDLOCK)
    WHERE chave = N'regrasIndicadores';

    IF @regras IS NULL OR ISJSON(@regras) <> 1
        THROW 51006, 'Configuração regrasIndicadores ausente ou inválida.', 1;

    IF (
        SELECT COUNT(*)
        FROM OPENJSON(@regras) AS j
        WHERE TRY_CONVERT(NVARCHAR(100), JSON_VALUE(j.value, '$.indicadorId')) = @indicador_id
    ) <> 1
        THROW 51007, 'Regra do indicador ausente ou ambígua.', 1;

    DECLARE @regra_indice NVARCHAR(20) = (
        SELECT j.[key]
        FROM OPENJSON(@regras) AS j
        WHERE TRY_CONVERT(NVARCHAR(100), JSON_VALUE(j.value, '$.indicadorId')) = @indicador_id
    );
    DECLARE @curva_mensal_json NVARCHAR(MAX) = N'{
      "2026-01":89555555.56,"2026-02":89555555.55,"2026-03":89555555.56,
      "2026-04":89555555.55,"2026-05":89555555.56,"2026-06":89555555.55,
      "2026-07":89555555.56,"2026-08":89555555.55,"2026-09":89555555.56,
      "2026-10":89555555.56,"2026-11":89555555.55,"2026-12":223888888.89
    }';
    DECLARE @curva_acumulada_json NVARCHAR(MAX) = N'{
      "2026-01":89555555.56,"2026-02":179111111.11,"2026-03":268666666.67,
      "2026-04":358222222.22,"2026-05":447777777.78,"2026-06":537333333.33,
      "2026-07":626888888.89,"2026-08":716444444.44,"2026-09":806000000.00,
      "2026-10":895555555.56,"2026-11":985111111.11,"2026-12":1209000000.00
    }';
    DECLARE @regra_nova NVARCHAR(MAX) = (
        SELECT j.value FROM OPENJSON(@regras) AS j WHERE j.[key] = @regra_indice
    );

    SET @regra_nova = JSON_MODIFY(@regra_nova, '$.tipoCalculo', N'lucro_recorrente_mensal');
    SET @regra_nova = JSON_MODIFY(@regra_nova, '$.tipoConsolidacao', N'ultima_posicao_mensal_homologada');
    SET @regra_nova = JSON_MODIFY(@regra_nova, '$.metaAnualValor', CAST(1209000000.00 AS DECIMAL(19,2)));
    SET @regra_nova = JSON_MODIFY(@regra_nova, '$.parametrosCalculo.metaTipo', N'curva_mensal_por_competencia');
    SET @regra_nova = JSON_MODIFY(@regra_nova, '$.parametrosCalculo.metasMensaisPorCompetencia', JSON_QUERY(@curva_mensal_json));
    SET @regra_nova = JSON_MODIFY(@regra_nova, '$.parametrosCalculo.metasAcumuladasPorCompetencia', JSON_QUERY(@curva_acumulada_json));

    DECLARE @regras_novas NVARCHAR(MAX);
    SELECT @regras_novas = N'[' + STUFF((
        SELECT N',' + CASE WHEN j.[key] = @regra_indice THEN @regra_nova ELSE j.value END
        FROM OPENJSON(@regras) AS j
        ORDER BY TRY_CONVERT(INT, j.[key])
        FOR XML PATH(''), TYPE
    ).value('.', 'NVARCHAR(MAX)'), 1, 1, N'') + N']';

    DECLARE @regras_alteradas INT = CASE WHEN @regras_novas <> @regras THEN 1 ELSE 0 END;
    IF @regras_alteradas = 1
    BEGIN
        UPDATE dbo.configuracoes
        SET valor_json = @regras_novas,
            updated_at = CONVERT(NVARCHAR(40), SYSDATETIMEOFFSET(), 127)
        WHERE chave = N'regrasIndicadores';
    END;

    DECLARE @indicadores_alterados INT = 0;
    UPDATE dbo.indicadores
    SET tipo_calculo = N'lucro_recorrente_mensal'
    WHERE id = @indicador_id
      AND ISNULL(tipo_calculo, N'') <> N'lucro_recorrente_mensal';
    SET @indicadores_alterados = @@ROWCOUNT;

    DECLARE @lancamentos_alterados INT = 0;
    UPDATE l
    SET l.meta_referencia = CONVERT(NVARCHAR(50), c.meta_mensal)
    FROM dbo.lancamentos AS l
    INNER JOIN @curva AS c ON c.mes = l.mes
    WHERE l.indicador_id = @indicador_id
      AND l.ano = 2026
      AND ISNULL(TRY_CONVERT(DECIMAL(19,2), l.meta_referencia), -1) <> c.meta_mensal;
    SET @lancamentos_alterados = @@ROWCOUNT;

    IF EXISTS (
        SELECT 1
        FROM @curva AS c
        LEFT JOIN dbo.lancamentos AS l
          ON l.indicador_id = @indicador_id AND l.ano = 2026 AND l.mes = c.mes
        WHERE l.id IS NULL OR TRY_CONVERT(DECIMAL(19,2), l.meta_referencia) <> c.meta_mensal
    )
        THROW 51008, 'meta_referencia não corresponde à curva oficial.', 1;

    DECLARE @metas_validadas NVARCHAR(MAX) = (
        SELECT valor_json FROM dbo.configuracoes WHERE chave = N'metas'
    );
    IF (
        SELECT COUNT(*)
        FROM OPENJSON(@metas_validadas) AS j
        WHERE TRY_CONVERT(NVARCHAR(100), JSON_VALUE(j.value, '$.indicadorId')) = @indicador_id
          AND TRY_CONVERT(INT, JSON_VALUE(j.value, '$.ano')) = 2026
          AND TRY_CONVERT(DECIMAL(19,2), JSON_VALUE(j.value, '$.metaMensal')) IS NOT NULL
    ) <> 12
       OR (
        SELECT SUM(TRY_CONVERT(DECIMAL(19,2), JSON_VALUE(j.value, '$.metaMensal')))
        FROM OPENJSON(@metas_validadas) AS j
        WHERE TRY_CONVERT(NVARCHAR(100), JSON_VALUE(j.value, '$.indicadorId')) = @indicador_id
          AND TRY_CONVERT(INT, JSON_VALUE(j.value, '$.ano')) = 2026
       ) <> CAST(1209000000.00 AS DECIMAL(19,2))
        THROW 51009, 'Validação posterior das metas falhou.', 1;

    IF EXISTS (
        SELECT 1
        FROM #lancamentos_antes AS a
        INNER JOIN dbo.lancamentos AS l ON l.id = a.id
        WHERE ISNULL(l.indicador_id, N'') <> ISNULL(a.indicador_id, N'')
           OR ISNULL(l.competencia, N'') <> ISNULL(a.competencia, N'')
           OR ISNULL(l.ano, -1) <> ISNULL(a.ano, -1)
           OR ISNULL(l.mes, -1) <> ISNULL(a.mes, -1)
           OR ISNULL(l.trimestre, N'') <> ISNULL(a.trimestre, N'')
           OR ISNULL(l.plano, N'') <> ISNULL(a.plano, N'')
           OR ISNULL(l.pilar, N'') <> ISNULL(a.pilar, N'')
           OR ISNULL(l.unidade_apuradora, N'') <> ISNULL(a.unidade_apuradora, N'')
           OR ISNULL(l.diretoria_responsavel, N'') <> ISNULL(a.diretoria_responsavel, N'')
           OR ISNULL(l.dados_entrada_json, N'') <> ISNULL(a.dados_entrada_json, N'')
           OR ISNULL(l.resultado_calculado, N'') <> ISNULL(a.resultado_calculado, N'')
           OR ISNULL(l.resultado_oficial, N'') <> ISNULL(a.resultado_oficial, N'')
           OR ISNULL(l.percentual_atingido, N'') <> ISNULL(a.percentual_atingido, N'')
           OR ISNULL(l.situacao, N'') <> ISNULL(a.situacao, N'')
           OR ISNULL(l.status, N'') <> ISNULL(a.status, N'')
           OR ISNULL(l.observacao_unidade, N'') <> ISNULL(a.observacao_unidade, N'')
           OR ISNULL(l.referencia_evidencia, N'') <> ISNULL(a.referencia_evidencia, N'')
           OR ISNULL(l.evidencia_id, N'') <> ISNULL(a.evidencia_id, N'')
           OR ISNULL(l.usuario_responsavel, N'') <> ISNULL(a.usuario_responsavel, N'')
           OR ISNULL(l.created_at, N'') <> ISNULL(a.created_at, N'')
           OR ISNULL(l.updated_at, N'') <> ISNULL(a.updated_at, N'')
    )
        THROW 51010, 'Uma coluna protegida de lançamento foi alterada.', 1;

    IF (SELECT COUNT(*) FROM #homologacoes_antes) <> (
        SELECT COUNT(*)
        FROM dbo.homologacoes AS h
        INNER JOIN dbo.lancamentos AS l ON l.id = h.lancamento_id
        WHERE l.indicador_id = @indicador_id AND l.ano = 2026
    )
        THROW 51011, 'A quantidade de homologações foi alterada.', 1;

    COMMIT TRANSACTION;

    SELECT
        N'COMMIT' AS transacao,
        @indicador_id AS indicador_id,
        @metas_alteradas AS metas_json_alteradas,
        @lancamentos_alterados AS lancamentos_alterados,
        @indicadores_alterados AS indicadores_alterados,
        @regras_alteradas AS regras_json_alteradas,
        @metas_alteradas + @lancamentos_alterados + @indicadores_alterados + @regras_alteradas AS alteracoes_logicas;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
