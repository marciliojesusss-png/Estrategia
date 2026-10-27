/*
  Migration: 20261026_001_indicador02_regularizacao_tecnica.sql
  Indicador 02 — Índice de Satisfação de Clientes — NPS

  PREPARADA, NÃO EXECUTADA.

  Escopo persistente futuro:
    - dbo.indicadores: 1 linha;
    - dbo.lancamentos: 12 linhas (IDs 13 a 24);
    - dbo.configuracoes: 2 linhas (metas e regrasIndicadores);
    - registros criados/removidos: 0;
    - governança: nenhuma criação, alteração ou exclusão.

  Compatibilidade: SQL Server 2016, compatibility level 130 e TSql130Parser.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @migration NVARCHAR(160)=N'20261026_001_indicador02_regularizacao_tecnica.sql';
DECLARE @indicadorId NVARCHAR(100)=N'2';
DECLARE @linhasIndicadores INT=0,@linhasLancamentos INT=0,@linhasConfiguracoes INT=0;
DECLARE @metasAntes NVARCHAR(MAX),@regrasAntes NVARCHAR(MAX),@metasDepois NVARCHAR(MAX),@regrasDepois NVARCHAR(MAX);
DECLARE @protegidoAntes NVARCHAR(MAX),@protegidoDepois NVARCHAR(MAX);
DECLARE @alvosProtegidosAntes NVARCHAR(MAX),@alvosProtegidosDepois NVARCHAR(MAX);
DECLARE @governancaAntes NVARCHAR(MAX),@governancaDepois NVARCHAR(MAX);
DECLARE @hashProtegidoAntes VARBINARY(32),@hashProtegidoDepois VARBINARY(32);
DECLARE @hashAlvosProtegidosAntes VARBINARY(32),@hashAlvosProtegidosDepois VARBINARY(32);
DECLARE @hashGovernancaAntes VARBINARY(32),@hashGovernancaDepois VARBINARY(32);
DECLARE @indiceRegra NVARCHAR(20),@regraInicial NVARCHAR(MAX),@regraFinal NVARCHAR(MAX);

BEGIN TRY
  BEGIN TRANSACTION;

  IF DB_NAME()<>N'Estrategia'
    THROW 53200,'Banco incorreto: esperado Estrategia.',1;
  IF (SELECT compatibility_level FROM sys.databases WHERE name=DB_NAME())<130
    THROW 53201,'Compatibility level inferior a 130.',1;

  IF (SELECT COUNT(*) FROM dbo.indicadores WITH(UPDLOCK,HOLDLOCK) WHERE id=@indicadorId)<>1
    THROW 53202,'Indicador 02 ausente ou duplicado.',1;
  IF (SELECT COUNT(*) FROM dbo.lancamentos WITH(UPDLOCK,HOLDLOCK) WHERE indicador_id=@indicadorId AND ano=2026)<>12
    THROW 53203,'Esperados exatamente 12 lançamentos do Indicador 02 em 2026.',1;
  IF EXISTS(
    SELECT 1 FROM (VALUES
      (N'13',1),(N'14',2),(N'15',3),(N'16',4),(N'17',5),(N'18',6),
      (N'19',7),(N'20',8),(N'21',9),(N'22',10),(N'23',11),(N'24',12)
    ) esperado(id,mes)
    LEFT JOIN dbo.lancamentos l WITH(UPDLOCK,HOLDLOCK)
      ON l.id=esperado.id AND l.indicador_id=@indicadorId AND l.ano=2026 AND l.mes=esperado.mes
    WHERE l.id IS NULL
  ) THROW 53204,'Mapeamento de IDs/competências do Indicador 02 divergiu.',1;

  SELECT @metasAntes=valor_json FROM dbo.configuracoes WITH(UPDLOCK,HOLDLOCK) WHERE chave=N'metas';
  SELECT @regrasAntes=valor_json FROM dbo.configuracoes WITH(UPDLOCK,HOLDLOCK) WHERE chave=N'regrasIndicadores';
  IF @metasAntes IS NULL OR ISJSON(@metasAntes)<>1 OR @regrasAntes IS NULL OR ISJSON(@regrasAntes)<>1
    THROW 53205,'Configurações metas/regrasIndicadores ausentes ou inválidas.',1;

  IF EXISTS(SELECT 1 FROM dbo.indicadores WHERE id=@indicadorId AND
    (nome<>N'Índice de Satisfação de Clientes — NPS' OR unidade_apuradora<>N'SUCOL' OR
     diretoria_responsavel<>N'DICOT' OR plano<>N'PEI' OR tipo_calculo<>N'nota_pesquisa_nps' OR
     tipo_consolidacao IS NOT NULL OR meta_anual<>N'Meta anual correta: NPS 58'))
    THROW 53206,'Pré-condição do cadastro do Indicador 02 divergiu.',1;

  IF EXISTS(SELECT 1 FROM dbo.lancamentos WHERE id IN(N'13',N'14',N'15') AND
    (status<>N'Homologado' OR versao_atual<>1 OR evidencia_id IS NOT NULL))
    THROW 53207,'Pré-condição de JAN–MAR legado divergiu.',1;
  IF EXISTS(SELECT 1 FROM dbo.lancamentos WHERE id IN(N'16',N'17',N'19',N'20',N'21',N'22',N'23',N'24') AND
    status<>N'Não iniciado')
    THROW 53208,'Pré-condição dos lançamentos ainda não iniciados divergiu.',1;
  IF EXISTS(SELECT 1 FROM dbo.lancamentos WHERE id=N'18' AND
    (status<>N'Em preenchimento' OR meta_referencia<>N'58' OR resultado_calculado<>N'59.2' OR
     resultado_oficial<>N'59.2' OR percentual_atingido<>N'1.02069' OR versao_atual<>1))
    THROW 53209,'Pré-condição de JUN/2026 divergiu.',1;
  IF EXISTS(SELECT 1 FROM dbo.lancamentos WHERE id IN(N'13',N'14',N'16',N'17',N'19',N'20',N'21',N'22',N'23',N'24') AND
    (resultado_calculado IS NOT NULL OR resultado_oficial IS NOT NULL OR percentual_atingido IS NOT NULL))
    THROW 53210,'Pré-condição de resultados vazios divergiu.',1;
  IF EXISTS(SELECT 1 FROM dbo.lancamentos WHERE indicador_id=@indicadorId AND ISJSON(dados_entrada_json)<>1)
    THROW 53211,'Há JSON inválido nos lançamentos do Indicador 02.',1;

  IF (SELECT COUNT(*) FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value,'$.indicadorId')=N'2')<>3
    THROW 53212,'Pré-condição da configuração metas divergiu: esperados três itens legados.',1;
  IF EXISTS(SELECT 1 FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value,'$.indicadorId')=N'2' AND
    NOT ((JSON_VALUE(value,'$.mes')=N'1' AND JSON_VALUE(value,'$.metaMensal')=N'58') OR
         (JSON_VALUE(value,'$.mes')=N'2' AND JSON_VALUE(value,'$.metaMensal')=N'58') OR
         (JSON_VALUE(value,'$.mes')=N'3' AND JSON_VALUE(value,'$.metaMensal')=N'55')))
    THROW 53213,'Curva legada em metas não corresponde ao estado diagnosticado.',1;
  IF (SELECT COUNT(*) FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value,'$.indicadorId')=N'2')<>1
    THROW 53214,'Regra do Indicador 02 ausente ou duplicada.',1;

  SELECT @indiceRegra=[key],@regraInicial=value
  FROM OPENJSON(@regrasAntes)
  WHERE JSON_VALUE(value,'$.indicadorId')=N'2';
  IF (SELECT COUNT(*) FROM OPENJSON(@regrasAntes))<>23 OR @indiceRegra<>N'1'
    THROW 53234,'Indice literal esperado da regra do Indicador 02 divergiu.',1;
  IF HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@regraInicial))<>
     0xC8168EDB6F9B6F330252A4DC52F1D9C5BA9D89150E762636C971FC59AE5F4F86
    THROW 53235,'Conteudo inicial da regra do Indicador 02 divergiu.',1;

  IF EXISTS(SELECT 1 FROM dbo.homologacoes WHERE lancamento_id IN(N'13',N'14',N'15',N'16',N'17',N'18',N'19',N'20',N'21',N'22',N'23',N'24'))
     OR EXISTS(SELECT 1 FROM dbo.evidencias WHERE lancamento_id IN(N'13',N'14',N'15',N'16',N'17',N'18',N'19',N'20',N'21',N'22',N'23',N'24'))
     OR EXISTS(SELECT 1 FROM dbo.auditoria WHERE
          (entidade=N'lancamentos' AND entidade_id IN(N'13',N'14',N'15',N'16',N'17',N'18',N'19',N'20',N'21',N'22',N'23',N'24'))
          OR (entidade=N'indicadores' AND entidade_id=@indicadorId))
     OR EXISTS(SELECT 1 FROM dbo.retificacoes WHERE lancamento_id IN(N'13',N'14',N'15',N'16',N'17',N'18',N'19',N'20',N'21',N'22',N'23',N'24'))
     OR EXISTS(SELECT 1 FROM dbo.solicitacoes_reabertura WHERE indicador_id=@indicadorId OR
          lancamento_id IN(N'13',N'14',N'15',N'16',N'17',N'18',N'19',N'20',N'21',N'22',N'23',N'24'))
    THROW 53215,'Governança do Indicador 02 deixou de estar zerada; execução bloqueada.',1;

  SET @governancaAntes=(SELECT
    JSON_QUERY((SELECT * FROM dbo.homologacoes ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS homologacoes,
    JSON_QUERY((SELECT * FROM dbo.evidencias ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS evidencias,
    JSON_QUERY((SELECT * FROM dbo.auditoria ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS auditoria,
    JSON_QUERY((SELECT * FROM dbo.retificacoes ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS retificacoes,
    JSON_QUERY((SELECT * FROM dbo.solicitacoes_reabertura ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS reaberturas
    FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
  SET @hashGovernancaAntes=HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@governancaAntes));

  SET @protegidoAntes=(SELECT
    JSON_QUERY((SELECT * FROM dbo.indicadores WHERE id<>@indicadorId ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS indicadores_outros,
    JSON_QUERY((SELECT * FROM dbo.lancamentos WHERE id NOT IN(N'13',N'14',N'15',N'16',N'17',N'18',N'19',N'20',N'21',N'22',N'23',N'24') ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS lancamentos_outros,
    JSON_QUERY((SELECT * FROM dbo.configuracoes WHERE chave NOT IN(N'metas',N'regrasIndicadores') ORDER BY chave FOR JSON PATH,INCLUDE_NULL_VALUES)) AS configuracoes_outras,
    JSON_QUERY((SELECT value AS objeto FROM OPENJSON(@metasAntes) WHERE JSON_VALUE(value,'$.indicadorId')<>N'2' ORDER BY TRY_CONVERT(INT,[key]) FOR JSON PATH)) AS metas_outros,
    JSON_QUERY((SELECT value AS objeto FROM OPENJSON(@regrasAntes) WHERE JSON_VALUE(value,'$.indicadorId')<>N'2' ORDER BY TRY_CONVERT(INT,[key]) FOR JSON PATH)) AS regras_outros
    FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
  SET @hashProtegidoAntes=HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@protegidoAntes));

  SET @alvosProtegidosAntes=(SELECT
    JSON_QUERY((SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,
      unidade_medida,tipo_calculo,ativo,created_at,updated_at FROM dbo.indicadores WHERE id=@indicadorId
      FOR JSON PATH,INCLUDE_NULL_VALUES)) AS indicador,
    JSON_QUERY((SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
      observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
      FROM dbo.lancamentos WHERE id IN(N'13',N'14',N'15',N'16',N'17',N'18',N'19',N'20',N'21',N'22',N'23',N'24')
      ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS lancamentos,
    JSON_QUERY((SELECT chave,updated_at FROM dbo.configuracoes WHERE chave IN(N'metas',N'regrasIndicadores') ORDER BY chave
      FOR JSON PATH,INCLUDE_NULL_VALUES)) AS configuracoes
    FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
  SET @hashAlvosProtegidosAntes=HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@alvosProtegidosAntes));

  UPDATE dbo.indicadores
  SET tipo_consolidacao=N'resultado_pesquisa_ou_ultima_posicao',
      meta_anual=N'Curva 2026: 55 pontos no 1TRI, 58 em ABR/MAI e 60 pontos de JUN a DEZ.',
      formula_referencia=N'NPS = (% promotores - % detratores) × 100; o resultado mensal pode carregar a última pesquisa disponível.',
      observacao_acompanhamento=N'Planilha 16.10 para acompanhamento mensal; Informes 0029/0056/0078 para os fechamentos trimestrais.'
  WHERE id=@indicadorId;
  SET @linhasIndicadores=@@ROWCOUNT;
  IF @linhasIndicadores<>1 THROW 53216,'Quantidade inesperada em dbo.indicadores.',1;

  UPDATE dbo.lancamentos
  SET meta_referencia=CASE id
        WHEN N'13' THEN N'55' WHEN N'14' THEN N'55' WHEN N'15' THEN N'55'
        WHEN N'16' THEN N'58' WHEN N'17' THEN N'58'
        ELSE N'60' END,
      resultado_calculado=CASE
        WHEN id IN(N'13',N'14',N'15',N'16',N'17') THEN N'55'
        WHEN id IN(N'18',N'19',N'20',N'21') THEN N'59.2'
        ELSE NULL END,
      resultado_oficial=CASE
        WHEN id IN(N'13',N'14',N'15',N'16',N'17') THEN N'55'
        WHEN id IN(N'18',N'19',N'20',N'21') THEN N'59.2'
        ELSE NULL END,
      percentual_atingido=CASE
        WHEN id IN(N'13',N'14',N'15') THEN N'1'
        WHEN id IN(N'16',N'17') THEN N'0.948275862068965517'
        WHEN id=N'18' THEN N'0.9866'
        WHEN id IN(N'19',N'20') THEN N'0.986666666666666667'
        WHEN id=N'21' THEN N'0.9866'
        ELSE NULL END,
      situacao=CASE
        WHEN id IN(N'13',N'14',N'15') THEN N'Atingido'
        WHEN id BETWEEN N'16' AND N'21' THEN N'Abaixo da meta'
        ELSE NULL END,
      status=CASE WHEN id BETWEEN N'13' AND N'21' THEN N'Em preenchimento' ELSE N'Não iniciado' END,
      dados_entrada_json=CASE id
        WHEN N'13' THEN N'{"tipoPosicaoNPS":"ultima_pesquisa_disponivel","metaReferenciaCompetenciaNPS":55,"resultadoDocumentalNPS":55,"fontePesquisaNPS":"Planilha 16.10","homologadoDiretoriaHistorico":true,"fonteHomologacaoHistorica":"Planilha 16.10","observacaoArea":"Acompanhamento mensal pela última pesquisa disponível; não representa nova pesquisa nem homologação transacional."}'
        WHEN N'14' THEN N'{"tipoPosicaoNPS":"ultima_pesquisa_disponivel","metaReferenciaCompetenciaNPS":55,"resultadoDocumentalNPS":55,"fontePesquisaNPS":"Planilha 16.10","homologadoDiretoriaHistorico":true,"fonteHomologacaoHistorica":"Planilha 16.10","observacaoArea":"Acompanhamento mensal pela última pesquisa disponível; não representa nova pesquisa nem homologação transacional."}'
        WHEN N'15' THEN N'{"tipoPosicaoNPS":"Baseline","metaReferenciaCompetenciaNPS":55,"npsApurado":55,"resultadoDocumentalNPS":55,"metaDocumentalNPS":55,"percentualAtingidoOficialNPS":1,"dataBasePesquisaNPS":"2026-03-31","fontePesquisaNPS":"Informe DILOT/GERIN nº 0029/2026","homologadoDiretoriaHistorico":true,"fonteHomologacaoHistorica":"Planilha 16.10","observacaoArea":"Fechamento documental do 1TRI; não homologado no fluxo transacional atual."}'
        WHEN N'16' THEN N'{"tipoPosicaoNPS":"ultima_pesquisa_disponivel","metaReferenciaCompetenciaNPS":58,"resultadoDocumentalNPS":55,"fontePesquisaNPS":"Planilha 16.10","observacaoArea":"Acompanhamento mensal pela última pesquisa disponível; não representa nova pesquisa."}'
        WHEN N'17' THEN N'{"tipoPosicaoNPS":"ultima_pesquisa_disponivel","metaReferenciaCompetenciaNPS":58,"resultadoDocumentalNPS":55,"fontePesquisaNPS":"Planilha 16.10","observacaoArea":"Acompanhamento mensal pela última pesquisa disponível; não representa nova pesquisa."}'
        WHEN N'18' THEN N'{"tipoPosicaoNPS":"Pesquisa oficial","metaReferenciaCompetenciaNPS":60,"percentualPromotores":0.7263,"percentualDetratores":0.1343,"totalRespondentesNPS":48003,"quantidadePromotoresNPS":34863,"quantidadeNeutrosNPS":6694,"quantidadeDetratoresNPS":6446,"npsApurado":59.2,"resultadoDocumentalNPS":59.2,"metaDocumentalNPS":60,"percentualAtingidoOficialNPS":0.9866,"fontePesquisaNPS":"Informe DILOT/GERIN nº 0056/2026","observacaoArea":"Fechamento do 2TRI com meta oficial de 60 pontos; a meta 58 é exclusiva do acompanhamento de ABR/MAI."}'
        WHEN N'19' THEN N'{"tipoPosicaoNPS":"ultima_pesquisa_disponivel","metaReferenciaCompetenciaNPS":60,"resultadoDocumentalNPS":59.2,"fontePesquisaNPS":"Planilha 16.10","observacaoArea":"Acompanhamento mensal pela última pesquisa disponível; não representa nova pesquisa."}'
        WHEN N'20' THEN N'{"tipoPosicaoNPS":"ultima_pesquisa_disponivel","metaReferenciaCompetenciaNPS":60,"resultadoDocumentalNPS":59.2,"fontePesquisaNPS":"Planilha 16.10","observacaoArea":"Acompanhamento mensal pela última pesquisa disponível; não representa nova pesquisa."}'
        WHEN N'21' THEN N'{"tipoPosicaoNPS":"ultima_pesquisa_disponivel","metaReferenciaCompetenciaNPS":60,"resultadoDocumentalNPS":59.2,"metaDocumentalNPS":60,"percentualAtingidoOficialNPS":0.9866,"fontePesquisaNPS":"Informe DILOT/GERIN nº 0078/2026","observacaoArea":"Sem nova pesquisa no 3TRI; mantida a última posição disponível. Nova apuração prevista para OUT/2026."}'
        WHEN N'22' THEN N'{"tipoPosicaoNPS":"Acompanhamento","metaReferenciaCompetenciaNPS":60,"observacaoArea":"Nova pesquisa prevista para OUT/2026, ainda sem resultado confirmado."}'
        WHEN N'23' THEN N'{"tipoPosicaoNPS":"Acompanhamento","metaReferenciaCompetenciaNPS":60,"observacaoArea":"Sem resultado confirmado; zero da planilha não representa NPS realizado."}'
        WHEN N'24' THEN N'{"tipoPosicaoNPS":"Fechamento anual","metaReferenciaCompetenciaNPS":60,"observacaoArea":"Fechamento do 4TRI aguardando resultado; zero da planilha não representa NPS realizado."}'
      END
  WHERE indicador_id=@indicadorId AND ano=2026 AND id IN(N'13',N'14',N'15',N'16',N'17',N'18',N'19',N'20',N'21',N'22',N'23',N'24');
  SET @linhasLancamentos=@@ROWCOUNT;
  IF @linhasLancamentos<>12 THROW 53217,'Quantidade inesperada em dbo.lancamentos.',1;

  DECLARE @metasNovo NVARCHAR(MAX)=N'[]',@objeto NVARCHAR(MAX),@indice INT,@mes INT=1;
  DECLARE @idMeta INT,@proximoIdMeta INT;
  SELECT @proximoIdMeta=ISNULL(MAX(TRY_CONVERT(INT,JSON_VALUE(value,'$.id'))),0)+1 FROM OPENJSON(@metasAntes);
  DECLARE metas_cursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT TRY_CONVERT(INT,[key]),value FROM OPENJSON(@metasAntes)
    WHERE JSON_VALUE(value,'$.indicadorId')<>N'2' ORDER BY TRY_CONVERT(INT,[key]);
  OPEN metas_cursor;
  FETCH NEXT FROM metas_cursor INTO @indice,@objeto;
  WHILE @@FETCH_STATUS=0
  BEGIN
    SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(@objeto));
    FETCH NEXT FROM metas_cursor INTO @indice,@objeto;
  END;
  CLOSE metas_cursor;
  DEALLOCATE metas_cursor;

  WHILE @mes<=12
  BEGIN
    SELECT @idMeta=TRY_CONVERT(INT,JSON_VALUE(value,'$.id')) FROM OPENJSON(@metasAntes)
      WHERE JSON_VALUE(value,'$.indicadorId')=N'2' AND TRY_CONVERT(INT,JSON_VALUE(value,'$.mes'))=@mes;
    IF @idMeta IS NULL BEGIN SET @idMeta=@proximoIdMeta; SET @proximoIdMeta=@proximoIdMeta+1; END;
    SET @objeto=(SELECT @idMeta AS id,2 AS indicadorId,2026 AS ano,@mes AS mes,
      CASE @mes WHEN 1 THEN N'Janeiro' WHEN 2 THEN N'Fevereiro' WHEN 3 THEN N'Março' WHEN 4 THEN N'Abril'
        WHEN 5 THEN N'Maio' WHEN 6 THEN N'Junho' WHEN 7 THEN N'Julho' WHEN 8 THEN N'Agosto'
        WHEN 9 THEN N'Setembro' WHEN 10 THEN N'Outubro' WHEN 11 THEN N'Novembro' ELSE N'Dezembro' END AS nomeMes,
      CASE WHEN @mes<=3 THEN 55 WHEN @mes<=5 THEN 58 ELSE 60 END AS metaMensal,
      CASE WHEN @mes IN(3,6,9) THEN CONCAT(N'fechamento_',CASE @mes WHEN 3 THEN N'1tri_informe_0029_2026' WHEN 6 THEN N'2tri_informe_0056_2026' ELSE N'3tri_informe_0078_2026' END)
        WHEN @mes=12 THEN N'fechamento_4tri_aguardando_resultado'
        ELSE N'planilha_16_10_acompanhamento_mensal' END AS fonte
      FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
    SET @metasNovo=JSON_MODIFY(@metasNovo,'append $',JSON_QUERY(@objeto));
    SET @idMeta=NULL;
    SET @mes=@mes+1;
  END;

  UPDATE dbo.configuracoes SET valor_json=@metasNovo WHERE chave=N'metas';
  SET @linhasConfiguracoes=@linhasConfiguracoes+@@ROWCOUNT;

  SET @regraFinal=N'{"indicadorId":2,"nome":"Índice de Satisfação de Clientes — NPS","tipoCalculo":"nota_pesquisa_nps","tipoConsolidacao":"resultado_pesquisa_ou_ultima_posicao","metaRecorrente":false,"unidadeMedida":"pontos","metaAnualValor":60,"parametrosCalculo":{"campoTipoPosicao":"tipoPosicaoNPS","campoNps":"npsApurado","campoPromotores":"percentualPromotores","campoDetratores":"percentualDetratores","campoDataBase":"dataBasePesquisaNPS","campoFonte":"fontePesquisaNPS","campoResultadoDocumental":"resultadoDocumentalNPS","campoMetaDocumental":"metaDocumentalNPS","campoPercentualAtingidoOficial":"percentualAtingidoOficialNPS","metaTipo":"meta_absoluta_por_competencia","baselineNPS":55,"notaReferenciaNPS":70,"percentualReducaoGap":0.2,"metaAnualMetodologica":60,"metaVigenteNPS2026":60,"referenciasPorCompetencia":{"2026-01":55,"2026-02":55,"2026-03":55,"2026-04":58,"2026-05":58,"2026-06":60,"2026-07":60,"2026-08":60,"2026-09":60,"2026-10":60,"2026-11":60,"2026-12":60},"contextoMetodologicoMeta58":{"valor":58,"uso":"meta_de_acompanhamento_abr_mai_2026","aplicaCompetencias":["2026-04","2026-05"]},"sentidoMeta":"quanto_maior_melhor","campoMetaReferencia":"metaReferenciaCompetenciaNPS","mesesFechamentoTrimestral":[3,6,9,12],"permiteAcompanhamentoMensal":true,"aprovacaoMeta60":{"documento":"Proposição DILOT/GERIN nº 0050/2026","data":"2026-08-06"},"apresentacoesOficiaisTrimestrais":{"1TRI/2026":{"metaOficialReportada":55,"resultadoOficialReportado":55,"percentualAtingidoOficialReportado":1,"situacaoOficial":"Atingido","fonte":"Informe DILOT/GERIN nº 0029/2026"},"2TRI/2026":{"metaOficialReportada":60,"resultadoOficialReportado":59.2,"percentualAtingidoOficialReportado":0.9866,"situacaoOficial":"Abaixo da meta","fonte":"Informe DILOT/GERIN nº 0056/2026"},"3TRI/2026":{"metaOficialReportada":60,"resultadoOficialReportado":59.2,"percentualAtingidoOficialReportado":0.9866,"situacaoOficial":"Abaixo da meta","semNovaPesquisa":true,"proximaApuracao":"2026-10","fonte":"Informe DILOT/GERIN nº 0078/2026"},"4TRI/2026":{"metaOficialReportada":60,"resultadoOficialReportado":null,"percentualAtingidoOficialReportado":null,"situacaoOficial":null,"fonte":null}}},"camposEntrada":[{"nome":"tipoPosicaoNPS","rotulo":"Tipo da posição","tipo":"selecao","obrigatorio":true,"opcoes":["Baseline","Acompanhamento","Pesquisa oficial",{"value":"ultima_pesquisa_disponivel","label":"Última pesquisa disponível"},"Revisão metodológica","Fechamento anual"]},{"nome":"metaReferenciaCompetenciaNPS","rotulo":"Meta de referência da competência","tipo":"numero","obrigatorio":false,"somenteLeitura":true},{"nome":"percentualPromotores","rotulo":"Percentual de promotores","tipo":"percentual","obrigatorio":false,"entradaPtBr":true},{"nome":"percentualDetratores","rotulo":"Percentual de detratores","tipo":"percentual","obrigatorio":false,"entradaPtBr":true},{"nome":"totalRespondentesNPS","rotulo":"Total de respondentes","tipo":"inteiro","obrigatorio":false},{"nome":"quantidadePromotoresNPS","rotulo":"Quantidade de promotores","tipo":"inteiro","obrigatorio":false},{"nome":"quantidadeNeutrosNPS","rotulo":"Quantidade de neutros","tipo":"inteiro","obrigatorio":false},{"nome":"quantidadeDetratoresNPS","rotulo":"Quantidade de detratores","tipo":"inteiro","obrigatorio":false},{"nome":"npsApurado","rotulo":"NPS calculado","tipo":"numero","obrigatorio":false,"somenteLeitura":true},{"nome":"resultadoDocumentalNPS","rotulo":"Resultado documental NPS","tipo":"numero","obrigatorio":false},{"nome":"metaDocumentalNPS","rotulo":"Meta documental NPS","tipo":"numero","obrigatorio":false},{"nome":"percentualAtingidoOficialNPS","rotulo":"Atingimento oficial documental","tipo":"percentual","obrigatorio":false,"escalaPercentual":"decimal"},{"nome":"dataBasePesquisaNPS","rotulo":"Data-base da pesquisa","tipo":"data","obrigatorio":false},{"nome":"fontePesquisaNPS","rotulo":"Fonte/evidência da pesquisa","tipo":"texto","obrigatorio":false},{"nome":"observacaoArea","rotulo":"Observação da área","tipo":"texto","obrigatorio":false}],"campoResultadoPrincipal":"npsApurado","campoPercentualAtingido":"percentualAtingidoMensal","exigeJustificativa":false,"exigeEvidencia":true,"resultadoOficial":"resultado_pesquisa_ou_ultima_posicao_homologada","exigirHomologacaoTransacionalVersaoAtual":true}';
  SET @regrasDepois=JSON_MODIFY(@regrasAntes,'$[1]',JSON_QUERY(@regraFinal));
  UPDATE dbo.configuracoes SET valor_json=@regrasDepois WHERE chave=N'regrasIndicadores';
  SET @linhasConfiguracoes=@linhasConfiguracoes+@@ROWCOUNT;
  IF @linhasConfiguracoes<>2 THROW 53218,'Quantidade inesperada em dbo.configuracoes.',1;

  SELECT @metasDepois=valor_json FROM dbo.configuracoes WHERE chave=N'metas';
  SELECT @regrasDepois=valor_json FROM dbo.configuracoes WHERE chave=N'regrasIndicadores';

  IF EXISTS(SELECT 1 FROM dbo.indicadores WHERE id=@indicadorId AND
    (tipo_consolidacao<>N'resultado_pesquisa_ou_ultima_posicao' OR tipo_calculo<>N'nota_pesquisa_nps' OR
     unidade_apuradora<>N'SUCOL' OR diretoria_responsavel<>N'DICOT'))
    THROW 53219,'Pós-condição do cadastro do Indicador 02 inválida.',1;
  IF EXISTS(SELECT 1 FROM dbo.lancamentos WHERE id IN(N'13',N'14',N'15',N'16',N'17',N'18',N'19',N'20',N'21') AND status<>N'Em preenchimento')
     OR EXISTS(SELECT 1 FROM dbo.lancamentos WHERE id IN(N'22',N'23',N'24') AND status<>N'Não iniciado')
    THROW 53220,'Pós-condição de status inválida.',1;
  IF EXISTS(SELECT 1 FROM dbo.lancamentos WHERE id IN(N'13',N'14',N'15') AND
    (meta_referencia<>N'55' OR resultado_calculado<>N'55' OR resultado_oficial<>N'55' OR percentual_atingido<>N'1' OR
     situacao<>N'Atingido' OR JSON_VALUE(dados_entrada_json,'$.homologadoDiretoriaHistorico')<>N'true' OR
     JSON_VALUE(dados_entrada_json,'$.fonteHomologacaoHistorica')<>N'Planilha 16.10'))
    THROW 53221,'Pós-condição de JAN–MAR inválida.',1;
  IF EXISTS(SELECT 1 FROM dbo.lancamentos WHERE id IN(N'16',N'17') AND
    (meta_referencia<>N'58' OR resultado_calculado<>N'55' OR resultado_oficial<>N'55' OR
     TRY_CONVERT(DECIMAL(38,18),percentual_atingido) IS NULL OR
     TRY_CONVERT(DECIMAL(38,18),percentual_atingido)<>CAST(N'0.948275862068965517' AS DECIMAL(38,18)) OR
     situacao<>N'Abaixo da meta' OR JSON_VALUE(dados_entrada_json,'$.tipoPosicaoNPS')<>N'ultima_pesquisa_disponivel'))
    THROW 53222,'Pós-condição de ABR/MAI inválida.',1;
  IF EXISTS(SELECT 1 FROM dbo.lancamentos WHERE id=N'18' AND
    (meta_referencia<>N'60' OR resultado_calculado<>N'59.2' OR resultado_oficial<>N'59.2' OR percentual_atingido<>N'0.9866' OR
     situacao<>N'Abaixo da meta' OR JSON_VALUE(dados_entrada_json,'$.totalRespondentesNPS')<>N'48003' OR
     JSON_VALUE(dados_entrada_json,'$.quantidadePromotoresNPS')<>N'34863' OR
     JSON_VALUE(dados_entrada_json,'$.quantidadeNeutrosNPS')<>N'6694' OR JSON_VALUE(dados_entrada_json,'$.quantidadeDetratoresNPS')<>N'6446'))
    THROW 53223,'Pós-condição de JUN inválida.',1;
  IF EXISTS(SELECT 1 FROM dbo.lancamentos WHERE id IN(N'19',N'20') AND
    (meta_referencia<>N'60' OR resultado_calculado<>N'59.2' OR resultado_oficial<>N'59.2' OR
     JSON_VALUE(dados_entrada_json,'$.tipoPosicaoNPS')<>N'ultima_pesquisa_disponivel' OR
     JSON_VALUE(dados_entrada_json,'$.percentualPromotores') IS NOT NULL OR JSON_VALUE(dados_entrada_json,'$.totalRespondentesNPS') IS NOT NULL))
    THROW 53224,'Pós-condição de JUL/AGO inválida.',1;
  IF EXISTS(SELECT 1 FROM dbo.lancamentos WHERE id=N'21' AND
    (meta_referencia<>N'60' OR resultado_calculado<>N'59.2' OR resultado_oficial<>N'59.2' OR percentual_atingido<>N'0.9866' OR
     situacao<>N'Abaixo da meta' OR JSON_VALUE(dados_entrada_json,'$.tipoPosicaoNPS')<>N'ultima_pesquisa_disponivel'))
    THROW 53225,'Pós-condição de SET inválida.',1;
  IF EXISTS(SELECT 1 FROM dbo.lancamentos WHERE id IN(N'22',N'23',N'24') AND
    (meta_referencia<>N'60' OR resultado_calculado IS NOT NULL OR resultado_oficial IS NOT NULL OR percentual_atingido IS NOT NULL OR situacao IS NOT NULL))
    THROW 53226,'Pós-condição de OUT–DEZ inválida.',1;

  IF (SELECT COUNT(*) FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value,'$.indicadorId')=N'2')<>12
    THROW 53227,'Configuração metas não contém as 12 competências.',1;
  IF EXISTS(SELECT 1 FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value,'$.indicadorId')=N'2' AND
    TRY_CONVERT(INT,JSON_VALUE(value,'$.metaMensal'))<>
      CASE WHEN TRY_CONVERT(INT,JSON_VALUE(value,'$.mes'))<=3 THEN 55 WHEN TRY_CONVERT(INT,JSON_VALUE(value,'$.mes'))<=5 THEN 58 ELSE 60 END)
    THROW 53228,'Curva final 55/58/60 inválida em metas.',1;
  DECLARE @regraDepoisObjeto NVARCHAR(MAX);
  SELECT @regraDepoisObjeto=value FROM OPENJSON(@regrasDepois) WHERE JSON_VALUE(value,'$.indicadorId')=N'2';
  IF (SELECT COUNT(*) FROM OPENJSON(@regrasDepois))<>23
     OR JSON_VALUE(@regrasDepois,'$[1].indicadorId')<>N'2'
     OR (SELECT COUNT(*) FROM OPENJSON(@regrasDepois) WHERE JSON_VALUE(value,'$.indicadorId')=N'2')<>1
    THROW 53236,'Quantidade, indice ou unicidade da regra final do Indicador 02 divergiu.',1;
  IF EXISTS(
    SELECT 1
    FROM OPENJSON(@regrasAntes) a
    FULL JOIN OPENJSON(@regrasDepois) d ON d.[key]=a.[key]
    WHERE ISNULL(a.[key],d.[key])<>N'1'
      AND (a.[key] IS NULL OR d.[key] IS NULL OR a.value<>d.value OR a.type<>d.type)
  ) THROW 53237,'As outras 22 regras ou sua ordem foram alteradas.',1;
  IF JSON_QUERY(@regraDepoisObjeto,'$.parametrosCalculo.mesesFechamentoTrimestral')<>N'[3,6,9,12]'
    THROW 53229,'Fechamentos trimestrais inválidos na regra.',1;
  IF JSON_VALUE(@regraDepoisObjeto,'$.exigirHomologacaoTransacionalVersaoAtual')<>N'true'
    THROW 53230,'Proteção transacional do Resumo Executivo ausente.',1;

  SET @governancaDepois=(SELECT
    JSON_QUERY((SELECT * FROM dbo.homologacoes ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS homologacoes,
    JSON_QUERY((SELECT * FROM dbo.evidencias ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS evidencias,
    JSON_QUERY((SELECT * FROM dbo.auditoria ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS auditoria,
    JSON_QUERY((SELECT * FROM dbo.retificacoes ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS retificacoes,
    JSON_QUERY((SELECT * FROM dbo.solicitacoes_reabertura ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS reaberturas
    FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
  SET @hashGovernancaDepois=HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@governancaDepois));
  IF @hashGovernancaAntes<>@hashGovernancaDepois OR @governancaAntes<>@governancaDepois
    THROW 53231,'Governança foi alterada pela migration.',1;

  SET @protegidoDepois=(SELECT
    JSON_QUERY((SELECT * FROM dbo.indicadores WHERE id<>@indicadorId ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS indicadores_outros,
    JSON_QUERY((SELECT * FROM dbo.lancamentos WHERE id NOT IN(N'13',N'14',N'15',N'16',N'17',N'18',N'19',N'20',N'21',N'22',N'23',N'24') ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS lancamentos_outros,
    JSON_QUERY((SELECT * FROM dbo.configuracoes WHERE chave NOT IN(N'metas',N'regrasIndicadores') ORDER BY chave FOR JSON PATH,INCLUDE_NULL_VALUES)) AS configuracoes_outras,
    JSON_QUERY((SELECT value AS objeto FROM OPENJSON(@metasDepois) WHERE JSON_VALUE(value,'$.indicadorId')<>N'2' ORDER BY TRY_CONVERT(INT,[key]) FOR JSON PATH)) AS metas_outros,
    JSON_QUERY((SELECT value AS objeto FROM OPENJSON(@regrasDepois) WHERE JSON_VALUE(value,'$.indicadorId')<>N'2' ORDER BY TRY_CONVERT(INT,[key]) FOR JSON PATH)) AS regras_outros
    FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
  SET @hashProtegidoDepois=HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@protegidoDepois));
  IF @hashProtegidoAntes<>@hashProtegidoDepois OR @protegidoAntes<>@protegidoDepois
    THROW 53232,'Dados fora do escopo foram alterados.',1;

  SET @alvosProtegidosDepois=(SELECT
    JSON_QUERY((SELECT id,numero,nome,plano,pilar,unidade_apuradora,diretoria_responsavel,periodicidade,
      unidade_medida,tipo_calculo,ativo,created_at,updated_at FROM dbo.indicadores WHERE id=@indicadorId
      FOR JSON PATH,INCLUDE_NULL_VALUES)) AS indicador,
    JSON_QUERY((SELECT id,indicador_id,competencia,ano,mes,trimestre,plano,pilar,unidade_apuradora,diretoria_responsavel,
      observacao_unidade,evidencia_id,usuario_responsavel,created_at,updated_at,referencia_evidencia,versao_atual
      FROM dbo.lancamentos WHERE id IN(N'13',N'14',N'15',N'16',N'17',N'18',N'19',N'20',N'21',N'22',N'23',N'24')
      ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)) AS lancamentos,
    JSON_QUERY((SELECT chave,updated_at FROM dbo.configuracoes WHERE chave IN(N'metas',N'regrasIndicadores') ORDER BY chave
      FOR JSON PATH,INCLUDE_NULL_VALUES)) AS configuracoes
    FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
  SET @hashAlvosProtegidosDepois=HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@alvosProtegidosDepois));
  IF @hashAlvosProtegidosAntes<>@hashAlvosProtegidosDepois OR @alvosProtegidosAntes<>@alvosProtegidosDepois
    THROW 53233,'Versões, usuários, timestamps ou outros campos protegidos foram alterados.',1;

  COMMIT TRANSACTION;
  SELECT N'COMMIT' AS transacao,@linhasIndicadores AS linhas_indicadores,
    @linhasLancamentos AS linhas_lancamentos,@linhasConfiguracoes AS linhas_configuracoes,
    0 AS registros_criados,0 AS registros_removidos,@migration AS migration;
END TRY
BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
