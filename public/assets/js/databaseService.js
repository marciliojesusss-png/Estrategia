(function () {
  const DATABASE_API_PING = "api/database?ping=1";

  function applicationPath(path) {
    return typeof window.appUrl === "function" ? window.appUrl(path) : path;
  }

  async function conectarBanco() {
    const response = await fetch(applicationPath(DATABASE_API_PING), { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    const connected = response.ok && payload?.ok === true && String(payload?.database || "").toLowerCase() === "sqlsrv";
    if (!connected) {
      throw new Error("A API nao confirmou a conexao obrigatoria com o SQL Server.");
    }
    return {
      conectado: true,
      modo: payload.mode || "php_sqlserver",
      banco: payload.databaseName || "Estrategia"
    };
  }

  async function inicializarBanco() {
    return conectarBanco();
  }

  async function criarSchemaSeNecessario() {
    return conectarBanco();
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

    if (indicadores.length !== 23) alertas.push(`Foram encontrados ${indicadores.length} indicadores; esperado: 23.`);
    indicadores.forEach((item) => {
      if (!item.plano || !item.pilar) alertas.push(`Indicador ${item.id} sem plano ou pilar.`);
      if (numeros.has(Number(item.numero))) alertas.push(`Indicador duplicado por numero: ${item.numero}.`);
      numeros.add(Number(item.numero));
    });
    lancamentos.forEach((item) => {
      if (!indicatorIds.has(String(item.indicadorId))) alertas.push(`Lancamento ${item.id} vinculado a indicador inexistente ${item.indicadorId}.`);
      if (!item.competencia) alertas.push(`Lancamento ${item.id} sem competencia.`);
    });
    homologacoes.forEach((item) => {
      if (item.lancamentoId && !launchIds.has(String(item.lancamentoId))) alertas.push(`Homologacao ${item.id} vinculada a lancamento inexistente ${item.lancamentoId}.`);
    });

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
      conectarBanco(),
      carregarBase(),
      verificarIntegridadeBanco()
    ]);
    return {
      tipo: "SQL Server",
      banco: connection.banco,
      modo: connection.modo,
      conectado: connection.conectado,
      indicadores: (data.indicadores || []).length,
      lancamentos: (data.lancamentos || []).length,
      homologacoes: (data.homologacoes || []).length,
      auditoria: (data.historico || []).length,
      integridade: integrity.status
    };
  }

  function setDatabaseStatus(message, type = "info") {
    const target = document.getElementById("databaseServerStatus");
    if (!target) return;
    target.hidden = false;
    target.className = `notice ${type}`;
    target.textContent = message;
  }

  async function renderDatabasePanel() {
    const panel = document.getElementById("databaseServerPanel");
    const infoTarget = document.getElementById("databaseServerInfo");
    if (!panel || !infoTarget) return;
    const info = await databaseInfo();
    infoTarget.innerHTML = [
      ["Tipo", info.tipo],
      ["Banco", info.banco],
      ["Modo", info.modo],
      ["Conectado", info.conectado ? "Sim" : "Nao"],
      ["Indicadores", info.indicadores],
      ["Lancamentos", info.lancamentos],
      ["Homologacoes", info.homologacoes],
      ["Auditoria", info.auditoria],
      ["Integridade", info.integridade]
    ].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
  }

  function initBancoDadosSqlServer() {
    const panel = document.getElementById("databaseServerPanel");
    if (!panel) return;
    renderDatabasePanel().catch((error) => setDatabaseStatus(error.message, "warning"));
    document.getElementById("checkSqlServerIntegrityButton")?.addEventListener("click", async () => {
      const result = await verificarIntegridadeBanco();
      setDatabaseStatus(result.alertas.length ? `${result.status}: ${result.alertas.join(" | ")}` : result.status, result.alertas.length ? "warning" : "info");
    });
    document.getElementById("reloadSqlServerDataButton")?.addEventListener("click", () => window.location.reload());
  }

  window.DatabaseService = {
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
    carregarResumoExecutivo: carregarBase,
    carregarVisaoTrimestral: carregarBase,
    verificarIntegridadeBanco,
    databaseInfo,
    initBancoDadosSqlServer
  };
})();
