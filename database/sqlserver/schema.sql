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
        referencia_evidencia NVARCHAR(MAX) NULL,
        evidencia_id NVARCHAR(100) NULL,
        versao_atual INT NOT NULL CONSTRAINT df_lancamentos_versao_atual DEFAULT (1),
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

IF OBJECT_ID(N'dbo.prazos_apuracao', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.prazos_apuracao (
        id INT IDENTITY(1,1) NOT NULL
            CONSTRAINT pk_prazos_apuracao PRIMARY KEY,
        competencia CHAR(7) NOT NULL,
        data_limite_preenchimento DATE NOT NULL,
        data_limite_homologacao DATE NOT NULL,
        ativo BIT NOT NULL
            CONSTRAINT df_prazos_apuracao_ativo DEFAULT 1,
        created_at DATETIME2 NOT NULL
            CONSTRAINT df_prazos_apuracao_created_at DEFAULT SYSDATETIME(),
        updated_at DATETIME2 NULL,
        CONSTRAINT uq_prazos_apuracao_competencia UNIQUE (competencia),
        CONSTRAINT ck_prazos_apuracao_competencia CHECK (
            competencia LIKE '[12][0-9][0-9][0-9]-[01][0-9]'
            AND SUBSTRING(competencia, 6, 2) BETWEEN '01' AND '12'
        ),
        CONSTRAINT ck_prazos_apuracao_datas CHECK (
            data_limite_homologacao >= data_limite_preenchimento
        )
    );
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
        versao_anterior INT NULL,
        versao_nova INT NULL,
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
        versao_lancamento INT NOT NULL CONSTRAINT df_evidencias_versao_lancamento DEFAULT (1),
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

IF COL_LENGTH(N'dbo.lancamentos', N'versao_atual') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'ck_lancamentos_versao_atual')
    ALTER TABLE dbo.lancamentos WITH CHECK ADD CONSTRAINT ck_lancamentos_versao_atual CHECK (versao_atual >= 1);

IF COL_LENGTH(N'dbo.evidencias', N'versao_lancamento') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'ck_evidencias_versao_lancamento')
    ALTER TABLE dbo.evidencias WITH CHECK ADD CONSTRAINT ck_evidencias_versao_lancamento CHECK (versao_lancamento >= 1);

IF COL_LENGTH(N'dbo.evidencias', N'versao_lancamento') IS NOT NULL
   AND NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'idx_evidencias_lancamento_versao'
      AND object_id = OBJECT_ID(N'dbo.evidencias')
)
    CREATE INDEX idx_evidencias_lancamento_versao
    ON dbo.evidencias(lancamento_id, versao_lancamento, data_upload, id);

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

IF OBJECT_ID(N'dbo.iniciativas_estrategicas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.iniciativas_estrategicas (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_iniciativas_estrategicas PRIMARY KEY,
        codigo NVARCHAR(50) NOT NULL,
        plano NVARCHAR(255) NOT NULL,
        pilar NVARCHAR(255) NOT NULL,
        titulo_executivo NVARCHAR(255) NOT NULL,
        descricao_oficial NVARCHAR(MAX) NOT NULL,
        objetivo NVARCHAR(MAX) NOT NULL,
        unidade_responsavel NVARCHAR(255) NOT NULL,
        diretoria_responsavel NVARCHAR(255) NOT NULL,
        ano_inicio INT NOT NULL,
        trimestre_inicio NVARCHAR(10) NOT NULL,
        previsao_conclusao DATE NULL,
        exige_evidencia BIT NOT NULL CONSTRAINT df_iniciativas_estrategicas_exige_evidencia DEFAULT (0),
        ativo BIT NOT NULL CONSTRAINT df_iniciativas_estrategicas_ativo DEFAULT (1),
        created_by NVARCHAR(255) NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT df_iniciativas_estrategicas_created_at DEFAULT (SYSUTCDATETIME()),
        updated_at DATETIME2 NULL,
        CONSTRAINT uq_iniciativas_estrategicas_codigo UNIQUE (codigo),
        CONSTRAINT ck_iniciativas_estrategicas_ano_inicio CHECK (ano_inicio BETWEEN 1900 AND 9999),
        CONSTRAINT ck_iniciativas_estrategicas_trimestre_inicio CHECK (trimestre_inicio IN (N'1TRI', N'2TRI', N'3TRI', N'4TRI'))
    );
END;

IF OBJECT_ID(N'dbo.iniciativas_acompanhamentos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.iniciativas_acompanhamentos (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_iniciativas_acompanhamentos PRIMARY KEY,
        iniciativa_id NVARCHAR(100) NOT NULL,
        ano INT NOT NULL,
        trimestre NVARCHAR(10) NOT NULL,
        competencia CHAR(7) NOT NULL,
        data_referencia DATE NOT NULL,
        plano_snapshot NVARCHAR(255) NOT NULL,
        pilar_snapshot NVARCHAR(255) NOT NULL,
        titulo_snapshot NVARCHAR(255) NOT NULL,
        descricao_snapshot NVARCHAR(MAX) NOT NULL,
        objetivo_snapshot NVARCHAR(MAX) NOT NULL,
        unidade_snapshot NVARCHAR(255) NOT NULL,
        diretoria_snapshot NVARCHAR(255) NOT NULL,
        status_iniciativa NVARCHAR(40) NULL,
        andamento_unidade NVARCHAR(MAX) NULL,
        referencia_evidencia NVARCHAR(MAX) NULL,
        sintese_executiva_ca NVARCHAR(MAX) NULL,
        status_consolidacao_ca NVARCHAR(40) NOT NULL CONSTRAINT df_iniciativas_acompanhamentos_status_consolidacao_ca DEFAULT (N'PENDENTE'),
        status_fluxo NVARCHAR(40) NOT NULL CONSTRAINT df_iniciativas_acompanhamentos_status_fluxo DEFAULT (N'NAO_INICIADO'),
        usuario_responsavel NVARCHAR(255) NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT df_iniciativas_acompanhamentos_created_at DEFAULT (SYSUTCDATETIME()),
        updated_at DATETIME2 NULL,
        CONSTRAINT uq_iniciativas_acompanhamentos_iniciativa_competencia UNIQUE (iniciativa_id, competencia),
        CONSTRAINT ck_iniciativas_acompanhamentos_ano CHECK (ano BETWEEN 1900 AND 9999),
        CONSTRAINT ck_iniciativas_acompanhamentos_trimestre CHECK (trimestre IN (N'1TRI', N'2TRI', N'3TRI', N'4TRI')),
        CONSTRAINT ck_iniciativas_acompanhamentos_competencia CHECK (
            competencia LIKE '[12][0-9][0-9][0-9]-[01][0-9]'
            AND SUBSTRING(competencia, 6, 2) IN ('03', '06', '09', '12')
        ),
        CONSTRAINT ck_iniciativas_acompanhamentos_periodo_consistente CHECK (
            LEFT(competencia, 4) = CONVERT(CHAR(4), ano)
            AND YEAR(data_referencia) = ano
            AND data_referencia = EOMONTH(data_referencia)
            AND (
                (trimestre = N'1TRI' AND SUBSTRING(competencia, 6, 2) = '03' AND MONTH(data_referencia) = 3)
                OR (trimestre = N'2TRI' AND SUBSTRING(competencia, 6, 2) = '06' AND MONTH(data_referencia) = 6)
                OR (trimestre = N'3TRI' AND SUBSTRING(competencia, 6, 2) = '09' AND MONTH(data_referencia) = 9)
                OR (trimestre = N'4TRI' AND SUBSTRING(competencia, 6, 2) = '12' AND MONTH(data_referencia) = 12)
            )
        ),
        CONSTRAINT ck_iniciativas_acompanhamentos_status_iniciativa CHECK (
            status_iniciativa IS NULL OR status_iniciativa IN (N'NAO_INICIADA', N'EM_ANDAMENTO', N'CONCLUIDA', N'SUSPENSA', N'CANCELADA')
        ),
        CONSTRAINT ck_iniciativas_acompanhamentos_status_fluxo CHECK (
            status_fluxo IN (N'NAO_INICIADO', N'EM_PREENCHIMENTO', N'ENVIADO_HOMOLOGACAO', N'DEVOLVIDO_AJUSTE', N'HOMOLOGADO', N'REABERTO')
        ),
        CONSTRAINT ck_iniciativas_acompanhamentos_status_consolidacao_ca CHECK (
            status_consolidacao_ca IN (N'PENDENTE', N'CONSOLIDADA', N'REVISAO_NECESSARIA')
        ),
        CONSTRAINT fk_iniciativas_acompanhamentos_iniciativas FOREIGN KEY (iniciativa_id)
            REFERENCES dbo.iniciativas_estrategicas(id) ON DELETE NO ACTION ON UPDATE NO ACTION
    );
END;

IF OBJECT_ID(N'dbo.iniciativas_acompanhamento_itens', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.iniciativas_acompanhamento_itens (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_iniciativas_acompanhamento_itens PRIMARY KEY,
        acompanhamento_id NVARCHAR(100) NOT NULL,
        tipo NVARCHAR(40) NOT NULL,
        titulo NVARCHAR(255) NULL,
        descricao NVARCHAR(MAX) NOT NULL,
        status NVARCHAR(100) NULL,
        ordem INT NOT NULL CONSTRAINT df_iniciativas_acompanhamento_itens_ordem DEFAULT (0),
        destaque_ca BIT NOT NULL CONSTRAINT df_iniciativas_acompanhamento_itens_destaque_ca DEFAULT (0),
        created_at DATETIME2 NOT NULL CONSTRAINT df_iniciativas_acompanhamento_itens_created_at DEFAULT (SYSUTCDATETIME()),
        updated_at DATETIME2 NULL,
        CONSTRAINT ck_iniciativas_acompanhamento_itens_tipo CHECK (tipo IN (N'MARCO_ENTREGA', N'PROXIMO_PASSO', N'FRENTE_PROJETO')),
        CONSTRAINT ck_iniciativas_acompanhamento_itens_ordem CHECK (ordem >= 0),
        CONSTRAINT fk_iniciativas_acompanhamento_itens_acompanhamentos FOREIGN KEY (acompanhamento_id)
            REFERENCES dbo.iniciativas_acompanhamentos(id) ON DELETE NO ACTION ON UPDATE NO ACTION
    );
END;

IF OBJECT_ID(N'dbo.iniciativas_homologacoes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.iniciativas_homologacoes (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_iniciativas_homologacoes PRIMARY KEY,
        acompanhamento_id NVARCHAR(100) NOT NULL,
        acao NVARCHAR(100) NOT NULL,
        status_anterior NVARCHAR(40) NULL,
        status_novo NVARCHAR(40) NULL,
        justificativa NVARCHAR(MAX) NULL,
        usuario NVARCHAR(255) NULL,
        perfil_usuario NVARCHAR(100) NULL,
        data_acao DATETIME2 NOT NULL CONSTRAINT df_iniciativas_homologacoes_data_acao DEFAULT (SYSUTCDATETIME()),
        created_at DATETIME2 NOT NULL CONSTRAINT df_iniciativas_homologacoes_created_at DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT fk_iniciativas_homologacoes_acompanhamentos FOREIGN KEY (acompanhamento_id)
            REFERENCES dbo.iniciativas_acompanhamentos(id) ON DELETE NO ACTION ON UPDATE NO ACTION
    );
END;

IF OBJECT_ID(N'dbo.iniciativas_evidencias', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.iniciativas_evidencias (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_iniciativas_evidencias PRIMARY KEY,
        acompanhamento_id NVARCHAR(100) NOT NULL,
        nome_arquivo NVARCHAR(255) NOT NULL,
        tipo_arquivo NVARCHAR(100) NULL,
        caminho_arquivo NVARCHAR(MAX) NOT NULL,
        descricao NVARCHAR(MAX) NULL,
        data_upload DATETIME2 NOT NULL CONSTRAINT df_iniciativas_evidencias_data_upload DEFAULT (SYSUTCDATETIME()),
        usuario NVARCHAR(255) NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT df_iniciativas_evidencias_created_at DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT fk_iniciativas_evidencias_acompanhamentos FOREIGN KEY (acompanhamento_id)
            REFERENCES dbo.iniciativas_acompanhamentos(id) ON DELETE NO ACTION ON UPDATE NO ACTION
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamentos') AND name = N'idx_iniciativas_acompanhamentos_unidade_competencia_status')
    CREATE INDEX idx_iniciativas_acompanhamentos_unidade_competencia_status ON dbo.iniciativas_acompanhamentos (unidade_snapshot, competencia, status_fluxo);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamentos') AND name = N'idx_iniciativas_acompanhamentos_diretoria_competencia_status')
    CREATE INDEX idx_iniciativas_acompanhamentos_diretoria_competencia_status ON dbo.iniciativas_acompanhamentos (diretoria_snapshot, competencia, status_fluxo);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamentos') AND name = N'idx_iniciativas_acompanhamentos_iniciativa_ano_trimestre')
    CREATE INDEX idx_iniciativas_acompanhamentos_iniciativa_ano_trimestre ON dbo.iniciativas_acompanhamentos (iniciativa_id, ano, trimestre);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.iniciativas_acompanhamento_itens') AND name = N'idx_iniciativas_acompanhamento_itens_acompanhamento_tipo_ordem')
    CREATE INDEX idx_iniciativas_acompanhamento_itens_acompanhamento_tipo_ordem ON dbo.iniciativas_acompanhamento_itens (acompanhamento_id, tipo, ordem);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.iniciativas_homologacoes') AND name = N'idx_iniciativas_homologacoes_acompanhamento_data')
    CREATE INDEX idx_iniciativas_homologacoes_acompanhamento_data ON dbo.iniciativas_homologacoes (acompanhamento_id, data_acao);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.iniciativas_evidencias') AND name = N'idx_iniciativas_evidencias_acompanhamento_data')
    CREATE INDEX idx_iniciativas_evidencias_acompanhamento_data ON dbo.iniciativas_evidencias (acompanhamento_id, data_upload);
