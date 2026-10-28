/*
  Carga documental complementar das observações literais do 3TRI/2026.
  Fonte soberana: docs/manifesto-observacoes-3tri-2026.yaml.
  SHA-256 do manifesto: bf8b52cb270345db3ba1999181c2fc55ad4c32d1bde76b727fb8709bb98ec45f.
  Compatibilidade: SQL Server 2016 e compatibility level 130.

  Esta migration exige a arquitetura documental já aplicada pelo 1TRI.
  O único DML persistente permitido é a inclusão das 23 observações de SET/2026.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @migration NVARCHAR(255)=N'20261028_002_observacoes_documentais_3tri_2026.sql';
DECLARE @migration1tri NVARCHAR(255)=N'20261027_003_observacoes_documentais_1tri_2026.sql';
DECLARE @migration2tri NVARCHAR(255)=N'20261028_001_observacoes_documentais_2tri_2026.sql';
DECLARE @tipo NVARCHAR(100)=N'OBSERVACAO_AREA_INFORME_TRIMESTRAL';
DECLARE @manifestoFonteSha256 CHAR(64)='bf8b52cb270345db3ba1999181c2fc55ad4c32d1bde76b727fb8709bb98ec45f';
DECLARE @transacaoPropria BIT=CASE WHEN @@TRANCOUNT=0 THEN 1 ELSE 0 END;
DECLARE @linhasInseridas INT=0;

BEGIN TRY
  IF @transacaoPropria=1 BEGIN TRANSACTION;

  IF OBJECT_ID(N'dbo.lancamentos_observacoes_documentais',N'U') IS NULL
    THROW 53501,N'Camada documental obrigatoria nao encontrada; nenhuma estrutura sera criada por esta migration.',1;

  IF (SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.lancamentos_observacoes_documentais'))<>18
    THROW 53401,N'Tabela documental existente com quantidade de colunas incompatível.',1;
  IF EXISTS(
    SELECT 1 FROM (VALUES
      (N'id',N'nvarchar',200,0,0),(N'lancamento_id',N'nvarchar',200,0,0),(N'indicador_id',N'nvarchar',200,0,0),
      (N'competencia',N'nvarchar',80,0,0),(N'ano',N'int',4,0,0),(N'mes',N'int',4,0,0),
      (N'versao_lancamento',N'int',4,0,0),(N'tipo_observacao',N'nvarchar',200,0,0),(N'observacao',N'nvarchar',-1,0,0),
      (N'fonte_documental',N'nvarchar',1000,0,0),(N'paginas_documento',N'nvarchar',200,0,0),
      (N'sha256_observacao',N'char',64,0,0),(N'sha256_documento_declarado',N'char',64,0,0),
      (N'sha256_arquivo_fisico',N'char',64,0,0),(N'documento_referencia',N'nvarchar',1000,0,0),
      (N'substitui_observacao_id',N'nvarchar',200,1,0),(N'origem_registro',N'nvarchar',510,0,0),
      (N'criado_em',N'datetime2',6,0,0)
    ) esperado(nome,tipo,maximo,aceita_nulo,escala)
    LEFT JOIN sys.columns c ON c.object_id=OBJECT_ID(N'dbo.lancamentos_observacoes_documentais') AND c.name=esperado.nome
    LEFT JOIN sys.types t ON t.user_type_id=c.user_type_id
    WHERE c.column_id IS NULL OR t.name<>esperado.tipo OR c.max_length<>esperado.maximo
      OR c.is_nullable<>esperado.aceita_nulo OR c.scale<>esperado.escala
  ) THROW 53401,N'Tabela documental existente com tipos de colunas incompatíveis.',1;
  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.lancamentos_observacoes_documentais') AND name=N'uq_lanc_obs_doc_identidade' AND is_unique=1 AND has_filter=0)
    OR NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.lancamentos_observacoes_documentais') AND name=N'uq_lanc_obs_doc_substituicao' AND is_unique=1 AND has_filter=1)
    OR NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.lancamentos_observacoes_documentais') AND name=N'ix_lanc_obs_doc_leitura' AND is_unique=0)
    THROW 53401,N'Tabela documental existente com índices incompatíveis.',1;
  IF NOT EXISTS(
    SELECT 1 FROM sys.key_constraints kc
    JOIN sys.index_columns ic ON ic.object_id=kc.parent_object_id AND ic.index_id=kc.unique_index_id AND ic.key_ordinal=1
    JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
    WHERE kc.parent_object_id=OBJECT_ID(N'dbo.lancamentos_observacoes_documentais')
      AND kc.name=N'pk_lancamentos_observacoes_documentais' AND kc.type=N'PK' AND c.name=N'id'
      AND NOT EXISTS(SELECT 1 FROM sys.index_columns extra WHERE extra.object_id=ic.object_id AND extra.index_id=ic.index_id AND extra.key_ordinal>1)
  ) THROW 53401,N'Chave primária documental incompatível.',1;
  DECLARE @indiceIdentidade INT=(SELECT index_id FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.lancamentos_observacoes_documentais') AND name=N'uq_lanc_obs_doc_identidade');
  DECLARE @indiceSubstituicao INT=(SELECT index_id FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.lancamentos_observacoes_documentais') AND name=N'uq_lanc_obs_doc_substituicao');
  DECLARE @indiceLeitura INT=(SELECT index_id FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.lancamentos_observacoes_documentais') AND name=N'ix_lanc_obs_doc_leitura');
  IF (SELECT COUNT(*) FROM sys.index_columns WHERE object_id=OBJECT_ID(N'dbo.lancamentos_observacoes_documentais') AND index_id=@indiceIdentidade AND key_ordinal>0)<>6
    OR EXISTS(
      SELECT 1 FROM (VALUES(1,N'lancamento_id',0),(2,N'versao_lancamento',0),(3,N'competencia',0),(4,N'tipo_observacao',0),(5,N'sha256_documento_declarado',0),(6,N'sha256_observacao',0)) esperado(ordem,coluna,descendente)
      LEFT JOIN sys.index_columns ic ON ic.object_id=OBJECT_ID(N'dbo.lancamentos_observacoes_documentais') AND ic.index_id=@indiceIdentidade AND ic.key_ordinal=esperado.ordem
      LEFT JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
      WHERE c.name<>esperado.coluna OR ic.is_descending_key<>esperado.descendente OR c.name IS NULL
    ) THROW 53401,N'Índice de identidade documental com chaves incompatíveis.',1;
  IF (SELECT COUNT(*) FROM sys.index_columns WHERE object_id=OBJECT_ID(N'dbo.lancamentos_observacoes_documentais') AND index_id=@indiceSubstituicao AND key_ordinal>0)<>1
    OR NOT EXISTS(
      SELECT 1 FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
      WHERE ic.object_id=OBJECT_ID(N'dbo.lancamentos_observacoes_documentais') AND ic.index_id=@indiceSubstituicao AND ic.key_ordinal=1 AND c.name=N'substitui_observacao_id'
    ) OR NOT EXISTS(
      SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.lancamentos_observacoes_documentais') AND index_id=@indiceSubstituicao
        AND CHARINDEX(N'substitui_observacao_id',filter_definition)>0 AND CHARINDEX(N'IS NOT NULL',UPPER(filter_definition))>0
    ) THROW 53401,N'Índice filtrado de substituição com definição incompatível.',1;
  IF (SELECT COUNT(*) FROM sys.index_columns WHERE object_id=OBJECT_ID(N'dbo.lancamentos_observacoes_documentais') AND index_id=@indiceLeitura AND key_ordinal>0)<>6
    OR EXISTS(
      SELECT 1 FROM (VALUES(1,N'lancamento_id',0),(2,N'versao_lancamento',0),(3,N'ano',0),(4,N'mes',0),(5,N'tipo_observacao',0),(6,N'criado_em',1)) esperado(ordem,coluna,descendente)
      LEFT JOIN sys.index_columns ic ON ic.object_id=OBJECT_ID(N'dbo.lancamentos_observacoes_documentais') AND ic.index_id=@indiceLeitura AND ic.key_ordinal=esperado.ordem
      LEFT JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
      WHERE c.name<>esperado.coluna OR ic.is_descending_key<>esperado.descendente OR c.name IS NULL
    ) THROW 53401,N'Índice de leitura documental com chaves incompatíveis.',1;
  IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.lancamentos_observacoes_documentais') AND name=N'fk_lanc_obs_doc_lancamento' AND referenced_object_id=OBJECT_ID(N'dbo.lancamentos') AND is_disabled=0 AND is_not_trusted=0)
    OR NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.lancamentos_observacoes_documentais') AND name=N'fk_lanc_obs_doc_indicador' AND referenced_object_id=OBJECT_ID(N'dbo.indicadores') AND is_disabled=0 AND is_not_trusted=0)
    OR NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.lancamentos_observacoes_documentais') AND name=N'fk_lanc_obs_doc_substituida' AND referenced_object_id=OBJECT_ID(N'dbo.lancamentos_observacoes_documentais') AND is_disabled=0 AND is_not_trusted=0)
    THROW 53401,N'Tabela documental existente com chaves estrangeiras incompatíveis.',1;
  IF EXISTS(
    SELECT 1 FROM (VALUES(N'ck_lanc_obs_doc_mes'),(N'ck_lanc_obs_doc_versao'),(N'ck_lanc_obs_doc_tipo'),(N'ck_lanc_obs_doc_nao_autossubstitui'),(N'ck_lanc_obs_doc_hashes')) esperada(nome)
    LEFT JOIN sys.check_constraints c ON c.parent_object_id=OBJECT_ID(N'dbo.lancamentos_observacoes_documentais') AND c.name=esperada.nome
    WHERE c.object_id IS NULL OR c.is_disabled=1 OR c.is_not_trusted=1
  ) THROW 53401,N'Tabela documental existente com checks incompatíveis.',1;
  IF NOT EXISTS(
    SELECT 1 FROM sys.default_constraints d JOIN sys.columns c ON c.object_id=d.parent_object_id AND c.column_id=d.parent_column_id
    WHERE d.parent_object_id=OBJECT_ID(N'dbo.lancamentos_observacoes_documentais') AND d.name=N'df_lanc_obs_doc_criado_em' AND c.name=N'criado_em'
  ) THROW 53401,N'Default de criação documental incompatível.',1;
  IF OBJECT_ID(N'dbo.tr_lanc_obs_doc_integridade_insert',N'TR') IS NULL OR OBJECT_ID(N'dbo.tr_lanc_obs_doc_append_only',N'TR') IS NULL
    THROW 53401,N'Tabela documental existente sem os triggers obrigatórios.',1;
  IF EXISTS(SELECT 1 FROM sys.triggers WHERE object_id IN(OBJECT_ID(N'dbo.tr_lanc_obs_doc_integridade_insert'),OBJECT_ID(N'dbo.tr_lanc_obs_doc_append_only')) AND is_disabled=1)
    OR NOT EXISTS(SELECT 1 FROM sys.trigger_events WHERE object_id=OBJECT_ID(N'dbo.tr_lanc_obs_doc_integridade_insert') AND type_desc=N'INSERT')
    OR NOT EXISTS(SELECT 1 FROM sys.trigger_events WHERE object_id=OBJECT_ID(N'dbo.tr_lanc_obs_doc_append_only') AND type_desc=N'UPDATE')
    OR NOT EXISTS(SELECT 1 FROM sys.trigger_events WHERE object_id=OBJECT_ID(N'dbo.tr_lanc_obs_doc_append_only') AND type_desc=N'DELETE')
    THROW 53401,N'Triggers documentais existentes com eventos incompatíveis.',1;


  IF @manifestoFonteSha256<>'bf8b52cb270345db3ba1999181c2fc55ad4c32d1bde76b727fb8709bb98ec45f'
    THROW 53502,N'Hash de autoridade do manifesto divergente.',1;

  DECLARE @manifesto NVARCHAR(MAX)=N'';
SET @manifesto += N'[{"id":"observacao-documental-3tri-2026-ind-01","indicadorId":"1","lancamentoId":"9","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_TRIMESTRAL","observacao":"▪ O resultado permanece positivo, demonstrando a evolução de ações no que se referem a qualificação da base de clientes.\n\n▪ No período, foram realizadas campanhas via push voltadas à divulgação dos produtos de loterias, promoção do Jogo Responsável e comunicação de concursos especiais.\n\n▪ A Lotofácil da Independência foi o principal destaque, concentrando 11 campanhas, número superior ao dos demais impulsionamentos realizados no período. A maior recorrência de comunicações contribuiu para que o concurso especial apresentasse também maior alcance entre as campanhas realizadas.\n\n▪ As ações reforçam a utilização do canal push como instrumento de ativação e relacionamento com a base de clientes, especialmente em períodos estratégicos associados aos concursos especiais.","fonteDocumental":"Informe DILOT/GERIN nº 0078/2026","paginasDocumento":"6","sha256Observacao":"68edb59fa5ee54b415ff993dfc7858edd5ee9b49ae31d0f04fc7f1f5c431385c","sha256ObservacaoSqlUtf16":"76c787161b143acc2fb4c5885a93d7de73c302ccb98daeda513e60eeb33a7dfd","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"},{"id":"observacao-documental-3tri-2026-ind-02","indicadorId":"2","lancamentoId":"21","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_TRIMESTRAL","observacao":"▪ A CAIXA Loterias elevou o NPS de 55,0 para 59,2 pontos (+7,64%), ampliando a implementação das melhorias demandadas pelos clientes, consolidando a evolução da experiência e a voz do cliente. Nova apuração prevista para OUT/26.","fonteDocumental":"Informe DILOT/GERIN nº 0078/2026","paginasDocumento":"7","sha256Observacao":"4d5229f4d87afa4991f3c4357b9fe6a35e781d5f0c21362a941bbaa1e03fb845","sha256ObservacaoSqlUtf16":"482391573addb76245dcabdc91b9c52069df7b0d2267f3268a0d0a943504efe5","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"},{"id":"observacao-documental-3tri-2026-ind-03","indicadorId":"3","lancamentoId":"33","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_TRIMESTRAL","observacao":"▪ O resultado do indicador ratifica o sucesso das ações de aquisição, reativação e engajamento de clientes, além do impacto positivo das iniciativas de digitalização e personalização da jornada.\n\n▪ A média de clientes ativos de JAN a SET de 2026 foi de 3.079.049, um aumento de 52,70% em relação ao mesmo período do ano anterior (2.016.416).","fonteDocumental":"Informe DILOT/GERIN nº 0078/2026","paginasDocumento":"7","sha256Observacao":"ac24b6f1604f85fe864175bfe38';
SET @manifesto += N'1f591a349a104366ca113bd2ce8b313b6db11","sha256ObservacaoSqlUtf16":"bc7a536670b9b0dd44e1174a03f1e8ae0ef7538b1aee0a43286711e648cad8d3","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"},{"id":"observacao-documental-3tri-2026-ind-04","indicadorId":"4","lancamentoId":"45","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_TRIMESTRAL","observacao":"▪ A partir da realização da pesquisa NPS de baseline de 2025, foram definidas 22 melhorias como plano de trabalho ao longo do ano de 2026, em que para atingimento da meta anual do indicador para o ano é necessária a entrega de ao menos 06 melhorias, representando assim a meta de 25% das ocorrências apontadas.\n\n▪ As melhorias mapeadas demandam implantação junto à área de TI da CAIXA.\n\n▪ Nesse sentido, convém relembrar que a curva definida para o ano foi estruturada trimestralmente da seguinte forma:\n\n▪ 1TRI26: 4,54% - entrega de 01 melhoria do plano de trabalho de 2026;\n▪ 2TRI26: 13,64% - entrega de 03 melhorias (acumuladas) do plano de trabalho de 2026;\n▪ 3TRI26: 18,18% - entrega de 04 melhorias (acumuladas) do plano de trabalho de 2026;\n▪ 4TRI26: 251% - entrega de 06 melhorias (acumuladas) do plano de trabalho de 2026.\n\n▪ Foram realizadas 6 entregas (acumuladas) no 3TRI/2026.\n\n▪ Durante o período do 3TRI2026, foram implementadas 02 melhorias, quais sejam:\n\ni) Login simplificado no Portal Loterias:\nA melhoria simplifica o processo de login no Portal Loterias Online, tornando o acesso do cliente mais direto e fluido.\nA atualização reduz etapas na jornada de entrada e facilita o acesso às funcionalidades disponíveis no Portal.\n\nii) Tela de Aviso de Instabilidade:\nA melhoria apresenta uma comunicação específica ao cliente quando houver indisponibilidade ou instabilidade que impeça o acesso normal aos serviços.\nA tela mantém o cliente informado sobre a situação, com uma mensagem clara e adequada ao contexto apresentado.\n\n1 O plano de trabalho previsto para atendimento desse indicador considera o escopo de 22 melhorias mapeadas posteriormente à definição da meta do presente indicador, conforme data da aprovação do PN 2026 da CAIXA Loterias.","fonteDocumental":"Informe DILOT/GERIN nº 0078/2026","paginasDocumento":"8, 9","sha256Observacao":"b0afbab02cb9c78f4ee1475ced2e1de992a90c1367ffb211e41746de5b2fb585","sha256ObservacaoSqlUtf16":"41e3749e7611b5a5f191edd180fab8d5cff226342976f1aa46400feff5f4a028","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"},{"id":"observacao-documental-3tri-2026-ind-05","indicadorId":"5","lancamentoId":"57","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_TRIMESTRAL","observacao":"▪ O desempenho vem mantendo o patamar mensal de arrecadação próx';
SET @manifesto += N'imo ao orçado, em que ações comerciais e de engajamento de clientes vem sendo desenvolvidas para incremento dos resultados nos próximos períodos, como o concurso especial Lotofácil da Independência e estratégias comerciais.","fonteDocumental":"Informe DILOT/GERIN nº 0078/2026","paginasDocumento":"9","sha256Observacao":"2f8a184a3470f80068dade33f78c5c956bd974833b2765101ae7c0267b07acaa","sha256ObservacaoSqlUtf16":"8cb8bbd51411f05ed57d2fd3ce72b3a4a0a87c277bfae08c02998bf805002425","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"},{"id":"observacao-documental-3tri-2026-ind-06","indicadorId":"6","lancamentoId":"69","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_TRIMESTRAL","observacao":"▪ Fórmula – percentual atingido:\n\nUma vez que um valor mais baixo indica maior eficiência, o percentual de atingimento é calculado considerando a seguinte fórmula:\n\n% Atingido = 1- ((realizado – meta) / (VRM – meta))\n\nVRM (Valor de Referência Mínimo): No caso do IEO, o VRM é igual a 100%.\n\nSetembro / 2026\n\nDespesas Gerais e Administrativas:   207.600.617,97\nDespesas com serviços de Pagamentos:   60.460.075,58\nOutras Despesas Operacionais:   321.534,28\nReceitas Operacionais:   1.850.907.955,34\nDespesas de Tributos:   201.813.909,75","fonteDocumental":"Informe DILOT/GERIN nº 0078/2026","paginasDocumento":"10","sha256Observacao":"6c4f0ccbe65515fa3661400daafeaf5ad7b1987ca1d4028d63e70f706025effb","sha256ObservacaoSqlUtf16":"c47ac33fc31eebef7013328d563fc9f1a82cc4333d4b5b0828279d8c6ef23c2a","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"},{"id":"observacao-documental-3tri-2026-ind-07","indicadorId":"7","lancamentoId":"81","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_TRIMESTRAL","observacao":"▪ Em julho/2026 a companhia obteve lucro líquido de R$ 780,6 milhões, receita total de R$ 1.545,8 milhões e despesas de R$ 765,2 milhões.\n\n▪ Em agosto/2026 a companhia obteve lucro líquido de R$ 900,8 milhões, receita total de R$ 1.781,8 milhões e despesas de R$ 881,0 milhões.\n\n▪ Em setembro/2026 a companhia obteve lucro líquido de R$ 1.040,09 milhões, receita total de R$ 2.060,4 milhões e despesas de R$ 1.019,4 milhões.","fonteDocumental":"Informe DILOT/GERIN nº 0078/2026","paginasDocumento":"11","sha256Observacao":"fe3d6ea34a3e74b95943811e0f9f9a2e137cd96cd0aa1486e341b8696c65e8ff","sha256ObservacaoSqlUtf16":"dea8f19fa2791625cbf29fc1d31f2eddf63e75088b221252e25c3f9d1f9a339a","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_20';
SET @manifesto += N'26_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"},{"id":"observacao-documental-3tri-2026-ind-08","indicadorId":"8","lancamentoId":"93","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_TRIMESTRAL","observacao":"▪ O desempenho dos canais digitais apresentou crescimento acima do esperado, quando comparado com o mesmo período do ano de 2025, registrando ao final do 3TRI2026 realizado de 29,17%, que corresponde a arrecadação de R$ 5,455 bilhões, e alcance da meta em 102,82%. Em 2025, no mesmo período foi registrada arrecadação de R$ 4,205 bilhões no Canal Eletrônico.\n\n▪ O resultado reforça a maturidade das iniciativas digitais, a maior adesão dos clientes aos canais eletrônicos e a efetividade das estratégias de estímulo à migração digital.","fonteDocumental":"Informe DILOT/GERIN nº 0078/2026","paginasDocumento":"11, 12","sha256Observacao":"e5bb6962ade9727af3adbbdd3105e31ef0cc865edd5ae4fa913adbb068488968","sha256ObservacaoSqlUtf16":"de4aae1a6194f7826c3dbfd550f05c90dec94019d44bc8dc5221c90d6451c7c7","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"},{"id":"observacao-documental-3tri-2026-ind-09","indicadorId":"9","lancamentoId":"105","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_TRIMESTRAL","observacao":"Cabe relembrar que a seguinte curva de meta foi definida para 2026:\n▪ 1TRI26: 61%;\n▪ 2TRI26: 62%;\n▪ 3TRI26: 63%;\n▪ 4TRI26: 65%.\n\n▪ Com R$ 3,538 bilhões acumulados até setembro de 2026, o indicador segue apresentando desempenho superior ao previsto para o exercício. A evolução observada ao longo do ano demonstra a continuidade da ampliação do uso do Pix nos canais eletrônicos, contribuindo para a sustentação dos resultados do período.\n\n▪ Com nove meses de execução, o desempenho do indicador demonstra estabilidade e consistência, evidenciando a manutenção da preferência dos clientes pelo pagamento via Pix nas compras realizadas pelos canais digitais. A evolução acumulada reforça a contribuição desse meio de pagamento para o aumento da eficiência operacional e para os resultados comerciais dos canais eletrônicos ao longo do exercício.","fonteDocumental":"Informe DILOT/GERIN nº 0078/2026","paginasDocumento":"12","sha256Observacao":"19eb82398790d1aa27acf89a67781fd00f4d6f448e34af01659fe7dbd3407b75","sha256ObservacaoSqlUtf16":"084af53d2b2f8dd1087b31772b7d58c0d4e23823a29da14155b25ce80eaca394","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"},{"id":"observacao-documental-3tri-2026-ind-10","indicadorId":"10","lancamentoId":"117","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_T';
SET @manifesto += N'RIMESTRAL","observacao":"▪ No 2TR/26 e 3TRI/26, foram concluídas as funcionalidades que permitem ao gestor criar e parametrizar produtos lotéricos em conformidade com a legislação aplicável, contemplando regras de rateio da arrecadação, cronograma de concursos, cadastro de produtos, tipos de apostas, concursos e tipos de concursos. Também evoluíram as funcionalidades relacionadas à distribuição da arrecadação (repasses, premiação e despesas de custeio e manutenção) e ao registro de apostas.\n\n▪ Ao longo do trimestre, o projeto atingiu maior maturidade no detalhamento dos requisitos e na consolidação do escopo do MVP (Mínimo Produto Viável), estimado em aproximadamente 264 histórias de usuário. Esse refinamento permitiu aprimorar a mensuração da evolução da plataforma e estabelecer uma visão mais precisa do desenvolvimento efetivamente realizado.\n\n▪ Considerando que as funcionalidades previstas para a plataforma possuem diferentes níveis de complexidade e esforço de implementação, a evolução do projeto não ocorre de forma linear entre os trimestres. Dessa forma, o acompanhamento do indicador passou a refletir a evolução acumulada do escopo efetivamente desenvolvido para o MVP, proporcionando uma avaliação mais aderente ao estágio atual do projeto.\n\n▪ Nesse contexto, a evolução do desenvolvimento passou de aproximadamente 10% no início do trimestre para 37,9% ao final do 3TRI/26, representando avanço significativo na construção da plataforma. O resultado reflete tanto a conclusão de funcionalidades estruturantes quanto o aumento da capacidade de execução do projeto, com a incorporação, em agosto de 2026, de dois novos squads de desenvolvimento atuando em paralelo nas frentes de trabalho.\n\n▪ Dessa forma, o acompanhamento do indicador passa a refletir a evolução acumulada do escopo efetivamente desenvolvido para o MVP, proporcionando uma visão mais aderente ao estágio atual do projeto e à complexidade da construção da nova plataforma.\n\n▪ Embora o desafio de conclusão do MVP permaneça relevante, o projeto encontra-se estruturado, com escopo mapeado, metodologia de acompanhamento definida e capacidade de desenvolvimento ampliada para suportar a continuidade das entregas.","fonteDocumental":"Informe DILOT/GERIN nº 0078/2026","paginasDocumento":"13, 14","sha256Observacao":"18e088154a2b5f73daa0c5e7127f0feb692f89cadd7a5d69d9ec4018fce1701d","sha256ObservacaoSqlUtf16":"c67a8e07aa10b674e4b379e140aff7d62a1bbcaa6fd8afc923b68eaa524d58f0","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"},{"id":"observacao-documental-3tri-2026-ind-11","indicadorId":"11","lancamentoId":"129","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_TRIMESTRAL","observacao":"A seguinte curva de meta foi definida para 2026 com relação ao presente indicador:\n▪ 1TRI26: 35% - Realização de Consulta Pública de Informações – RFI (Request for Information);\n▪ 2TRI26: 70% - Realização de Consulta Pública de Propostas – RFP (Request for Proposal);\n▪ 3TRI26: 85% - Iniciação da Fase Seleção;\n▪ 4TRI26: 100% - Contrato assinado com fornecedor.\n\n▪ Em 10/06/2026 foi aberta ';
SET @manifesto += N'a OS (Ordem de Serviço), em parceria entre CAIXA Loterias e CAIXA, 25173021, para contratação adicional de 18 profissionais de tecnologia, através da Fábrica de Software Spassu, com o objetivo de ampliar a capacidade de desenvolvimento de soluções de Tecnologia da Informação e Comunicação do projeto da Nova Plataforma (SIPLX), a qual foi concluída em 14/08/2026, concluindo o atingimento do indicador para o exercício.","fonteDocumental":"Informe DILOT/GERIN nº 0078/2026","paginasDocumento":"14","sha256Observacao":"768231a83888dd5f14eda81a18ce6ffa022dce5a5f0bcc77f2285d3288b48ae1","sha256ObservacaoSqlUtf16":"5851a127e20ce361ce747d1334e91106e776424419eaa233a946c82b828b9dac","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"},{"id":"observacao-documental-3tri-2026-ind-12","indicadorId":"12","lancamentoId":"141","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_TRIMESTRAL","observacao":"As iniciativas previstas no Plano de Ação seguem em andamento em toda a CAIXA Loterias. A pesquisa GPTW está programada para novembro de 2026.\n\nHouve a contratação da empresa que efetuará a pesquisa.","fonteDocumental":"Informe DILOT/GERIN nº 0078/2026","paginasDocumento":"15","sha256Observacao":"a9ed0973910002c2d80a87f344d152cef65cf66af41ec3ebf2c15b20bb5e26ce","sha256ObservacaoSqlUtf16":"719749fded82e691b13a5a438820c25b1e14a60ff31756687ab1c23c1c441b38","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"},{"id":"observacao-documental-3tri-2026-ind-13","indicadorId":"13","lancamentoId":"153","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_TRIMESTRAL","observacao":"▪ jun/26:  19 mulheres de 46 Gestores | 41,30%\n▪ ago/26: 20 mulheres de 46 Gestores | 43,48%\n▪ set/26:  20 mulheres de 46 Gestores | 43,48%","fonteDocumental":"Informe DILOT/GERIN nº 0078/2026","paginasDocumento":"15, 16","sha256Observacao":"293847d25f30bc3cd0ba10c1ca58b7b1fadb51b33200907276717d45d8570d31","sha256ObservacaoSqlUtf16":"99ed78eca036407dbab358709997244604e4b24bfb6a2538fb4852ebcb60edd2","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"},{"id":"observacao-documental-3tri-2026-ind-14","indicadorId":"14","lancamentoId":"165","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_TRIMESTRAL","observacao":"▪ jul/26:   12 de 46 Gestores  | 26,09%\n▪ ago/26: 12 de 46 Gestores  ';
SET @manifesto += N'| 26,09%\n▪ set/26:  12 de 46 Gestores  | 26,09%","fonteDocumental":"Informe DILOT/GERIN nº 0078/2026","paginasDocumento":"16","sha256Observacao":"760ac55d0fa76f8bdf6818266a8400dc80efdbfd4ed70e04039cda6ba0bfbb60","sha256ObservacaoSqlUtf16":"f4cd84fb3eb40f526b1861407365ebf37666e882231136c6346477bad645e379","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"},{"id":"observacao-documental-3tri-2026-ind-15","indicadorId":"15","lancamentoId":"177","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_TRIMESTRAL","observacao":"▪ Meta estipulada em 90% para que os empregados realizem os dois cursos propostos na trilha de desenvolvimento, quais sejam: Customer Experience e Ecossistema Negocial.\n\n▪ Até 30/09/2026, 163 empregados no total de 171 empregados realizaram o curso de Customer Experience e 154 empregados do total de 171 empregados elegíveis no período realizaram o curso de Ecossistema Negocial.","fonteDocumental":"Informe DILOT/GERIN nº 0078/2026","paginasDocumento":"17","sha256Observacao":"a6c2f0ee93dd1ec55a4b120a612ab8f91f36b13ac62c3686942c590306fcee2e","sha256ObservacaoSqlUtf16":"6e6ab7e6dca5f8c3f790038b117ecfd058d850988ee9fbb7d954bb31e1ca6c58","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"},{"id":"observacao-documental-3tri-2026-ind-16","indicadorId":"16","lancamentoId":"189","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_TRIMESTRAL","observacao":"▪ A seguinte curva de meta foi definida para 2026 com relação ao presente indicador:\n▪ 1TRI26: 0%;\n▪ 2TRI26: 50% - 1ª iniciativa realizada;\n▪ 3TRI26: 50% (acumulado de 50% considerando apenas a meta do 2TRI26);\n▪ 4TRI26: 100% - 2ª iniciativa realizada.\n\n▪ Patrocínio da edição 2026 da Brasil Ladies Cup:\n\n▪ Entre 09 e 12/07/2026 foi realizado patrocínio ao Projeto Brasil Ladies Cup, com a Federação Internacional de Football Soccer Society (FIFOS), na cidade de Campinas/SP, com valor de investimento total de R$ 190.000,00 (cento e noventa mil reais), originados da reserva especial do Fundo para Desenvolvimento das Loterias (FDL), conforme aprovação pela alçada competente, conforme MN ZL026.\n\n▪ Na edição 2026 da Brasil Ladies Cup, foram identificadas as seguintes entregas aderentes ao indicador:\n\n▪ Acesso gratuito ao esporte: os ingressos de todos os jogos foram cedidos gratuitamente e disponibilizados por resgate em virtual, com público acumulado superior a 3 mil pessoas.\n\n▪ Atendimento direto à comunidade: mais de 200 jovens da ONG Vaso do Oleiro, de Campinas/SP, visitaram o Estádio Brinco de Ouro, assistiram à final e participaram de conversa sobre futebol feminino. A organização informa ter custeado logística e alimentação.\n\n▪ Formação e disseminação de conh';
SET @manifesto += N'ecimento: foram realizados dois dias de palestras e workshops gratuitos, com mais de 60 inscrições presenciais e mais de 600 acompanhamentos on-line.\n\n▪ Conteúdo formativo: as atividades abordaram futebol feminino, análise de desempenho e dados, formação e carreira de atletas, saúde e preparação física, universidade e ciência, scout, liderança e cultura e Copa do Mundo de 2027.","fonteDocumental":"Informe DILOT/GERIN nº 0078/2026","paginasDocumento":"17, 18","sha256Observacao":"7b712477c85a02b0620237222349f56568e79176aa4926937109305084552ce1","sha256ObservacaoSqlUtf16":"e5f7247eaf965e39e004371e9bce8e379ea1d27262074f2a6e7337970d2ee476","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"},{"id":"observacao-documental-3tri-2026-ind-17","indicadorId":"17","lancamentoId":"201","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_TRIMESTRAL","observacao":"▪ A meta estabelecida para o período considerou a projeção orçamentária prevista no Plano de Dispêndios Globais da Companhia de 2026.\n\n▪ Cabe relembrar a seguinte curva de meta definida para 2026 com relação ao presente indicador:\n\n▪ 1TRI26: R$ 2.143,0 milhões;\n▪ 2TRI26: R$ 4.545,1 milhões;\n▪ 3TRI26: R$ 7.165,1 milhões;\n▪ 4TRI26: R$ 10.452,8 milhões.\n\nEm setembro/2026, o valor acumulado de repasses descontando o IR sobre prêmios pagos foi de R$ 7,095 bilhões.\n\nO repasse social atingiu 99% da meta para o período em função da distribuição realizada entre as modalidades, com maior e menor percentual de repasse, e considerando a sazonalidade dos repasses ao FIES por prescrição de prêmios.","fonteDocumental":"Informe DILOT/GERIN nº 0078/2026","paginasDocumento":"18, 19","sha256Observacao":"4c796ca2defeabacc681c6359997f707a2f6b6728bc81feade160ddbe48c0360","sha256ObservacaoSqlUtf16":"a01e09b6f4f840770701ded592afab2e4e279d985d04834cb3c08163b5eb40c0","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"},{"id":"observacao-documental-3tri-2026-ind-18","indicadorId":"18","lancamentoId":"213","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_TRIMESTRAL","observacao":"▪ Em setembro de 2026 foi realizada a inclusão das informações relativas à submissão ao RGF (Responsible Gaming Framework – RGF) desenvolvidos pela World Lottery Association (WLA) Nível 3 na plataforma DigitalRG.\n\n▪ Ao final do 3º trimestre, o Programa manteve o atendimento de 8 dos 10 elementos previstos para o exercício, contemplando os Elementos 1, 2, 3, 4, 5, 8, 9 e 10 e superando o quantitativo mínimo de 5 elementos esperado para o período.\n\n▪ As ações referentes aos elementos faltantes, elementos 6 – Publicidade e Comunicações e 7 – Educação do Jogador, serão atendidas com a realização da Semana de Jogo Responsáv';
SET @manifesto += N'el 2026, prevista para novembro, completando os 10 elementos no período planejado.\n\n▪ Dessa forma, o resultado acumulado cumpre o esperado para setembro e mantém a trajetória de evolução prevista para o exercício, com 8 elementos já atendidos no encerramento do 3º trimestre e previsão de atendimento dos 10 elementos no 4º trimestre.","fonteDocumental":"Informe DILOT/GERIN nº 0078/2026","paginasDocumento":"20","sha256Observacao":"dae506294c0abd9a7ee91d1e171caa3b8148bf65076bffaf0c4b4753d8f03d85","sha256ObservacaoSqlUtf16":"1a1dae6dcb9ad9bcbead81746598b2001fd399c8b77f30ed868481dcabc05d53","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"},{"id":"observacao-documental-3tri-2026-ind-19","indicadorId":"19","lancamentoId":"225","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_TRIMESTRAL","observacao":"▪ A seguinte curva de meta foi definida para 2026 com relação ao presente indicador:\n\n▪ 1TRI26: 0%;\n▪ 2TRI26: 0,05%; (R$ 652,7 mil);\n▪ 3TRI26: 0,10% (R$ 1.305,4 mil - valor acumulado, considerando o realizado do 2TRI26 e 3TRI26).\n▪ 4TRI26: 0,33% (R$ 4.307,9 mil4 - valor acumulado, considerando o realizado do 2TRI26, 3TRI26 e 4TRI26).\n\n▪ Patrocínio da edição 2026 da Brasil Ladies Cup:\n\n▪ Entre 09 e 12/07/2026 foi realizado patrocínio ao Projeto Brasil Ladies Cup, com a Federação Internacional de Football Soccer Society (FIFOS), na cidade de Campinas/SP, com valor de investimento total de R$ 190.000,00 (cento e noventa mil reais), originados da reserva especial do Fundo para Desenvolvimento das Loterias (FDL), conforme aprovação pela alçada competente.\n\n4 Valor projetado conforme orçamento 2026, que prevê Lucro Líquido em R$ 1.305,4 milhões.","fonteDocumental":"Informe DILOT/GERIN nº 0078/2026","paginasDocumento":"20, 21","sha256Observacao":"671f0a468bb98f4fe7f4a0ac4998826db5bab7fb1ee023756479a0b4ac491629","sha256ObservacaoSqlUtf16":"1ba00eefd61974051aaf1d9240041fcaae764e082867a819c8799c34c3b41d5f","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"},{"id":"observacao-documental-3tri-2026-ind-20","indicadorId":"20","lancamentoId":"237","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_TRIMESTRAL","observacao":"▪ O resultado do 3TRI26 refere-se ao acumulado no ano, com a publicação do relatório institucional \"A Sorte em Números - 2025\" realizada em junho/2026. Para o período do 3TRI26, não houve meta estabelecida, segundo curva estabelecida considerando o acumulado de 50% da meta do 2TR26).\n\n▪ Para o 4TRI26 está prevista campanha publicitária exclusiva com foco no repasse social das Loterias CAIXA, a ser veiculada nos canais oficiais da Companhia e demais meios estratégicos.","fonteDocumental":"Informe DILOT/GERIN nº 00';
SET @manifesto += N'78/2026","paginasDocumento":"21","sha256Observacao":"4ea0f2341f493ca002ef17d342bb526d5911f01d53292aa08522e11dc8c82616","sha256ObservacaoSqlUtf16":"677e8c770814fd6ec542dc0112979ecc9847c15e3e735617b372fc98be8e0183","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"},{"id":"observacao-documental-3tri-2026-ind-21","indicadorId":"21","lancamentoId":"249","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_TRIMESTRAL","observacao":"▪ Foi apurado que 99 funcionários, de 171 empregados, realizaram/participaram de ao menos 2 ações de disseminação de JR até 30/09/2026.\n\nCurso na Universidade CAIXA;\n\n- Capacitação em Jogo Responsável, realizada em maio/2026 na Universidade CAIXA;\n\n- Capacitação em Design de Jogos - GamGard - realizado em junho/2026 na Universidade CAIXA.\n\n▪ Em setembro, novas conclusões do curso na Universidade CAIXA ampliaram o quantitativo de empregados que cumpriram o requisito de participação em pelo menos duas ações. As demais capacitações mantiveram seus quantitativos de participação.\n\n▪ Outras ações referentes ao Jogo Responsável serão realizadas até o final de 2026.","fonteDocumental":"Informe DILOT/GERIN nº 0078/2026","paginasDocumento":"22","sha256Observacao":"eb0a72f9bc682c31f77340eafb2fb4f2ada94f4c965f2ea3f2da274f8fbdcbe9","sha256ObservacaoSqlUtf16":"9df14ccd6902f0eb89dd0b2e5a2f64257f0a7bdbd96cb6239af5a190ba67ed47","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"},{"id":"observacao-documental-3tri-2026-ind-22","indicadorId":"22","lancamentoId":"261","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_TRIMESTRAL","observacao":"▪ A seguinte curva de meta foi definida para 2026 com relação ao presente indicador:\n\nMETA Realizado 2025 Meta 2026\n1TRI 0,90% 0,91%\n2TRI 0,78% 0,79%\n3TRI 0,74% 0,75%\n4TRI 0,65% 0,66%\n\nNo mês de referência, o desempenho de vendas registrou realizado em 0,60%, com alcance da meta em 80 %, já ajustada conforme recente alteração aprovada pelo extrato de ata da reunião do Conselho de Administração, de 27/08/2026 (Anexo III).\n\nAo longo do 3TRI/2026 foram lançados os programas Compre Aqui e Afiliados Instantânea CAIXA Digital, iniciativas as quais têm como objetivo fortalecer a atuação da Rede Lotérica, ampliar a oferta aos clientes à modalidade, além de criar oportunidade de geração de receitas para os parceiros lotéricos. As iniciativas ainda não tiveram o resultado esperado, e são planejadas novas ações para o 4º trimestre com o objetivo de impulsionar as vendas.","fonteDocumental":"Informe DILOT/GERIN nº 0078/2026","paginasDocumento":"23","sha256Observacao":"59d36a9129d652239abd81754263ad360e63198ad7d4749be207a20c53f3d6ba","sha256ObservacaoSqlUtf16":"ced0cbcc1aaee9752cc';
SET @manifesto += N'96477f2922cbc23fe904b5ed498b633719bf29d799fe2","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"},{"id":"observacao-documental-3tri-2026-ind-23","indicadorId":"23","lancamentoId":"273","versaoLancamento":1,"statusEsperado":"Em preenchimento","competencia":"2026-09","ano":2026,"mes":9,"tipoObservacao":"OBSERVACAO_AREA_INFORME_TRIMESTRAL","observacao":"A seguinte curva de meta foi definida para 2026, considerando o comportamento de dados do realizado de arrecadação em 2025:\n\n▪ 1TRI26: 100,50%;\n▪ 2TRI26: 101,00%;\n▪ 3TRI26: 101,50%;\n▪ 4TRI26: 102,00%.\n\nNo mês de referência, a arrecadação da Rede Lotérica atingiu 98,16%, com alcance da meta 96,71%. As iniciativas do período reforçaram a atuação da Rede Lotérica via balcão presencial e plataforma de comercialização de bolão online, Marketplace, fatores que contribuíram para o resultado apurado na prestação de contas do mês.","fonteDocumental":"Informe DILOT/GERIN nº 0078/2026","paginasDocumento":"24","sha256Observacao":"cad0e69fbd36c14031b68f867f10239fa22dfc7d018f636baacbe190333d3e51","sha256ObservacaoSqlUtf16":"3e0a4bbcce2d4c635c822685130541407d5463d42ddc635af7c2f4efdd20a725","sha256DocumentoDeclarado":"6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa","sha256ArquivoFisico":"0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367","documentoReferencia":"C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf","origemRegistro":"20261028_002_observacoes_documentais_3tri_2026.sql"}]';
  IF ISJSON(@manifesto)<>1 THROW 53503,N'Manifesto incorporado invalido.',1;

  DECLARE @carga TABLE(
    id NVARCHAR(100) PRIMARY KEY,lancamento_id NVARCHAR(100),indicador_id NVARCHAR(100),competencia NVARCHAR(40),
    ano INT,mes INT,versao_lancamento INT,status_esperado NVARCHAR(100),tipo_observacao NVARCHAR(100),observacao NVARCHAR(MAX),
    fonte_documental NVARCHAR(500),paginas_documento NVARCHAR(100),sha256_observacao CHAR(64),
    sha256_observacao_sql_utf16 CHAR(64),sha256_documento_declarado CHAR(64),sha256_arquivo_fisico CHAR(64),
    documento_referencia NVARCHAR(500),origem_registro NVARCHAR(255)
  );
  INSERT @carga
  SELECT id,lancamentoId,indicadorId,competencia,ano,mes,versaoLancamento,statusEsperado,tipoObservacao,observacao,
         fonteDocumental,paginasDocumento,sha256Observacao,sha256ObservacaoSqlUtf16,sha256DocumentoDeclarado,
         sha256ArquivoFisico,documentoReferencia,origemRegistro
  FROM OPENJSON(@manifesto) WITH(
    id NVARCHAR(100) '$.id',lancamentoId NVARCHAR(100) '$.lancamentoId',indicadorId NVARCHAR(100) '$.indicadorId',
    competencia NVARCHAR(40) '$.competencia',ano INT '$.ano',mes INT '$.mes',versaoLancamento INT '$.versaoLancamento',
    statusEsperado NVARCHAR(100) '$.statusEsperado',tipoObservacao NVARCHAR(100) '$.tipoObservacao',
    observacao NVARCHAR(MAX) '$.observacao',fonteDocumental NVARCHAR(500) '$.fonteDocumental',
    paginasDocumento NVARCHAR(100) '$.paginasDocumento',sha256Observacao CHAR(64) '$.sha256Observacao',
    sha256ObservacaoSqlUtf16 CHAR(64) '$.sha256ObservacaoSqlUtf16',sha256DocumentoDeclarado CHAR(64) '$.sha256DocumentoDeclarado',
    sha256ArquivoFisico CHAR(64) '$.sha256ArquivoFisico',documentoReferencia NVARCHAR(500) '$.documentoReferencia',
    origemRegistro NVARCHAR(255) '$.origemRegistro'
  );

  IF (SELECT COUNT(*) FROM @carga)<>23
    OR (SELECT COUNT(DISTINCT indicador_id) FROM @carga)<>23
    OR (SELECT COUNT(DISTINCT lancamento_id) FROM @carga)<>23
    OR (SELECT COUNT(DISTINCT sha256_observacao) FROM @carga)<>23
    THROW 53504,N'Manifesto deve conter exatamente 23 identidades, lancamentos e hashes unicos.',1;
  IF EXISTS(
    SELECT 1 FROM @carga
    WHERE tipo_observacao<>@tipo OR competencia<>N'2026-09' OR ano<>2026 OR mes<>9 OR origem_registro<>@migration
      OR fonte_documental<>N'Informe DILOT/GERIN nº 0078/2026'
      OR sha256_documento_declarado<>'6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa'
      OR sha256_arquivo_fisico<>'0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367'
      OR documento_referencia<>N'C:/Users/jonat/Downloads/sistema/00.Informe DILOT_GERIN_0078_2026_Monitoramento_PEI_PNI 3TR.pdf'
  ) THROW 53505,N'Identidade ou metadados documentais da carga invalidos.',1;
  IF EXISTS(
    SELECT 1 FROM @carga
    WHERE LOWER(CONVERT(VARCHAR(64),HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),observacao)),2))<>sha256_observacao_sql_utf16
  ) THROW 53506,N'Hash SQL UTF-16 da observacao literal divergente.',1;

  DECLARE @marAntes NVARCHAR(MAX)=(
    SELECT d.* FROM dbo.lancamentos_observacoes_documentais d
    WHERE d.competencia=N'2026-03' AND d.ano=2026 AND d.mes=3
    ORDER BY d.id FOR JSON PATH,INCLUDE_NULL_VALUES
  );
  DECLARE @marHashAntes VARBINARY(32)=HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@marAntes));
  IF (SELECT COUNT(*) FROM dbo.lancamentos_observacoes_documentais WHERE competencia=N'2026-03' AND ano=2026 AND mes=3)<>23
    OR LOWER(CONVERT(VARCHAR(64),@marHashAntes,2))<>'c3d83d43e7644033f73020b89858e8fdbc5f12b5ae2bf3b30f12d4c7aaaefd96'
    OR EXISTS(
      SELECT 1 FROM dbo.lancamentos_observacoes_documentais
      WHERE competencia=N'2026-03' AND ano=2026 AND mes=3
        AND (origem_registro<>@migration1tri OR substitui_observacao_id IS NOT NULL)
    ) THROW 53507,N'Snapshot documental do 1TRI incompativel.',1;

  DECLARE @junAntes NVARCHAR(MAX)=(
    SELECT d.* FROM dbo.lancamentos_observacoes_documentais d
    WHERE d.competencia=N'2026-06' AND d.ano=2026 AND d.mes=6
    ORDER BY d.id FOR JSON PATH,INCLUDE_NULL_VALUES
  );
  DECLARE @junHashAntes VARBINARY(32)=HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@junAntes));
  IF (SELECT COUNT(*) FROM dbo.lancamentos_observacoes_documentais WHERE competencia=N'2026-06' AND ano=2026 AND mes=6)<>23
    OR LOWER(CONVERT(VARCHAR(64),@junHashAntes,2))<>'c24d510bacc8d432555f4ede1bff89c124263cdfedba7079a19efcce4bb0b890'
    OR EXISTS(
      SELECT 1 FROM dbo.lancamentos_observacoes_documentais
      WHERE competencia=N'2026-06' AND ano=2026 AND mes=6
        AND (origem_registro<>@migration2tri OR substitui_observacao_id IS NOT NULL)
    ) THROW 53519,N'Snapshot documental do 2TRI incompativel.',1;

  DECLARE @existentes INT=(SELECT COUNT(*) FROM dbo.lancamentos_observacoes_documentais WHERE origem_registro=@migration);
  DECLARE @setExistentes INT=(SELECT COUNT(*) FROM dbo.lancamentos_observacoes_documentais WHERE competencia=N'2026-09' AND ano=2026 AND mes=9);
  DECLARE @totalExistentes INT=(SELECT COUNT(*) FROM dbo.lancamentos_observacoes_documentais);
  IF @existentes NOT IN(0,23)
    THROW 53508,N'Aplicacao parcial detectada; nenhuma linha sera acrescentada.',1;
  IF @setExistentes<>@existentes OR @totalExistentes<>46+@existentes
    THROW 53509,N'Conflito com carga documental preexistente ou total documental inesperado.',1;

  IF EXISTS(
    SELECT 1 FROM @carga c
    LEFT JOIN dbo.lancamentos l ON l.id=c.lancamento_id AND l.indicador_id=c.indicador_id
      AND l.competencia=c.competencia AND l.ano=c.ano AND l.mes=c.mes
      AND l.versao_atual=c.versao_lancamento AND l.status=c.status_esperado
    WHERE l.id IS NULL
  ) THROW 53510,N'Lancamento, competencia, versao ou status divergiu do manifesto.',1;

  IF @existentes=23 AND EXISTS(
    SELECT 1 FROM @carga c FULL JOIN (
      SELECT * FROM dbo.lancamentos_observacoes_documentais WHERE origem_registro=@migration
    ) d ON d.id=c.id
    WHERE c.id IS NULL OR d.id IS NULL OR d.lancamento_id<>c.lancamento_id OR d.indicador_id<>c.indicador_id
      OR d.competencia<>c.competencia OR d.ano<>c.ano OR d.mes<>c.mes OR d.versao_lancamento<>c.versao_lancamento
      OR d.tipo_observacao<>c.tipo_observacao OR d.observacao<>c.observacao OR d.fonte_documental<>c.fonte_documental
      OR d.paginas_documento<>c.paginas_documento OR d.sha256_observacao<>c.sha256_observacao
      OR d.sha256_documento_declarado<>c.sha256_documento_declarado OR d.sha256_arquivo_fisico<>c.sha256_arquivo_fisico
      OR d.documento_referencia<>c.documento_referencia OR d.substitui_observacao_id IS NOT NULL
  ) THROW 53511,N'Reexecucao encontrou conteudo documental divergente.',1;
  IF @existentes=0 AND EXISTS(
    SELECT 1 FROM @carga c JOIN dbo.lancamentos_observacoes_documentais d
      ON d.id=c.id OR (d.lancamento_id=c.lancamento_id AND d.versao_lancamento=c.versao_lancamento
      AND d.competencia=c.competencia AND d.tipo_observacao=c.tipo_observacao)
  ) THROW 53512,N'Conflito de identidade com carga documental preexistente.',1;

  DECLARE @lancamentos_antes TABLE(id NVARCHAR(100) PRIMARY KEY,fingerprint VARBINARY(32));
  INSERT @lancamentos_antes
  SELECT l.id,HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),
    CAST(N'' AS NVARCHAR(MAX))+ISNULL(l.id,N'<NULL>')+N'|'+ISNULL(l.indicador_id,N'<NULL>')+N'|'+ISNULL(l.competencia,N'<NULL>')+
    N'|'+ISNULL(CONVERT(NVARCHAR(20),l.ano),N'<NULL>')+N'|'+ISNULL(CONVERT(NVARCHAR(20),l.mes),N'<NULL>')+
    N'|'+ISNULL(l.trimestre,N'<NULL>')+N'|'+ISNULL(l.plano,N'<NULL>')+N'|'+ISNULL(l.pilar,N'<NULL>')+
    N'|'+ISNULL(l.unidade_apuradora,N'<NULL>')+N'|'+ISNULL(l.diretoria_responsavel,N'<NULL>')+
    N'|'+ISNULL(l.dados_entrada_json,N'<NULL>')+N'|'+ISNULL(l.resultado_calculado,N'<NULL>')+
    N'|'+ISNULL(l.resultado_oficial,N'<NULL>')+N'|'+ISNULL(l.meta_referencia,N'<NULL>')+
    N'|'+ISNULL(l.percentual_atingido,N'<NULL>')+N'|'+ISNULL(l.situacao,N'<NULL>')+N'|'+ISNULL(l.status,N'<NULL>')+
    N'|'+ISNULL(l.observacao_unidade,N'<NULL>')+N'|'+ISNULL(l.referencia_evidencia,N'<NULL>')+
    N'|'+ISNULL(l.evidencia_id,N'<NULL>')+N'|'+CONVERT(NVARCHAR(20),l.versao_atual)+
    N'|'+ISNULL(l.usuario_responsavel,N'<NULL>')+N'|'+ISNULL(l.created_at,N'<NULL>')+N'|'+ISNULL(l.updated_at,N'<NULL>')
  )) FROM dbo.lancamentos l JOIN @carga c ON c.lancamento_id=l.id;

  DECLARE @homologacoesAntes NVARCHAR(MAX)=(SELECT h.* FROM dbo.homologacoes h JOIN @carga c ON c.lancamento_id=h.lancamento_id ORDER BY h.id FOR JSON PATH,INCLUDE_NULL_VALUES);
  DECLARE @evidenciasAntes NVARCHAR(MAX)=(SELECT e.* FROM dbo.evidencias e JOIN @carga c ON c.lancamento_id=e.lancamento_id ORDER BY e.id FOR JSON PATH,INCLUDE_NULL_VALUES);
  DECLARE @retificacoesAntes NVARCHAR(MAX)=(SELECT r.* FROM dbo.retificacoes r JOIN @carga c ON c.lancamento_id=r.lancamento_id ORDER BY r.id FOR JSON PATH,INCLUDE_NULL_VALUES);
  DECLARE @reaberturasAntes NVARCHAR(MAX)=(SELECT s.* FROM dbo.solicitacoes_reabertura s JOIN @carga c ON c.lancamento_id=s.lancamento_id ORDER BY s.id FOR JSON PATH,INCLUDE_NULL_VALUES);
  DECLARE @auditoriaAntes NVARCHAR(MAX)=(SELECT a.* FROM dbo.auditoria a JOIN @carga c ON c.lancamento_id=a.entidade_id WHERE a.entidade=N'lancamentos' ORDER BY a.id FOR JSON PATH,INCLUDE_NULL_VALUES);

  IF @existentes=0
  BEGIN
    INSERT dbo.lancamentos_observacoes_documentais(
      id,lancamento_id,indicador_id,competencia,ano,mes,versao_lancamento,tipo_observacao,observacao,
      fonte_documental,paginas_documento,sha256_observacao,sha256_documento_declarado,sha256_arquivo_fisico,
      documento_referencia,substitui_observacao_id,origem_registro
    )
    SELECT id,lancamento_id,indicador_id,competencia,ano,mes,versao_lancamento,tipo_observacao,observacao,
      fonte_documental,paginas_documento,sha256_observacao,sha256_documento_declarado,sha256_arquivo_fisico,
      documento_referencia,NULL,origem_registro FROM @carga;
    SET @linhasInseridas=@@ROWCOUNT;
    IF @linhasInseridas<>23 THROW 53513,N'Quantidade inserida diferente de 23.',1;
  END

  IF EXISTS(
    SELECT 1 FROM @carga c FULL JOIN (
      SELECT * FROM dbo.lancamentos_observacoes_documentais WHERE origem_registro=@migration
    ) d ON d.id=c.id
    WHERE c.id IS NULL OR d.id IS NULL OR d.lancamento_id<>c.lancamento_id OR d.indicador_id<>c.indicador_id
      OR d.competencia<>c.competencia OR d.ano<>c.ano OR d.mes<>c.mes OR d.versao_lancamento<>c.versao_lancamento
      OR d.tipo_observacao<>c.tipo_observacao OR d.observacao<>c.observacao OR d.fonte_documental<>c.fonte_documental
      OR d.paginas_documento<>c.paginas_documento OR d.sha256_observacao<>c.sha256_observacao
      OR d.sha256_documento_declarado<>c.sha256_documento_declarado OR d.sha256_arquivo_fisico<>c.sha256_arquivo_fisico
      OR d.documento_referencia<>c.documento_referencia OR d.substitui_observacao_id IS NOT NULL
  ) THROW 53514,N'Pos-condicao encontrou conteudo documental divergente.',1;

  IF EXISTS(
    SELECT 1 FROM @lancamentos_antes a JOIN dbo.lancamentos l ON l.id=a.id
    WHERE a.fingerprint<>HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),
      CAST(N'' AS NVARCHAR(MAX))+ISNULL(l.id,N'<NULL>')+N'|'+ISNULL(l.indicador_id,N'<NULL>')+N'|'+ISNULL(l.competencia,N'<NULL>')+
      N'|'+ISNULL(CONVERT(NVARCHAR(20),l.ano),N'<NULL>')+N'|'+ISNULL(CONVERT(NVARCHAR(20),l.mes),N'<NULL>')+
      N'|'+ISNULL(l.trimestre,N'<NULL>')+N'|'+ISNULL(l.plano,N'<NULL>')+N'|'+ISNULL(l.pilar,N'<NULL>')+
      N'|'+ISNULL(l.unidade_apuradora,N'<NULL>')+N'|'+ISNULL(l.diretoria_responsavel,N'<NULL>')+
      N'|'+ISNULL(l.dados_entrada_json,N'<NULL>')+N'|'+ISNULL(l.resultado_calculado,N'<NULL>')+
      N'|'+ISNULL(l.resultado_oficial,N'<NULL>')+N'|'+ISNULL(l.meta_referencia,N'<NULL>')+
      N'|'+ISNULL(l.percentual_atingido,N'<NULL>')+N'|'+ISNULL(l.situacao,N'<NULL>')+N'|'+ISNULL(l.status,N'<NULL>')+
      N'|'+ISNULL(l.observacao_unidade,N'<NULL>')+N'|'+ISNULL(l.referencia_evidencia,N'<NULL>')+
      N'|'+ISNULL(l.evidencia_id,N'<NULL>')+N'|'+CONVERT(NVARCHAR(20),l.versao_atual)+
      N'|'+ISNULL(l.usuario_responsavel,N'<NULL>')+N'|'+ISNULL(l.created_at,N'<NULL>')+N'|'+ISNULL(l.updated_at,N'<NULL>')
    ))
  ) THROW 53515,N'Snapshot historico de lancamento foi alterado.',1;
  IF @homologacoesAntes<>(SELECT h.* FROM dbo.homologacoes h JOIN @carga c ON c.lancamento_id=h.lancamento_id ORDER BY h.id FOR JSON PATH,INCLUDE_NULL_VALUES)
    OR @evidenciasAntes<>(SELECT e.* FROM dbo.evidencias e JOIN @carga c ON c.lancamento_id=e.lancamento_id ORDER BY e.id FOR JSON PATH,INCLUDE_NULL_VALUES)
    OR @retificacoesAntes<>(SELECT r.* FROM dbo.retificacoes r JOIN @carga c ON c.lancamento_id=r.lancamento_id ORDER BY r.id FOR JSON PATH,INCLUDE_NULL_VALUES)
    OR @reaberturasAntes<>(SELECT s.* FROM dbo.solicitacoes_reabertura s JOIN @carga c ON c.lancamento_id=s.lancamento_id ORDER BY s.id FOR JSON PATH,INCLUDE_NULL_VALUES)
    OR @auditoriaAntes<>(SELECT a.* FROM dbo.auditoria a JOIN @carga c ON c.lancamento_id=a.entidade_id WHERE a.entidade=N'lancamentos' ORDER BY a.id FOR JSON PATH,INCLUDE_NULL_VALUES)
    THROW 53516,N'Governanca ou auditoria historica foi alterada.',1;

  DECLARE @marDepois NVARCHAR(MAX)=(
    SELECT d.* FROM dbo.lancamentos_observacoes_documentais d
    WHERE d.competencia=N'2026-03' AND d.ano=2026 AND d.mes=3
    ORDER BY d.id FOR JSON PATH,INCLUDE_NULL_VALUES
  );
  DECLARE @marHashDepois VARBINARY(32)=HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@marDepois));
  IF @marAntes<>@marDepois OR @marHashAntes<>@marHashDepois
    THROW 53517,N'Snapshot documental do 1TRI foi alterado.',1;

  DECLARE @junDepois NVARCHAR(MAX)=(
    SELECT d.* FROM dbo.lancamentos_observacoes_documentais d
    WHERE d.competencia=N'2026-06' AND d.ano=2026 AND d.mes=6
    ORDER BY d.id FOR JSON PATH,INCLUDE_NULL_VALUES
  );
  DECLARE @junHashDepois VARBINARY(32)=HASHBYTES('SHA2_256',CONVERT(VARBINARY(MAX),@junDepois));
  IF @junAntes<>@junDepois OR @junHashAntes<>@junHashDepois
    THROW 53520,N'Snapshot documental do 2TRI foi alterado.',1;

  IF (SELECT COUNT(*) FROM dbo.lancamentos_observacoes_documentais)<>69
    OR (SELECT COUNT(*) FROM dbo.lancamentos_observacoes_documentais WHERE competencia=N'2026-03' AND ano=2026 AND mes=3)<>23
    OR (SELECT COUNT(*) FROM dbo.lancamentos_observacoes_documentais WHERE competencia=N'2026-06' AND ano=2026 AND mes=6)<>23
    OR (SELECT COUNT(*) FROM dbo.lancamentos_observacoes_documentais WHERE competencia=N'2026-09' AND ano=2026 AND mes=9)<>23
    OR EXISTS(SELECT 1 FROM dbo.lancamentos_observacoes_documentais WHERE origem_registro=@migration AND substitui_observacao_id IS NOT NULL)
    THROW 53518,N'Pos-condicao quantitativa documental incompleta.',1;

  IF @transacaoPropria=1 COMMIT TRANSACTION;
  SELECT N'COMMIT' AS transacao,@linhasInseridas AS registros_criados,0 AS registros_alterados,0 AS registros_removidos,
    LOWER(CONVERT(VARCHAR(64),@marHashAntes,2)) AS hash_mar_antes,
    LOWER(CONVERT(VARCHAR(64),@marHashDepois,2)) AS hash_mar_depois,
    LOWER(CONVERT(VARCHAR(64),@junHashAntes,2)) AS hash_jun_antes,
    LOWER(CONVERT(VARCHAR(64),@junHashDepois,2)) AS hash_jun_depois,
    CASE WHEN @existentes=23 THEN N'JA APLICADA - SEM DML' ELSE N'23 OBSERVACOES DOCUMENTAIS CRIADAS' END AS resultado;
END TRY
BEGIN CATCH
  IF @transacaoPropria=1 AND XACT_STATE()<>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
