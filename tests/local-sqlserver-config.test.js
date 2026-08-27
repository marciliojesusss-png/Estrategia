const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const serverScript = fs.readFileSync(path.join(root, "scripts/servidor.ps1"), "utf8");
const exampleConfig = fs.readFileSync(path.join(root, "app/config/servidor.local.php.example"), "utf8");
const gitignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");

assert.doesNotMatch(
  serverScript,
  /\$env:DB_CONNECTION\s*=\s*['"]sqlite['"]/,
  "O iniciador local nao deve forcar SQLite quando servidor.local.php selecionar SQL Server."
);
assert.match(exampleConfig, /'db_driver'\s*=>\s*'sqlsrv'/);
assert.match(exampleConfig, /'app_env'\s*=>\s*'development'/);
assert.match(gitignore, /\/app\/config\/servidor\.local\.php/);

console.log("Configuracao local: SQL Server pode ser selecionado sem versionar credenciais.");
