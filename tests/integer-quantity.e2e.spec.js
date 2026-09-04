const path = require("node:path");
const playwrightRoot = require.main.filename.match(/^(.*[\\/]node_modules[\\/]playwright)(?:[\\/]|$)/)?.[1];
if (!playwrightRoot) throw new Error("Playwright não encontrado no processo de teste.");
const { test, expect } = require(path.join(playwrightRoot, "test"));

const baseUrl = "http://127.0.0.1:8000";
test.use({ channel: "msedge", headless: true });

async function login(page) {
  await page.goto(`${baseUrl}/login`);
  await page.locator("select[name=matricula]").selectOption("UNIDADE-SUCOL");
  await Promise.all([
    page.waitForURL((url) => !url.pathname.endsWith("/login")),
    page.getByRole("button", { name: "Entrar" }).click()
  ]);
}

test("Indicador 1 mascara, calcula e reabre quantidades sem persistir texto formatado", async ({ page }) => {
  await login(page);
  await page.waitForFunction(() => Boolean(window.DataStore?.loadJson));
  const launches = await page.evaluate(() => window.DataStore.loadJson("lancamentos"));
  const launch = launches.find((item) => (
    Number(item.indicadorId) === 1 &&
    ["Não iniciado", "Rascunho", "Em preenchimento", "Devolvido para ajuste"].includes(item.status)
  ));
  expect(launch).toBeTruthy();

  const persistedBodies = [];
  await page.route((url) => decodeURIComponent(url.href).includes("api/database"), async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      persistedBodies.push(request.postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, database: "sqlsrv", mode: "central" })
      });
      return;
    }
    await route.continue();
  });

  await page.getByRole("link", { name: "Lançamentos" }).click();
  await page.waitForSelector('body[data-page="lancamentos"]');
  const target = new URL(page.url());
  target.searchParams.set("lancamentoId", launch.id);
  await page.goto(target.toString());
  await expect(page.locator("#launchEditorPanel")).toBeVisible();
  const base = page.locator('[data-entry-field="baseClientesAtivosCompetencia"]');
  const clients = page.locator('[data-entry-field="clientesUnicosComOfertaPersonalizadaCompetencia"]');

  await expect(base).toHaveAttribute("data-entry-type", "inteiro");
  await expect(base).toHaveAttribute("inputmode", "numeric");
  await base.fill("3018556");
  await clients.fill("2.371.981");
  await expect(base).toHaveValue("3.018.556");
  await expect(clients).toHaveValue("2.371.981");
  await expect(page.locator("#launchResultadoMensal")).toHaveValue("78,58%");
  await expect(page.locator("#launchPercentualCalculado")).toHaveValue("785,8%");
  await expect(page.locator("#launchSituacaoCalculada")).toHaveValue("Atingido");

  await page.locator("#saveDraftButton").click();
  await expect(page.locator("#launchActionFeedback")).toContainText("Rascunho salvo com sucesso.");
  const draft = persistedBodies
    .filter((body) => body?.key === "lancamentos")
    .flatMap((body) => body.value || [])
    .find((item) => String(item.id) === String(launch.id));
  expect(draft).toBeTruthy();
  expect(draft.camposEntrada.baseClientesAtivosCompetencia).toBe(3018556);
  expect(draft.camposEntrada.clientesUnicosComOfertaPersonalizadaCompetencia).toBe(2371981);
  expect(typeof draft.camposEntrada.baseClientesAtivosCompetencia).toBe("number");
  expect(typeof draft.camposEntrada.clientesUnicosComOfertaPersonalizadaCompetencia).toBe("number");

  await page.locator("#closeLaunchButton").click();
  await page.locator(`#lancamentosTable button[data-id="${launch.id}"]`).click();
  await expect(base).toHaveValue("3.018.556");
  await expect(clients).toHaveValue("2.371.981");

  const postCount = persistedBodies.length;
  await clients.fill("2.371.981,50");
  await expect(clients).toHaveValue("2.371.981,50");
  await page.locator("#saveDraftButton").click();
  await expect(page.locator("#launchMessage")).toContainText("use apenas números inteiros não negativos");
  expect(persistedBodies).toHaveLength(postCount);
});
