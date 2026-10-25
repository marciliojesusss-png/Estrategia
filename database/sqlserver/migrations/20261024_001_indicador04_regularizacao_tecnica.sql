/*
  Indicador 04 — Aprimoramento da Experiência do Cliente

  Estado real de referência validado por SELECT em 2026-10-24.
  Escopo persistente máximo:
  - dbo.indicadores: ID 4, somente tipo_consolidacao;
  - dbo.lancamentos: ID 42, somente merge documental em dados_entrada_json;
  - dbo.lancamentos: ID 45, fechamento técnico do 3TRI;
  - dbo.configuracoes: regrasIndicadores, somente mesesFechamentoTrimestral do ID 4.

  IDs 37–41, 43–44 e 46–48 são protegidos contra alteração. Em especial,
  o ID 39 permanece Em preenchimento, versão 2, com sua auditoria real de
  reabertura. Nenhuma governança é criada, alterada ou removida.

  IMPORTANTE: preparar este arquivo não autoriza sua execução.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'Estrategia'
    THROW 52401, 'Execute esta migration somente no banco Estrategia.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @migration NVARCHAR(255) = N'20261024_001_indicador04_regularizacao_tecnica.sql';
    DECLARE @indicadorId NVARCHAR(100) = N'4';
    DECLARE @regrasAntes NVARCHAR(MAX);
    DECLARE @regrasDepois NVARCHAR(MAX);
    DECLARE @regraAntes NVARCHAR(MAX);
    DECLARE @regraDepois NVARCHAR(MAX);
    DECLARE @indiceRegra INT;
    DECLARE @quantidadeRegrasIndicador INT;
    DECLARE @dadosJunAntes NVARCHAR(MAX);
    DECLARE @dadosJunDepois NVARCHAR(MAX);
    DECLARE @dadosSet NVARCHAR(MAX) = N'{"tipoPosicaoAprimoramento":"fechamento_quantitativo","melhoriasImplementadasMes":2,"melhoriasImplementadasAcumuladas":6,"metaQuantidadeAcumuladaAprimoramento":4,"descricaoMelhoriasMes":"Duas novas melhorias no 3TRI: login simplificado no Portal Loterias e Tela de Aviso de Instabilidade.","identificadorLoginSimplificado":"CHG00004941","identificadorAvisoInstabilidadeAndroid":"STRY00058023","identificadorAvisoInstabilidadeIos":"STRY00058012","fonteFechamentoAprimoramento":"Informe DILOT/GERIN nº 0078/2026","metaPlanilhaAprimoramento":0.1818,"realizadoPlanilhaAprimoramento":0.2727,"atingimentoPlanilhaAprimoramento":1.5,"descricaoPlanilhaAprimoramento":"Seis melhorias acumuladas no fechamento do 3TRI/2026; duas foram implementadas no período.","fontePlanilhaAprimoramento":"16.10(3).xlsx"}';
    DECLARE @junInicial BIT = 0;
    DECLARE @junFinal BIT = 0;
    DECLARE @setInicial BIT = 0;
    DECLARE @setFinal BIT = 0;
    DECLARE @sqlSubstituirRegra NVARCHAR(MAX);
    DECLARE @linhasIndicador INT = 0;
    DECLARE @linhasLancamentos INT = 0;
    DECLARE @linhasConfiguracoes INT = 0;

    IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL
       OR OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
       OR OBJECT_ID(N'dbo.configuracoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.homologacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.evidencias', N'U') IS NULL
       OR OBJECT_ID(N'dbo.retificacoes', N'U') IS NULL
       OR OBJECT_ID(N'dbo.solicitacoes_reabertura', N'U') IS NULL
       OR OBJECT_ID(N'dbo.auditoria', N'U') IS NULL
        THROW 52402, 'Pré-condição inválida: estrutura obrigatória ausente.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.indicadores WITH (UPDLOCK, HOLDLOCK)
        WHERE id = @indicadorId
          AND numero = 4
          AND nome = N'Aprimoramento da Experiência do Cliente'
          AND unidade_apuradora = N'SUCOL'
          AND diretoria_responsavel = N'DICOT'
          AND plano = N'PN'
          AND pilar = N'Cliente no Centro'
          AND periodicidade = N'Não especificada'
          AND tipo_calculo = N'melhorias_acumuladas'
          AND (tipo_consolidacao IS NULL OR tipo_consolidacao = N'quantidade_acumulada')
          AND unidade_medida = N'percentual'
          AND meta_anual = N'Implementar melhorias que atendam a 25% das ocorrências apontadas na pesquisa NPS de baseline.'
    )
        THROW 52403, 'Pré-condição inválida: cadastro do Indicador 04 divergiu.', 1;

    IF (SELECT COUNT(*) FROM dbo.lancamentos WITH (UPDLOCK, HOLDLOCK) WHERE indicador_id = @indicadorId) <> 12
       OR (SELECT COUNT(*) FROM dbo.lancamentos WHERE indicador_id = @indicadorId AND id IN
          (N'37',N'38',N'39',N'40',N'41',N'42',N'43',N'44',N'45',N'46',N'47',N'48')) <> 12
       OR EXISTS (
          SELECT 1 FROM dbo.lancamentos
          WHERE indicador_id = @indicadorId
            AND (ano <> 2026 OR mes < 1 OR mes > 12 OR id <> CONVERT(NVARCHAR(100), 36 + mes))
       )
        THROW 52404, 'Pré-condição inválida: lançamentos 37–48 não estão íntegros.', 1;

    /* JAN/FEV: homologação legada sem evento transacional. Não alterar. */
    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'37',N'38') AND indicador_id = @indicadorId
          AND status = N'Homologado'
          AND versao_atual = 1
          AND TRY_CONVERT(DECIMAL(19,6), meta_referencia) = 0.0454
          AND TRY_CONVERT(DECIMAL(19,6), resultado_calculado) = 0
          AND TRY_CONVERT(DECIMAL(19,6), resultado_oficial) = 0
          AND TRY_CONVERT(DECIMAL(19,6), percentual_atingido) = 0
          AND situacao = N'Abaixo da meta'
          AND TRY_CONVERT(INT, JSON_VALUE(dados_entrada_json,'$.melhoriasImplementadasMes')) = 0) <> 2
       OR EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (N'37',N'38'))
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (N'37',N'38'))
       OR EXISTS (SELECT 1 FROM dbo.auditoria WHERE entidade = N'lancamentos' AND entidade_id IN (N'37',N'38'))
        THROW 52405, 'Pré-condição inválida: JAN/FEV divergiram do legado preservado.', 1;

    /* MAR: fechamento do 1TRI reaberto, com auditoria real. Não alterar. */
    IF NOT EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE id = N'39' AND indicador_id = @indicadorId
          AND competencia = N'2026-03' AND ano = 2026 AND mes = 3
          AND status = N'Em preenchimento'
          AND versao_atual = 2
          AND usuario_responsavel = N'UNIDADE-SUCOL'
          AND TRY_CONVERT(DECIMAL(19,6), meta_referencia) = 0.0454
          AND TRY_CONVERT(DECIMAL(19,6), resultado_calculado) = 0.0454
          AND TRY_CONVERT(DECIMAL(19,6), resultado_oficial) = 0.0454
          AND TRY_CONVERT(DECIMAL(19,6), percentual_atingido) = 1
          AND situacao = N'Atingido'
          AND TRY_CONVERT(INT, JSON_VALUE(dados_entrada_json,'$.melhoriasImplementadasMes')) = 1
          AND TRY_CONVERT(INT, JSON_VALUE(dados_entrada_json,'$.melhoriasImplementadasAcumuladas')) = 1
          AND JSON_VALUE(dados_entrada_json,'$.tipoPosicaoAprimoramento') = N'fechamento_quantitativo'
    )
       OR (SELECT COUNT(*) FROM dbo.auditoria WHERE entidade=N'lancamentos' AND entidade_id=N'39') <> 2
       OR NOT EXISTS (
          SELECT 1 FROM dbo.auditoria
          WHERE entidade=N'lancamentos' AND entidade_id=N'39' AND acao=N'lancamento_reaberto'
            AND JSON_VALUE(dados_anteriores_json,'$.status')=N'Homologado'
            AND JSON_VALUE(dados_novos_json,'$.status')=N'Reaberto'
       )
       OR NOT EXISTS (
          SELECT 1 FROM dbo.auditoria
          WHERE entidade=N'lancamentos' AND entidade_id=N'39' AND acao=N'referencia_evidencia_atualizada'
       )
       OR EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id=N'39')
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id=N'39')
       OR EXISTS (SELECT 1 FROM dbo.retificacoes WHERE lancamento_id=N'39')
       OR EXISTS (SELECT 1 FROM dbo.solicitacoes_reabertura WHERE lancamento_id=N'39')
        THROW 52406, 'Pré-condição inválida: MAR divergiu do fechamento reaberto e auditado.', 1;

    /* Competências fora do escopo persistente: reconhecer o estado real e proteger contra alteração. */
    IF (SELECT COUNT(*) FROM dbo.lancamentos
        WHERE id IN (N'40',N'41',N'43',N'44',N'46',N'47',N'48')
          AND indicador_id = @indicadorId
          AND status = N'Não iniciado'
          AND versao_atual = 1
          AND resultado_calculado IS NULL
          AND resultado_oficial IS NULL
          AND percentual_atingido IS NULL
          AND situacao = N'Sem dados'
          AND LTRIM(RTRIM(dados_entrada_json)) = N'[]') <> 7
        THROW 52407, 'Pré-condição inválida: competência protegida divergiu do estado real.', 1;

    SET @junInicial = CASE WHEN EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE id=N'42' AND indicador_id=@indicadorId
          AND competencia=N'2026-06' AND ano=2026 AND mes=6
          AND status=N'Em preenchimento' AND versao_atual=1
          AND usuario_responsavel=N'UNIDADE-SUCOL'
          AND TRY_CONVERT(DECIMAL(19,6),meta_referencia)=0.1364
          AND resultado_calculado=N'0.181818'
          AND resultado_oficial=N'0.181818'
          AND percentual_atingido=N'1.33333'
          AND situacao=N'Atingido'
          AND ISJSON(dados_entrada_json)=1
          AND TRY_CONVERT(INT,JSON_VALUE(dados_entrada_json,'$.melhoriasImplementadasMes'))=3
          AND TRY_CONVERT(INT,JSON_VALUE(dados_entrada_json,'$.melhoriasImplementadasAcumuladas'))=4
          AND JSON_VALUE(dados_entrada_json,'$.tipoPosicaoAprimoramento')=N'fechamento_quantitativo'
          AND JSON_VALUE(dados_entrada_json,'$.metaQuantidadeAcumuladaAprimoramento') IS NULL
          AND JSON_VALUE(dados_entrada_json,'$.fonteFechamentoAprimoramento') IS NULL
          AND JSON_VALUE(dados_entrada_json,'$.fontePlanilhaAprimoramento') IS NULL
    ) THEN 1 ELSE 0 END;

    SET @junFinal = CASE WHEN EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE id=N'42' AND indicador_id=@indicadorId
          AND competencia=N'2026-06' AND ano=2026 AND mes=6
          AND status=N'Em preenchimento' AND versao_atual=1
          AND usuario_responsavel=N'UNIDADE-SUCOL'
          AND TRY_CONVERT(DECIMAL(19,6),meta_referencia)=0.1364
          AND resultado_calculado=N'0.181818'
          AND resultado_oficial=N'0.181818'
          AND percentual_atingido=N'1.33333'
          AND situacao=N'Atingido'
          AND TRY_CONVERT(INT,JSON_VALUE(dados_entrada_json,'$.melhoriasImplementadasMes'))=3
          AND TRY_CONVERT(INT,JSON_VALUE(dados_entrada_json,'$.melhoriasImplementadasAcumuladas'))=4
          AND TRY_CONVERT(INT,JSON_VALUE(dados_entrada_json,'$.metaQuantidadeAcumuladaAprimoramento'))=3
          AND JSON_VALUE(dados_entrada_json,'$.tipoPosicaoAprimoramento')=N'fechamento_quantitativo'
          AND JSON_VALUE(dados_entrada_json,'$.descricaoMelhoriasMes')=N'Três novas melhorias da demanda tecnológica nº 24547165: conferência automática completa das apostas Teimosinhas; tela específica para acompanhamento das Teimosinhas; e conferência automática “Conferir Tudo” para Teimosinhas.'
          AND JSON_VALUE(dados_entrada_json,'$.demandaTecnologicaAprimoramento')=N'24547165'
          AND JSON_VALUE(dados_entrada_json,'$.fonteFechamentoAprimoramento')=N'Informe DILOT/GERIN nº 0056/2026'
          AND TRY_CONVERT(DECIMAL(19,4),JSON_VALUE(dados_entrada_json,'$.metaPlanilhaAprimoramento'))=0.1364
          AND TRY_CONVERT(DECIMAL(19,4),JSON_VALUE(dados_entrada_json,'$.realizadoPlanilhaAprimoramento'))=0.1818
          AND JSON_VALUE(dados_entrada_json,'$.fontePlanilhaAprimoramento')=N'16.10(3).xlsx'
    ) THEN 1 ELSE 0 END;
    IF @junInicial=0 AND @junFinal=0
        THROW 52408, 'Pré-condição inválida: JUN divergiu dos estados parcial e final reconhecidos.', 1;

    SET @setInicial = CASE WHEN EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE id=N'45' AND indicador_id=@indicadorId
          AND competencia=N'2026-09' AND ano=2026 AND mes=9
          AND status=N'Não iniciado' AND versao_atual=1
          AND TRY_CONVERT(DECIMAL(19,6),meta_referencia)=0.1818
          AND resultado_calculado IS NULL
          AND resultado_oficial IS NULL
          AND percentual_atingido IS NULL
          AND situacao=N'Sem dados'
          AND LTRIM(RTRIM(dados_entrada_json)) IN (N'[]',N'{}')
    ) THEN 1 ELSE 0 END;

    SET @setFinal = CASE WHEN EXISTS (
        SELECT 1 FROM dbo.lancamentos
        WHERE id=N'45' AND indicador_id=@indicadorId
          AND competencia=N'2026-09' AND ano=2026 AND mes=9
          AND status=N'Em preenchimento' AND versao_atual=1
          AND TRY_CONVERT(DECIMAL(19,6),meta_referencia)=0.1818
          AND resultado_calculado=N'0.272727272727272727'
          AND resultado_oficial=N'0.2727'
          AND percentual_atingido=N'1.5'
          AND situacao=N'Atingido'
          AND TRY_CONVERT(INT,JSON_VALUE(dados_entrada_json,'$.melhoriasImplementadasMes'))=2
          AND TRY_CONVERT(INT,JSON_VALUE(dados_entrada_json,'$.melhoriasImplementadasAcumuladas'))=6
          AND TRY_CONVERT(INT,JSON_VALUE(dados_entrada_json,'$.metaQuantidadeAcumuladaAprimoramento'))=4
          AND JSON_VALUE(dados_entrada_json,'$.tipoPosicaoAprimoramento')=N'fechamento_quantitativo'
          AND JSON_VALUE(dados_entrada_json,'$.identificadorLoginSimplificado')=N'CHG00004941'
          AND JSON_VALUE(dados_entrada_json,'$.identificadorAvisoInstabilidadeAndroid')=N'STRY00058023'
          AND JSON_VALUE(dados_entrada_json,'$.identificadorAvisoInstabilidadeIos')=N'STRY00058012'
          AND JSON_VALUE(dados_entrada_json,'$.descricaoMelhoriasMes')=N'Duas novas melhorias no 3TRI: login simplificado no Portal Loterias e Tela de Aviso de Instabilidade.'
          AND JSON_VALUE(dados_entrada_json,'$.fonteFechamentoAprimoramento')=N'Informe DILOT/GERIN nº 0078/2026'
          AND TRY_CONVERT(DECIMAL(19,4),JSON_VALUE(dados_entrada_json,'$.metaPlanilhaAprimoramento'))=0.1818
          AND TRY_CONVERT(DECIMAL(19,4),JSON_VALUE(dados_entrada_json,'$.realizadoPlanilhaAprimoramento'))=0.2727
          AND JSON_VALUE(dados_entrada_json,'$.fontePlanilhaAprimoramento')=N'16.10(3).xlsx'
    ) THEN 1 ELSE 0 END;
    IF @setInicial=0 AND @setFinal=0
        THROW 52409, 'Pré-condição inválida: SET divergiu dos estados inicial e final reconhecidos.', 1;

    IF (SELECT COUNT(*) FROM dbo.configuracoes WITH (UPDLOCK,HOLDLOCK) WHERE chave=N'regrasIndicadores')<>1
        THROW 52410, 'Pré-condição inválida: configuração regrasIndicadores ausente ou duplicada.', 1;

    SELECT @regrasAntes=valor_json FROM dbo.configuracoes WHERE chave=N'regrasIndicadores';
    IF ISJSON(@regrasAntes)<>1
        THROW 52411, 'Pré-condição inválida: regrasIndicadores não contém JSON válido.', 1;

    SET @regrasDepois=@regrasAntes;
    SELECT @quantidadeRegrasIndicador=COUNT(*)
    FROM OPENJSON(@regrasAntes)
    WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId;
    IF @quantidadeRegrasIndicador<>1
        THROW 52416, 'Pré-condição inválida: deve existir exatamente uma regra para o Indicador 04.', 1;

    SELECT @indiceRegra=TRY_CONVERT(INT,[key]),@regraAntes=value
    FROM OPENJSON(@regrasAntes)
    WHERE JSON_VALUE(value,'$.indicadorId')=@indicadorId;

    IF JSON_VALUE(@regraAntes,'$.tipoCalculo')<>N'melhorias_acumuladas'
       OR JSON_VALUE(@regraAntes,'$.tipoConsolidacao')<>N'quantidade_acumulada'
       OR TRY_CONVERT(DECIMAL(19,6),JSON_VALUE(@regraAntes,'$.metaAnualValor'))<>0.25
       OR TRY_CONVERT(INT,JSON_VALUE(@regraAntes,'$.parametrosCalculo.totalMelhoriasPlano2026'))<>22
       OR TRY_CONVERT(INT,JSON_VALUE(@regraAntes,'$.parametrosCalculo.metaMinimaMelhoriasAno'))<>6
       OR TRY_CONVERT(DECIMAL(19,6),JSON_VALUE(@regraAntes,'$.parametrosCalculo.curvaTrimestralAcumulada."1TRI/2026".metaPercentual'))<>0.0454
       OR TRY_CONVERT(INT,JSON_VALUE(@regraAntes,'$.parametrosCalculo.curvaTrimestralAcumulada."1TRI/2026".metaQuantidadeAcumulada'))<>1
       OR TRY_CONVERT(DECIMAL(19,6),JSON_VALUE(@regraAntes,'$.parametrosCalculo.curvaTrimestralAcumulada."2TRI/2026".metaPercentual'))<>0.1364
       OR TRY_CONVERT(INT,JSON_VALUE(@regraAntes,'$.parametrosCalculo.curvaTrimestralAcumulada."2TRI/2026".metaQuantidadeAcumulada'))<>3
       OR TRY_CONVERT(DECIMAL(19,6),JSON_VALUE(@regraAntes,'$.parametrosCalculo.curvaTrimestralAcumulada."3TRI/2026".metaPercentual'))<>0.1818
       OR TRY_CONVERT(INT,JSON_VALUE(@regraAntes,'$.parametrosCalculo.curvaTrimestralAcumulada."3TRI/2026".metaQuantidadeAcumulada'))<>4
       OR TRY_CONVERT(DECIMAL(19,6),JSON_VALUE(@regraAntes,'$.parametrosCalculo.curvaTrimestralAcumulada."4TRI/2026".metaPercentual'))<>0.25
       OR TRY_CONVERT(INT,JSON_VALUE(@regraAntes,'$.parametrosCalculo.curvaTrimestralAcumulada."4TRI/2026".metaQuantidadeAcumulada'))<>6
       OR JSON_VALUE(@regraAntes,'$.parametrosCalculo.sentidoMeta')<>N'quanto_maior_melhor'
       OR (
          JSON_QUERY(@regraAntes,'$.parametrosCalculo.mesesFechamentoTrimestral') IS NOT NULL
          AND JSON_QUERY(@regraAntes,'$.parametrosCalculo.mesesFechamentoTrimestral')<>N'[3,6,9,12]'
       )
        THROW 52412, 'Pré-condição inválida: regra vigente do Indicador 04 divergiu.', 1;

    IF EXISTS (SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN (N'40',N'41',N'42',N'43',N'44',N'45',N'46',N'47',N'48'))
       OR EXISTS (SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN (N'40',N'41',N'42',N'43',N'44',N'45',N'46',N'47',N'48'))
       OR EXISTS (SELECT 1 FROM dbo.auditoria WHERE entidade=N'lancamentos' AND entidade_id IN (N'40',N'41',N'42',N'43',N'44',N'45',N'46',N'47',N'48'))
       OR EXISTS (SELECT 1 FROM dbo.retificacoes WHERE lancamento_id IN (N'40',N'41',N'42',N'43',N'44',N'45',N'46',N'47',N'48'))
       OR EXISTS (SELECT 1 FROM dbo.solicitacoes_reabertura WHERE lancamento_id IN (N'40',N'41',N'42',N'43',N'44',N'45',N'46',N'47',N'48'))
        THROW 52413, 'Pré-condição inválida: há governança transacional inesperada em ABR–DEZ.', 1;

    /* Snapshots capturados somente após todas as pré-condições e antes de qualquer UPDATE. */
    SELECT * INTO #indicadoresAntes FROM dbo.indicadores;
    SELECT * INTO #lancamentosAntes FROM dbo.lancamentos;
    SELECT * INTO #configuracoesAntes FROM dbo.configuracoes;
    SELECT * INTO #homologacoesAntes FROM dbo.homologacoes;
    SELECT * INTO #evidenciasAntes FROM dbo.evidencias;
    SELECT * INTO #retificacoesAntes FROM dbo.retificacoes;
    SELECT * INTO #reaberturasAntes FROM dbo.solicitacoes_reabertura;
    SELECT * INTO #auditoriaAntes FROM dbo.auditoria;

    UPDATE dbo.indicadores
    SET tipo_consolidacao=N'quantidade_acumulada'
    WHERE id=@indicadorId AND tipo_consolidacao IS NULL;
    SET @linhasIndicador=@@ROWCOUNT;

    IF @junInicial=1
    BEGIN
        /* Os três campos numéricos são NVARCHAR no schema real; preservar exatamente
           0.181818 / 0.181818 / 1.33333 e complementar somente o JSON. */
        SELECT @dadosJunAntes=dados_entrada_json FROM dbo.lancamentos WHERE id=N'42' AND indicador_id=@indicadorId;
        IF ISJSON(@dadosJunAntes)<>1 OR LEFT(LTRIM(@dadosJunAntes),1)<>N'{'
            THROW 52418, 'Proteção de merge falhou: JSON parcial de JUN não é um objeto válido.', 1;

        SET @dadosJunDepois=JSON_MODIFY(@dadosJunAntes,'$.metaQuantidadeAcumuladaAprimoramento',3);
        SET @dadosJunDepois=JSON_MODIFY(@dadosJunDepois,'$.descricaoMelhoriasMes',N'Três novas melhorias da demanda tecnológica nº 24547165: conferência automática completa das apostas Teimosinhas; tela específica para acompanhamento das Teimosinhas; e conferência automática “Conferir Tudo” para Teimosinhas.');
        SET @dadosJunDepois=JSON_MODIFY(@dadosJunDepois,'$.demandaTecnologicaAprimoramento',N'24547165');
        SET @dadosJunDepois=JSON_MODIFY(@dadosJunDepois,'$.fonteFechamentoAprimoramento',N'Informe DILOT/GERIN nº 0056/2026');
        SET @dadosJunDepois=JSON_MODIFY(@dadosJunDepois,'$.metaPlanilhaAprimoramento',CONVERT(DECIMAL(19,4),0.1364));
        SET @dadosJunDepois=JSON_MODIFY(@dadosJunDepois,'$.realizadoPlanilhaAprimoramento',CONVERT(DECIMAL(19,4),0.1818));
        SET @dadosJunDepois=JSON_MODIFY(@dadosJunDepois,'$.atingimentoPlanilhaAprimoramento',CONVERT(DECIMAL(38,18),1.3328445747800586));
        SET @dadosJunDepois=JSON_MODIFY(@dadosJunDepois,'$.descricaoPlanilhaAprimoramento',N'A planilha registra 18,18% / 13,64% ≈ 133,284%; o fechamento técnico usa 4 / 3 = 133,33%.');
        SET @dadosJunDepois=JSON_MODIFY(@dadosJunDepois,'$.fontePlanilhaAprimoramento',N'16.10(3).xlsx');

        UPDATE dbo.lancamentos
        SET dados_entrada_json=@dadosJunDepois
        WHERE id=N'42' AND indicador_id=@indicadorId AND dados_entrada_json=@dadosJunAntes;
        IF @@ROWCOUNT<>1
            THROW 52419, 'Atualização documental de JUN não afetou exatamente uma linha.', 1;
        SET @linhasLancamentos+=1;
    END;

    IF @setInicial=1
    BEGIN
        UPDATE dbo.lancamentos
        SET dados_entrada_json=@dadosSet,
            resultado_calculado=N'0.272727272727272727',
            resultado_oficial=N'0.2727',
            percentual_atingido=N'1.5',
            situacao=N'Atingido',
            status=N'Em preenchimento'
        WHERE id=N'45' AND indicador_id=@indicadorId
          AND status=N'Não iniciado' AND situacao=N'Sem dados'
          AND resultado_calculado IS NULL AND resultado_oficial IS NULL AND percentual_atingido IS NULL;
        IF @@ROWCOUNT<>1
            THROW 52420, 'Atualização do fechamento de SET não afetou exatamente uma linha.', 1;
        SET @linhasLancamentos+=1;
    END;

    IF JSON_QUERY(@regraAntes,'$.parametrosCalculo.mesesFechamentoTrimestral') IS NULL
    BEGIN
        SET @regraDepois=JSON_MODIFY(@regraAntes,'$.parametrosCalculo.mesesFechamentoTrimestral',JSON_QUERY(N'[3,6,9,12]'));
        SET @sqlSubstituirRegra=CONCAT(
          N'SET @saida=JSON_MODIFY(@entrada,''$[',CONVERT(NVARCHAR(10),@indiceRegra),N']'',JSON_QUERY(@regra));'
        );
        EXEC sys.sp_executesql @sqlSubstituirRegra,
          N'@entrada NVARCHAR(MAX),@regra NVARCHAR(MAX),@saida NVARCHAR(MAX) OUTPUT',
          @entrada=@regrasAntes,@regra=@regraDepois,@saida=@regrasDepois OUTPUT;

        UPDATE dbo.configuracoes
        SET valor_json=@regrasDepois
        WHERE chave=N'regrasIndicadores' AND valor_json=@regrasAntes;
        IF @@ROWCOUNT<>1
            THROW 52421, 'Atualização da regra do Indicador 04 não afetou exatamente uma linha.', 1;
        SET @linhasConfiguracoes=1;
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.indicadores WHERE id=@indicadorId AND tipo_consolidacao=N'quantidade_acumulada')
       OR NOT EXISTS (
          SELECT 1 FROM dbo.lancamentos WHERE id=N'42' AND status=N'Em preenchimento' AND versao_atual=1
            AND resultado_calculado=N'0.181818' AND resultado_oficial=N'0.181818' AND percentual_atingido=N'1.33333'
            AND TRY_CONVERT(INT,JSON_VALUE(dados_entrada_json,'$.melhoriasImplementadasAcumuladas'))=4
            AND TRY_CONVERT(INT,JSON_VALUE(dados_entrada_json,'$.metaQuantidadeAcumuladaAprimoramento'))=3
            AND JSON_VALUE(dados_entrada_json,'$.demandaTecnologicaAprimoramento')=N'24547165'
            AND JSON_VALUE(dados_entrada_json,'$.fonteFechamentoAprimoramento')=N'Informe DILOT/GERIN nº 0056/2026'
            AND JSON_VALUE(dados_entrada_json,'$.fontePlanilhaAprimoramento')=N'16.10(3).xlsx'
       )
       OR NOT EXISTS (
          SELECT 1 FROM dbo.lancamentos WHERE id=N'45' AND status=N'Em preenchimento' AND versao_atual=1
            AND resultado_calculado=N'0.272727272727272727' AND resultado_oficial=N'0.2727'
            AND percentual_atingido=N'1.5' AND situacao=N'Atingido'
            AND TRY_CONVERT(INT,JSON_VALUE(dados_entrada_json,'$.melhoriasImplementadasMes'))=2
            AND TRY_CONVERT(INT,JSON_VALUE(dados_entrada_json,'$.melhoriasImplementadasAcumuladas'))=6
            AND TRY_CONVERT(INT,JSON_VALUE(dados_entrada_json,'$.metaQuantidadeAcumuladaAprimoramento'))=4
            AND JSON_VALUE(dados_entrada_json,'$.identificadorLoginSimplificado')=N'CHG00004941'
            AND JSON_VALUE(dados_entrada_json,'$.identificadorAvisoInstabilidadeAndroid')=N'STRY00058023'
            AND JSON_VALUE(dados_entrada_json,'$.identificadorAvisoInstabilidadeIos')=N'STRY00058012'
            AND JSON_VALUE(dados_entrada_json,'$.fonteFechamentoAprimoramento')=N'Informe DILOT/GERIN nº 0078/2026'
            AND JSON_VALUE(dados_entrada_json,'$.fontePlanilhaAprimoramento')=N'16.10(3).xlsx'
       )
       OR NOT EXISTS (
          SELECT 1 FROM dbo.configuracoes CROSS APPLY OPENJSON(valor_json)
          WHERE chave=N'regrasIndicadores' AND JSON_VALUE(value,'$.indicadorId')=@indicadorId
            AND JSON_QUERY(value,'$.parametrosCalculo.mesesFechamentoTrimestral')=N'[3,6,9,12]'
       )
        THROW 52414, 'Validação final falhou para cadastro, lançamentos ou regra.', 1;

    IF @linhasIndicador>1 OR @linhasLancamentos>2 OR @linhasConfiguracoes>1
       OR (@linhasIndicador+@linhasLancamentos+@linhasConfiguracoes)>4
        THROW 52422, 'Proteção de cardinalidade falhou: mais de quatro linhas seriam alteradas.', 1;

    IF EXISTS (SELECT * FROM dbo.indicadores WHERE id<>@indicadorId EXCEPT SELECT * FROM #indicadoresAntes WHERE id<>@indicadorId)
       OR EXISTS (SELECT * FROM #indicadoresAntes WHERE id<>@indicadorId EXCEPT SELECT * FROM dbo.indicadores WHERE id<>@indicadorId)
       OR EXISTS (SELECT * FROM dbo.lancamentos WHERE id NOT IN (N'42',N'45') EXCEPT SELECT * FROM #lancamentosAntes WHERE id NOT IN (N'42',N'45'))
       OR EXISTS (SELECT * FROM #lancamentosAntes WHERE id NOT IN (N'42',N'45') EXCEPT SELECT * FROM dbo.lancamentos WHERE id NOT IN (N'42',N'45'))
       OR EXISTS (SELECT * FROM dbo.configuracoes WHERE chave<>N'regrasIndicadores' EXCEPT SELECT * FROM #configuracoesAntes WHERE chave<>N'regrasIndicadores')
       OR EXISTS (SELECT * FROM #configuracoesAntes WHERE chave<>N'regrasIndicadores' EXCEPT SELECT * FROM dbo.configuracoes WHERE chave<>N'regrasIndicadores')
        THROW 52415, 'Proteção de escopo falhou: registro fora dos quatro alvos foi alterado.', 1;

    IF EXISTS (
          SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
          FROM dbo.indicadores WHERE id=@indicadorId
          EXCEPT
          SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,unidade_medida,tipo_calculo,meta_anual,formula_referencia,observacao_acompanhamento,ativo,created_at,updated_at
          FROM #indicadoresAntes WHERE id=@indicadorId
       )
       OR EXISTS (
          SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,resultado_calculado,resultado_oficial,meta_referencia,percentual_atingido,situacao,status,observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
          FROM dbo.lancamentos WHERE id=N'42'
          EXCEPT
          SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,resultado_calculado,resultado_oficial,meta_referencia,percentual_atingido,situacao,status,observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
          FROM #lancamentosAntes WHERE id=N'42'
       )
       OR EXISTS (
          SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,meta_referencia,observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
          FROM dbo.lancamentos WHERE id=N'45'
          EXCEPT
          SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,meta_referencia,observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
          FROM #lancamentosAntes WHERE id=N'45'
       )
       OR EXISTS (
          SELECT updated_at FROM dbo.configuracoes WHERE chave=N'regrasIndicadores'
          EXCEPT
          SELECT updated_at FROM #configuracoesAntes WHERE chave=N'regrasIndicadores'
       )
        THROW 52423, 'Proteção de colunas falhou: campo não autorizado foi alterado.', 1;

    IF EXISTS (
          SELECT [key],value FROM OPENJSON(@regrasAntes) WHERE TRY_CONVERT(INT,[key])<>@indiceRegra
          EXCEPT
          SELECT [key],value FROM OPENJSON(@regrasDepois) WHERE TRY_CONVERT(INT,[key])<>@indiceRegra
       )
       OR EXISTS (
          SELECT [key],value FROM OPENJSON(@regrasDepois) WHERE TRY_CONVERT(INT,[key])<>@indiceRegra
          EXCEPT
          SELECT [key],value FROM OPENJSON(@regrasAntes) WHERE TRY_CONVERT(INT,[key])<>@indiceRegra
       )
        THROW 52417, 'Proteção de escopo falhou: outra regra de indicador foi alterada.', 1;

    IF EXISTS (SELECT * FROM dbo.homologacoes EXCEPT SELECT * FROM #homologacoesAntes)
       OR EXISTS (SELECT * FROM #homologacoesAntes EXCEPT SELECT * FROM dbo.homologacoes)
       OR EXISTS (SELECT * FROM dbo.evidencias EXCEPT SELECT * FROM #evidenciasAntes)
       OR EXISTS (SELECT * FROM #evidenciasAntes EXCEPT SELECT * FROM dbo.evidencias)
       OR EXISTS (SELECT * FROM dbo.retificacoes EXCEPT SELECT * FROM #retificacoesAntes)
       OR EXISTS (SELECT * FROM #retificacoesAntes EXCEPT SELECT * FROM dbo.retificacoes)
       OR EXISTS (SELECT * FROM dbo.solicitacoes_reabertura EXCEPT SELECT * FROM #reaberturasAntes)
       OR EXISTS (SELECT * FROM #reaberturasAntes EXCEPT SELECT * FROM dbo.solicitacoes_reabertura)
       OR EXISTS (SELECT * FROM dbo.auditoria EXCEPT SELECT * FROM #auditoriaAntes)
       OR EXISTS (SELECT * FROM #auditoriaAntes EXCEPT SELECT * FROM dbo.auditoria)
        THROW 52424, 'Proteção de governança falhou: trilha histórica foi alterada.', 1;

    COMMIT TRANSACTION;

    SELECT N'COMMIT' AS transacao,@migration AS migration,
           @linhasIndicador AS indicadores_alterados,
           @linhasLancamentos AS lancamentos_alterados,
           @linhasConfiguracoes AS configuracoes_alteradas,
           (@linhasIndicador+@linhasLancamentos+@linhasConfiguracoes) AS total_alterado,
           0 AS registros_criados,0 AS registros_removidos;
END TRY
BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
