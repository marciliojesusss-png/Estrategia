(function (root) {
  const STATUS = Object.freeze({
    SEM_PRAZO: "sem_prazo",
    SEM_LANCAMENTO: "sem_lancamento",
    EM_DIA: "em_dia",
    PREENCHIMENTO_ATRASADO: "preenchimento_atrasado",
    HOMOLOGACAO_ATRASADA: "homologacao_atrasada",
    AJUSTE_ATRASADO: "ajuste_atrasado",
    RETIFICACAO_EM_ANDAMENTO: "retificacao_em_andamento"
  });

  function normalizeText(value) {
    let repaired = String(value || "");
    const replacements = [
      ["ÃƒÂ£", "ã"], ["ÃƒÂ§", "ç"], ["ÃƒÂ¡", "á"], ["ÃƒÂ©", "é"],
      ["ÃƒÂ­", "í"], ["ÃƒÂ³", "ó"], ["ÃƒÂº", "ú"], ["ÃƒÂª", "ê"],
      ["Ã£", "ã"], ["Ã§", "ç"], ["Ã¡", "á"], ["Ã©", "é"],
      ["Ã­", "í"], ["Ã³", "ó"], ["Ãº", "ú"], ["Ãª", "ê"],
      ["Ãµ", "õ"], ["Ã¢", "â"]
    ];
    for (let pass = 0; pass < 2; pass += 1) {
      replacements.forEach(([broken, correct]) => {
        repaired = repaired.replaceAll(broken, correct);
      });
    }
    return repaired
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function normalizeStatus(value) {
    return normalizeText(value)
      .replace(/homologacao/g, "homologacao")
      .replace(/\s+/g, " ");
  }

  function isoDate(value) {
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, "0");
      const day = String(value.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
  }

  function competenceOf(launch) {
    if (launch?.competencia && /^\d{4}-\d{2}$/.test(String(launch.competencia))) {
      return String(launch.competencia);
    }
    const year = Number(launch?.ano);
    const month = Number(launch?.mes);
    return Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12
      ? `${year}-${String(month).padStart(2, "0")}`
      : null;
  }

  function formatDate(value) {
    const date = isoDate(value);
    if (!date) return "-";
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
  }

  function result(code, overdue = false, message = "", deadline = null) {
    return {
      codigo: code,
      atrasado: overdue,
      mensagem: message,
      prazo: deadline,
      prazoFormatado: deadline ? formatDate(deadline) : null
    };
  }

  function avaliar(launch, deadline, referenceDate = new Date()) {
    if (!launch) return result(STATUS.SEM_LANCAMENTO);
    const competence = competenceOf(launch);
    if (!deadline || deadline.ativo === false || String(deadline.competencia || "") !== competence) {
      return result(STATUS.SEM_PRAZO);
    }

    const reference = isoDate(referenceDate);
    const fillDeadline = isoDate(deadline.dataLimitePreenchimento || deadline.data_limite_preenchimento);
    const approvalDeadline = isoDate(deadline.dataLimiteHomologacao || deadline.data_limite_homologacao);
    if (!reference || !fillDeadline || !approvalDeadline) return result(STATUS.SEM_PRAZO);

    const status = normalizeStatus(launch.status);
    if (status === "homologado") return result(STATUS.EM_DIA);
    if (status === "reaberto" || status === "retificado") {
      return result(STATUS.RETIFICACAO_EM_ANDAMENTO);
    }
    if (status === "enviado para homologacao") {
      return reference > approvalDeadline
        ? result(STATUS.HOMOLOGACAO_ATRASADA, true, "Homologação em atraso", approvalDeadline)
        : result(STATUS.EM_DIA);
    }
    if (status === "devolvido para ajuste") {
      return reference > fillDeadline
        ? result(STATUS.AJUSTE_ATRASADO, true, "Ajuste em atraso", fillDeadline)
        : result(STATUS.EM_DIA);
    }
    if (["nao iniciado", "rascunho", "em preenchimento"].includes(status)) {
      return reference > fillDeadline
        ? result(STATUS.PREENCHIMENTO_ATRASADO, true, "Preenchimento em atraso", fillDeadline)
        : result(STATUS.EM_DIA);
    }
    return result(STATUS.EM_DIA);
  }

  function findForLaunch(deadlines, launch) {
    const competence = competenceOf(launch);
    return (deadlines || []).find((item) => (
      item?.ativo !== false && String(item?.competencia || "") === competence
    )) || null;
  }

  async function carregarPrazos() {
    const target = typeof root.appUrl === "function"
      ? root.appUrl("api/prazos-apuracao")
      : `${root.APP_BASE_PATH || ""}/index.php?route=api/prazos-apuracao`;
    const response = await root.fetch(target, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.sucesso === false) {
      throw new Error(payload.mensagem || "Não foi possível consultar os prazos de apuração.");
    }
    return Array.isArray(payload.dados) ? payload.dados : [];
  }

  root.PrazoApuracao = Object.freeze({
    STATUS,
    avaliar,
    carregarPrazos,
    competenceOf,
    findForLaunch,
    formatDate,
    normalizeStatus
  });
})(window);
