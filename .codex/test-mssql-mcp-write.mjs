import path from "node:path";
import { pathToFileURL } from "node:url";

const sdkRoot = path.join(
  process.env.APPDATA,
  "npm",
  "node_modules",
  "@connorbritain",
  "mssql-mcp-server",
  "node_modules",
  "@modelcontextprotocol",
  "sdk",
  "dist",
  "esm",
);
const { Client } = await import(
  pathToFileURL(path.join(sdkRoot, "client", "index.js"))
);
const { StdioClientTransport } = await import(
  pathToFileURL(path.join(sdkRoot, "client", "stdio.js"))
);

const transport = new StdioClientTransport({
  command: "node.exe",
  args: [".codex/start-mssql-mcp-write.mjs"],
  cwd: process.cwd(),
  stderr: "inherit",
});

const client = new Client({
  name: "estrategia-mcp-connection-test",
  version: "1.0.0",
});

function parseToolResult(result) {
  const textResult = result.content?.find(({ type }) => type === "text");
  return textResult ? JSON.parse(textResult.text) : result;
}

try {
  await client.connect(transport);

  const { tools } = await client.listTools();
  const toolNames = tools.map(({ name }) => name);
  const connectionResult = await client.callTool({
    name: "test_connection",
    arguments: {},
  });
  const tableResult = await client.callTool({
    name: "list_tables",
    arguments: { schemas: ["dbo"] },
  });
  const deadlineTableResult = await client.callTool({
    name: "describe_table",
    arguments: { tableName: "dbo.prazos_apuracao" },
  });
  const operationalFrequencyResult = await client.callTool({
    name: "read_data",
    arguments: {
      query: "SELECT chave FROM dbo.configuracoes WHERE chave = N'frequenciasCobrancaOperacional'",
      maxRows: 5,
    },
  });

  const connection = parseToolResult(connectionResult);
  const tables = parseToolResult(tableResult);
  const deadlineTable = parseToolResult(deadlineTableResult);
  const operationalFrequency = parseToolResult(operationalFrequencyResult);

  process.stdout.write(
    `${JSON.stringify({
      connected: true,
      toolCount: toolNames.length,
      server: connection.serverInfo?.server,
      database: connection.serverInfo?.database,
      readonly: connection.serverInfo?.readonly,
      mcpServerVersion: connection.mcpServerVersion,
      plannedState: {
        deadlineTableExists: tables.tables?.some(
          ({ TABLE_SCHEMA, TABLE_NAME }) =>
            TABLE_SCHEMA === "dbo" && TABLE_NAME === "prazos_apuracao",
        ),
        deadlineTableColumnCount: deadlineTable.columnCount,
        operationalFrequencyExists:
          operationalFrequency.recordCount === 1,
      },
    }, null, 2)}\n`,
  );
} finally {
  await client.close();
}
