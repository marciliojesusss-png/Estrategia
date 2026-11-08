SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'Estrategia'
    THROW 54101, 'Migration permitida somente no banco Estrategia.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @antes NVARCHAR(MAX);
    DECLARE @depois NVARCHAR(MAX);
    DECLARE @indice INT = 0;
    DECLARE @quantidade INT;
    DECLARE @sql NVARCHAR(MAX);
    DECLARE @agora NVARCHAR(40) = CONVERT(NVARCHAR(40), SYSDATETIMEOFFSET(), 127);

    SELECT @antes = valor_json
    FROM dbo.configuracoes WITH (UPDLOCK, HOLDLOCK)
    WHERE chave = N'regrasIndicadores';

    IF @antes IS NULL OR ISJSON(@antes) <> 1
        THROW 54102, 'Configuracao regrasIndicadores ausente ou invalida.', 1;

    SET @depois = @antes;
    SELECT @quantidade = COUNT(*) FROM OPENJSON(@depois);

    WHILE @indice < @quantidade
    BEGIN
        SET @sql = N'SET @saida = JSON_MODIFY(@entrada, ''$['
            + CONVERT(NVARCHAR(10), @indice)
            + N'].exigeEvidencia'', CAST(0 AS BIT));';
        EXEC sys.sp_executesql @sql,
            N'@entrada NVARCHAR(MAX), @saida NVARCHAR(MAX) OUTPUT',
            @entrada = @depois, @saida = @depois OUTPUT;

        SET @sql = N'SET @saida = JSON_MODIFY(@entrada, ''$['
            + CONVERT(NVARCHAR(10), @indice)
            + N'].exigeEvidenciaNosFechamentos'', CAST(0 AS BIT));';
        EXEC sys.sp_executesql @sql,
            N'@entrada NVARCHAR(MAX), @saida NVARCHAR(MAX) OUTPUT',
            @entrada = @depois, @saida = @depois OUTPUT;
        SET @indice = @indice + 1;
    END;

    IF @depois <> @antes
    BEGIN
        UPDATE dbo.configuracoes
        SET valor_json = @depois, updated_at = @agora
        WHERE chave = N'regrasIndicadores';

        INSERT INTO dbo.auditoria (
            id, entidade, entidade_id, acao, descricao,
            dados_anteriores_json, dados_novos_json,
            usuario, perfil_usuario, data_acao, created_at
        ) VALUES (
            CONVERT(NVARCHAR(100), NEWID()), N'configuracoes', N'regrasIndicadores',
            N'evidencias_indicadores_opcionais',
            N'Remocao da obrigatoriedade de anexo no envio, reenvio e homologacao de indicadores.',
            @antes, @depois, N'MIGRACAO-20261108', N'Sistema', @agora, @agora
        );
    END;

    IF EXISTS (
        SELECT 1
        FROM OPENJSON(@depois) regra
        WHERE JSON_VALUE(regra.value, '$.exigeEvidencia') <> N'false'
           OR JSON_VALUE(regra.value, '$.exigeEvidenciaNosFechamentos') <> N'false'
    )
        THROW 54103, 'Validacao falhou: ainda existe regra com evidencia obrigatoria.', 1;

    COMMIT TRANSACTION;

    SELECT
        @quantidade AS regras_atualizadas,
        CAST(0 AS BIT) AS evidencia_obrigatoria,
        N'Anexos permanecem opcionais e auditaveis.' AS politica;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
