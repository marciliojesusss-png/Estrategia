const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const DocumentationFields = require("../assets/js/documentation-fields");
const { loadBootstrapData } = require("./helpers/bootstrap-data");

const root = path.resolve(__dirname, "..");
const bootstrap = loadBootstrapData(root);
const rulesByIndicator = Object.fromEntries(
  bootstrap.regrasIndicadores.map((rule) => [Number(rule.indicadorId), rule])
);

const expectedDocumentationFields = {
  2: ["fontePesquisaNPS", "observacaoArea"],
  4: [],
  10: ["evidenciaPlataformaJogos", "observacaoArea"],
  11: ["evidenciaTIC"],
  12: ["fonteEvidenciaClima", "observacaoArea"],
  15: ["fonteEvidenciaCapacitacao", "observacaoArea"],
  16: ["evidenciaIniciativaSocioambiental", "observacaoArea"],
  18: ["evidenciaAcao"],
  19: ["evidenciaIncentivoSocioambiental", "observacaoArea"],
  20: ["evidenciaVisibilidade", "observacaoArea"],
  21: ["fonteEvidenciaJR", "observacaoArea"],
  22: ["fonteEvidenciaEcossistema", "observacaoArea"],
  23: ["observacaoArea"]
};

test("inventário global usa uma lista explícita e remove somente campos documentais", () => {
  for (const [indicatorId, expectedNames] of Object.entries(expectedDocumentationFields)) {
    const rule = rulesByIndicator[Number(indicatorId)];
    const configuredDocumentation = rule.camposEntrada
      .filter(DocumentationFields.isCentralDocumentationField)
      .map((field) => field.nome);
    assert.deepEqual(configuredDocumentation, expectedNames, `indicador ${indicatorId}`);

    const visibleNames = DocumentationFields.visibleInputFields(rule).map((field) => field.nome);
    expectedNames.forEach((name) => assert.equal(visibleNames.includes(name), false, `${indicatorId}/${name}`));
  }

  assert.equal(DocumentationFields.isCentralDocumentationField("descricaoAndamentoVisibilidade"), false);
  assert.equal(DocumentationFields.isCentralDocumentationField("dataBasePesquisaClima"), false);
  assert.equal(DocumentationFields.isCentralDocumentationField("evidencia"), false);
  assert.equal(DocumentationFields.isCentralDocumentationField("evidenciaMelhoriasMes"), true);
});

test("indicador 19 prioriza os controles centrais e mantém os valores legados", () => {
  const rule = rulesByIndicator[19];
  const launch = {
    indicadorId: 19,
    referenciaEvidencia: "Processo central 123",
    observacaoArea: "Observação central",
    camposEntrada: {
      nomeProjetoIncentivoSocioambiental: "Projeto A",
      evidenciaIncentivoSocioambiental: "Referência antiga",
      observacaoArea: "Observação antiga"
    }
  };

  assert.deepEqual(DocumentationFields.resolve(rule, launch), {
    reference: "Processo central 123",
    observation: "Observação central",
    legacyReference: "Referência antiga"
  });

  const preserved = DocumentationFields.preserveLegacyFields(rule, launch, {
    nomeProjetoIncentivoSocioambiental: "Projeto A revisado"
  });
  assert.equal(preserved.evidenciaIncentivoSocioambiental, "Referência antiga");
  assert.equal(preserved.observacaoArea, "Observação antiga");
  assert.equal(preserved.nomeProjetoIncentivoSocioambiental, "Projeto A revisado");
});

test("registro histórico do indicador 12 abre a documentação legada nos campos centrais", () => {
  const resolved = DocumentationFields.resolve(rulesByIndicator[12], {
    indicadorId: 12,
    referenciaEvidencia: "   ",
    observacaoArea: "",
    camposEntrada: {
      fonteEvidenciaClima: "Relatório GPTW histórico",
      observacaoArea: "Contexto histórico da área"
    }
  });

  assert.equal(resolved.reference, "Relatório GPTW histórico");
  assert.equal(resolved.observation, "Contexto histórico da área");
});

test("observação documental oficial tem prioridade e permanece somente leitura", () => {
  const resolved = DocumentationFields.resolve(rulesByIndicator[3] || { indicadorId: 3 }, {
    indicadorId: 3,
    referenciaEvidencia: "Referência operacional preservada",
    observacaoArea: "Observação física do lançamento",
    camposEntrada: { observacaoArea: "Observação legada no JSON" },
    observacaoDocumental: {
      observacao: "Observação literal do Informe",
      fonteDocumental: "Informe DILOT/GERIN nº 0029/2026",
      somenteLeitura: true
    }
  });

  assert.equal(resolved.observation, "Observação literal do Informe");
  assert.equal(resolved.reference, "Referência operacional preservada");
  assert.equal(resolved.isDocumentaryOfficial, true);
  assert.equal(resolved.readOnly, true);
  assert.equal(resolved.documentarySource, "Informe DILOT/GERIN nº 0029/2026");
  assert.match(resolved.documentaryNotice, /Observação registrada no Informe/);
});

test("ausência de observação documental mantém fallback físico e legado", () => {
  const physical = DocumentationFields.resolve({ indicadorId: 3 }, {
    indicadorId: 3,
    observacaoArea: "Observação física",
    camposEntrada: { observacaoArea: "Observação legada" }
  });
  assert.equal(physical.observation, "Observação física");
  assert.equal(physical.readOnly, undefined);

  const legacy = DocumentationFields.resolve({ indicadorId: 3 }, {
    indicadorId: 3,
    observacaoDocumental: { observacao: "  " },
    camposEntrada: { observacaoArea: "Observação legada" }
  });
  assert.equal(legacy.observation, "Observação legada");
});

test("JAN, FEV e competência não trimestral não herdam a observação documental de MAR", () => {
  const rule = rulesByIndicator[22];
  const jan = DocumentationFields.resolve(rule, {
    indicadorId: 22,
    competencia: "2026-01",
    observacaoArea: "Acompanhamento JAN"
  });
  const fev = DocumentationFields.resolve(rule, {
    indicadorId: 22,
    competencia: "2026-02",
    camposEntrada: { observacaoArea: "Acompanhamento FEV legado" }
  });
  const abril = DocumentationFields.resolve({ indicadorId: 99 }, {
    indicadorId: 99,
    competencia: "2026-04",
    observacaoArea: "Competência não trimestral"
  });

  assert.equal(jan.observation, "Acompanhamento JAN");
  assert.equal(fev.observation, "Acompanhamento FEV legado");
  assert.equal(abril.observation, "Competência não trimestral");
  assert.equal(jan.isDocumentaryOfficial, undefined);
  assert.equal(fev.isDocumentaryOfficial, undefined);
});

test("indicadores 20 e 21 não exibem duplicatas e continuam com os campos operacionais", () => {
  assert.deepEqual(
    DocumentationFields.visibleInputFields(rulesByIndicator[20]).map((field) => field.nome),
    [
      "acaoPropostaVisibilidade",
      "statusAcaoVisibilidade",
      "etapaAtualVisibilidade",
      "descricaoAndamentoVisibilidade",
      "dataConclusaoVisibilidade"
    ]
  );
  assert.deepEqual(
    DocumentationFields.visibleInputFields(rulesByIndicator[21]).map((field) => field.nome),
    [
      "publicoAlvoElegivelJR",
      "empregadosCapacitadosJR",
      "quantidadeMinimaIniciativasJR",
      "iniciativasConsideradasJR",
      "dataBaseApuracaoJR"
    ]
  );
});

test("campos operacionais somente leitura de 15, 22 e 23 permanecem visíveis", () => {
  const rules = [
    {
      indicadorId: 15,
      camposEntrada: [
        { nome: "quantidadeCursosMinimaCapacitacao", somenteLeitura: true },
        { nome: "fonteEvidenciaCapacitacao" },
        { nome: "observacaoArea" }
      ]
    },
    {
      indicadorId: 22,
      camposEntrada: [
        { nome: "referenciaLotex2025", somenteLeitura: true },
        { nome: "metaParticipacao2026", somenteLeitura: true },
        { nome: "fonteEvidenciaEcossistema" },
        { nome: "observacaoArea" }
      ]
    },
    {
      indicadorId: 23,
      camposEntrada: [
        { nome: "metaTrimestral", somenteLeitura: true },
        { nome: "fonteEvidenciaRedeLoterica" },
        { nome: "observacaoArea" }
      ]
    }
  ];

  assert.deepEqual(DocumentationFields.visibleInputFields(rules[0]).map((field) => field.nome), ["quantidadeCursosMinimaCapacitacao"]);
  assert.deepEqual(DocumentationFields.visibleInputFields(rules[1]).map((field) => field.nome), ["referenciaLotex2025", "metaParticipacao2026"]);
  assert.deepEqual(DocumentationFields.visibleInputFields(rules[2]).map((field) => field.nome), ["metaTrimestral"]);
});

test("integração usa o fallback central sem alterar regra de evidência", () => {
  const launches = fs.readFileSync(path.join(root, "assets", "js", "launches.js"), "utf8");
  const indicators = fs.readFileSync(path.join(root, "assets", "js", "indicators.js"), "utf8");
  const approvals = fs.readFileSync(path.join(root, "assets", "js", "approvals.js"), "utf8");
  const view = fs.readFileSync(path.join(root, "views", "frontend", "lancamentos.php"), "utf8");

  assert.match(launches, /DocumentationFields\.visibleInputFields\(regra\)/);
  assert.match(launches, /DocumentationFields\.preserveLegacyFields\(regra, lancamento, collectedFields\)/);
  assert.match(launches, /regra\.exigeEvidencia/);
  assert.match(indicators, /DocumentationFields\.resolve\(regra, lancamento\)/);
  assert.match(approvals, /DocumentationFields\.resolve\(regra, lancamento\)/);
  assert.match(launches, /hasDocumentaryObservation[\s\S]*lancamento\.observacaoArea \?\? ""/);
  assert.match(launches, /observationField\.readOnly = Boolean\(documentation\.readOnly\)/);
  assert.match(view, /id="launchDocumentaryObservation"/);
  assert.match(view, /Fonte documental:/);
});

test("espelhos da apresentação documental permanecem byte a byte idênticos", () => {
  for (const file of ["documentation-fields.js", "launches.js"]) {
    assert.equal(
      fs.readFileSync(path.join(root, "assets", "js", file), "utf8"),
      fs.readFileSync(path.join(root, "public", "assets", "js", file), "utf8"),
      file
    );
  }
});
