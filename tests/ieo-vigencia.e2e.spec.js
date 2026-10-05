const path = require("node:path");
const playwrightRoot = require.main.filename.match(/^(.*[\\/]node_modules[\\/]playwright)(?:[\\/]|$)/)?.[1];
if (!playwrightRoot) throw new Error("Playwright não encontrado no processo de teste.");
const { test, expect } = require(path.join(playwrightRoot, "test"));

const baseUrl = "http://127.0.0.1:8000";
test.use({ channel: "msedge", headless: true });

async function login(page) {
  await page.goto(`${baseUrl}/login`);
  await page.locator("select[name=matricula]").selectOption("UNIDADE-SUCTF");
  await Promise.all([
    page.waitForURL((url) => !url.pathname.endsWith("/login")),
    page.getByRole("button", { name: "Entrar" }).click()
  ]);
}

async function openIeoLaunch(page, month) {
  const launch = await page.evaluate(async (targetMonth) => {
    const launches = await window.DataStore.loadJson("lancamentos");
    return launches.find((item) => Number(item.indicadorId) === 6 && Number(item.ano) === 2026 && Number(item.mes) === targetMonth);
  }, month);
  expect(launch).toBeTruthy();
  if (await page.locator('body[data-page="lancamentos"]').count() === 0) {
    await page.getByRole("link", { name: "Lançamentos" }).click();
    await page.waitForSelector('body[data-page="lancamentos"]');
  }
  const target = new URL(page.url());
  target.searchParams.set("lancamentoId", launch.id);
  await page.goto(target.toString());
  await expect(page.locator("#launchEditorPanel")).toBeVisible();
  return launch;
}

async function visibleFields(page) {
  return page.locator("#dynamicInputFields [data-entry-field]").evaluateAll((nodes) => (
    nodes.map((node) => node.getAttribute("data-entry-field"))
  ));
}

test("Indicador 6 usa em Lançamentos a meta administrativa da competência", async ({ page }) => {
  await page.route((url) => {
    const decoded = decodeURIComponent(url.href);
    return decoded.includes("api/database") && decoded.includes("collection=metas");
  }, async (route) => {
    const response = await route.fetch();
    const metas = await response.json();
    const fixture = Array.isArray(metas) ? metas.map((meta) => (
      Number(meta.indicadorId) === 6 && Number(meta.ano) === 2026 && Number(meta.mes) === 8
        ? { ...meta, metaMensal: 0.2988 }
        : meta
    )) : [];
    if (!fixture.some((meta) => Number(meta.indicadorId) === 6 && Number(meta.ano) === 2026 && Number(meta.mes) === 8)) {
      fixture.push({ id: "fixture-ieo-2026-08", indicadorId: 6, ano: 2026, mes: 8, nomeMes: "Agosto", metaMensal: 0.2988 });
    }
    await route.fulfill({ response, contentType: "application/json", body: JSON.stringify(fixture) });
  });
  await login(page);
  await page.waitForFunction(() => Boolean(window.DataStore?.loadJson && window.IeoRecorrente));

  await openIeoLaunch(page, 7);
  await expect(page.locator("#launchMeta")).toHaveValue(/14,24%/);
  expect(await visibleFields(page)).toEqual([
    "despesaPessoalMes",
    "despesasAdministrativasMes",
    "receitasLiquidasMes",
    "ieoApuradoInformado"
  ]);
  await expect(page.getByText("Metodologia vigente a partir de agosto/2026", { exact: false })).toHaveCount(0);

  const augustLaunch = await openIeoLaunch(page, 8);
  const augustRow = page.locator(`#lancamentosTable button[data-id="${augustLaunch.id}"]`).locator("xpath=ancestor::tr");
  await expect(augustRow).toContainText("29,88%");
  await expect(page.locator("#launchMeta")).toHaveValue("29,88%");
  expect(await visibleFields(page)).toEqual([
    "despesasGeraisAdministrativasMes",
    "despesasServicosPagamentosMes",
    "outrasDespesasOperacionaisMes",
    "receitasOperacionaisMes",
    "despesasTributosMes"
  ]);
  await expect(page.getByText("Metodologia vigente a partir de agosto/2026", { exact: false }).first()).toBeVisible();
  await expect(page.locator("#ieoDirectToggle")).toHaveCount(0);
  await expect(page.locator('[data-entry-field="ieoApuradoInformado"]')).toHaveCount(0);
  await expect(page.locator("#resultadoAnualWrapper")).toBeHidden();

  const calculation = await page.evaluate(() => window.IeoRecorrente.calcularIeo(
    { indicadorId: 6, parametrosCalculo: {}, camposEntrada: [] },
    {
      competencia: "2026-08",
      indicadorId: 6,
      ano: 2026,
      mes: 8,
      metaReferencia: 0.2988,
      camposEntrada: {
        despesasGeraisAdministrativasMes: 100,
        despesasServicosPagamentosMes: 50,
        outrasDespesasOperacionaisMes: 30,
        receitasOperacionaisMes: 1000,
        despesasTributosMes: 100
      }
    }
  ));
  expect(calculation.resultadoMensal).toBeCloseTo(0.20, 10);
  expect(calculation.percentualAtingidoMensal).toBeCloseTo(1.494, 10);
  expect(calculation.percentualAtingidoMensalFormatado).toBe("149,40%");
  expect(calculation.situacao).toBe("Atingido");
});
