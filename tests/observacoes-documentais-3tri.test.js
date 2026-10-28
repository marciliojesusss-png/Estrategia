const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const DocumentationFields = require("../assets/js/documentation-fields");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "docs", "manifesto-observacoes-3tri-2026.yaml");
const firstTriManifestPath = path.join(root, "docs", "manifesto-observacoes-1tri-2026.yaml");
const secondTriManifestPath = path.join(root, "docs", "manifesto-observacoes-2tri-2026.yaml");
const migrationPath = path.join(root, "database", "sqlserver", "migrations", "20261028_002_observacoes_documentais_3tri_2026.sql");
const manifestText = fs.readFileSync(manifestPath, "utf8").replace(/^\uFEFF/, "");
const firstTriManifestText = fs.readFileSync(firstTriManifestPath, "utf8").replace(/^\uFEFF/, "");
const secondTriManifestText = fs.readFileSync(secondTriManifestPath, "utf8").replace(/^\uFEFF/, "");
const migrationText = fs.readFileSync(migrationPath, "utf8").replace(/^\uFEFF/, "");
const expectedManifestHash = "bf8b52cb270345db3ba1999181c2fc55ad4c32d1bde76b727fb8709bb98ec45f";

function arrayField(block, name) {
  const value = block.match(new RegExp("\\n    " + name + ": \\[([^\\]]*)\\]"))[1];
  return value === "" ? [] : value.split(",").map((item) => Number(item.trim()));
}

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
      includedNotes: arrayField(block, "notasExternasIncorporadas"),
      excludedNotes: arrayField(block, "notasExternasExcluidas"),
      observation
    };
  });
}

function embeddedEntries() {
  const chunks = [...migrationText.matchAll(/SET @manifesto \+= N'((?:''|[^'])*)';/g)];
  assert.ok(chunks.length > 1, "manifesto deve ser fracionado em literais seguros");
  return JSON.parse(chunks.map((match) => match[1].replaceAll("''", "'")).join(""));
}

test("manifesto 3TRI mantém SHA-256, YAML lógico, notas e 23 hashes inéditos", () => {
  assert.equal(crypto.createHash("sha256").update(manifestText, "utf8").digest("hex"), expectedManifestHash);
  const rows = manifestEntries();
  assert.equal(rows.length, 23);
  assert.deepEqual(rows.map((row) => row.indicatorId), Array.from({ length: 23 }, (_, index) => index + 1));
  assert.equal(new Set(rows.map((row) => row.launchId)).size, 23);
  assert.equal(new Set(rows.map((row) => row.hash)).size, 23);
  rows.forEach((row) => {
    assert.equal(crypto.createHash("sha256").update(row.observation, "utf8").digest("hex"), row.hash);
    assert.equal(row.source, "Informe DILOT/GERIN nº 0078/2026");
    assert.equal(row.type, "OBSERVACAO_AREA_INFORME_TRIMESTRAL");
  });
  assert.deepEqual(rows[3].includedNotes, [1]);
  assert.deepEqual(rows[18].includedNotes, [4]);
  assert.deepEqual(rows[7].excludedNotes, [2]);
  assert.deepEqual(rows[8].excludedNotes, [3]);
  const historicHashes = new Set(
    [...(firstTriManifestText + secondTriManifestText).matchAll(/^    sha256: "([a-f0-9]{64})"$/gm)]
      .map((match) => match[1])
  );
  rows.forEach((row) => assert.equal(historicHashes.has(row.hash), false));
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
    assert.equal(row.competencia, "2026-09");
    assert.equal(row.ano, 2026);
    assert.equal(row.mes, 9);
    assert.equal(row.observacao, entry.observation);
    assert.equal(row.sha256Observacao, entry.hash);
    assert.equal(
      row.sha256ObservacaoSqlUtf16,
      crypto.createHash("sha256").update(Buffer.from(entry.observation, "utf16le")).digest("hex")
    );
    assert.equal(row.sha256DocumentoDeclarado, "6f97de83e610071190017d2942609c25501eb21c0e86896436c5c143b1c1c9aa");
    assert.equal(row.sha256ArquivoFisico, "0acadd32b423c73c54589d78db3b1056cb86116282d95ffd792ef89ed5643367");
    assert.equal(row.substituiObservacaoId, undefined);
  });
});

test("mapeamento SET, versões e status coincidem com os 23 guards autorizados", () => {
  const launches = [9,21,33,45,57,69,81,93,105,117,129,141,153,165,177,189,201,213,225,237,249,261,273];
  assert.deepEqual(
    embeddedEntries().map((row) => [Number(row.indicadorId), Number(row.lancamentoId), row.versaoLancamento, row.statusEsperado]),
    launches.map((launchId, index) => [index + 1, launchId, 1, "Em preenchimento"])
  );
});

test("migration exige arquitetura existente e possui somente INSERT persistente documental", () => {
  assert.match(migrationText, /OBJECT_ID\(N'dbo\.lancamentos_observacoes_documentais',N'U'\) IS NULL/);
  assert.match(migrationText, /nenhuma estrutura sera criada por esta migration/);
  assert.doesNotMatch(migrationText, /\bCREATE\s+(?:TABLE|INDEX|UNIQUE INDEX|TRIGGER)\b/i);
  assert.doesNotMatch(migrationText, /\bALTER\s+TABLE\b/i);
  assert.doesNotMatch(migrationText, /\bUPDATE\s+dbo\./i);
  assert.doesNotMatch(migrationText, /\bDELETE\s+(?:FROM\s+)?dbo\./i);
  assert.doesNotMatch(migrationText, /JSON_MODIFY/i);
  const persistentInserts = [...migrationText.matchAll(/\bINSERT\s+(?:INTO\s+)?(dbo\.\w+)/gi)]
    .map((match) => match[1].toLowerCase());
  assert.deepEqual(persistentInserts, ["dbo.lancamentos_observacoes_documentais"]);
  assert.match(migrationText, /documento_referencia,NULL,origem_registro FROM @carga/);
});

test("estados A-F são protegidos por idempotência, conflitos e rollback integral", () => {
  assert.match(migrationText, /SET XACT_ABORT ON/);
  assert.match(migrationText, /@existentes NOT IN\(0,23\)/);
  assert.match(migrationText, /@setExistentes<>@existentes OR @totalExistentes<>46\+@existentes/);
  assert.match(migrationText, /Aplicacao parcial detectada/);
  assert.match(migrationText, /Reexecucao encontrou conteudo documental divergente/);
  assert.match(migrationText, /JA APLICADA - SEM DML/);
  assert.match(migrationText, /Snapshot documental do 1TRI incompativel/);
  assert.match(migrationText, /Snapshot documental do 2TRI incompativel/);
  assert.match(migrationText, /IF @transacaoPropria=1 AND XACT_STATE\(\)<>0 ROLLBACK TRANSACTION/);
  assert.match(migrationText, /Tabela documental existente com tipos de colunas incompatíveis/);

  function state({ currentRows, exact = true, history = true, structure = true }) {
    if (!structure) return "THROW_ESTRUTURA";
    if (!history) return "THROW_HISTORICO";
    if (![0, 23].includes(currentRows)) return "THROW_PARCIAL";
    if (currentRows === 23 && !exact) return "THROW_HASH";
    if (currentRows === 23) return "JA_APLICADA_SEM_DML";
    return "INSERT_23";
  }
  assert.equal(state({ currentRows: 0 }), "INSERT_23");
  assert.equal(state({ currentRows: 23 }), "JA_APLICADA_SEM_DML");
  assert.equal(state({ currentRows: 12 }), "THROW_PARCIAL");
  assert.equal(state({ currentRows: 23, exact: false }), "THROW_HASH");
  assert.equal(state({ currentRows: 0, history: false }), "THROW_HISTORICO");
  assert.equal(state({ currentRows: 0, structure: false }), "THROW_ESTRUTURA");
});

test("snapshots MAR/JUN, lançamentos e governança são invariantes e o total final é 69", () => {
  assert.match(migrationText, /c3d83d43e7644033f73020b89858e8fdbc5f12b5ae2bf3b30f12d4c7aaaefd96/);
  assert.match(migrationText, /c24d510bacc8d432555f4ede1bff89c124263cdfedba7079a19efcce4bb0b890/);
  assert.match(migrationText, /@marAntes<>@marDepois OR @marHashAntes<>@marHashDepois/);
  assert.match(migrationText, /@junAntes<>@junDepois OR @junHashAntes<>@junHashDepois/);
  assert.match(migrationText, /SELECT COUNT\(\*\) FROM dbo\.lancamentos_observacoes_documentais\)<>69/);
  assert.match(migrationText, /@lancamentos_antes/);
  assert.match(migrationText, /Snapshot historico de lancamento foi alterado/);
  ["homologacoesAntes", "evidenciasAntes", "retificacoesAntes", "reaberturasAntes", "auditoriaAntes"]
    .forEach((name) => assert.match(migrationText, new RegExp("@" + name)));
  assert.match(migrationText, /Governanca ou auditoria historica foi alterada/);
});

test("NPS, GGR, IEO e Indicadores 22/23 preservam exclusivamente o conteúdo do 3TRI", () => {
  const rows = embeddedEntries();
  const indicator2 = rows.find((row) => Number(row.indicadorId) === 2);
  const indicator5 = rows.find((row) => Number(row.indicadorId) === 5);
  const indicator6 = rows.find((row) => Number(row.indicadorId) === 6);
  const indicator22 = rows.find((row) => Number(row.indicadorId) === 22);
  const indicator23 = rows.find((row) => Number(row.indicadorId) === 23);
  ["55,0", "59,2", "+7,64%", "OUT/26"].forEach((fragment) => assert.ok(indicator2.observacao.includes(fragment)));
  ["48.003", "promotores", "detratores"].forEach((fragment) => assert.equal(indicator2.observacao.includes(fragment), false));
  assert.equal(indicator5.observacao.startsWith("▪ O desempenho vem mantendo"), true);
  ["% Atingido = 1-", "VRM é igual a 100%", "Setembro / 2026", "Despesas de Tributos"]
    .forEach((fragment) => assert.ok(indicator6.observacao.includes(fragment)));
  ["META Realizado 2025 Meta 2026", "0,90% 0,91%", "0,60%", "80 %", "27/08/2026", "Compre Aqui", "Afiliados Instantânea CAIXA Digital"]
    .forEach((fragment) => assert.ok(indicator22.observacao.includes(fragment), fragment));
  ["Lotex + Marketplace", "71,12%", "Informe DILOT/GERIN nº 0056/2026"]
    .forEach((fragment) => assert.equal(indicator22.observacao.includes(fragment), false));
  ["98,16%", "96,71%", "balcão presencial", "Marketplace", "prestação de contas do mês"]
    .forEach((fragment) => assert.ok(indicator23.observacao.includes(fragment), fragment));
  assert.equal(indicator23.observacao.includes("3.7.1 A análise"), false);
});

test("interface mantém prioridade documental, read-only e isolamento JUL/AGO/SET", () => {
  for (const indicatorId of [3, 22]) {
    const rule = { indicadorId: indicatorId };
    const july = DocumentationFields.resolve(rule, {
      indicadorId: indicatorId, competencia: "2026-07", observacaoArea: "Acompanhamento JUL"
    });
    const august = DocumentationFields.resolve(rule, {
      indicadorId: indicatorId, competencia: "2026-08", camposEntrada: { observacaoArea: "Acompanhamento AGO legado" }
    });
    const september = DocumentationFields.resolve(rule, {
      indicadorId: indicatorId,
      competencia: "2026-09",
      observacaoArea: "Observação física",
      camposEntrada: { observacaoArea: "Fallback JSON" },
      observacaoDocumental: {
        observacao: "Observação literal do Informe 0078",
        fonteDocumental: "Informe DILOT/GERIN nº 0078/2026",
        somenteLeitura: true
      }
    });
    assert.equal(july.observation, "Acompanhamento JUL");
    assert.equal(august.observation, "Acompanhamento AGO legado");
    assert.equal(september.observation, "Observação literal do Informe 0078");
    assert.equal(september.documentarySource, "Informe DILOT/GERIN nº 0078/2026");
    assert.equal(september.readOnly, true);
  }

  const repository = fs.readFileSync(path.join(root, "app", "repositories", "LancamentosObservacoesDocumentaisRepository.php"), "utf8");
  const launches = fs.readFileSync(path.join(root, "assets", "js", "launches.js"), "utf8");
  assert.match(repository, /l\.competencia=d\.competencia/);
  assert.match(repository, /l\.ano=d\.ano AND l\.mes=d\.mes/);
  assert.match(repository, /l\.versao_atual=d\.versao_lancamento/);
  assert.match(launches, /observationField\.readOnly = Boolean\(documentation\.readOnly\)/);
  assert.match(launches, /hasDocumentaryObservation[\s\S]*lancamento\.observacaoArea \?\? ""/);
});
