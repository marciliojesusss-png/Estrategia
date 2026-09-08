(function () {
  async function carregarBaseValidacao() {
    return window.DataStore.loadAll();
  }

  async function salvarBaseValidacao() {
    throw new Error("Importacao de base local desativada. O SQL Server e a fonte exclusiva.");
  }

  async function verificarIntegridadeBase() {
    return window.DatabaseService.verificarIntegridadeBanco();
  }

  async function limparDadosLocais() {
    throw new Error("Nao existe base local para limpar.");
  }

  function initBaseValidacaoLocal() {
    window.DatabaseService?.initBancoDadosSqlServer?.();
  }

  window.DataService = {
    carregarBaseValidacao,
    salvarBaseValidacao,
    verificarIntegridadeBase,
    limparDadosLocais,
    initBaseValidacaoLocal
  };
})();
