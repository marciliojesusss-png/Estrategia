PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS indicadores (
  id TEXT PRIMARY KEY,
  numero INTEGER,
  nome TEXT NOT NULL,
  plano TEXT,
  pilar TEXT,
  unidade_apuradora TEXT,
  diretoria_responsavel TEXT,
  periodicidade TEXT,
  unidade_medida TEXT,
  tipo_calculo TEXT,
  tipo_consolidacao TEXT,
  meta_anual TEXT,
  formula_referencia TEXT,
  observacao_acompanhamento TEXT,
  ativo INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS lancamentos (
  id TEXT PRIMARY KEY,
  indicador_id TEXT NOT NULL,
  competencia TEXT NOT NULL,
  ano INTEGER,
  mes INTEGER,
  trimestre TEXT,
  plano TEXT,
  pilar TEXT,
  unidade_apuradora TEXT,
  diretoria_responsavel TEXT,
  dados_entrada_json TEXT,
  resultado_calculado TEXT,
  resultado_oficial TEXT,
  meta_referencia TEXT,
  percentual_atingido TEXT,
  situacao TEXT,
  status TEXT,
  observacao_unidade TEXT,
  evidencia_id TEXT,
  usuario_responsavel TEXT,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (indicador_id) REFERENCES indicadores(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lancamentos_indicador_competencia
  ON lancamentos(indicador_id, competencia);

CREATE TABLE IF NOT EXISTS homologacoes (
  id TEXT PRIMARY KEY,
  lancamento_id TEXT NOT NULL,
  acao TEXT NOT NULL,
  status_anterior TEXT,
  status_novo TEXT,
  justificativa TEXT,
  usuario TEXT,
  perfil_usuario TEXT,
  data_acao TEXT,
  created_at TEXT,
  FOREIGN KEY (lancamento_id) REFERENCES lancamentos(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_homologacoes_idempotencia
  ON homologacoes(lancamento_id, acao, data_acao);

CREATE TABLE IF NOT EXISTS retificacoes (
  id TEXT PRIMARY KEY,
  lancamento_id TEXT NOT NULL,
  versao_anterior_json TEXT,
  versao_nova_json TEXT,
  justificativa TEXT,
  usuario TEXT,
  data_retificacao TEXT,
  created_at TEXT,
  FOREIGN KEY (lancamento_id) REFERENCES lancamentos(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_retificacoes_idempotencia
  ON retificacoes(lancamento_id, data_retificacao);

CREATE TABLE IF NOT EXISTS evidencias (
  id TEXT PRIMARY KEY,
  lancamento_id TEXT,
  nome_arquivo TEXT,
  tipo_arquivo TEXT,
  caminho_arquivo TEXT,
  descricao TEXT,
  data_upload TEXT,
  usuario TEXT,
  created_at TEXT,
  FOREIGN KEY (lancamento_id) REFERENCES lancamentos(id)
);

CREATE TABLE IF NOT EXISTS auditoria (
  id TEXT PRIMARY KEY,
  entidade TEXT,
  entidade_id TEXT,
  acao TEXT,
  descricao TEXT,
  dados_anteriores_json TEXT,
  dados_novos_json TEXT,
  usuario TEXT,
  perfil_usuario TEXT,
  data_acao TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS configuracoes (
  chave TEXT PRIMARY KEY,
  valor_json TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS usuarios_validacao (
  id TEXT PRIMARY KEY,
  nome TEXT,
  perfil TEXT,
  unidade TEXT,
  diretoria TEXT,
  permissoes_json TEXT,
  ativo INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS backups_importacao (
  id TEXT PRIMARY KEY,
  tipo TEXT,
  origem TEXT,
  caminho_arquivo TEXT,
  resumo TEXT,
  data_backup TEXT,
  created_at TEXT
);
