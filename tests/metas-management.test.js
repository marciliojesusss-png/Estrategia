const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const metas = [
  { id: 601, indicadorId: 6, ano: 2026, mes: 8, nomeMes: "Agosto", metaMensal: 0.2988 },
  { id: 602, indicadorId: 6, ano: 2026, mes: 9, nomeMes: "Setembro", metaMensal: 0.2711 },
  { id: 701, indicadorId: 7, ano: 2026, mes: 1, nomeMes: "Janeiro", metaMensal: 110 },
  { id: 702, indicadorId: 7, ano: 2026, mes: 2, nomeMes: "Fevereiro", metaMensal: 120 },
  { id: 501, indicadorId: 5, ano: 2026, mes: 1, nomeMes: "Janeiro", metaMensal: 1000 }
];
const launches = [
  { id: "ieo-ago", indicadorId: 6, ano: 2026, mes: 8, metaReferencia: 0.2664, status: "Homologado", camposEntrada: { evidencia: "preservar" } },
  { id: "lucro-jan", indicadorId: 7, ano: 2026, mes: 1, metaReferencia: 90, status: "Homologado", camposEntrada: { lucroLiquidoRecorrenteCompetencia: 105 } },
  { id: "ggr-jan", indicadorId: 5, ano: 2026, mes: 1, metaReferencia: 900, status: "Homologado", camposEntrada: { arrecadacaoTotalMes: 1200, premiosAPagarMes: 100 } }
];

const context = {
  console,
  TextDecoder,
  fetch: async (target) => {
    if (String(target).includes("ping=1")) {
      return { ok: true, status: 200, json: async () => ({ ok: true, database: "sqlsrv", mode: "php_sqlserver" }) };
    }
    const match = String(target).match(/[?&]collection=([^&]+)/);
    const key = match ? decodeURIComponent(match[1]) : "";
    const values = { metas, lancamentos: launches };
    return { ok: true, status: 200, json: async () => values[key] || [] };
  },
  window: {
    location: { protocol: "http:" },
    CAIXA_LOTERIAS_AUTH_USER: { perfilCodigo: "administrador" },
    appUrl: (value) => value
  }
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "assets/js/currency.js"), "utf8"), context);
context.CurrencyBR = context.window.CurrencyBR;
vm.runInContext(fs.readFileSync(path.join(root, "assets/js/ieo-recorrente.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "assets/js/dataStore.js"), "utf8"), context);

(async () => {
  const store = context.window.DataStore;
  const loadedMetas = await store.loadJson("metas");
  const loadedLaunches = await store.loadJson("lancamentos");

  assert.equal(loadedMetas.find((item) => item.id === 601).metaMensal, 0.2988, "a normalização deve preservar a meta do SQL");
  assert.equal(loadedLaunches.find((item) => item.id === "ieo-ago").metaReferencia, 0.2988, "o lançamento deve usar a meta oficial");
  assert.equal(store.resolveMeta(6, 2026, 8, metas, 0.2664), 0.2988, "a meta oficial deve vencer o fallback de 26,64%");
  assert.equal(store.resolveMeta(6, 2026, 9, metas, 0.2664), 0.2711, "setembro deve preservar sua própria meta");
  assert.equal(store.resolveMeta(6, 2026, 8, [], null), 0.2664, "26,64% continua válido apenas como fallback sem configuração");
  assert.equal(store.resolveMeta(6, 2026, 10, metas, 0.23), 0.23, "sem configuração, o valor persistido no lançamento precede o fallback");
  assert.equal(store.resolveMeta(7, 2026, 1, metas, 999), 110);
  assert.equal(store.resolveMeta(5, 2026, 1, metas, 999), 1000, "o mecanismo deve funcionar para um terceiro indicador");
  assert.equal(store.resolveMeta(7, 2026, 2, metas, 999), 120, "uma competência não pode contaminar outra");
  assert.equal(store.resolveMeta(6, 2026, 8, metas, 999), 0.2988, "um indicador não pode contaminar outro");

  require(path.join(root, "assets/js/currency.js"));
  const formulas = require(path.join(root, "assets/js/formulas.js"));
  const ieo = require(path.join(root, "assets/js/ieo-recorrente.js"));

  const ieoLaunch = {
    indicadorId: 6,
    competencia: "2026-08",
    ano: 2026,
    mes: 8,
    metaReferencia: 0.2664,
    status: "Homologado",
    camposEntrada: {
      despesasGeraisAdministrativasMes: 180,
      despesasServicosPagamentosMes: 60,
      outrasDespesasOperacionaisMes: 30,
      receitasOperacionaisMes: 1000,
      despesasTributosMes: 100
    }
  };
  const regraIeoOficial = store.metasForRule({ indicadorId: 6, parametrosCalculo: {}, camposEntrada: [] }, metas);
  const regraIeoFinal = ieo.ajustarRegraIeo(structuredClone(regraIeoOficial), ieoLaunch);
  assert.equal(regraIeoFinal.parametrosCalculo.metasAcumuladasPorCompetencia["2026-08"], 0.2988);
  assert.equal(regraIeoFinal.parametrosCalculo.metasAcumuladasPorCompetencia["2026-09"], 0.2711);

  const ieoResult = ieo.calcularIeo(regraIeoOficial, ieoLaunch);
  assert.equal(ieo.getMetodologiaIeoPorCompetencia(ieoLaunch).codigo, "ca_agosto_2026");
  assert.equal(ieo.getMetaCompetencia(ieoLaunch, regraIeoOficial), 0.2988);
  assert.equal(ieoResult.metaReferenciaMensal, 0.2988);
  assert.equal(ieoResult.metaAnualIeo, 0.2988);
  assert.match(ieoResult.formulaVigenteIeo, /Despesas Gerais e Administrativas/);
  assert.equal(ieoResult.situacao, "Abaixo da meta");
  assert.ok(Math.abs(ieoResult.percentualAtingidoMensal - (0.2988 / 0.3)) < 1e-9, "IEO deve manter a fórmula inversa");

  const normalizedIeo = ieo.normalizarLancamentoParaExibicao(ieoLaunch, regraIeoOficial);
  assert.equal(normalizedIeo.metaMensal, 0.2988);
  assert.equal(normalizedIeo.metaReferencia, 0.2988);

  const launchContext = {
    window: {
      PageModules: {},
      DataStore: store,
      Calculations: {
        formatarValor(value, unidade) {
          if (unidade === "percentual") {
            return `${(Number(value) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
          }
          return String(value);
        }
      }
    }
  };
  launchContext.Calculations = launchContext.window.Calculations;
  vm.createContext(launchContext);
  vm.runInContext(fs.readFileSync(path.join(root, "assets/js/launches.js"), "utf8"), launchContext);
  const launchInternals = launchContext.window.__LAUNCHES_FILTER_TEST_INTERNALS__;
  assert.equal(launchInternals.getDisplayMeta(regraIeoFinal, ieoLaunch, metas), 0.2988);
  assert.equal(launchInternals.formatDisplayMeta(regraIeoFinal, ieoLaunch, metas), "29,88%");

  const lucroLaunch = {
    id: "lucro",
    indicadorId: 7,
    ano: 2026,
    mes: 1,
    competencia: "2026-01",
    metaReferencia: 110,
    status: "Homologado",
    referenciaEvidencia: "DOC-1",
    camposEntrada: { lucroLiquidoRecorrenteCompetencia: 105, evidencia: "arquivo.pdf" }
  };
  const lucroBefore = structuredClone(lucroLaunch);
  const lucroRule = {
    indicadorId: 7,
    tipoCalculo: "lucro_recorrente_mensal",
    unidadeMedida: "moeda",
    parametrosCalculo: { campoValorMensal: "lucroLiquidoRecorrenteCompetencia", metasMensaisPorCompetencia: { "2026-01": 90 } },
    camposEntrada: []
  };
  const lucroResult = formulas.calcularIndicador({ id: 7 }, lucroRule, lucroLaunch, [lucroLaunch]);
  assert.equal(lucroResult.resultadoMensal, 105);
  assert.ok(Math.abs(lucroResult.percentualAtingidoMensal - (105 / 110)) < 1e-9);
  assert.equal(lucroResult.situacao, "Abaixo da meta");
  assert.deepEqual(lucroLaunch, lucroBefore, "o cálculo não pode modificar realizado, entradas, evidência ou status homologado");

  const ggrLaunch = {
    indicadorId: 5,
    ano: 2026,
    mes: 1,
    competencia: "2026-01",
    metaReferencia: 1000,
    camposEntrada: { arrecadacaoTotalMes: 1200, premiosAPagarMes: 100 }
  };
  const ggrResult = formulas.calcularIndicador(
    { id: 5 },
    { indicadorId: 5, tipoCalculo: "ggr_formula", unidadeMedida: "moeda", parametrosCalculo: {}, camposEntrada: [] },
    ggrLaunch,
    [ggrLaunch]
  );
  assert.equal(ggrResult.resultadoMensal, 1100);
  assert.equal(ggrResult.percentualAtingidoMensal, 1.1);
  assert.equal(ggrResult.situacao, "Atingido");

  const admin = fs.readFileSync(path.join(root, "assets/js/admin.js"), "utf8");
  const view = fs.readFileSync(path.join(root, "views/frontend/administracao.php"), "utf8");
  assert.match(admin, /data-edit-meta/);
  assert.match(admin, /openMetaForm\(meta\)/);
  assert.match(admin, /form\.hidden = false/);
  assert.match(admin, /scrollIntoView/);
  assert.match(admin, /querySelector\('\[name="metaMensal"\]'\)/);
  assert.match(admin, /data-meta-edit-context/);
  assert.match(admin, /api\/administracao\/metas/);
  assert.doesNotMatch(admin.slice(admin.indexOf("async function saveMetaForm"), admin.indexOf("function renderTiposCalculo")), /DataStore\.saveLocal\("metas"/);
  assert.match(view, /formulas\.js/);

  for (const file of ["admin.js", "dataStore.js", "formulas.js", "ieo-recorrente.js", "lucro-recorrente.js", "central-persistence.js"]) {
    assert.equal(
      fs.readFileSync(path.join(root, "assets/js", file), "utf8"),
      fs.readFileSync(path.join(root, "public/assets/js", file), "utf8"),
      `${file} deve permanecer idêntico nas duas árvores`
    );
  }

  console.log("Gestão sistêmica de metas: fonte oficial, fórmulas, UI e duplicatas OK");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
