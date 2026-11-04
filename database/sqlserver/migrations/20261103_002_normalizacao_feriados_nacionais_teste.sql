SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @camposEsperados INT=90;
DECLARE @camposNormalizados INT=0;
DECLARE @lancamentosAntes INT;
DECLARE @homologacoesAntes INT;
DECLARE @auditoriaAntes INT;
DECLARE @lancamentosAlterados INT=0;
DECLARE @homologacoesAlteradas INT=0;
DECLARE @auditoriaAlterada INT=0;

IF DB_NAME()<>N'Estrategia'
    THROW 53201, 'Banco inesperado; nenhuma data foi alterada.', 1;

IF OBJECT_ID(N'dbo.lancamentos',N'U') IS NULL
   OR OBJECT_ID(N'dbo.homologacoes',N'U') IS NULL
   OR OBJECT_ID(N'dbo.auditoria',N'U') IS NULL
    THROW 53202, 'Estrutura obrigatoria ausente; nenhuma data foi alterada.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    SELECT @lancamentosAntes=COUNT(*) FROM dbo.lancamentos;
    SELECT @homologacoesAntes=COUNT(*) FROM dbo.homologacoes;
    SELECT @auditoriaAntes=COUNT(*) FROM dbo.auditoria;

    CREATE TABLE #FeriadosNacionais
    (
        data_feriado DATE NOT NULL PRIMARY KEY,
        descricao NVARCHAR(100) NOT NULL
    );

    INSERT INTO #FeriadosNacionais(data_feriado,descricao) VALUES
        ('2026-01-01',N'Confraternizacao Universal'),
        ('2026-04-03',N'Paixao de Cristo'),
        ('2026-04-21',N'Tiradentes'),
        ('2026-05-01',N'Dia Mundial do Trabalho'),
        ('2026-09-07',N'Independencia do Brasil'),
        ('2026-10-12',N'Nossa Senhora Aparecida'),
        ('2026-11-02',N'Finados'),
        ('2026-11-15',N'Proclamacao da Republica'),
        ('2026-11-20',N'Dia Nacional de Zumbi e da Consciencia Negra'),
        ('2026-12-25',N'Natal');

    CREATE TABLE #CamposTemporais
    (
        tabela NVARCHAR(40) NOT NULL,
        registro_id NVARCHAR(100) NOT NULL,
        campo NVARCHAR(40) NOT NULL,
        valor_anterior NVARCHAR(40) NOT NULL
    );

    INSERT INTO #CamposTemporais(tabela,registro_id,campo,valor_anterior)
    SELECT N'lancamentos',id,N'created_at',created_at
    FROM dbo.lancamentos WHERE NULLIF(LTRIM(RTRIM(created_at)),N'') IS NOT NULL
    UNION ALL
    SELECT N'lancamentos',id,N'updated_at',updated_at
    FROM dbo.lancamentos WHERE NULLIF(LTRIM(RTRIM(updated_at)),N'') IS NOT NULL
    UNION ALL
    SELECT N'homologacoes',id,N'data_acao',data_acao
    FROM dbo.homologacoes WHERE NULLIF(LTRIM(RTRIM(data_acao)),N'') IS NOT NULL
    UNION ALL
    SELECT N'homologacoes',id,N'created_at',created_at
    FROM dbo.homologacoes WHERE NULLIF(LTRIM(RTRIM(created_at)),N'') IS NOT NULL
    UNION ALL
    SELECT N'auditoria',id,N'data_acao',data_acao
    FROM dbo.auditoria
    WHERE LOWER(LTRIM(RTRIM(entidade))) IN (N'lancamentos',N'homologacoes')
      AND NULLIF(LTRIM(RTRIM(data_acao)),N'') IS NOT NULL
    UNION ALL
    SELECT N'auditoria',id,N'created_at',created_at
    FROM dbo.auditoria
    WHERE LOWER(LTRIM(RTRIM(entidade))) IN (N'lancamentos',N'homologacoes')
      AND NULLIF(LTRIM(RTRIM(created_at)),N'') IS NOT NULL;

    SELECT
        c.*,
        CASE
            WHEN LEN(c.valor_anterior)=10
             AND TRY_CONVERT(DATE,c.valor_anterior,23) IS NOT NULL THEN 1
            ELSE 0
        END AS somente_data,
        CASE
            WHEN LEN(c.valor_anterior)=10
             AND TRY_CONVERT(DATE,c.valor_anterior,23) IS NOT NULL
                THEN CONVERT(DATETIME2(7),TRY_CONVERT(DATE,c.valor_anterior,23))
            ELSE CONVERT(
                DATETIME2(7),
                TRY_CONVERT(DATETIMEOFFSET(7),c.valor_anterior,127)
                    AT TIME ZONE 'E. South America Standard Time'
            )
        END AS data_local
    INTO #CamposParseados
    FROM #CamposTemporais c;

    IF EXISTS(SELECT 1 FROM #CamposParseados WHERE data_local IS NULL)
        THROW 53203, 'Existe data operacional em formato nao reconhecido.', 1;

    SELECT
        p.tabela,
        p.registro_id,
        p.campo,
        p.valor_anterior,
        p.somente_data,
        DATEADD(DAY,1,p.data_local) AS data_normalizada
    INTO #DatasNormalizadas
    FROM #CamposParseados p
    INNER JOIN #FeriadosNacionais f
      ON f.data_feriado=CONVERT(DATE,p.data_local);

    WHILE EXISTS
    (
        SELECT 1
        FROM #DatasNormalizadas n
        WHERE ((DATEDIFF(DAY,CONVERT(DATE,'19000101',112),CONVERT(DATE,n.data_normalizada))%7)+7)%7 IN (5,6)
           OR EXISTS
              (
                  SELECT 1 FROM #FeriadosNacionais f
                  WHERE f.data_feriado=CONVERT(DATE,n.data_normalizada)
              )
    )
    BEGIN
        UPDATE n
        SET data_normalizada=DATEADD(DAY,1,n.data_normalizada)
        FROM #DatasNormalizadas n
        WHERE ((DATEDIFF(DAY,CONVERT(DATE,'19000101',112),CONVERT(DATE,n.data_normalizada))%7)+7)%7 IN (5,6)
           OR EXISTS
              (
                  SELECT 1 FROM #FeriadosNacionais f
                  WHERE f.data_feriado=CONVERT(DATE,n.data_normalizada)
              );
    END;

    CREATE TABLE #Normalizacao
    (
        tabela NVARCHAR(40) NOT NULL,
        registro_id NVARCHAR(100) NOT NULL,
        campo NVARCHAR(40) NOT NULL,
        valor_anterior NVARCHAR(40) NOT NULL,
        valor_novo NVARCHAR(40) NOT NULL,
        CONSTRAINT pk_normalizacao_feriado_temporaria PRIMARY KEY(tabela,registro_id,campo)
    );

    INSERT INTO #Normalizacao(tabela,registro_id,campo,valor_anterior,valor_novo)
    SELECT
        tabela,
        registro_id,
        campo,
        valor_anterior,
        CASE
            WHEN somente_data=1
                THEN CONVERT(NVARCHAR(10),data_normalizada,23)
            ELSE CONVERT(
                NVARCHAR(40),
                data_normalizada AT TIME ZONE 'E. South America Standard Time',
                127
            )
        END
    FROM #DatasNormalizadas;

    SELECT @camposNormalizados=COUNT(*) FROM #Normalizacao;

    IF @camposNormalizados NOT IN (0,@camposEsperados)
        THROW 53204, 'Quantidade de campos divergente do snapshot auditado; nenhuma data foi alterada.', 1;

    IF EXISTS
    (
        SELECT 1
        FROM
        (
            SELECT
                h.lancamento_id,
                h.acao,
                COALESCE(n.valor_novo,h.data_acao) AS data_acao_proposta,
                COUNT(*) AS quantidade
            FROM dbo.homologacoes h
            LEFT JOIN #Normalizacao n
              ON n.tabela=N'homologacoes'
             AND n.registro_id=h.id
             AND n.campo=N'data_acao'
            GROUP BY h.lancamento_id,h.acao,COALESCE(n.valor_novo,h.data_acao)
        ) duplicidades
        WHERE quantidade>1
    )
        THROW 53205, 'A normalizacao produziria colisao no historico de homologacoes.', 1;

    SELECT @lancamentosAlterados=COUNT(DISTINCT registro_id)
    FROM #Normalizacao WHERE tabela=N'lancamentos';
    SELECT @homologacoesAlteradas=COUNT(DISTINCT registro_id)
    FROM #Normalizacao WHERE tabela=N'homologacoes';
    SELECT @auditoriaAlterada=COUNT(DISTINCT registro_id)
    FROM #Normalizacao WHERE tabela=N'auditoria';

    UPDATE l
    SET created_at=COALESCE(c.valor_novo,l.created_at),
        updated_at=COALESCE(u.valor_novo,l.updated_at)
    FROM dbo.lancamentos l
    LEFT JOIN #Normalizacao c
      ON c.tabela=N'lancamentos' AND c.registro_id=l.id AND c.campo=N'created_at'
    LEFT JOIN #Normalizacao u
      ON u.tabela=N'lancamentos' AND u.registro_id=l.id AND u.campo=N'updated_at'
    WHERE c.registro_id IS NOT NULL OR u.registro_id IS NOT NULL;

    UPDATE h
    SET data_acao=COALESCE(d.valor_novo,h.data_acao),
        created_at=COALESCE(c.valor_novo,h.created_at)
    FROM dbo.homologacoes h
    LEFT JOIN #Normalizacao d
      ON d.tabela=N'homologacoes' AND d.registro_id=h.id AND d.campo=N'data_acao'
    LEFT JOIN #Normalizacao c
      ON c.tabela=N'homologacoes' AND c.registro_id=h.id AND c.campo=N'created_at'
    WHERE d.registro_id IS NOT NULL OR c.registro_id IS NOT NULL;

    UPDATE a
    SET data_acao=COALESCE(d.valor_novo,a.data_acao),
        created_at=COALESCE(c.valor_novo,a.created_at)
    FROM dbo.auditoria a
    LEFT JOIN #Normalizacao d
      ON d.tabela=N'auditoria' AND d.registro_id=a.id AND d.campo=N'data_acao'
    LEFT JOIN #Normalizacao c
      ON c.tabela=N'auditoria' AND c.registro_id=a.id AND c.campo=N'created_at'
    WHERE d.registro_id IS NOT NULL OR c.registro_id IS NOT NULL;

    IF (SELECT COUNT(*) FROM dbo.lancamentos)<>@lancamentosAntes
       OR (SELECT COUNT(*) FROM dbo.homologacoes)<>@homologacoesAntes
       OR (SELECT COUNT(*) FROM dbo.auditoria)<>@auditoriaAntes
        THROW 53206, 'A quantidade de registros mudou durante a normalizacao.', 1;

    CREATE TABLE #CamposDepois
    (
        tabela NVARCHAR(40) NOT NULL,
        registro_id NVARCHAR(100) NOT NULL,
        campo NVARCHAR(40) NOT NULL,
        valor_atual NVARCHAR(40) NOT NULL
    );

    INSERT INTO #CamposDepois(tabela,registro_id,campo,valor_atual)
    SELECT N'lancamentos',id,N'created_at',created_at FROM dbo.lancamentos WHERE NULLIF(LTRIM(RTRIM(created_at)),N'') IS NOT NULL
    UNION ALL SELECT N'lancamentos',id,N'updated_at',updated_at FROM dbo.lancamentos WHERE NULLIF(LTRIM(RTRIM(updated_at)),N'') IS NOT NULL
    UNION ALL SELECT N'homologacoes',id,N'data_acao',data_acao FROM dbo.homologacoes WHERE NULLIF(LTRIM(RTRIM(data_acao)),N'') IS NOT NULL
    UNION ALL SELECT N'homologacoes',id,N'created_at',created_at FROM dbo.homologacoes WHERE NULLIF(LTRIM(RTRIM(created_at)),N'') IS NOT NULL
    UNION ALL SELECT N'auditoria',id,N'data_acao',data_acao FROM dbo.auditoria WHERE LOWER(LTRIM(RTRIM(entidade))) IN (N'lancamentos',N'homologacoes') AND NULLIF(LTRIM(RTRIM(data_acao)),N'') IS NOT NULL
    UNION ALL SELECT N'auditoria',id,N'created_at',created_at FROM dbo.auditoria WHERE LOWER(LTRIM(RTRIM(entidade))) IN (N'lancamentos',N'homologacoes') AND NULLIF(LTRIM(RTRIM(created_at)),N'') IS NOT NULL;

    IF EXISTS
    (
        SELECT 1
        FROM #Normalizacao n
        LEFT JOIN #CamposDepois d
          ON d.tabela=n.tabela AND d.registro_id=n.registro_id AND d.campo=n.campo
        WHERE d.valor_atual<>n.valor_novo OR d.valor_atual IS NULL
    )
        THROW 53207, 'Validacao pos-gravacao falhou para os campos normalizados.', 1;

    IF EXISTS
    (
        SELECT 1
        FROM #CamposDepois d
        CROSS APPLY
        (
            SELECT CASE
                WHEN LEN(d.valor_atual)=10 AND TRY_CONVERT(DATE,d.valor_atual,23) IS NOT NULL
                    THEN CONVERT(DATETIME2(7),TRY_CONVERT(DATE,d.valor_atual,23))
                ELSE CONVERT(
                    DATETIME2(7),
                    TRY_CONVERT(DATETIMEOFFSET(7),d.valor_atual,127)
                        AT TIME ZONE 'E. South America Standard Time'
                )
            END AS data_local
        ) p
        WHERE p.data_local IS NULL
           OR ((DATEDIFF(DAY,CONVERT(DATE,'19000101',112),CONVERT(DATE,p.data_local))%7)+7)%7 IN (5,6)
           OR CONVERT(TIME(7),p.data_local)>CONVERT(TIME(7),'18:00:00')
           OR EXISTS
              (
                  SELECT 1 FROM #FeriadosNacionais f
                  WHERE f.data_feriado=CONVERT(DATE,p.data_local)
              )
    )
        THROW 53208, 'Ainda existem datas operacionais em fim de semana, feriado nacional ou posteriores a 18h.', 1;

    COMMIT TRANSACTION;

    SELECT
        CASE WHEN @camposNormalizados=0 THEN N'JA_NORMALIZADO' ELSE N'NORMALIZADO' END AS estado,
        @camposNormalizados AS campos_temporais_alterados,
        @lancamentosAlterados AS lancamentos_alterados,
        @homologacoesAlteradas AS homologacoes_alteradas,
        @auditoriaAlterada AS auditorias_alteradas,
        N'America/Sao_Paulo' AS fuso,
        N'Feriado nacional->proximo dia util; limite 18h preservado' AS regra;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
