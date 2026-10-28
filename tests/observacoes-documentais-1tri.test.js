const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "docs", "manifesto-observacoes-1tri-2026.yaml");
const migrationPath = path.join(root, "database", "sqlserver", "migrations", "20261027_003_observacoes_documentais_1tri_2026.sql");
const manifestText = fs.readFileSync(manifestPath, "utf8").replace(/^\uFEFF/, "");
const migrationText = fs.readFileSync(migrationPath, "utf8").replace(/^\uFEFF/, "");

function manifestEntries() {
  return manifestText.split(/\r?\n  - indicadorId: /).slice(1).map((block) => {
    const indicatorId = Number(block.match(/^(\d+)/)[1]);
    const launchId = Number(block.match(/\n    lancamentoId: (\d+)/)[1]);
    const hash = block.match(/\n    sha256: "([a-f0-9]{64})"/)[1];
    const observation = block.match(/\n    observacaoLiteral: \|-\r?\n([\s\S]*)$/)[1]
      .replace(/(?:\r?\n)+$/, "")
      .split(/\r?\n/)
      .map((line) => line.startsWith("      ") ? line.slice(6) : line)
      .join("\n")
      .normalize("NFC");
    return { indicatorId, launchId, hash, observation };
  });
}

function embeddedEntries() {
  const chunks = [...migrationText.matchAll(/SET @manifesto \+= N'((?:''|[^'])*)';/g)];
  assert.ok(chunks.length > 1, "manifesto deve ser fracionado em literais seguros para SQL Server 2016");
  return JSON.parse(chunks.map((match) => match[1].replaceAll("''", "'")).join(""));
}

test("migration incorpora as 23 observações literais e recalcula seus hashes UTF-8", () => {
  const source = manifestEntries();
  const embedded = embeddedEntries();
  assert.equal(source.length, 23);
  assert.equal(embedded.length, 23);
  assert.deepEqual(embedded.map((entry) => Number(entry.indicadorId)), Array.from({ length: 23 }, (_, index) => index + 1));

  source.forEach((entry, index) => {
    const row = embedded[index];
    assert.equal(Number(row.lancamentoId), entry.launchId, `lançamento do indicador ${entry.indicatorId}`);
    assert.equal(row.observacao, entry.observation, `literal do indicador ${entry.indicatorId}`);
    assert.equal(row.sha256Observacao, entry.hash, `hash declarado do indicador ${entry.indicatorId}`);
    assert.equal(crypto.createHash("sha256").update(row.observacao, "utf8").digest("hex"), entry.hash, `hash recalculado do indicador ${entry.indicatorId}`);
    assert.equal(row.competencia, "2026-03");
    assert.equal(row.tipoObservacao, "OBSERVACAO_AREA_INFORME_TRIMESTRAL");
    assert.equal(row.fonteDocumental, "Informe DILOT/GERIN nº 0029/2026");
    assert.equal(row.sha256DocumentoDeclarado, "5c9d14cabbb694f8dd5bea97643aff9b79e7c37f16f1a7fb489ee9ec1edfb068");
    assert.equal(row.sha256ArquivoFisico, "9f3e66e2d529a1a66cc7ad842ebc5430171a60de99cb64077b7236613ce9b08c");
  });
});

test("identidades especiais dos indicadores 03 e 22 permanecem vinculadas aos snapshots corretos", () => {
  const rows = embeddedEntries();
  assert.deepEqual(
    rows.filter((row) => [3, 22].includes(Number(row.indicadorId))).map((row) => ({
      indicadorId: Number(row.indicadorId),
      lancamentoId: Number(row.lancamentoId),
      versao: row.versaoLancamento,
      status: row.statusEsperado
    })),
    [
      { indicadorId: 3, lancamentoId: 27, versao: 2, status: "Enviado para homologacao" },
      { indicadorId: 22, lancamentoId: 255, versao: 1, status: "Em preenchimento" }
    ]
  );
});

test("migration é append-only, idempotente e rejeita aplicação parcial", () => {
  assert.match(migrationText, /CREATE TABLE dbo\.lancamentos_observacoes_documentais/);
  assert.match(migrationText, /CREATE UNIQUE INDEX uq_lanc_obs_doc_identidade/);
  assert.match(migrationText, /CREATE TRIGGER dbo\.tr_lanc_obs_doc_append_only/);
  assert.match(migrationText, /AFTER UPDATE,DELETE/);
  assert.match(migrationText, /@existentes NOT IN\(0,23\)/);
  assert.match(migrationText, /Aplicacao parcial detectada/);
  assert.match(migrationText, /JA APLICADA - SEM DML/);
  assert.match(migrationText, /substitui_observacao_id/);
  assert.match(migrationText, /CREATE TRIGGER dbo\.tr_lanc_obs_doc_integridade_insert/);
  assert.match(migrationText, /Uma observacao documental nao pode substituir a si propria/);
  assert.match(migrationText, /Substituicao documental deve preservar lancamento, indicador, competencia, versao e tipo/);
  assert.match(migrationText, /exatamente uma observacao documental vigente/);
  assert.match(migrationText, /CREATE UNIQUE INDEX uq_lanc_obs_doc_substituicao[\s\S]+WHERE substitui_observacao_id IS NOT NULL/);
  assert.match(migrationText, /tipos de colunas incompat/);
  assert.match(migrationText, /chaves incompat/);
});

test("indices usam somente tipos indexaveis e permanecem abaixo de 900 bytes", () => {
  assert.match(migrationText, /observacao NVARCHAR\(MAX\) NOT NULL/);
  assert.match(migrationText, /sha256_observacao CHAR\(64\) NOT NULL/);
  assert.match(migrationText, /sha256_documento_declarado CHAR\(64\) NOT NULL/);
  assert.match(migrationText, /sha256_arquivo_fisico CHAR\(64\) NOT NULL/);

  const maxColumns = new Set(["observacao"]);
  const indexes = [...migrationText.matchAll(/CREATE(?: UNIQUE)? INDEX\s+(\w+)\s+ON dbo\.lancamentos_observacoes_documentais\(([^)]+)\)/g)];
  assert.equal(indexes.length, 3);
  indexes.forEach(([, name, columns]) => {
    const keys = columns.split(",").map((column) => column.trim().split(/\s+/)[0]);
    keys.forEach((key) => assert.equal(maxColumns.has(key), false, `${name}/${key}`));
  });

  const conservativeKeyBytes = {
    pk_lancamentos_observacoes_documentais: 200,
    uq_lanc_obs_doc_identidade: 200 + 4 + 80 + 200 + 64 + 64,
    uq_lanc_obs_doc_substituicao: 200,
    ix_lanc_obs_doc_leitura: 200 + 4 + 4 + 4 + 200 + 6
  };
  Object.entries(conservativeKeyBytes).forEach(([name, bytes]) => {
    assert.ok(bytes <= 900, `${name}: ${bytes} bytes`);
  });
});

test("regra vigente seleciona somente a folha da cadeia e rejeita ambiguidade", () => {
  const repository = fs.readFileSync(path.join(root, "app", "repositories", "LancamentosObservacoesDocumentaisRepository.php"), "utf8");
  assert.match(repository, /NOT EXISTS \(SELECT 1 FROM dbo\.lancamentos_observacoes_documentais sucessora/);
  assert.match(repository, /sucessora\.substitui_observacao_id=d\.id/);
  assert.doesNotMatch(repository, /ROW_NUMBER\(\)|ORDER BY d\.criado_em/i);
  assert.match(repository, /Mais de uma observacao documental vigente/);

  const chain = [
    { id: "a", replaces: null },
    { id: "b", replaces: "a" },
    { id: "c", replaces: "b" }
  ];
  const current = chain.filter((row) => !chain.some((candidate) => candidate.replaces === row.id));
  assert.deepEqual(current.map((row) => row.id), ["c"]);
});

test("migration não grava lançamentos, configurações ou governança", () => {
  const forbidden = [
    /\bUPDATE\s+dbo\.lancamentos\b/i,
    /\bDELETE\s+(?:FROM\s+)?dbo\.lancamentos\b/i,
    /\bINSERT\s+(?:INTO\s+)?dbo\.lancamentos\s*\(/i,
    /\b(?:INSERT|UPDATE|DELETE)\s+(?:INTO\s+|FROM\s+)?dbo\.(?:homologacoes|evidencias|auditoria|retificacoes|solicitacoes_reabertura|configuracoes)\b/i,
    /JSON_MODIFY\s*\(/i
  ];
  forbidden.forEach((pattern) => assert.doesNotMatch(migrationText, pattern));
  assert.match(migrationText, /@lancamentos_antes/);
  assert.match(migrationText, /Snapshot historico de lancamento foi alterado/);
  assert.match(migrationText, /Governanca ou auditoria historica foi alterada/);
});

test("backend expõe a camada documental sem rota de escrita", () => {
  const repository = fs.readFileSync(path.join(root, "app", "repositories", "LancamentosObservacoesDocumentaisRepository.php"), "utf8");
  const launchService = fs.readFileSync(path.join(root, "app", "services", "LancamentoService.php"), "utf8");
  const dataService = fs.readFileSync(path.join(root, "app", "services", "BaseDadosService.php"), "utf8");
  assert.match(repository, /final class LancamentosObservacoesDocumentaisRepository/);
  assert.match(repository, /public function decorate\(/);
  assert.doesNotMatch(repository, /public function (?:create|update|delete|save|insert)\(/i);
  assert.match(repository, /OBJECT_ID\(N'dbo\.lancamentos_observacoes_documentais'/);
  assert.match(repository, /l\.competencia=d\.competencia/);
  assert.match(repository, /l\.ano=d\.ano AND l\.mes=d\.mes/);
  assert.match(repository, /l\.versao_atual=d\.versao_lancamento/);
  assert.match(launchService, /documentos->decorate/);
  assert.match(dataService, /observacoesDocumentais->decorate/);
});
