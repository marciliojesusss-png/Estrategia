const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const DocumentationFields = require("../assets/js/documentation-fields");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "docs", "manifesto-observacoes-2tri-2026.yaml");
const firstTriManifestPath = path.join(root, "docs", "manifesto-observacoes-1tri-2026.yaml");
const migrationPath = path.join(root, "database", "sqlserver", "migrations", "20261028_001_observacoes_documentais_2tri_2026.sql");
const firstTriMigrationPath = path.join(root, "database", "sqlserver", "migrations", "20261027_003_observacoes_documentais_1tri_2026.sql");
const manifestText = fs.readFileSync(manifestPath, "utf8").replace(/^\uFEFF/, "");
const firstTriManifestText = fs.readFileSync(firstTriManifestPath, "utf8").replace(/^\uFEFF/, "");
const migrationText = fs.readFileSync(migrationPath, "utf8").replace(/^\uFEFF/, "");
const expectedManifestHash = "24054694c6876a71988ab8b40c6e93475900fff94539bc2a24fa2c2cd4e1075d";

function manifestEntries(text = manifestText) {
  return text.split(/\r?\n  - indicadorId: /).slice(1).map((block) => {
    const number = (name) => Number(block.match(new RegExp("\\n    " + name + ": (\\d+)"))[1]);
    const quoted = (name) => block.match(new RegExp("\\n    " + name + ": \"([^\"]*)\""))[1];
    const indicatorId = Number(block.match(/^(\d+)/)[1]);
    const observation = block.match(/\n    observacaoLiteral: \|-\r?\n([\s\S]*)$/)[1]
      .replace(/(?:\r?\n)+$/, "")
      .split(/\r?\n/)
      .map((line) => line.startsWith("      ") ? line.slice(6) : line)
      .join("\n")
      .normalize("NFC");
    return {
      indicatorId,
      launchId: number("lancamentoId"),
      version: number("versaoLancamento"),
      status: quoted("statusLancamento"),
      hash: quoted("sha256"),
      source: quoted("fonte"),
      type: quoted("tipo"),
      observation
    };
  });
}

function embeddedEntries() {
  const chunks = [...migrationText.matchAll(/SET @manifesto \+= N'((?:''|[^'])*)';/g)];
  assert.ok(chunks.length > 1, "manifesto deve ser fracionado em literais seguros");
  return JSON.parse(chunks.map((match) => match[1].replaceAll("''", "'")).join(""));
}

test("manifesto autoritativo mantém SHA-256, estrutura e 23 hashes UTF-8 únicos", () => {
  assert.equal(crypto.createHash("sha256").update(manifestText, "utf8").digest("hex"), expectedManifestHash);
  const rows = manifestEntries();
  assert.equal(rows.length, 23);
  assert.deepEqual(rows.map((row) => row.indicatorId), Array.from({ length: 23 }, (_, index) => index + 1));
  assert.equal(new Set(rows.map((row) => row.launchId)).size, 23);
  assert.equal(new Set(rows.map((row) => row.hash)).size, 23);
  rows.forEach((row) => {
    assert.equal(
      crypto.createHash("sha256").update(row.observation, "utf8").digest("hex"),
      row.hash,
      "indicador " + row.indicatorId
    );
    assert.equal(row.source, "Informe DILOT/GERIN nº 0056/2026");
    assert.equal(row.type, "OBSERVACAO_AREA_INFORME_TRIMESTRAL");
  });
  const firstTriHashes = new Set(
    [...firstTriManifestText.matchAll(/^    sha256: "([a-f0-9]{64})"$/gm)]
      .map((match) => match[1])
  );
  assert.equal(firstTriHashes.size, 23);
  rows.forEach((row) => assert.equal(firstTriHashes.has(row.hash), false));
});

test("migration incorpora literalmente o manifesto e os metadados distintos do PDF", () => {
  const source = manifestEntries();
  const embedded = embeddedEntries();
  assert.equal(embedded.length, 23);
  source.forEach((entry, index) => {
    const row = embedded[index];
    assert.equal(Number(row.indicadorId), entry.indicatorId);
    assert.equal(Number(row.lancamentoId), entry.launchId);
    assert.equal(row.versaoLancamento, entry.version);
    assert.equal(row.statusEsperado, entry.status);
    assert.equal(row.competencia, "2026-06");
    assert.equal(row.ano, 2026);
    assert.equal(row.mes, 6);
    assert.equal(row.observacao, entry.observation);
    assert.equal(row.sha256Observacao, entry.hash);
    assert.equal(
      row.sha256ObservacaoSqlUtf16,
      crypto.createHash("sha256").update(Buffer.from(entry.observation, "utf16le")).digest("hex")
    );
    assert.equal(row.sha256DocumentoDeclarado, "7a357535e11e562a1d3abc43c419ef8b585316743ce04e34e287bdd45cd25d4f");
    assert.equal(row.sha256ArquivoFisico, "d4b59d51865c68b82a08d5e5e6bf6705edfea8651e5678bae2326fdee7c28446");
    assert.equal(row.substituiObservacaoId, undefined);
  });
});

test("mapeamento JUN, versões e status coincidem com os 23 guards autorizados", () => {
  assert.deepEqual(
    embeddedEntries().map((row) => [Number(row.indicadorId), Number(row.lancamentoId), row.versaoLancamento, row.statusEsperado]),
    [
      [1, 6, 1, "Em preenchimento"], [2, 18, 1, "Em preenchimento"],
      [3, 30, 1, "Em preenchimento"], [4, 42, 1, "Em preenchimento"],
      [5, 54, 1, "Em preenchimento"], [6, 66, 1, "Não iniciado"],
      [7, 78, 1, "Em preenchimento"], [8, 90, 1, "Em preenchimento"],
      [9, 102, 1, "Em preenchimento"], [10, 114, 1, "Em preenchimento"],
      [11, 126, 1, "Em preenchimento"], [12, 138, 1, "Homologado"],
      [13, 150, 1, "Homologado"], [14, 162, 1, "Homologado"],
      [15, 174, 2, "Retificado"], [16, 186, 1, "Em preenchimento"],
      [17, 198, 1, "Homologado"], [18, 210, 1, "Homologado"],
      [19, 222, 1, "Homologado"], [20, 234, 1, "Em preenchimento"],
      [21, 246, 1, "Homologado"], [22, 258, 1, "Em preenchimento"],
      [23, 270, 1, "Em preenchimento"]
    ]
  );
});

test("migration exige arquitetura existente e possui somente INSERT persistente documental", () => {
  assert.match(migrationText, /OBJECT_ID\(N'dbo\.lancamentos_observacoes_documentais',N'U'\) IS NULL/);
  assert.match(migrationText, /nenhuma estrutura sera criada por esta migration/);
  assert.doesNotMatch(migrationText, /\bCREATE\s+(?:TABLE|INDEX|UNIQUE INDEX|TRIGGER)\b/i);
  assert.doesNotMatch(migrationText, /\bALTER\s+TABLE\b/i);
  assert.doesNotMatch(migrationText, /\bUPDATE\s+dbo\./i);
  assert.doesNotMatch(migrationText, /\bDELETE\s+(?:FROM\s+)?dbo\./i);
  const persistentInserts = [...migrationText.matchAll(/\bINSERT\s+(?:INTO\s+)?(dbo\.\w+)/gi)]
    .map((match) => match[1].toLowerCase());
  assert.deepEqual(persistentInserts, ["dbo.lancamentos_observacoes_documentais"]);
  assert.match(migrationText, /documento_referencia,NULL,origem_registro FROM @carga/);
});

test("estados A-E são protegidos por idempotência, conflito, rollback e guards estruturais", () => {
  assert.match(migrationText, /SET XACT_ABORT ON/);
  assert.match(migrationText, /@existentes NOT IN\(0,23\)/);
  assert.match(migrationText, /Aplicacao parcial detectada/);
  assert.match(migrationText, /Reexecucao encontrou conteudo documental divergente/);
  assert.match(migrationText, /JA APLICADA - SEM DML/);
  assert.match(migrationText, /@junExistentes<>@existentes/);
  assert.match(migrationText, /@totalExistentes<>23\+@existentes/);
  assert.match(migrationText, /IF @transacaoPropria=1 AND XACT_STATE\(\)<>0 ROLLBACK TRANSACTION/);
  assert.match(migrationText, /Tabela documental existente com tipos de colunas incompatíveis/);

  function state({ currentRows, exact = true, structure = true }) {
    if (!structure) return "THROW_ESTRUTURA";
    if (![0, 23].includes(currentRows)) return "THROW_PARCIAL";
    if (currentRows === 23 && !exact) return "THROW_HASH";
    if (currentRows === 23) return "JA_APLICADA_SEM_DML";
    return "INSERT_23";
  }
  assert.equal(state({ currentRows: 0 }), "INSERT_23");
  assert.equal(state({ currentRows: 23 }), "JA_APLICADA_SEM_DML");
  assert.equal(state({ currentRows: 12 }), "THROW_PARCIAL");
  assert.equal(state({ currentRows: 23, exact: false }), "THROW_HASH");
  assert.equal(state({ currentRows: 0, structure: false }), "THROW_ESTRUTURA");
});

test("snapshot de MAR, lançamentos e governança são invariantes e o total final é 46", () => {
  assert.match(migrationText, /DECLARE @marAntes NVARCHAR\(MAX\)/);
  assert.match(migrationText, /DECLARE @marHashAntes VARBINARY\(32\)/);
  assert.match(migrationText, /@marAntes<>@marDepois OR @marHashAntes<>@marHashDepois/);
  assert.match(migrationText, /SELECT COUNT\(\*\) FROM dbo\.lancamentos_observacoes_documentais\)<>46/);
  assert.match(migrationText, /@lancamentos_antes/);
  assert.match(migrationText, /Snapshot historico de lancamento foi alterado/);
  assert.match(migrationText, /@homologacoesAntes/);
  assert.match(migrationText, /@evidenciasAntes/);
  assert.match(migrationText, /@retificacoesAntes/);
  assert.match(migrationText, /@reaberturasAntes/);
  assert.match(migrationText, /@auditoriaAntes/);
  assert.match(migrationText, /Governanca ou auditoria historica foi alterada/);
  assert.equal(
    crypto.createHash("sha256").update(fs.readFileSync(firstTriMigrationPath)).digest("hex"),
    "b42acbc9a9421653c7604fd5e8b9a9c96444484a97b63db4c13f971cb9d8a10c"
  );
});

test("Indicadores 03, 22 e 23 preservam versões e conteúdo histórico integral", () => {
  const rows = embeddedEntries();
  const indicator3 = rows.find((row) => Number(row.indicadorId) === 3);
  const indicator22 = rows.find((row) => Number(row.indicadorId) === 22);
  const indicator23 = rows.find((row) => Number(row.indicadorId) === 23);
  assert.deepEqual([Number(indicator3.lancamentoId), indicator3.versaoLancamento], [30, 1]);
  [
    "Cenário com Lotex", "0,61%", "71,12%",
    "Cenário com Lotex e ferramenta do Marketplace9", "4,22%", "117,13%",
    "Apostas de Quota Fixa", "9 Marketplace - plataforma de comercialização de bolão online"
  ].forEach((fragment) => assert.ok(indicator22.observacao.includes(fragment), fragment));
  [
    "Copa do Mundo 2026", "canais digitais10",
    "10 https://www.ecommercebrasil.com.br/"
  ].forEach((fragment) => assert.ok(indicator23.observacao.includes(fragment), fragment));
});

test("interface mantém prioridade documental, read-only, fallback e isolamento ABR/MAI/JUN", () => {
  const rule = { indicadorId: 22 };
  const april = DocumentationFields.resolve(rule, {
    indicadorId: 22, competencia: "2026-04", observacaoArea: "Acompanhamento ABR"
  });
  const may = DocumentationFields.resolve(rule, {
    indicadorId: 22, competencia: "2026-05", camposEntrada: { observacaoArea: "Acompanhamento MAI legado" }
  });
  const june = DocumentationFields.resolve(rule, {
    indicadorId: 22,
    competencia: "2026-06",
    observacaoArea: "Observação física",
    camposEntrada: { observacaoArea: "Fallback JSON" },
    observacaoDocumental: {
      observacao: "Observação literal do Informe 0056",
      fonteDocumental: "Informe DILOT/GERIN nº 0056/2026",
      somenteLeitura: true
    }
  });
  assert.equal(april.observation, "Acompanhamento ABR");
  assert.equal(may.observation, "Acompanhamento MAI legado");
  assert.equal(june.observation, "Observação literal do Informe 0056");
  assert.equal(june.documentarySource, "Informe DILOT/GERIN nº 0056/2026");
  assert.equal(june.readOnly, true);

  const repository = fs.readFileSync(path.join(root, "app", "repositories", "LancamentosObservacoesDocumentaisRepository.php"), "utf8");
  const launches = fs.readFileSync(path.join(root, "assets", "js", "launches.js"), "utf8");
  assert.match(repository, /l\.competencia=d\.competencia/);
  assert.match(repository, /l\.ano=d\.ano AND l\.mes=d\.mes/);
  assert.match(repository, /l\.versao_atual=d\.versao_lancamento/);
  assert.match(launches, /observationField\.readOnly = Boolean\(documentation\.readOnly\)/);
  assert.match(launches, /hasDocumentaryObservation[\s\S]*lancamento\.observacaoArea \?\? ""/);
});
