> Estou trabalhando em um sistema interno de gestão de indicadores estratégicos da CAIXA Loterias. A aplicação é desenvolvida em PHP + JavaScript e utiliza SQL Server como banco de dados.
>
> O indicador que precisa ser analisado é:
>
> **ID:** 6
> **Nome:** IEO Recorrente — Índice de Eficiência Operacional Recorrente
> **Unidade de medida:** percentual
> **Tipo de cálculo:** `indice_inverso`
> **Tipo de consolidação:** `ultima_posicao_acumulada`
> **Regra:** quanto menor o índice, melhor o resultado.
>
> ---
>
> ### 1. FÓRMULA OFICIAL DO IEO RECORRENTE
>
> O cálculo da competência deve ser:
>
> ```text
> IEO =
> (Despesa de Pessoal + Despesas Administrativas)
> -------------------------------------------------
>                 Receitas Líquidas
> ```
>
> Exemplo:
>
> ```text
> Despesa de pessoal           = 5.700.000
> Despesas administrativas     = 8.655.120
> Receitas líquidas            = 223.600.000
>
> IEO =
> (5.700.000 + 8.655.120) / 223.600.000
>
> IEO = 0,0642
> IEO = 6,42%
> ```
>
> O resultado armazenado matematicamente deve permanecer como decimal:
>
> ```text
> 6,42% = 0.0642
> 11,00% = 0.11
> 10,80% = 0.108
> ```
>
> ---
>
> ### 2. META ANUAL
>
> A meta estratégica anual do IEO para 2026 é:
>
> ```text
> IEO <= 14,03%
> ```
>
> Em decimal:
>
> ```text
> 0.1403
> ```
>
> Mas a apuração mensal NÃO deve utilizar 14,03% para todos os meses.
>
> Existe uma curva de referência mensal para 2026.
>
> ---
>
> ### 3. CURVA MENSAL CORRETA DO IEO PARA 2026
>
> A curva que deve ser utilizada é exatamente:
>
> ```text
> Janeiro/2026    14,49%   = 0.1449
> Fevereiro/2026  14,45%   = 0.1445
> Março/2026      14,41%   = 0.1441
> Abril/2026      14,36%   = 0.1436
> Maio/2026       14,32%   = 0.1432
> Junho/2026      14,28%   = 0.1428
> Julho/2026      14,2383333333% = 0.1423833333333333
> Agosto/2026     14,1966666667% = 0.1419666666666667
> Setembro/2026   14,155%  = 0.14155
> Outubro/2026    14,1133333333% = 0.1411333333333333
> Novembro/2026   14,0716666667% = 0.1407166666666667
> Dezembro/2026   14,03%   = 0.1403
> ```
>
> Portanto:
>
> ```text
> Janeiro usa 0.1449
> Fevereiro usa 0.1445
> Março usa 0.1441
> ...
> Dezembro usa 0.1403
> ```
>
> ---
>
> ### 4. CÁLCULO DO PERCENTUAL ATINGIDO
>
> Como se trata de indicador inverso — quanto menor, melhor — o percentual atingido NÃO é:
>
> ```text
> resultado / meta
> ```
>
> A fórmula correta é:
>
> ```text
> percentualAtingido =
> metaDaCompetencia / ieoDaCompetencia
> ```
>
> Não existe teto de 100%.
>
> Portanto, resultados melhores que a meta podem gerar:
>
> ```text
> 131%
> 150%
> 225%
> etc.
> ```
>
> Isso é intencional.
>
> ---
>
> ### 5. SITUAÇÃO DO INDICADOR
>
> A situação deve ser determinada diretamente pela comparação:
>
> ```text
> se IEO <= meta da competência:
>     Atingido
>
> se IEO > meta da competência:
>     Abaixo da meta
> ```
>
> Exemplo:
>
> ```text
> Meta janeiro = 14,49%
> IEO janeiro  = 6,42%
>
> 6,42% <= 14,49%
>
> situação = Atingido
> ```
>
> ---
>
> ### 6. DADOS REAIS JÁ EXISTENTES NO SQL SERVER
>
> Foram verificadas as competências Janeiro, Fevereiro e Março de 2026.
>
> #### Janeiro/2026
>
> ```text
> Despesa de pessoal:
> 5.700.000
>
> Despesas administrativas:
> 8.655.120
>
> Receitas líquidas:
> 223.600.000
>
> Resultado:
> (5.700.000 + 8.655.120) / 223.600.000
> = 0.0642
> = 6,42%
> ```
>
> Meta correta:
>
> ```text
> 0.1449 = 14,49%
> ```
>
> Percentual atingido esperado:
>
> ```text
> 0.1449 / 0.0642
> ≈ 2.257
> ≈ 225,70%
> ```
>
> Situação:
>
> ```text
> Atingido
> ```
>
> ---
>
> #### Fevereiro/2026
>
> ```text
> Despesa de pessoal:
> 19.000.000
>
> Despesas administrativas:
> 29.279.000
>
> Receitas líquidas:
> 438.900.000
>
> Resultado:
> (19.000.000 + 29.279.000) / 438.900.000
> = 0.11
> = 11,00%
> ```
>
> Meta correta:
>
> ```text
> 0.1445 = 14,45%
> ```
>
> Percentual atingido:
>
> ```text
> 0.1445 / 0.11
> = 1.313636...
> = 131,36%
> ```
>
> Situação:
>
> ```text
> Atingido
> ```
>
> ---
>
> #### Março/2026
>
> ```text
> Despesa de pessoal:
> 28.000.000
>
> Despesas administrativas:
> 43.625.600
>
> Receitas líquidas:
> 663.200.000
>
> Resultado:
> (28.000.000 + 43.625.600) / 663.200.000
> = 0.108
> = 10,80%
> ```
>
> Meta correta:
>
> ```text
> 0.1441 = 14,41%
> ```
>
> Percentual atingido:
>
> ```text
> 0.1441 / 0.108
> = 1.334259...
> = 133,43%
> ```
>
> Situação:
>
> ```text
> Atingido
> ```
>
> ---
>
> ### 7. VALORES ESPERADOS RESUMIDOS
>
> O resultado correto do primeiro trimestre é:
>
> ```text
> COMPETÊNCIA     META      IEO       % ATINGIDO    SITUAÇÃO
>
> Janeiro/2026    14,49%    6,42%     225,70%       Atingido
> Fevereiro/2026  14,45%    11,00%    131,36%       Atingido
> Março/2026      14,41%    10,80%    133,43%       Atingido
> ```
>
> ---
>
> ### 8. SITUAÇÃO ATUAL DO SQL SERVER
>
> O SQL Server já possui a tabela:
>
> ```text
> dbo.lancamentos
> ```
>
> com campos entre outros:
>
> ```text
> id
> indicador_id
> competencia
> ano
> mes
> trimestre
> dados_entrada_json
> resultado_calculado
> resultado_oficial
> meta_referencia
> percentual_atingido
> situacao
> status
> updated_at
> ```
>
> Os dados de entrada do IEO estão preservados dentro de:
>
> ```text
> dados_entrada_json
> ```
>
> com propriedades como:
>
> ```text
> despesaPessoalMes
> despesasAdministrativasMes
> receitasLiquidasMes
> ieoApuradoInformado
> ```
>
> Portanto, NÃO houve perda dos dados originais.
>
> ---
>
> ### 9. PROBLEMA NOS DADOS CALCULADOS EXISTENTES
>
> Existem registros antigos/inconsistentes no SQL.
>
> Janeiro e fevereiro estavam aproximadamente assim:
>
> ```text
> resultado_calculado = correto
> meta_referencia = NULL
> percentual_atingido = NULL
> situacao = Sem meta de referência
> ```
>
> Março possuía:
>
> ```text
> resultado_calculado = 0.108
> meta_referencia = 0.1441
> percentual_atingido = 1.0422
> situacao = Atingido
> ```
>
> O valor:
>
> ```text
> 1.0422 = 104,22%
> ```
>
> está ERRADO.
>
> O correto para março é:
>
> ```text
> 0.1441 / 0.108
> ≈ 1.3343
> = 133,43%
> ```
>
> O antigo 104,22% deve ser considerado dado legado incorreto.
>
> ---
>
> ### 10. CAMPO LEGADO QUE NÃO DEVE MAIS SER UTILIZADO
>
> Existia uma lógica antiga relacionada a:
>
> ```text
> percentualAtingidoOficialInformado
> ```
>
> e também:
>
> ```text
> observacaoAjusteOficial
> ```
>
> Essa lógica não deve mais interferir no IEO.
>
> O percentual atingido deve ser sempre recalculado matematicamente:
>
> ```text
> metaCompetencia / ieoCompetencia
> ```
>
> O valor “oficial informado” legado deve ser ignorado/removido da lógica.
>
> ---
>
> ### 11. CONFIGURAÇÃO DO INDICADOR NO SQL SERVER
>
> A tabela:
>
> ```text
> dbo.configuracoes
> ```
>
> possui a chave:
>
> ```text
> regrasIndicadores
> ```
>
> O JSON existe e foi conferido.
>
> O registro completo possui aproximadamente:
>
> ```text
> 38.507 caracteres
> ```
>
> A regra específica do indicador 6 foi consultada e retornou corretamente:
>
> ```text
> indicadorId = 6
> tipoCalculo = indice_inverso
> tipoConsolidacao = ultima_posicao_acumulada
> ```
>
> Portanto, a regra básica do indicador existe no banco.
>
> ---
>
> ### 12. PROBLEMA VISUAL OBSERVADO NA APLICAÇÃO
>
> Depois que a aplicação foi conectada diretamente ao SQL Server, a tela de detalhe do IEO passou a apresentar uma tabela genérica, algo semelhante a:
>
> ```text
> Mês
> Meta mensal/referência
> Realizado mensal
> Resultado mensal
> Status
> ```
>
> Quando o comportamento correto deveria ser uma tabela específica do IEO:
>
> ```text
> Mês
> Meta de referência da competência
> Despesa de pessoal
> Despesas administrativas
> Receitas líquidas
> IEO calculado da competência
> % atingido
> Situação da competência
> Status mensal
> Ação
> ```
>
> A aplicação possui código JavaScript específico para essa apresentação.
>
> ---
>
> ### 13. ARQUIVOS IMPORTANTES DA APLICAÇÃO
>
> Os arquivos relacionados ao comportamento do IEO são principalmente:
>
> ```text
> assets/js/ieo-recorrente.js
> public/assets/js/ieo-recorrente.js
>
> assets/js/indicators.js
> public/assets/js/indicators.js
>
> assets/js/formulas.js
> public/assets/js/formulas.js
>
> assets/js/dataStore.js
> public/assets/js/dataStore.js
> ```
>
> O arquivo:
>
> ```text
> ieo-recorrente.js
> ```
>
> já contém a curva mensal correta:
>
> ```javascript
> "2026-01": 0.1449
> "2026-02": 0.1445
> "2026-03": 0.1441
> ...
> "2026-12": 0.1403
> ```
>
> O arquivo `indicators.js` já possui também a tabela específica do IEO.
>
> ---
>
> ### 14. INCONSISTÊNCIA IDENTIFICADA NO DATASTORE
>
> Há uma versão mais antiga da curva dentro do `dataStore.js`.
>
> Ela ainda possui algo equivalente a:
>
> ```text
> Janeiro = NULL
> Fevereiro = NULL
> Março = 0.1441
> ...
> Dezembro = 0.1403
> ```
>
> Essa configuração é antiga.
>
> O sistema deve trabalhar com UMA ÚNICA REGRA OFICIAL:
>
> ```text
> janeiro 0.1449
> fevereiro 0.1445
> março 0.1441
> ...
> dezembro 0.1403
> ```
>
> A existência simultânea das duas curvas pode causar comportamento diferente dependendo do ponto da aplicação que processa o dado.
>
> ---
>
> ### 15. HISTÓRICO IMPORTANTE DA INVESTIGAÇÃO
>
> Inicialmente acreditávamos que a aplicação estava gravando no SQL Server.
>
> Depois foi descoberto que o ambiente de desenvolvimento estava usando:
>
> ```text
> php_sqlite_local
> ```
>
> ou seja:
>
> ```text
> aplicação → SQLite
> ```
>
> enquanto o SQL Server Management Studio estava consultando:
>
> ```text
> SQL Server
> ```
>
> Portanto estávamos comparando bancos diferentes.
>
> Posteriormente o ambiente PHP local foi configurado corretamente com a extensão:
>
> ```text
> sqlsrv
> ```
>
> e a aplicação passou a acessar o SQL Server.
>
> O endpoint:
>
> ```text
> api/database?ping=1
> ```
>
> deve retornar algo equivalente a:
>
> ```json
> {
>   "ok": true,
>   "mode": "php_sqlserver",
>   "database": "sqlsrv"
> }
> ```
>
> Agora a investigação deve considerar somente o SQL Server como fonte central.
>
> ---
>
> ### 16. O QUE PRECISA SER VERIFICADO PELA IA COM ACESSO AO SQL SERVER
>
> Preciso que você analise o banco e a aplicação considerando que:
>
> **NÃO queremos recriar o banco.**
>
> **NÃO queremos excluir os lançamentos existentes.**
>
> **NÃO queremos perder os dados homologados ou os dados de entrada.**
>
> Deve ser feita uma análise cuidadosa antes de qualquer alteração.
>
> Verifique principalmente:
>
> ```text
> 1. Todos os lançamentos do indicador_id = 6 em 2026.
>
> 2. dados_entrada_json de cada competência.
>
> 3. resultado_calculado.
>
> 4. meta_referencia.
>
> 5. percentual_atingido.
>
> 6. situacao.
>
> 7. status.
>
> 8. updated_at.
>
> 9. A regra indicadorId = 6 dentro de configuracoes/regrasIndicadores.
>
> 10. Se existe alguma outra configuração de meta do indicador 6 na
>     coleção "metas" ou em outro JSON que esteja sobrescrevendo a curva.
> ```
>
> ---
>
> ### 17. CONSULTA SQL ÚTIL PARA DIAGNÓSTICO
>
> Pode ser utilizada:
>
> ```sql
> SELECT
>     competencia,
>     JSON_VALUE(dados_entrada_json, '$.despesaPessoalMes')
>         AS despesa_pessoal,
>     JSON_VALUE(dados_entrada_json, '$.despesasAdministrativasMes')
>         AS despesas_administrativas,
>     JSON_VALUE(dados_entrada_json, '$.receitasLiquidasMes')
>         AS receitas_liquidas,
>     JSON_VALUE(dados_entrada_json, '$.ieoApuradoInformado')
>         AS ieo_informado,
>     resultado_calculado,
>     meta_referencia,
>     percentual_atingido,
>     situacao,
>     status,
>     updated_at
> FROM dbo.lancamentos
> WHERE indicador_id = '6'
>   AND ano = 2026
> ORDER BY mes;
> ```
>
> Para verificar a regra:
>
> ```sql
> SELECT
>     JSON_VALUE(j.value, '$.indicadorId') AS indicador_id,
>     JSON_VALUE(j.value, '$.tipoCalculo') AS tipo_calculo,
>     JSON_VALUE(j.value, '$.tipoConsolidacao') AS tipo_consolidacao
> FROM dbo.configuracoes c
> CROSS APPLY OPENJSON(c.valor_json) j
> WHERE c.chave = 'regrasIndicadores'
>   AND JSON_VALUE(j.value, '$.indicadorId') = '6';
> ```
>
> ---
>
> ### 18. RESULTADO FINAL QUE O SISTEMA PRECISA PRODUZIR
>
> Independentemente do valor legado existente em `meta_referencia` ou `percentual_atingido`, a regra funcional correta deve resultar em:
>
> ```text
> Janeiro/2026
> Meta = 14,49%
> IEO = 6,42%
> % atingido = 225,70%
> Situação = Atingido
>
> Fevereiro/2026
> Meta = 14,45%
> IEO = 11,00%
> % atingido = 131,36%
> Situação = Atingido
>
> Março/2026
> Meta = 14,41%
> IEO = 10,80%
> % atingido = 133,43%
> Situação = Atingido
> ```
>
> E a aplicação deve apresentar os componentes:
>
> ```text
> Despesa de pessoal
> +
> Despesas administrativas
> --------------------------------
> Receitas líquidas
>
> = IEO da competência
> ```
>
> ---
>
> ### 19. RESTRIÇÃO IMPORTANTE SOBRE ALTERAÇÕES NO BANCO
>
> Antes de executar qualquer alteração, classifique o impacto:
>
> ```text
> 🟢 Só aplicação
> Nenhuma alteração no SQL.
>
> 🟡 Aplicação + ajuste de dados
> UPDATE dos registros existentes, sem alteração estrutural.
>
> 🔴 Aplicação + estrutura do banco
> ALTER TABLE, CREATE, migration etc.
> ```
>
> Para o problema atual do IEO, a preferência é **🟢 Só aplicação**.
>
> Se for necessário corrigir registros históricos de:
>
> ```text
> meta_referencia
> percentual_atingido
> situacao
> ```
>
> isso deve ser tratado separadamente como:
>
> ```text
> 🟡 Aplicação + ajuste de dados
> ```
>
> e nenhum `UPDATE` deve ser executado sem mostrar antes exatamente quais registros serão afetados.
>
> ---
>
> ### 20. O QUE EU QUERO QUE VOCÊ FAÇA
>
> Analise o SQL Server e o código relacionado ao indicador 6 e determine:
>
> ```text
> 1. Por que a aplicação, mesmo tendo a regra indice_inverso,
>    ainda pode apresentar o IEO em layout genérico.
>
> 2. Qual fonte está efetivamente fornecendo a meta mensal:
>    lancamentos.meta_referencia,
>    configuracoes.regrasIndicadores,
>    configuracoes.metas,
>    dataStore.js,
>    ieo-recorrente.js,
>    ou outra fonte.
>
> 3. Se existe alguma curva antiga do IEO ainda ativa.
>
> 4. Como garantir uma única curva oficial para 2026.
>
> 5. Como garantir que o percentual atingido seja sempre:
>
>       metaCompetencia / ieoCompetencia
>
> 6. Como eliminar totalmente a influência de:
>
>       percentualAtingidoOficialInformado
>
> 7. Como corrigir a apresentação sem perder os dados existentes.
>
> 8. Se for necessário corrigir dados históricos no SQL,
>    apresente PRIMEIRO um SELECT mostrando os registros que seriam
>    alterados e somente depois proponha o UPDATE.
>
> 9. Não recrie o banco e não altere a estrutura sem necessidade.
>
> 10. Preserve os dados de entrada, homologações e histórico.
> ```
>
> O objetivo final é deixar **SQL Server, cálculo da aplicação, tela de lançamento, tela de indicadores, homologação, resumo executivo e visão trimestral usando exatamente a mesma regra do IEO Recorrente**.

Um ponto que eu acrescentaria para a outra IA: **não deixe ela simplesmente corrigir janeiro, fevereiro e março no SQL e considerar o problema resolvido**. O principal é eliminar a duplicidade de regras. Caso contrário, abril em diante poderá repetir o mesmo problema. A correção precisa garantir que a curva mensal oficial do IEO esteja centralizada ou, no mínimo, aplicada de forma consistente em todos os módulos.
