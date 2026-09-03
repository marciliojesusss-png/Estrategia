const path = require("node:path");
const playwrightRoot = require.main.filename.match(/^(.*[\\/]node_modules[\\/]playwright)(?:[\\/]|$)/)?.[1];
if (!playwrightRoot) throw new Error("Playwright não encontrado no processo de teste.");
const { test, expect } = require(path.join(playwrightRoot, "test"));

const baseUrl = "http://127.0.0.1:8000";
test.use({ channel: "msedge", headless: true });
const documentationKeys = [
  "observacaoArea",
  "fontePesquisaNPS",
  "evidenciaMelhoriasMes",
  "evidenciaPlataformaJogos",
  "evidenciaTIC",
  "fonteEvidenciaClima",
  "fonteEvidenciaCapacitacao",
  "evidenciaIniciativaSocioambiental",
  "evidenciaAcao",
  "evidenciaIncentivoSocioambiental",
  "evidenciaVisibilidade",
  "fonteEvidenciaJR",
  "fonteEvidenciaEcossistema",
  "fonteEvidenciaRedeLoterica"
];

async function login(page, user) {
  await page.goto(`${baseUrl}/login`);
  await page.locator("select[name=matricula]").selectOption(user);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.endsWith("/login")),
    page.getByRole("button", { name: "Entrar" }).click()
  ]);
}

async function launches(page) {
  await page.waitForFunction(() => Boolean(window.DataStore?.loadJson));
  return page.evaluate(() => window.DataStore.loadJson("lancamentos"));
}

async function openLaunch(page, launchId) {
  if (await page.locator('body[data-page="lancamentos"]').count() === 0) {
    await page.getByRole("link", { name: "Lançamentos" }).click();
    await page.waitForSelector('body[data-page="lancamentos"]');
  }
  const target = new URL(page.url());
  target.searchParams.set("lancamentoId", launchId);
  await page.goto(target.toString());
  await expect(page.locator("#launchEditorPanel")).toBeVisible();
}

async function dynamicFieldNames(page) {
  return page.locator("#dynamicInputFields [data-entry-field]").evaluateAll((elements) => (
    elements.map((element) => element.getAttribute("data-entry-field"))
  ));
}

async function expectNoDocumentationDuplicates(page) {
  const names = await dynamicFieldNames(page);
  documentationKeys.forEach((key) => expect(names).not.toContain(key));
  await expect(page.locator("#launchObservacaoArea")).toHaveCount(1);
  await expect(page.locator("#launchEvidenceReference")).toHaveCount(1);
}

test("indicador 19 mantém sete campos operacionais e documentação central única", async ({ page }) => {
  await login(page, "UNIDADE-GENOL");
  const launch = (await launches(page)).find((item) => Number(item.indicadorId) === 19 && Number(item.mes) === 6);
  expect(launch).toBeTruthy();
  const persistedBodies = [];
  await page.route((url) => decodeURIComponent(url.href).includes("api/database"), async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      persistedBodies.push(request.postDataJSON());
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, database: "sqlsrv", mode: "central" }) });
      return;
    }
    if (request.url().includes("ping=1")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, database: "sqlsrv", mode: "central" }) });
      return;
    }
    await route.continue();
  });
  await page.route((url) => /api\/lancamentos\/[^/?]+\/evidencias/.test(decodeURIComponent(url.href)), async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sucesso: true,
        dados: [{ id: "evidencia-teste", nomeArquivo: "evidencia-existente.pdf", descricao: "Evidência simulada pelo teste", dataUpload: "2026-06-30T12:00:00", usuario: "teste" }]
      })
    });
  });
  await openLaunch(page, launch.id);
  await expectNoDocumentationDuplicates(page);
  expect(await dynamicFieldNames(page)).toEqual([
    "nomeProjetoIncentivoSocioambiental",
    "tipoIncentivoSocioambiental",
    "statusProjetoIncentivoSocioambiental",
    "valorInvestidoMes",
    "valorInvestidoAcumuladoCompetencia",
    "dataInvestimentoSocioambiental",
    "descricaoAndamentoIncentivoSocioambiental"
  ]);

  await expect(page.locator("#saveDraftButton")).toBeEnabled();
  await page.locator("#launchObservacaoArea").fill("Observação central validada pelo Playwright");
  await page.locator("#launchEvidenceReference").fill("Referência central validada pelo Playwright");
  await page.locator("#saveDraftButton").click();
  await expect(page.locator("#launchActionFeedback")).toContainText("Rascunho salvo com sucesso.");

  const draft = persistedBodies
    .filter((body) => body?.key === "lancamentos")
    .flatMap((body) => body.value || [])
    .find((item) => String(item.id) === String(launch.id));
  expect(draft).toBeTruthy();
  expect(draft.referenciaEvidencia).toBe("Referência central validada pelo Playwright");
  expect(draft.observacaoArea).toBe("Observação central validada pelo Playwright");
  if (Object.prototype.hasOwnProperty.call(launch.camposEntrada || {}, "evidenciaIncentivoSocioambiental")) {
    expect(draft.camposEntrada.evidenciaIncentivoSocioambiental).toBe(launch.camposEntrada.evidenciaIncentivoSocioambiental);
  }

  await page.locator("#sendApprovalButton").click();
  await expect(page.locator("#launchActionFeedback")).toContainText("Lançamento enviado para homologação com sucesso.");
  const sent = persistedBodies
    .filter((body) => body?.key === "lancamentos")
    .flatMap((body) => body.value || [])
    .filter((item) => String(item.id) === String(launch.id))
    .at(-1);
  expect(sent.status).toBe("Enviado para homologação");
});

test("indicador 12 reaproveita valor histórico no campo central e indicador 15 preserva readonly", async ({ page }) => {
  await login(page, "UNIDADE-GERIN");
  const allLaunches = await launches(page);
  const legacyClimate = allLaunches.find((item) => (
    Number(item.indicadorId) === 12 &&
    !String(item.referenciaEvidencia || "").trim() &&
    String(item.camposEntrada?.fonteEvidenciaClima || "").trim()
  ));
  const climate = legacyClimate || allLaunches.find((item) => Number(item.indicadorId) === 12);
  expect(climate).toBeTruthy();
  await openLaunch(page, climate.id);
  await expectNoDocumentationDuplicates(page);
  if (legacyClimate) {
    await expect(page.locator("#launchEvidenceReference")).toHaveValue(legacyClimate.camposEntrada.fonteEvidenciaClima.trim());
  }

  const training = allLaunches.find((item) => Number(item.indicadorId) === 15);
  expect(training).toBeTruthy();
  await openLaunch(page, training.id);
  await expectNoDocumentationDuplicates(page);
  await expect(page.locator('[data-entry-field="quantidadeCursosMinimaCapacitacao"]')).toHaveAttribute("readonly", "");
});

test("indicadores 20, 22 e 23 preservam somente campos operacionais", async ({ page }) => {
  await login(page, "UNIDADE-SUCOL");
  const allLaunches = await launches(page);
  for (const indicatorId of [20, 22, 23]) {
    const launch = allLaunches.find((item) => Number(item.indicadorId) === indicatorId);
    expect(launch).toBeTruthy();
    await openLaunch(page, launch.id);
    await expectNoDocumentationDuplicates(page);
  }

  const indicator22 = allLaunches.find((item) => Number(item.indicadorId) === 22);
  await openLaunch(page, indicator22.id);
  await expect(page.locator('[data-entry-field="referencia2025Trimestre"]')).toHaveAttribute("readonly", "");
  await expect(page.locator('[data-entry-field="metaTrimestral2026"]')).toHaveAttribute("readonly", "");

  const indicator23 = allLaunches.find((item) => Number(item.indicadorId) === 23);
  await openLaunch(page, indicator23.id);
  await expect(page.locator('[data-entry-field="metaTrimestral"]')).toHaveAttribute("readonly", "");
});

test("indicador 21 mantém histórico acessível sem campos duplicados", async ({ page }) => {
  await login(page, "UNIDADE-SURCI");
  const launch = (await launches(page)).find((item) => Number(item.indicadorId) === 21);
  expect(launch).toBeTruthy();
  await openLaunch(page, launch.id);
  await expectNoDocumentationDuplicates(page);
  expect(await dynamicFieldNames(page)).toEqual([
    "publicoAlvoElegivelJR",
    "empregadosCapacitadosJR",
    "quantidadeMinimaIniciativasJR",
    "iniciativasConsideradasJR",
    "dataBaseApuracaoJR"
  ]);
});
