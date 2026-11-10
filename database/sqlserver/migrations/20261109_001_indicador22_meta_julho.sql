SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @descricaoAnterior nvarchar(max)=N'JAN–JUL/2026: ≥10% sobre a referência de 2025; AGO–DEZ/2026: ≥1% sobre a referência de 2025';
DECLARE @descricaoNova nvarchar(max)=N'JAN–JUN/2026: ≥10% sobre a referência de 2025; JUL–DEZ/2026: ≥1% sobre a referência de 2025';
DECLARE @metaAnterior decimal(38,18)=0.008542119277860550;
DECLARE @metaNova decimal(38,18)=0.007843218609671960;
DECLARE @atingimentoAnterior decimal(38,18)=0.725015277263211700;
DECLARE @atingimentoNovo decimal(38,18)=0.789620598999537400;
DECLARE @agora nvarchar(40)=CONVERT(nvarchar(40),SYSDATETIMEOFFSET(),127);
DECLARE @regras nvarchar(max),@regra22 nvarchar(max),@metas nvarchar(max),@dadosJulho nvarchar(max);
DECLARE @estadoAnterior bit=0,@estadoFinal bit=0;

BEGIN TRY
  BEGIN TRANSACTION;

  IF DB_NAME()<>N'Estrategia'
    THROW 53401,N'Banco inesperado: a migration da meta de julho do Indicador 22 exige o banco Estrategia.',1;

  IF (SELECT COUNT(*) FROM dbo.indicadores WITH(UPDLOCK,HOLDLOCK) WHERE id=N'22' AND numero=22)<>1
    THROW 53402,N'Indicador 22 não encontrado de forma única.',1;

  SELECT @regras=valor_json FROM dbo.configuracoes WITH(UPDLOCK,HOLDLOCK) WHERE chave=N'regrasIndicadores';
  SELECT @metas=valor_json FROM dbo.configuracoes WITH(UPDLOCK,HOLDLOCK) WHERE chave=N'metas';
  SELECT @dadosJulho=dados_entrada_json FROM dbo.lancamentos WITH(UPDLOCK,HOLDLOCK)
    WHERE id=N'259' AND indicador_id=N'22' AND competencia=N'2026-07';

  IF ISJSON(@regras)<>1 OR ISJSON(@metas)<>1 OR ISJSON(@dadosJulho)<>1
    THROW 53403,N'Configurações ou dados de julho não contêm JSON válido.',1;

  IF JSON_VALUE(@regras,'$[21].indicadorId')<>N'22'
     OR (SELECT COUNT(*) FROM OPENJSON(@regras) WHERE JSON_VALUE(value,'$.indicadorId')=N'22')<>1
    THROW 53404,N'A regra única do Indicador 22 não está no índice esperado $[21].',1;

  IF JSON_VALUE(@metas,'$[225].id')<>N'244'
     OR JSON_VALUE(@metas,'$[225].indicadorId')<>N'22'
     OR JSON_VALUE(@metas,'$[225].ano')<>N'2026'
     OR JSON_VALUE(@metas,'$[225].mes')<>N'7'
     OR (SELECT COUNT(*) FROM OPENJSON(@metas)
         WHERE JSON_VALUE(value,'$.indicadorId')=N'22'
           AND JSON_VALUE(value,'$.ano')=N'2026'
           AND JSON_VALUE(value,'$.mes')=N'7')<>1
    THROW 53405,N'A meta única de julho do Indicador 22 não está no índice esperado $[225].',1;

  SET @estadoAnterior=CASE WHEN
    (SELECT meta_anual FROM dbo.indicadores WHERE id=N'22')=@descricaoAnterior
    AND JSON_VALUE(@regras,'$[21].parametrosCalculo.vigenciasMeta[0].inicio')=N'2026-01'
    AND JSON_VALUE(@regras,'$[21].parametrosCalculo.vigenciasMeta[0].fim')=N'2026-07'
    AND TRY_CONVERT(decimal(10,2),JSON_VALUE(@regras,'$[21].parametrosCalculo.vigenciasMeta[0].fator'))=1.10
    AND JSON_VALUE(@regras,'$[21].parametrosCalculo.vigenciasMeta[1].inicio')=N'2026-08'
    AND JSON_VALUE(@regras,'$[21].parametrosCalculo.vigenciasMeta[1].fim')=N'2026-12'
    AND TRY_CONVERT(decimal(10,2),JSON_VALUE(@regras,'$[21].parametrosCalculo.vigenciasMeta[1].fator'))=1.01
    AND TRY_CONVERT(decimal(38,18),JSON_VALUE(@metas,'$[225].metaMensal'))=@metaAnterior
    AND TRY_CONVERT(decimal(10,2),JSON_VALUE(@dadosJulho,'$.fatorMetaVigente'))=1.10
    AND ABS(TRY_CONVERT(decimal(38,18),(SELECT meta_referencia FROM dbo.lancamentos WHERE id=N'259'))-@metaAnterior)<=0.000000010000000000
    THEN 1 ELSE 0 END;

  SET @estadoFinal=CASE WHEN
    (SELECT meta_anual FROM dbo.indicadores WHERE id=N'22')=@descricaoNova
    AND JSON_VALUE(@regras,'$[21].parametrosCalculo.vigenciasMeta[0].inicio')=N'2026-01'
    AND JSON_VALUE(@regras,'$[21].parametrosCalculo.vigenciasMeta[0].fim')=N'2026-06'
    AND TRY_CONVERT(decimal(10,2),JSON_VALUE(@regras,'$[21].parametrosCalculo.vigenciasMeta[0].fator'))=1.10
    AND JSON_VALUE(@regras,'$[21].parametrosCalculo.vigenciasMeta[1].inicio')=N'2026-07'
    AND JSON_VALUE(@regras,'$[21].parametrosCalculo.vigenciasMeta[1].fim')=N'2026-12'
    AND TRY_CONVERT(decimal(10,2),JSON_VALUE(@regras,'$[21].parametrosCalculo.vigenciasMeta[1].fator'))=1.01
    AND TRY_CONVERT(decimal(38,18),JSON_VALUE(@metas,'$[225].metaMensal'))=@metaNova
    AND TRY_CONVERT(decimal(10,2),JSON_VALUE(@dadosJulho,'$.fatorMetaVigente'))=1.01
    AND ABS(TRY_CONVERT(decimal(38,18),(SELECT meta_referencia FROM dbo.lancamentos WHERE id=N'259'))-@metaNova)<=0.000000000000000001
    THEN 1 ELSE 0 END;

  IF @estadoAnterior=0 AND @estadoFinal=0
    THROW 53406,N'Estado atual diverge tanto da configuração anterior quanto da configuração final esperada.',1;

  IF @estadoAnterior=1
  BEGIN
    UPDATE dbo.indicadores
       SET meta_anual=@descricaoNova,updated_at=@agora
     WHERE id=N'22' AND meta_anual=@descricaoAnterior;
    IF @@ROWCOUNT<>1 THROW 53407,N'Falha ao atualizar a descrição da meta do Indicador 22.',1;

    SET @regra22=JSON_QUERY(@regras,'$[21]');
    SET @regra22=JSON_MODIFY(@regra22,'$.parametrosCalculo.vigenciasMeta[0].fim',N'2026-06');
    SET @regra22=JSON_MODIFY(@regra22,'$.parametrosCalculo.vigenciasMeta[1].inicio',N'2026-07');
    SET @regras=JSON_MODIFY(@regras,'$[21]',JSON_QUERY(@regra22));
    UPDATE dbo.configuracoes SET valor_json=@regras,updated_at=@agora WHERE chave=N'regrasIndicadores';
    IF @@ROWCOUNT<>1 THROW 53408,N'Falha ao atualizar a regra do Indicador 22.',1;

    SET @metas=JSON_MODIFY(@metas,'$[225].metaMensal',@metaNova);
    UPDATE dbo.configuracoes SET valor_json=@metas,updated_at=@agora WHERE chave=N'metas';
    IF @@ROWCOUNT<>1 THROW 53409,N'Falha ao atualizar a meta mensal de julho.',1;

    SET @dadosJulho=JSON_MODIFY(@dadosJulho,'$.fatorMetaVigente',CAST(1.01 AS decimal(10,2)));
    SET @dadosJulho=JSON_MODIFY(@dadosJulho,'$.metaParticipacao2026',@metaNova);
    UPDATE dbo.lancamentos
       SET dados_entrada_json=@dadosJulho,
           meta_referencia=CONVERT(nvarchar(100),@metaNova),
           percentual_atingido=CONVERT(nvarchar(100),@atingimentoNovo),
           situacao=N'Abaixo da meta',
           updated_at=@agora
     WHERE id=N'259' AND indicador_id=N'22' AND competencia=N'2026-07'
       AND status=N'Em preenchimento' AND versao_atual=1;
    IF @@ROWCOUNT<>1 THROW 53410,N'Falha ao atualizar exclusivamente o lançamento 259 de julho.',1;

    IF NOT EXISTS(SELECT 1 FROM dbo.auditoria WHERE id=N'migration-ind22-meta-jul-20261109')
      INSERT INTO dbo.auditoria
        (id,entidade,entidade_id,acao,descricao,dados_anteriores_json,dados_novos_json,usuario,perfil_usuario,data_acao,created_at)
      VALUES
        (N'migration-ind22-meta-jul-20261109',N'lancamentos',N'259',N'meta_indicador_ajustada',
         N'Início da vigência de crescimento mínimo de 1% do Indicador 22 alterado de agosto para julho de 2026.',
         N'{"competencia":"2026-07","fatorMetaVigente":1.10,"metaReferencia":0.008542119277860550,"percentualAtingido":0.725015277263211700,"situacao":"Abaixo da meta"}',
         N'{"competencia":"2026-07","fatorMetaVigente":1.01,"metaReferencia":0.007843218609671960,"percentualAtingido":0.789620598999537400,"situacao":"Abaixo da meta"}',
         N'MIGRACAO-20261109',N'Sistema',@agora,@agora);
  END;

  IF (SELECT meta_anual FROM dbo.indicadores WHERE id=N'22')<>@descricaoNova
     OR JSON_VALUE((SELECT valor_json FROM dbo.configuracoes WHERE chave=N'regrasIndicadores'),'$[21].parametrosCalculo.vigenciasMeta[0].fim')<>N'2026-06'
     OR JSON_VALUE((SELECT valor_json FROM dbo.configuracoes WHERE chave=N'regrasIndicadores'),'$[21].parametrosCalculo.vigenciasMeta[1].inicio')<>N'2026-07'
     OR TRY_CONVERT(decimal(38,18),JSON_VALUE((SELECT valor_json FROM dbo.configuracoes WHERE chave=N'metas'),'$[225].metaMensal'))<>@metaNova
     OR TRY_CONVERT(decimal(38,18),(SELECT meta_referencia FROM dbo.lancamentos WHERE id=N'259'))<>@metaNova
     OR TRY_CONVERT(decimal(38,18),(SELECT percentual_atingido FROM dbo.lancamentos WHERE id=N'259'))<>@atingimentoNovo
    THROW 53411,N'Pós-condição inválida após ajustar a meta de julho do Indicador 22.',1;

  COMMIT TRANSACTION;

  SELECT N'Indicador 22' AS objeto,N'2026-07' AS competencia,
         CAST(1.01 AS decimal(10,2)) AS fator_meta,
         @metaNova AS meta_referencia,@atingimentoNovo AS percentual_atingido,
         N'Abaixo da meta' AS situacao,
         CASE WHEN @estadoAnterior=1 THEN N'ATUALIZADO' ELSE N'JÁ ESTAVA REGULARIZADO' END AS resultado;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
