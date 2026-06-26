const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT_DIR = __dirname;
const PORT = Number(process.env.PORT || 5500);
const writeQueues = new Map();

const DATA_FILES = {
  usuarios: "data/usuarios.json",
  planos: "data/planos.json",
  pilares: "data/pilares.json",
  unidades: "data/unidades.json",
  diretorias: "data/diretorias.json",
  indicadores: "data/indicadores.json",
  metas: "data/metas-mensais.json",
  regrasIndicadores: "data/regras-indicadores.json",
  lancamentos: "data/lancamentos.json",
  homologacoes: "data/homologacoes.json",
  historico: "data/historico.json"
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function sendJson(res, status, value) {
  send(res, status, JSON.stringify(value, null, 2));
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 25_000_000) {
        reject(new Error("Payload muito grande."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function resolveDataFile(key) {
  const relative = DATA_FILES[key];
  if (!relative) return null;
  return path.join(ROOT_DIR, relative);
}

function enqueueFileWrite(key, operation) {
  const previousWrite = writeQueues.get(key) || Promise.resolve();
  const nextWrite = previousWrite.catch(() => undefined).then(operation);
  writeQueues.set(key, nextWrite);
  const cleanup = () => {
    if (writeQueues.get(key) === nextWrite) {
      writeQueues.delete(key);
    }
  };
  nextWrite.then(cleanup, cleanup);
  return nextWrite;
}

async function writeJsonAtomically(key, filePath, value) {
  return enqueueFileWrite(key, async () => {
    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await fs.rename(temporaryPath, filePath);
  });
}

async function handleDataApi(req, res, key) {
  const filePath = resolveDataFile(key);
  if (!filePath) {
    sendJson(res, 404, { erro: "Colecao JSON nao encontrada." });
    return;
  }

  if (req.method === "GET") {
    try {
      const content = await fs.readFile(filePath, "utf8");
      send(res, 200, content);
    } catch (error) {
      sendJson(res, 500, { erro: `Nao foi possivel ler ${key}.`, detalhe: error.message });
    }
    return;
  }

  if (req.method === "PUT" || req.method === "POST") {
    try {
      const body = await getBody(req);
      const parsed = JSON.parse(body);
      await writeJsonAtomically(key, filePath, parsed);
      sendJson(res, 200, { ok: true, key, arquivo: DATA_FILES[key] });
    } catch (error) {
      sendJson(res, 400, { erro: `Nao foi possivel salvar ${key}.`, detalhe: error.message });
    }
    return;
  }

  sendJson(res, 405, { erro: "Metodo nao permitido." });
}

async function handleStatic(req, res, pathname) {
  let safePath;
  try {
    safePath = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^[/\\]+/, "");
  } catch {
    sendJson(res, 400, { erro: "Caminho invalido." });
    return;
  }

  const filePath = path.resolve(ROOT_DIR, safePath);
  const relativePath = path.relative(ROOT_DIR, filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    sendJson(res, 403, { erro: "Acesso negado." });
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": type.includes("text/html") ? "no-store" : "public, max-age=60"
    });
    res.end(content);
  } catch {
    sendJson(res, 404, { erro: "Arquivo nao encontrado." });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);

  if (url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true, banco: "json", dataDir: "data" });
    return;
  }

  const dataMatch = url.pathname.match(/^\/api\/data\/([A-Za-z0-9_-]+)$/);
  if (dataMatch) {
    await handleDataApi(req, res, dataMatch[1]);
    return;
  }

  await handleStatic(req, res, url.pathname);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Banco JSON e sistema disponíveis em http://127.0.0.1:${PORT}/`);
});
