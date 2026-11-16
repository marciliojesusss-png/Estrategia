# Migrar indicadores.sqlite para o SQL Server da CAIXA

## Objetivo

O script `scripts/migrar-para-sqlserver.py` utiliza o arquivo local `database/indicadores.sqlite` para criar um banco SQL Server completamente novo no ambiente corporativo da CAIXA.

O procedimento foi validado com sucesso no ambiente:

    Servidor SQL Server: DF7436SR439
    Banco novo: DB5319_Monitoramento_Estrategia
    Proprietario/dbo: CORPCAIXA\c118119
    Login SQL da aplicacao: s531902

O banco:

    DB5319_IndicadoresEstrategicos

nao e utilizado como destino, nao e limpo, nao e restaurado e nao e sobrescrito pelo processo.

A estrategia cria `DB5319_Monitoramento_Estrategia` como banco independente e transporta para ele os dados funcionais existentes no SQLite.

A aplicacao somente deve ser configurada para utilizar o novo banco depois da criacao, validacao, backup e testes funcionais.

---

## Por que utilizar SQLite em vez de RESTORE de um backup SQL Server externo

Durante os testes realizados no ambiente CAIXA foi identificado que bancos restaurados a partir de backups SQL Server produzidos em ambiente externo podiam apresentar incompatibilidade de seguranca.

Em bancos restaurados diretamente do ambiente externo foram observados resultados:

    TemAcesso       = 0
    PodeFazerBackup = 0
    TemControle     = 0

Tambem ocorreu SQL Server Error 916 ao tentar acessar banco de staging restaurado a partir de backup externo.

Em contraste, bancos criados ou restaurados dentro do contexto CAIXA apresentaram:

    TemAcesso       = 1
    PodeFazerBackup = 1
    TemControle     = 1

Por esse motivo, a estrategia adotada cria diretamente o banco na instancia:

    DF7436SR439

e utiliza como fonte apenas os dados funcionais existentes no:

    database/indicadores.sqlite

O fluxo evita transportar para o novo banco o contexto de seguranca interno existente em backups SQL Server produzidos externamente.

---

## Banco atual preservado

O banco atualmente existente:

    DB5319_IndicadoresEstrategicos

deve permanecer preservado durante a criacao e validacao do novo banco.

O novo banco e:

    DB5319_Monitoramento_Estrategia

Nao excluir `DB5319_IndicadoresEstrategicos` durante:

- criacao do banco novo;
- migracao;
- validacoes;
- backup;
- publicacao da nova aplicacao;
- primeiros testes funcionais.

O banco anterior constitui uma contingencia adicional durante a estabilizacao da nova versao.

---

## Regra corporativa para nome do banco

Na primeira tentativa foi utilizado:

    Monitoramento_Estrategia

A criacao foi rejeitada pelo SQL Server corporativo porque o ambiente exige o padrao de nomenclatura:

    DB(gcg_da_unidade)_(nome_do_sistema)

Para a unidade correspondente, foi adotado:

    DB5319_Monitoramento_Estrategia

Esse e o nome oficial utilizado pelo migrador.

Nao utilizar:

    Monitoramento_Estrategia

como nome de banco no servidor corporativo.

---

## Protecoes do fluxo

O migrador:

- exige que `DB5319_Monitoramento_Estrategia` ainda nao exista;
- nunca utiliza um banco existente como destino da migracao;
- nao altera `DB5319_IndicadoresEstrategicos`;
- valida a identidade Windows utilizada para executar a migracao;
- valida o SID corporativo esperado de `CORPCAIXA\c118119`;
- valida existencia, estado e SID do login `s531902`;
- valida `CREATE ANY DATABASE` antes da criacao;
- cria o banco inicialmente em `RESTRICTED_USER`;
- aplica `database/sqlserver/schema.sql`;
- importa as 20 tabelas funcionais;
- preserva valores das colunas `IDENTITY`;
- desabilita temporariamente constraints durante a carga;
- reativa e valida constraints depois da importacao;
- cria triggers documentais somente depois da carga;
- valida os eventos dos triggers documentais;
- compara contagens de registros entre SQLite e SQL Server;
- compara chaves dos registros;
- compara agrupamentos funcionais;
- valida relacionamentos e chaves estrangeiras;
- valida campos JSON;
- valida tabelas de autenticacao da aplicacao;
- define ou confirma `CORPCAIXA\c118119` como proprietario/dbo;
- cria ou remapeia o usuario `s531902` para o login SQL existente;
- garante `db_datareader` e `db_datawriter` para `s531902`;
- verifica ausencia de `DENY CONNECT`;
- valida novamente `owner_sid`, SID de `dbo` e SID de `s531902`;
- somente libera o banco em `MULTI_USER` depois das validacoes finais;
- em caso de erro anterior a conclusao, preserva o banco para diagnostico.

No servidor `DF7436SR439`, sao bloqueadas pelo migrador as opcoes:

    --truncate
    --seed-auth-users
    --skip-schema
    --skip-verify

---

# Requisitos

## Arquivo SQLite

O arquivo deve existir em:

    database/indicadores.sqlite

O arquivo deve conter as 20 tabelas funcionais obrigatorias utilizadas pela aplicacao.

IMPORTANTE:

Confirmar que o arquivo nao possui tamanho zero.

Durante a implantacao foi inicialmente encontrado um `indicadores.sqlite` com:

    Length = 0 bytes

Ao consultar esse arquivo vazio, foram obtidos:

    PRAGMA integrity_check = ok
    PRAGMA foreign_key_check = []

Portanto, esses dois resultados isoladamente NAO comprovam que o SQLite contem os dados da aplicacao.

O SQLite correto utilizado na migracao apresentou:

    Tamanho: 3.203.072 bytes

Sempre verificar tamanho, estrutura e contagens antes da migracao.

---

## Schema SQL Server

O arquivo abaixo deve existir:

    database/sqlserver/schema.sql

O arquivo deve corresponder a estrutura esperada pela versao da aplicacao que sera implantada.

---

## Python

Na maquina utilizada foram encontradas:

    Python 3.14
    Python 3.13
    Python 3.11

O Python padrao era o Python 3.14.

O Python 3.14 nao possuia `pyodbc`.

A tentativa de instalar:

    python -m pip install --user pyodbc

falhou porque o ambiente corporativo nao conseguiu acessar `pypi.org`.

Foi identificado que o Python 3.13 ja possuia:

    pyodbc 5.3.0

Por isso, o procedimento validado utiliza:

    py -3.13

Nao utilizar simplesmente:

    python

sem verificar previamente qual interpretador sera executado.

---

## Verificar instalacoes Python

Executar:

    py -0p

Na maquina utilizada foram encontradas versoes equivalentes a:

    Python 3.14
    Python 3.13
    Python 3.11

---

## Verificar pyodbc e drivers

Executar:

    py -3.13 -c "import pyodbc; print('pyodbc:', pyodbc.version); print('drivers:', pyodbc.drivers())"

Na implantacao validada foi utilizado:

    pyodbc: 5.3.0

O driver escolhido automaticamente pelo migrador foi:

    SQL Server Native Client 11.0

O migrador procura, nesta ordem:

    ODBC Driver 18 for SQL Server
    ODBC Driver 17 for SQL Server
    SQL Server Native Client 11.0
    SQL Server

Nao e obrigatorio possuir ODBC Driver 17 ou 18 se outro driver suportado pelo migrador estiver instalado e validado.

---

## Rede

A maquina deve conseguir acessar:

    DF7436SR439

A autenticacao administrativa utilizada pelo migrador e integrada do Windows.

---

## Identidade corporativa

A execucao corporativa validada ocorreu com:

    CORPCAIXA\c118119

A conta deve possuir:

    CREATE ANY DATABASE

Nao e obrigatorio que a conta seja `sysadmin`.

Na implantacao validada:

    IS_SRVROLEMEMBER('sysadmin') = 0
    CREATE ANY DATABASE = 1

---

## SIDs esperados

SID de:

    CORPCAIXA\c118119

esperado:

    0x010500000000000515000000C78A7EB26AEE162F1968276B896C0000

Login SQL:

    s531902

SID esperado:

    0x401E46BC08211343899A19AC0768B6B8

O login `s531902` deve:

- existir na instancia;
- estar habilitado;
- apresentar o SID esperado.

O migrador nao deve remover nem recriar o login `s531902` da instancia.

---

# Validacao da identidade corporativa

No ambiente CAIXA, a identidade executora e validada utilizando:

    ORIGINAL_LOGIN()

e:

    SUSER_SID(...)

O SID retornado pelo SQL Server deve corresponder ao SID corporativo esperado.

O login `s531902` e validado separadamente por meio de:

    sys.server_principals

Dentro do banco novo, o usuario correspondente a `s531902` e criado ou remapeado para o login existente.

---

# Validacoes do SQLite antes da criacao

## Confirmar tamanho

Executar na raiz da aplicacao:

    Get-Item .\database\indicadores.sqlite |
    Select-Object FullName, Length, LastWriteTime

O campo:

    Length

deve ser maior que zero.

Na implantacao validada:

    Length = 3203072

---

## Verificar integridade

Executar:

    python -c "import sqlite3; c=sqlite3.connect(r'.\database\indicadores.sqlite'); print(c.execute('PRAGMA integrity_check').fetchone()[0]); c.close()"

Resultado esperado:

    ok

---

## Verificar chaves estrangeiras

Executar:

    python -c "import sqlite3; c=sqlite3.connect(r'.\database\indicadores.sqlite'); print(c.execute('PRAGMA foreign_key_check').fetchall()); c.close()"

Resultado esperado:

    []

---

## Tabelas obrigatorias

O migrador exige as seguintes 20 tabelas:

    indicadores
    prazos_apuracao
    lancamentos
    homologacoes
    solicitacoes_reabertura
    retificacoes
    evidencias
    lancamentos_observacoes_documentais
    lancamentos_resultados_homologados
    auditoria
    configuracoes
    usuarios_validacao
    backups_importacao
    usuarios_acesso
    acessos_log
    iniciativas_estrategicas
    iniciativas_acompanhamentos
    iniciativas_acompanhamento_itens
    iniciativas_homologacoes
    iniciativas_evidencias

O SQLite utilizado tambem possuia:

    _migration_metadata

totalizando 21 tabelas.

---

# Baseline de registros utilizado na implantacao

As contagens observadas antes da migracao foram:

    indicadores                           23
    prazos_apuracao                        2
    lancamentos                          276
    homologacoes                         318
    solicitacoes_reabertura                0
    retificacoes                          14
    evidencias                            69
    lancamentos_observacoes_documentais   69
    lancamentos_resultados_homologados    79
    auditoria                            767
    configuracoes                         11
    usuarios_validacao                    13
    backups_importacao                     1
    usuarios_acesso                        4
    acessos_log                         1298
    iniciativas_estrategicas               9
    iniciativas_acompanhamentos           27
    iniciativas_acompanhamento_itens       0
    iniciativas_homologacoes              27
    iniciativas_evidencias                 0

Tabelas com zero registros sao aceitas desde que existam e estejam estruturalmente corretas.

Essas contagens correspondem ao SQLite utilizado nesta implantacao e devem ser utilizadas como referencia historica, nao como numeros fixos para migracoes futuras.

Nas proximas migracoes, registrar novamente as contagens da fonte antes da criacao.

---

# Backup local do SQLite

Antes da carga, o migrador cria uma copia local de:

    database/indicadores.sqlite

na pasta:

    database/backups/

O backup utiliza timestamp no nome.

Na execucao validada foi criada uma copia com formato semelhante a:

    indicadores-antes-sqlserver-YYYYMMDD-HHMMSS.sqlite

Preservar essa copia durante a implantacao.

---

# Estrutura SQL Server

O arquivo:

    database/sqlserver/schema.sql

cria as estruturas funcionais necessarias no banco novo.

O migrador executa o schema antes da importacao dos registros.

---

# Tratamento de IDENTITY

O migrador compara as colunas do SQLite com as colunas da tabela equivalente no SQL Server.

Caso existam colunas na origem que nao estejam presentes no destino, a migracao e interrompida.

Para tabelas com `IDENTITY`, utiliza temporariamente:

    SET IDENTITY_INSERT ... ON

Depois da carga:

    SET IDENTITY_INSERT ... OFF

Isso preserva os IDs existentes e os relacionamentos historicos.

---

# Constraints

Durante a importacao, as constraints sao temporariamente desabilitadas.

Depois da carga, sao reativadas e verificadas.

A migracao deve ser interrompida em caso de violacao.

---

# Triggers documentais

Os triggers da tabela:

    dbo.lancamentos_observacoes_documentais

sao criados somente depois da carga dos dados.

Essa ordem evita que regras documentais bloqueiem registros historicos validos devido a ordem de importacao.

Depois da carga, o migrador cria:

    dbo.tr_lanc_obs_doc_integridade_insert

e:

    dbo.tr_lanc_obs_doc_append_only

O trigger:

    tr_lanc_obs_doc_integridade_insert

atua exclusivamente sobre:

    INSERT

O trigger:

    tr_lanc_obs_doc_append_only

atua sobre:

    UPDATE
    DELETE

Depois da criacao, o migrador consulta:

    sys.triggers
    sys.trigger_events

e confirma:

- existencia dos dois triggers;
- triggers habilitados;
- evento `INSERT` para `tr_lanc_obs_doc_integridade_insert`;
- eventos `UPDATE` e `DELETE` para `tr_lanc_obs_doc_append_only`.

---

# Banco em RESTRICTED_USER

Depois da criacao:

    DB5319_Monitoramento_Estrategia

e mantido inicialmente em:

    RESTRICTED_USER

O banco somente passa para:

    MULTI_USER

depois de:

- schema aplicado;
- dados importados;
- triggers criados;
- triggers validados;
- contagens verificadas;
- chaves verificadas;
- relacionamentos verificados;
- JSON validado;
- owner_sid validado;
- SID de dbo validado;
- SID de s531902 validado;
- roles da aplicacao validadas.

---

# Permissoes do usuario da aplicacao

Depois da carga, o migrador garante que:

    s531902

esteja mapeado para o login SQL corporativo existente.

O usuario recebe:

    db_datareader
    db_datawriter

O migrador tambem verifica ausencia de:

    DENY CONNECT

O processo nao concede `sysadmin` ao `s531902`.

---

# Validacao local do migrador

Antes de conectar ao SQL Server, executar:

    py -3.13 -m py_compile .\scripts\migrar-para-sqlserver.py

Resultado esperado:

    retorno direto ao prompt

Nao devem aparecer:

    SyntaxError
    IndentationError
    Traceback

---

# Conferir ajuda

Executar:

    py -3.13 .\scripts\migrar-para-sqlserver.py --help

Confirmar que seja apresentado:

    Banco novo de destino.
    Padrao: DB5319_Monitoramento_Estrategia

---

# Validacao do SQL Server antes da criacao

No SSMS:

    USE [master];
    GO

    SELECT
        @@SERVERNAME AS Servidor,
        ORIGINAL_LOGIN() AS LoginOriginal,
        SUSER_SNAME() AS LoginAtual,
        DB_ID('DB5319_Monitoramento_Estrategia') AS IdBancoNovo,
        IS_SRVROLEMEMBER('sysadmin') AS EhSysadmin,
        HAS_PERMS_BY_NAME(NULL, NULL, 'CREATE ANY DATABASE') AS PodeCriarBanco,
        CONVERT(VARCHAR(200), SUSER_SID('CORPCAIXA\c118119'), 1) AS SidProprietario,
        CONVERT(VARCHAR(200), SUSER_SID('s531902'), 1) AS SidAplicacao;
    GO

Antes da criacao, o resultado esperado para:

    IdBancoNovo

e:

    NULL

Na implantacao validada:

    Servidor = DF7436SR439
    LoginOriginal = CORPCAIXA\c118119
    LoginAtual = CORPCAIXA\c118119
    IdBancoNovo = NULL
    EhSysadmin = 0
    PodeCriarBanco = 1

---

# Executar a migracao

Executar na raiz do projeto:

    py -3.13 .\scripts\migrar-para-sqlserver.py

Recomenda-se executar inicialmente sem:

    --yes

para manter o ponto manual de confirmacao.

A tela deve apresentar:

    Ambiente: homologacao
    Servidor SQL Server: DF7436SR439
    Banco SQL Server: DB5319_Monitoramento_Estrategia
    Driver ODBC: SQL Server Native Client 11.0
    SQLite origem: ...\database\indicadores.sqlite

Depois:

    Voce esta prestes a criar DB5319_Monitoramento_Estrategia no SQL Server da CAIXA.
    Digite SIM para continuar:

Digitar exatamente:

    SIM

A confirmacao e sensivel a maiusculas/minusculas.

A entrada:

    sim

nao e aceita.

---

# Execucao explicita para auditoria

Os parametros podem ser informados explicitamente:

    py -3.13 .\scripts\migrar-para-sqlserver.py `
      --servidor "DF7436SR439" `
      --banco "DB5319_Monitoramento_Estrategia" `
      --sqlite ".\database\indicadores.sqlite"

Para execucao automatica, somente apos validar previamente todos os parametros:

    py -3.13 .\scripts\migrar-para-sqlserver.py `
      --servidor "DF7436SR439" `
      --banco "DB5319_Monitoramento_Estrategia" `
      --sqlite ".\database\indicadores.sqlite" `
      --yes

---

# Resultado esperado

Uma execucao bem-sucedida deve apresentar mensagens equivalentes a:

    Preflight da origem SQLite aprovado

    Instancia corporativa validada:
    DF7436SR439
    login: CORPCAIXA\c118119

    Banco SQL Server criado:
    DB5319_Monitoramento_Estrategia

    Acesso mantido em RESTRICTED_USER durante a migracao

    Migracao concluida

    Triggers documentais criados e validados

    Owner/dbo definido como CORPCAIXA\c118119;
    s531902 remapeado

    Verificacao concluida sem alertas

    SIDs e papeis corporativos validados

    Banco liberado em MULTI_USER

    Processo finalizado.

A ausencia de qualquer etapa deve ser investigada antes de alterar a aplicacao.

---

# Relatorio da migracao

O relatorio fica em:

    database/sqlserver/migration-report.json

Preservar esse arquivo como evidencia da execucao.

O relatorio e o SQLite podem conter dados da aplicacao e nao devem ser publicados em repositorios publicos.

---

# Validacao administrativa depois da criacao

Executar:

    SELECT
        name AS Banco,
        state_desc AS Estado,
        user_access_desc AS ModoAcesso,
        SUSER_SNAME(owner_sid) AS Proprietario,
        CONVERT(VARCHAR(200), owner_sid, 1) AS OwnerSid
    FROM sys.databases
    WHERE name = 'DB5319_Monitoramento_Estrategia';
    GO

    SELECT
        HAS_DBACCESS('DB5319_Monitoramento_Estrategia') AS TemAcesso,
        HAS_PERMS_BY_NAME(
            'DB5319_Monitoramento_Estrategia',
            'DATABASE',
            'BACKUP DATABASE'
        ) AS PodeFazerBackup,
        HAS_PERMS_BY_NAME(
            'DB5319_Monitoramento_Estrategia',
            'DATABASE',
            'CONTROL'
        ) AS TemControle;
    GO

Resultado validado:

    Banco = DB5319_Monitoramento_Estrategia
    Estado = ONLINE
    ModoAcesso = MULTI_USER
    Proprietario = CORPCAIXA\c118119

    TemAcesso       = 1
    PodeFazerBackup = 1
    TemControle     = 1

O resultado:

    1 / 1 / 1

e criterio obrigatorio de sucesso administrativo.

---

# Backup inicial do banco novo

Depois da criacao e das validacoes:

    BACKUP DATABASE [DB5319_Monitoramento_Estrategia]
    TO DISK = '\\df7436sr256\1019www.gelot.mz.caixa\backup\DB5319_Monitoramento_Estrategia_INICIAL_20261116.bak'
    WITH
        COPY_ONLY,
        INIT,
        CHECKSUM,
        STATS = 10;

Resultado esperado:

    100 percent processed
    BACKUP DATABASE successfully processed

---

# Validar o backup

Executar:

    RESTORE VERIFYONLY
    FROM DISK = '\\df7436sr256\1019www.gelot.mz.caixa\backup\DB5319_Monitoramento_Estrategia_INICIAL_20261116.bak'
    WITH CHECKSUM;

Resultado obrigatorio:

    The backup set on file 1 is valid.

Nao alterar a aplicacao para o novo banco antes de possuir um checkpoint validado, quando isso for operacionalmente possivel.

---

# Configuracao da aplicacao

Arquivo:

    app\config\servidor.local.php

Configuracao validada:

    'db_driver' => 'sqlsrv',
    'db_host' => 'DF7436SR439',
    'db_database' => 'DB5319_Monitoramento_Estrategia',
    'db_auth_mode' => 'sql',
    'db_username' => 's531902',

Nao alterar desnecessariamente os demais parametros de conexao.

---

# Publicacao da aplicacao

A aplicacao nova deve ser publicada somente depois da validacao tecnica do banco novo.

Origem utilizada na implantacao:

    C:\Users\c118119\Downloads\Estrategia_sql_lite\Estrategia

Destino:

    \\df7436sr256\1019www.gelot.mz.caixa\Estrategia

Antes de substituir a versao publicada, manter backup da versao anterior da aplicacao.

Depois da copia, confirmar no arquivo efetivamente publicado:

    \\df7436sr256\1019www.gelot.mz.caixa\Estrategia\app\config\servidor.local.php

que:

    'db_database' => 'DB5319_Monitoramento_Estrategia',

---

# Validacao funcional da aplicacao

URL validada:

    https://www.gelot.mz.caixa/estrategia/

Depois de apontar a aplicacao para o novo banco:

1. testar abertura da aplicacao;
2. testar login;
3. conferir Resumo Executivo;
4. conferir Visao Trimestral;
5. conferir Indicadores;
6. abrir Lancamentos;
7. testar Salvar rascunho;
8. reabrir o lancamento e confirmar persistencia;
9. conferir Iniciativas Estrategicas;
10. conferir Homologacao;
11. conferir Homologacao de Iniciativas;
12. conferir Consolidacao CA;
13. conferir Relatorios;
14. conferir Configuracoes;
15. conferir Auditoria;
16. verificar logs da aplicacao;
17. verificar ausencia de novos erros HTTP 500;
18. verificar ausencia de novos erros HTTP 405.

---

# Resultados funcionais obtidos na implantacao

A aplicacao abriu normalmente utilizando:

    DB5319_Monitoramento_Estrategia

O Resumo Executivo apresentou:

    Total de indicadores: 23
    Indicadores atingidos: 14
    Indicadores abaixo da meta: 8
    Indicadores em acompanhamento: 1
    Indicadores sem dados: 0
    Indicadores homologados: 23
    Pendentes de homologacao: 0

Tambem foi realizado teste de gravacao em Lancamentos.

Resultado apresentado pela aplicacao:

    Rascunho salvo com sucesso.

Esse teste confirma funcionamento de leitura e gravacao no banco novo por meio da aplicacao.

---

# Contingencia

Nao excluir imediatamente:

    DB5319_IndicadoresEstrategicos

O banco anterior deve permanecer temporariamente disponivel como rollback.

Preservar tambem:

    DB5319_Monitoramento_Estrategia_INICIAL_20261116.bak

e o backup da aplicacao anterior.

Em caso de necessidade de rollback da configuracao da aplicacao, alterar:

    'db_database' => 'DB5319_Monitoramento_Estrategia',

para:

    'db_database' => 'DB5319_IndicadoresEstrategicos',

desde que a versao de aplicacao utilizada no rollback seja compativel com o banco anterior.

---

# Em caso de erro durante a criacao

Se ocorrer erro:

- nao executar novamente imediatamente;
- registrar a ultima mensagem do PowerShell;
- verificar se o banco chegou a ser criado;
- consultar `migration-report.json`, se disponivel;
- nao alterar SIDs manualmente;
- nao conceder `sysadmin` ao `s531902`;
- nao alterar a aplicacao para o banco novo;
- nao excluir `DB5319_IndicadoresEstrategicos`;
- preservar o banco novo em `RESTRICTED_USER` quando aplicavel.

O migrador apresenta a mensagem ODBC original em falhas de criacao para facilitar o diagnostico.

---

# Exportacao opcional SQL Server para SQLite

A operacao de exportacao SQL Server para SQLite permanece separada da criacao corporativa.

Exemplo:

    py -3.13 .\scripts\migrar-para-sqlserver.py `
      --exportar-sqlserver-para-sqlite `
      --servidor-origem "localhost\SQLEXPRESS01" `
      --banco-origem "Estrategia" `
      --sobrescrever-sqlite

Essa operacao nao deve ser confundida com a criacao de:

    DB5319_Monitoramento_Estrategia

no ambiente corporativo.

---

# Criterio de sucesso

A migracao somente deve ser considerada concluida quando:

    DB5319_Monitoramento_Estrategia existe
    DB5319_Monitoramento_Estrategia esta ONLINE
    DB5319_Monitoramento_Estrategia esta MULTI_USER

    Proprietario/dbo = CORPCAIXA\c118119

    TemAcesso       = 1
    PodeFazerBackup = 1
    TemControle     = 1

    SID de dbo validado
    SID de s531902 validado

    db_datareader confirmado para s531902
    db_datawriter confirmado para s531902

    20 tabelas migradas
    contagens validadas
    chaves validadas
    agrupamentos validados
    chaves estrangeiras validadas
    JSON validado

    tr_lanc_obs_doc_integridade_insert criado e validado
    tr_lanc_obs_doc_append_only criado e validado

    migration-report.json sem alertas

    backup inicial criado
    RESTORE VERIFYONLY WITH CHECKSUM aprovado

    aplicacao publicada
    aplicacao apontando para DB5319_Monitoramento_Estrategia

    login funcionando
    Resumo Executivo funcionando
    Indicadores funcionando
    Lancamentos funcionando
    Salvar rascunho funcionando
    Iniciativas Estrategicas funcionando
    Homologacao funcionando
    Homologacao de Iniciativas funcionando
    Relatorios funcionando

    DB5319_IndicadoresEstrategicos preservado temporariamente como contingencia

---

# Checklist resumido para futuras criacoes

## Antes

    [ ] indicadores.sqlite existe
    [ ] indicadores.sqlite possui tamanho maior que zero
    [ ] PRAGMA integrity_check = ok
    [ ] PRAGMA foreign_key_check = []
    [ ] 20 tabelas obrigatorias presentes
    [ ] contagens-base registradas
    [ ] schema.sql conferido
    [ ] Python 3.13 disponivel
    [ ] pyodbc disponivel no Python 3.13
    [ ] driver SQL Server disponivel
    [ ] py_compile sem erros
    [ ] --help mostra nome correto do banco
    [ ] identidade Windows correta
    [ ] CREATE ANY DATABASE = 1
    [ ] SID CORPCAIXA\c118119 correto
    [ ] SID s531902 correto
    [ ] nome respeita padrao DB5319_*
    [ ] DB_ID(novo banco) = NULL

## Durante

    [ ] conferir servidor
    [ ] conferir banco
    [ ] conferir driver ODBC
    [ ] conferir SQLite de origem
    [ ] digitar SIM somente apos conferencia
    [ ] preflight SQLite aprovado
    [ ] instancia corporativa validada
    [ ] banco criado
    [ ] RESTRICTED_USER
    [ ] schema aplicado
    [ ] 20 tabelas importadas
    [ ] IDENTITY preservado
    [ ] constraints validadas
    [ ] triggers criados
    [ ] triggers validados
    [ ] verificacao sem alertas
    [ ] SIDs e roles validados
    [ ] MULTI_USER
    [ ] Processo finalizado

## Depois

    [ ] ONLINE
    [ ] MULTI_USER
    [ ] proprietario correto
    [ ] TemAcesso = 1
    [ ] PodeFazerBackup = 1
    [ ] TemControle = 1
    [ ] backup inicial criado
    [ ] RESTORE VERIFYONLY aprovado
    [ ] servidor.local.php atualizado
    [ ] aplicacao publicada
    [ ] login testado
    [ ] dashboard testado
    [ ] Salvar rascunho testado
    [ ] persistencia confirmada
    [ ] iniciativas testadas
    [ ] homologacao testada
    [ ] relatorios testados
    [ ] auditoria testada
    [ ] logs verificados
    [ ] banco anterior preservado temporariamente
