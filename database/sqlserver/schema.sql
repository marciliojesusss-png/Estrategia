IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.indicadores (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_indicadores PRIMARY KEY,
        numero INT NULL,
        nome NVARCHAR(255) NOT NULL,
        plano NVARCHAR(255) NULL,
        pilar NVARCHAR(255) NULL,
        unidade_apuradora NVARCHAR(255) NULL,
        diretoria_responsavel NVARCHAR(255) NULL,
        periodicidade NVARCHAR(100) NULL,
        unidade_medida NVARCHAR(100) NULL,
        tipo_calculo NVARCHAR(100) NULL,
        tipo_consolidacao NVARCHAR(100) NULL,
        meta_anual NVARCHAR(MAX) NULL,
        formula_referencia NVARCHAR(MAX) NULL,
        observacao_acompanhamento NVARCHAR(MAX) NULL,
        ativo BIT NOT NULL CONSTRAINT df_indicadores_ativo DEFAULT 1,
        created_at NVARCHAR(40) NULL,
        updated_at NVARCHAR(40) NULL
    );
END;

IF OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.lancamentos (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_lancamentos PRIMARY KEY,
        indicador_id NVARCHAR(100) NOT NULL,
        competencia NVARCHAR(40) NOT NULL,
        ano INT NULL,
        mes INT NULL,
        trimestre NVARCHAR(40) NULL,
        plano NVARCHAR(255) NULL,
        pilar NVARCHAR(255) NULL,
        unidade_apuradora NVARCHAR(255) NULL,
        diretoria_responsavel NVARCHAR(255) NULL,
        dados_entrada_json NVARCHAR(MAX) NULL,
        resultado_calculado NVARCHAR(MAX) NULL,
        resultado_oficial NVARCHAR(MAX) NULL,
        meta_referencia NVARCHAR(MAX) NULL,
        percentual_atingido NVARCHAR(100) NULL,
        situacao NVARCHAR(100) NULL,
        status NVARCHAR(100) NULL,
        observacao_unidade NVARCHAR(MAX) NULL,
        evidencia_id NVARCHAR(100) NULL,
        usuario_responsavel NVARCHAR(255) NULL,
        created_at NVARCHAR(40) NULL,
        updated_at NVARCHAR(40) NULL,
        CONSTRAINT fk_lancamentos_indicadores
            FOREIGN KEY (indicador_id) REFERENCES dbo.indicadores(id)
    );
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'idx_lancamentos_indicador_competencia'
      AND object_id = OBJECT_ID(N'dbo.lancamentos')
)
BEGIN
    CREATE UNIQUE INDEX idx_lancamentos_indicador_competencia
    ON dbo.lancamentos(indicador_id, competencia);
END;

IF OBJECT_ID(N'dbo.homologacoes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.homologacoes (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_homologacoes PRIMARY KEY,
        lancamento_id NVARCHAR(100) NOT NULL,
        acao NVARCHAR(100) NOT NULL,
        status_anterior NVARCHAR(100) NULL,
        status_novo NVARCHAR(100) NULL,
        justificativa NVARCHAR(MAX) NULL,
        usuario NVARCHAR(255) NULL,
        perfil_usuario NVARCHAR(100) NULL,
        data_acao NVARCHAR(40) NULL,
        created_at NVARCHAR(40) NULL,
        CONSTRAINT fk_homologacoes_lancamentos
            FOREIGN KEY (lancamento_id) REFERENCES dbo.lancamentos(id)
    );
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'idx_homologacoes_idempotencia'
      AND object_id = OBJECT_ID(N'dbo.homologacoes')
)
BEGIN
    CREATE UNIQUE INDEX idx_homologacoes_idempotencia
    ON dbo.homologacoes(lancamento_id, acao, data_acao);
END;

IF OBJECT_ID(N'dbo.solicitacoes_reabertura', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.solicitacoes_reabertura (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_solicitacoes_reabertura PRIMARY KEY,
        lancamento_id NVARCHAR(100) NOT NULL,
        indicador_id NVARCHAR(100) NULL,
        competencia NVARCHAR(40) NULL,
        solicitante_usuario NVARCHAR(255) NULL,
        solicitante_perfil NVARCHAR(100) NULL,
        solicitante_unidade NVARCHAR(255) NULL,
        tipo_ajuste NVARCHAR(100) NULL,
        justificativa NVARCHAR(MAX) NOT NULL,
        observacao_complementar NVARCHAR(MAX) NULL,
        status_solicitacao NVARCHAR(100) NOT NULL,
        administrador_responsavel NVARCHAR(255) NULL,
        decisao_administrador NVARCHAR(100) NULL,
        justificativa_decisao NVARCHAR(MAX) NULL,
        data_solicitacao NVARCHAR(40) NULL,
        data_decisao NVARCHAR(40) NULL,
        created_at NVARCHAR(40) NULL,
        updated_at NVARCHAR(40) NULL,
        CONSTRAINT fk_solicitacoes_reabertura_lancamentos
            FOREIGN KEY (lancamento_id) REFERENCES dbo.lancamentos(id)
    );
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'idx_solicitacoes_reabertura_pendente'
      AND object_id = OBJECT_ID(N'dbo.solicitacoes_reabertura')
)
BEGIN
    CREATE UNIQUE INDEX idx_solicitacoes_reabertura_pendente
    ON dbo.solicitacoes_reabertura(lancamento_id)
    WHERE status_solicitacao = N'Pendente';
END;

IF OBJECT_ID(N'dbo.retificacoes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.retificacoes (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_retificacoes PRIMARY KEY,
        lancamento_id NVARCHAR(100) NOT NULL,
        versao_anterior_json NVARCHAR(MAX) NULL,
        versao_nova_json NVARCHAR(MAX) NULL,
        justificativa NVARCHAR(MAX) NULL,
        usuario NVARCHAR(255) NULL,
        data_retificacao NVARCHAR(40) NULL,
        created_at NVARCHAR(40) NULL,
        CONSTRAINT fk_retificacoes_lancamentos
            FOREIGN KEY (lancamento_id) REFERENCES dbo.lancamentos(id)
    );
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'idx_retificacoes_idempotencia'
      AND object_id = OBJECT_ID(N'dbo.retificacoes')
)
BEGIN
    CREATE UNIQUE INDEX idx_retificacoes_idempotencia
    ON dbo.retificacoes(lancamento_id, data_retificacao);
END;

IF OBJECT_ID(N'dbo.evidencias', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.evidencias (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_evidencias PRIMARY KEY,
        lancamento_id NVARCHAR(100) NULL,
        nome_arquivo NVARCHAR(255) NULL,
        tipo_arquivo NVARCHAR(100) NULL,
        caminho_arquivo NVARCHAR(MAX) NULL,
        descricao NVARCHAR(MAX) NULL,
        data_upload NVARCHAR(40) NULL,
        usuario NVARCHAR(255) NULL,
        created_at NVARCHAR(40) NULL,
        CONSTRAINT fk_evidencias_lancamentos
            FOREIGN KEY (lancamento_id) REFERENCES dbo.lancamentos(id)
    );
END;

IF OBJECT_ID(N'dbo.auditoria', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.auditoria (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_auditoria PRIMARY KEY,
        entidade NVARCHAR(100) NULL,
        entidade_id NVARCHAR(100) NULL,
        acao NVARCHAR(100) NULL,
        descricao NVARCHAR(MAX) NULL,
        dados_anteriores_json NVARCHAR(MAX) NULL,
        dados_novos_json NVARCHAR(MAX) NULL,
        usuario NVARCHAR(255) NULL,
        perfil_usuario NVARCHAR(100) NULL,
        data_acao NVARCHAR(40) NULL,
        created_at NVARCHAR(40) NULL
    );
END;

IF OBJECT_ID(N'dbo.configuracoes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.configuracoes (
        chave NVARCHAR(255) NOT NULL CONSTRAINT pk_configuracoes PRIMARY KEY,
        valor_json NVARCHAR(MAX) NULL,
        updated_at NVARCHAR(40) NULL
    );
END;

IF OBJECT_ID(N'dbo.usuarios_validacao', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.usuarios_validacao (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_usuarios_validacao PRIMARY KEY,
        nome NVARCHAR(255) NULL,
        perfil NVARCHAR(100) NULL,
        unidade NVARCHAR(255) NULL,
        diretoria NVARCHAR(255) NULL,
        permissoes_json NVARCHAR(MAX) NULL,
        ativo BIT NOT NULL CONSTRAINT df_usuarios_validacao_ativo DEFAULT 1,
        created_at NVARCHAR(40) NULL,
        updated_at NVARCHAR(40) NULL
    );
END;

IF OBJECT_ID(N'dbo.backups_importacao', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.backups_importacao (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_backups_importacao PRIMARY KEY,
        tipo NVARCHAR(100) NULL,
        origem NVARCHAR(255) NULL,
        caminho_arquivo NVARCHAR(MAX) NULL,
        resumo NVARCHAR(MAX) NULL,
        data_backup NVARCHAR(40) NULL,
        created_at NVARCHAR(40) NULL
    );
END;

IF OBJECT_ID(N'dbo.usuarios_acesso', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.usuarios_acesso (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_usuarios_acesso PRIMARY KEY,
        matricula NVARCHAR(50) NOT NULL,
        nome NVARCHAR(255) NULL,
        email NVARCHAR(255) NULL,
        sg_unidade NVARCHAR(50) NULL,
        no_unidade NVARCHAR(255) NULL,
        perfil NVARCHAR(50) NOT NULL,
        unidade_apuradora NVARCHAR(255) NULL,
        diretoria_responsavel NVARCHAR(255) NULL,
        ativo BIT NOT NULL CONSTRAINT df_usuarios_acesso_ativo DEFAULT 1,
        created_at DATETIME2 NULL,
        updated_at DATETIME2 NULL,
        CONSTRAINT uq_usuarios_acesso_matricula UNIQUE (matricula)
    );
END;

IF OBJECT_ID(N'dbo.acessos_log', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.acessos_log (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_acessos_log PRIMARY KEY,
        matricula NVARCHAR(50) NULL,
        nome NVARCHAR(255) NULL,
        perfil NVARCHAR(50) NULL,
        sg_unidade NVARCHAR(50) NULL,
        ip NVARCHAR(100) NULL,
        user_agent NVARCHAR(MAX) NULL,
        data_acesso DATETIME2 NOT NULL CONSTRAINT df_acessos_log_data_acesso DEFAULT SYSUTCDATETIME()
    );
END;
