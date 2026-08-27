(function (root) {
  "use strict";

  const CHUNK_SIZE = {
    lancamentos: 40,
    homologacoes: 80
  };

  let backendInfoPromise = null;

  function appUrl(path) {
    return typeof root.appUrl === "function" ? root.appUrl(path) : path;
  }

  function csrfToken() {
    return root.Auth?.getCurrentUser?.()?.csrfToken ||
      root.CAIXA_LOTERIAS_AUTH_USER?.csrfToken ||
      root.CAIXA_LOTERIAS_CSRF_TOKEN ||
      "";
  }

  function hasPhpBackendContext() {
    return Boolean(
      root.location?.protocol?.startsWith("http") &&
      root.CAIXA_LOTERIAS_AUTH_USER
    );
  }

  async function requestJson(path, options) {
    const response = await fetch(appUrl(path), {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken() ? { "X-CSRF-Token": csrfToken() } : {}),
        ...(options?.headers || {})
      },
      ...(options || {})
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false || payload?.sucesso === false) {
      const message = payload?.mensagem || payload?.message || payload?.error ||
        `Falha na persistência central (${response.status}).`;
      throw new Error(message);
    }
    return payload;
  }

  async function getBackendInfo(force) {
    if (!hasPhpBackendContext()) {
      return { available: false, database: "browser", mode: "browser" };
    }
    if (!backendInfoPromise || force) {
      backendInfoPromise = requestJson("api/database?ping=1", { method: "GET" })
        .then((payload) => ({
          available: payload?.ok === true,
          database: String(payload?.database || "").toLowerCase(),
          mode: payload?.mode || null
        }))
        .catch((error) => {
          backendInfoPromise = null;
          throw error;
        });
    }
    return backendInfoPromise;
  }

  function prepareLaunchForCentral(launch) {
    const prepared = {
      ...launch,
      camposEntrada: { ...(launch?.camposEntrada || {}) }
    };

    // O backend deve registrar o momento real desta persistência.
    delete prepared.updatedAt;

    if (Number(prepared.indicadorId ?? prepared.indicador_id) === 6) {
      const key = prepared.competencia || `${prepared.ano}-${String(prepared.mes).padStart(2, "0")}`;
      const curve = root.IndicatorFormulas?.IEO_META_MENSAL_2026 || {};
      const meta = Object.prototype.hasOwnProperty.call(curve, key) ? curve[key] : prepared.metaMensal;
      if (meta !== null && meta !== undefined) {
        prepared.metaMensal = meta;
        prepared.metaReferencia = meta;
      }
      delete prepared.camposEntrada.percentualAtingidoOficialInformado;
      delete prepared.camposEntrada.observacaoAjusteOficial;
    }

    return prepared;
  }

  function prepareValueForCentral(key, value) {
    if (key !== "lancamentos") return value;
    return value.map(prepareLaunchForCentral);
  }

  async function persistCollection(key, value) {
    if (!Array.isArray(value)) {
      throw new Error(`Coleção ${key} inválida para persistência central.`);
    }

    const backend = await getBackendInfo();
    if (!backend.available) {
      throw new Error("Backend PHP indisponível. Os dados não foram confirmados no banco central.");
    }

    const preparedValue = prepareValueForCentral(key, value);
    const size = CHUNK_SIZE[key] || 40;
    for (let index = 0; index < preparedValue.length; index += size) {
      const chunk = preparedValue.slice(index, index + size);
      await requestJson("api/database", {
        method: "POST",
        body: JSON.stringify({ key, value: chunk })
      });
    }

    return {
      persisted: true,
      database: backend.database,
      mode: backend.mode,
      records: preparedValue.length
    };
  }

  function showPersistenceError(error) {
    const message = `Falha ao gravar no banco central: ${error.message}`;
    const target = root.document && (
      root.document.getElementById("launchMessage") ||
      root.document.getElementById("approvalMessage")
    );
    if (target) {
      target.className = "notice warning";
      target.textContent = message;
      target.hidden = false;
    }
    console.error(message, error);
  }

  function install() {
    if (!root.DataStore || root.DataStore.__centralPersistenceInstalled) return false;

    const originalSalvarLancamentos = root.DataStore.salvarLancamentos.bind(root.DataStore);
    const originalSaveLocal = root.DataStore.saveLocal.bind(root.DataStore);

    root.DataStore.salvarLancamentos = async function (lancamentos) {
      if (!hasPhpBackendContext()) {
        return originalSalvarLancamentos(lancamentos);
      }

      try {
        const confirmation = await persistCollection("lancamentos", lancamentos);
        await originalSalvarLancamentos(lancamentos);
        root.DataStore.__lastCentralPersistence = confirmation;
        return true;
      } catch (error) {
        showPersistenceError(error);
        throw error;
      }
    };

    root.DataStore.saveLocal = async function (key, value) {
      if (!hasPhpBackendContext() || key !== "homologacoes") {
        return originalSaveLocal(key, value);
      }

      try {
        const confirmation = await persistCollection(key, value);
        await originalSaveLocal(key, value);
        root.DataStore.__lastCentralPersistence = confirmation;
        return true;
      } catch (error) {
        showPersistenceError(error);
        throw error;
      }
    };

    root.DataStore.__centralPersistenceInstalled = true;
    return true;
  }

  root.CentralPersistence = {
    getBackendInfo,
    prepareLaunchForCentral,
    persistCollection,
    install
  };

  install();
})(typeof window !== "undefined" ? window : globalThis);
