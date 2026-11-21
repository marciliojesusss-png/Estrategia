import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(scriptDirectory);
const resolverPath = path.join(scriptDirectory, "start-mssql-mcp-write.ps1");
let resolved = spawnSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    resolverPath,
    "-EmitConnectionJson",
  ],
  {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env, MSSQL_MCP_RESOLVE_CONNECTION: "1" },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  },
);

if (resolved.error) {
  throw resolved.error;
}
if (resolved.status !== 0) {
  throw new Error(
    `Falha ao carregar a configuracao protegida do MCP: ${resolved.stderr.trim()}`,
  );
}

const connection = JSON.parse(resolved.stdout.trim());
resolved.stdout = "";
resolved.stderr = "";
resolved = null;
if (connection.DATABASE_NAME !== "Estrategia") {
  throw new Error("O MCP de escrita foi bloqueado porque o banco nao e Estrategia.");
}

Object.assign(process.env, {
  SERVER_NAME: connection.SERVER_NAME,
  DATABASE_NAME: connection.DATABASE_NAME,
  SQL_AUTH_MODE: "sql",
  SQL_USERNAME: connection.SQL_USERNAME,
  SQL_PASSWORD: connection.SQL_PASSWORD,
  SQL_PORT: connection.SQL_PORT,
  TRUST_SERVER_CERTIFICATE: connection.TRUST_SERVER_CERTIFICATE,
  READONLY: "false",
  REQUIRE_MUTATION_CONFIRMATION: "true",
  MAX_ROWS_DEFAULT: "1000",
  AUDIT_LOGGING: "true",
  AUDIT_REDACT_SENSITIVE: "true",
  AUDIT_LOG_PATH: path.join(
    projectRoot,
    "storage",
    "logs",
    "mssql-mcp-write-audit.jsonl",
  ),
});

connection.SQL_PASSWORD = undefined;

const serverEntryPoint = path.join(
  process.env.APPDATA,
  "npm",
  "node_modules",
  "@connorbritain",
  "mssql-mcp-server",
  "dist",
  "index.js",
);
await import(pathToFileURL(serverEntryPoint));
