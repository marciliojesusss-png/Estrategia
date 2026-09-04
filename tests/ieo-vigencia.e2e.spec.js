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
}

async function visibleFields(page) {
  return page.locator("#dynamicInputFields [data-entry-field]").evaluateAll((nodes) => (
    nodes.map((node) => node.getAttribute("data-entry-field"))
  ));
}

test("Indicador 6 troca metodologia e campos exatamente na fronteira Jul/Ago 2026", async ({ page }) => {
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

  await openIeoLaunch(page, 8);
  await expect(page.locator("#launchMeta")).toHaveValue("26,64%");
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
  expect(calculation.percentualAtingidoMensal).toBeCloseTo(1.332, 10);
  expect(calculation.percentualAtingidoMensalFormatado).toBe("133,20%");
  expect(calculation.situacao).toBe("Atingido");
});
