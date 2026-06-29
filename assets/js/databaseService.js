(function () {
  const SQLITE_PATH = "database/indicadores.sqlite";
  const SCHEMA_PATH = "database/schema.sql";

  async function inicializarBanco() {
    return criarSchemaSeNecessario();
  }

  async function conectarBanco() {
    const response = await fetch(SQLITE_PATH, { cache: "no-store" });
    return {
      conectado: response.ok,
      caminho: SQLITE_PATH,
      tamanhoBytes: response.ok ? Number(response.headers.get("content-length")) || null : null
    };
  }

  async function criarSchemaSeNecessario() {
    const [dbResponse, schemaResponse] = await Promise.all([
      fetch(SQLITE_PATH, { cache: "no-store" }).catch(() => null),
      fetch(SCHEMA_PATH, { cache: "no-store" }).catch(() => null)
    ]);
    return {
      bancoExiste: Boolean(dbResponse?.ok),
      schemaExiste: Boolean(schemaResponse?.ok),
      caminhoBanco: SQLITE_PATH,
      caminhoSchema: SCHEMA_PATH
    };
  }

  async function carregarBase() {
    return window.DataStore.loadAll();
  }

  async function carregarIndicadores() {
    return window.DataStore.loadJson("indicadores");
  }

  async function salvarIndicador(indicador) {
    const indicadores = await carregarIndicadores();
    const next = indicadores.some((item) => String(item.id) === String(indicador.id))
      ? indicadores.map((item) => String(item.id) === String(indicador.id) ? indicador : item)
      : [...indicadores, indicador];
    await window.DataStore.saveLocal("indicadores", next);
    return indicador;
  }

  async function carregarLancamentos() {
    return window.DataStore.loadJson("lancamentos");
  }

  async function salvarLancamento(lancamento) {
    const lancamentos = await carregarLancamentos();
    const next = lancamentos.some((item) => String(item.id) === String(lancamento.id))
      ? lancamentos.map((item) => String(item.id) === String(lancamento.id) ? lancamento : item)
      : [...lancamentos, lancamento];
    await window.DataStore.salvarLancamentos(next);
    return lancamento;
  }

  async function atualizarLancamento(id, dados) {
    const lancamentos = await carregarLancamentos();
    const next = lancamentos.map((item) => String(item.id) === String(id) ? { ...item, ...dados } : item);
    await window.DataStore.salvarLancamentos(next);
    return next.find((item) => String(item.id) === String(id)) || null;
  }

  async function homologarLancamento(id, usuario) {
    return atualizarLancamento(id, {
      status: "Homologado",
      homologadoPor: usuario?.email || usuario?.nome || usuario || "sistema",
      dataHomologacao: new Date().toISOString().slice(0, 10)
    });
  }

  async function reabrirLancamento(id, justificativa, usuario) {
    return atualizarLancamento(id, {
      status: "Reaberto",
      solicitacaoReabertura: justificativa,
      reabertoPor: usuario?.email || usuario?.nome || usuario || "sistema",
      dataReabertura: new Date().toISOString().slice(0, 10)
    });
  }

  async function registrarRetificacao(id, dados, justificativa, usuario) {
    const current = (await carregarLancamentos()).find((item) => String(item.id) === String(id));
    const updated = await atualizarLancamento(id, dados);
    await registrarAuditoria({
      entidade: "lancamentos",
      entidadeId: id,
      acao: "retificado",
      descricao: justificativa,
      dadosAnteriores: current,
      dadosNovos: updated,
      usuario: usuario?.email || usuario?.nome || usuario || "sistema"
    });
    return updated;
  }

  async function registrarAuditoria(acao) {
    return window.DataStore.appendHistory({
      entidade: acao.entidade,
      registroId: acao.entidadeId,
      acao: acao.acao,
      descricao: acao.descricao,
      valorAnterior: acao.dadosAnteriores,
      valorNovo: acao.dadosNovos,
      usuario: acao.usuario || "sistema"
    });
  }

  async function carregarResumoExecutivo() {
    return carregarBase();
  }

  async function carregarVisaoTrimestral() {
    return carregarBase();
  }

  async function verificarIntegridadeBanco() {
    const data = await carregarBase();
    const alertas = [];
    const indicadores = data.indicadores || [];
    const lancamentos = data.lancamentos || [];
    const homologacoes = data.homologacoes || [];
    const historico = data.historico || [];
    const indicatorIds = new Set(indicadores.map((item) => String(item.id)));
    const launchIds = new Set(lancamentos.map((item) => String(item.id)));
    const numeros = new Set();
    const statusValidos = new Set(["Nao iniciado", "N\u00e3o iniciado", "N\u00c3\u00a3o iniciado", "Rascunho", "Em preenchimento", "Enviado para homologa\u00e7\u00e3o", "Enviado para homologa\u00c3\u00a7\u00c3\u00a3o", "Homologado", "Devolvido para ajuste", "Reaberto", "Retificado", "Cancelado"]);

    if (indicadores.length !== 23) alertas.push(`Foram encontrados ${indicadores.length} indicadores; esperado: 23.`);
    indicadores.forEach((item) => {
      if (!item.plano || !item.pilar) alertas.push(`Indicador ${item.id} sem plano ou pilar.`);
      if (numeros.has(Number(item.numero))) alertas.push(`Indicador duplicado por numero: ${item.numero}.`);
      numeros.add(Number(item.numero));
    });
    lancamentos.forEach((item) => {
      if (!indicatorIds.has(String(item.indicadorId))) alertas.push(`Lancamento ${item.id} vinculado a indicador inexistente ${item.indicadorId}.`);
      if (!item.competencia) alertas.push(`Lancamento ${item.id} sem competencia.`);
      if (item.status && !statusValidos.has(item.status)) alertas.push(`Lancamento ${item.id} com status invalido: ${item.status}.`);
    });
    homologacoes.forEach((item) => {
      if (item.lancamentoId && !launchIds.has(String(item.lancamentoId))) alertas.push(`Homologacao ${item.id} vinculada a lancamento inexistente ${item.lancamentoId}.`);
    });
    if (!historico.length) alertas.push("Tabela de auditoria sem registros.");

    return {
      status: alertas.length ? "Foram encontrados alertas" : "Banco integro",
      alertas,
      contagens: {
        indicadores: indicadores.length,
        lancamentos: lancamentos.length,
        homologacoes: homologacoes.length,
        auditoria: historico.length
      }
    };
  }

  async function databaseInfo() {
    const [connection, data, integrity] = await Promise.all([
      conectarBanco().catch(() => ({ conectado: false, caminho: SQLITE_PATH, tamanhoBytes: null })),
      carregarBase(),
      verificarIntegridadeBanco()
    ]);
    return {
      tipo: "SQLite",
      arquivo: SQLITE_PATH,
      modo: "Validacao local",
      conectado: connection.conectado,
      tamanhoBytes: connection.tamanhoBytes,
      indicadores: (data.indicadores || []).length,
      lancamentos: (data.lancamentos || []).length,
      homologacoes: (data.homologacoes || []).length,
      auditoria: (data.historico || []).length,
      integridade: integrity.status
    };
  }

  function setDatabaseStatus(message, type = "info") {
    const target = document.getElementById("databaseLocalStatus");
    if (!target) return;
    target.hidden = false;
    target.className = `notice ${type}`;
    target.textContent = message;
  }

  async function renderDatabasePanel() {
    const panel = document.getElementById("databaseLocalPanel");
    const infoTarget = document.getElementById("databaseLocalInfo");
    if (!panel || !infoTarget) return;
    const info = await databaseInfo();
    infoTarget.innerHTML = [
      ["Tipo", info.tipo],
      ["Arquivo", `/${info.arquivo}`],
      ["Modo", info.modo],
      ["Banco encontrado", info.conectado ? "Sim" : "Nao"],
      ["Indicadores", info.indicadores],
      ["Lancamentos", info.lancamentos],
      ["Homologacoes", info.homologacoes],
      ["Auditoria", info.auditoria],
      ["Integridade", info.integridade]
    ].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
  }

  function initBancoDadosLocal() {
    const panel = document.getElementById("databaseLocalPanel");
    if (!panel) return;
    renderDatabasePanel().catch((error) => setDatabaseStatus(error.message, "warning"));

    document.getElementById("checkSqliteIntegrityButton")?.addEventListener("click", async () => {
      const result = await verificarIntegridadeBanco();
      setDatabaseStatus(result.alertas.length ? `${result.status}: ${result.alertas.join(" | ")}` : result.status, result.alertas.length ? "warning" : "info");
    });
    document.getElementById("reloadSqliteDataButton")?.addEventListener("click", () => window.location.reload());
  }

  window.DatabaseService = {
    SQLITE_PATH,
    inicializarBanco,
    conectarBanco,
    criarSchemaSeNecessario,
    carregarIndicadores,
    salvarIndicador,
    carregarLancamentos,
    salvarLancamento,
    atualizarLancamento,
    homologarLancamento,
    reabrirLancamento,
    registrarRetificacao,
    registrarAuditoria,
    carregarResumoExecutivo,
    carregarVisaoTrimestral,
    verificarIntegridadeBanco,
    databaseInfo,
    initBancoDadosLocal
  };
})();
