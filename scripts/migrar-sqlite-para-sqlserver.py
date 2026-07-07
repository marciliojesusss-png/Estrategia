import argparse
import json
import os
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

try:
    import pyodbc
except ImportError as exc:
    raise SystemExit(
        "Dependencia ausente: instale o pacote 'pyodbc' para conectar ao SQL Server."
    ) from exc


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SQLITE = ROOT / "database" / "indicadores.sqlite"
DEFAULT_SCHEMA = ROOT / "database" / "sqlserver" / "schema.sql"
DEFAULT_REPORT = ROOT / "database" / "sqlserver" / "migration-report.json"

TABLES = [
    "indicadores",
    "lancamentos",
    "homologacoes",
    "solicitacoes_reabertura",
    "retificacoes",
    "evidencias",
    "auditoria",
    "configuracoes",
    "usuarios_validacao",
    "backups_importacao",
]

AUTH_TABLES = [
    "usuarios_acesso",
    "acessos_log",
]

AUTH_SEED_USERS = [
    {
        "matricula": "C000001",
        "nome": "Administrador Local",
        "email": "administrador.local@caixa.gov.br",
        "sg_unidade": "MATRIZ",
        "no_unidade": "Administracao Local",
        "perfil": "administrador",
        "unidade_apuradora": None,
        "diretoria_responsavel": None,
    },
    {
        "matricula": "C000002",
        "nome": "Unidade Apuradora Local",
        "email": "unidade.apuradora.local@caixa.gov.br",
        "sg_unidade": "SUCOL",
        "no_unidade": "Unidade Apuradora Local",
        "perfil": "unidade_apuradora",
        "unidade_apuradora": "SUCOL",
        "diretoria_responsavel": None,
    },
    {
        "matricula": "C000003",
        "nome": "Homologador Local",
        "email": "homologador.local@caixa.gov.br",
        "sg_unidade": "DIFIR",
        "no_unidade": "Diretoria Homologadora Local",
        "perfil": "homologador",
        "unidade_apuradora": None,
        "diretoria_responsavel": "DIFIR",
    },
    {
        "matricula": "C000004",
        "nome": "Usuario Companhia Local",
        "email": "usuario.companhia.local@caixa.gov.br",
        "sg_unidade": "GERAL",
        "no_unidade": "Companhia Local",
        "perfil": "usuario_companhia",
        "unidade_apuradora": None,
        "diretoria_responsavel": None,
    },
]

BOOLEAN_COLUMNS = {
    "indicadores": {"ativo"},
    "usuarios_validacao": {"ativo"},
}

JSON_COLUMNS = {
    "lancamentos": {"dados_entrada_json"},
    "retificacoes": {"versao_anterior_json", "versao_nova_json"},
    "auditoria": {"dados_anteriores_json", "dados_novos_json"},
    "configuracoes": {"valor_json"},
    "usuarios_validacao": {"permissoes_json"},
}

INVALID_JSON_ESCAPE = re.compile(r'\\(?!["\\/u])')

DEFAULT_SQLSERVER_SCHEMA = r"""
IF OBJECT_ID(N'dbo.indicadores', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.indicadores (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_indicadores PRIMARY KEY,
        numero INT NULL,
        nome NVARCHAR(255) NOT NULL,
        plano NVARCHAR(255) NULL,
        pilar NVARCHAR(255) NULL,
        unidade_apuradora NVARCHAR(255) NULL,
        diretoria_responsavel NVARCHAR(255) NULL,
        periodicidade NVARCHAR(100) NULL,
        unidade_medida NVARCHAR(100) NULL,
        tipo_calculo NVARCHAR(100) NULL,
        tipo_consolidacao NVARCHAR(100) NULL,
        meta_anual NVARCHAR(MAX) NULL,
        formula_referencia NVARCHAR(MAX) NULL,
        observacao_acompanhamento NVARCHAR(MAX) NULL,
        ativo BIT NOT NULL CONSTRAINT df_indicadores_ativo DEFAULT 1,
        created_at NVARCHAR(40) NULL,
        updated_at NVARCHAR(40) NULL
    );
END;

IF OBJECT_ID(N'dbo.lancamentos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.lancamentos (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_lancamentos PRIMARY KEY,
        indicador_id NVARCHAR(100) NOT NULL,
        competencia NVARCHAR(40) NOT NULL,
        ano INT NULL,
        mes INT NULL,
        trimestre NVARCHAR(40) NULL,
        plano NVARCHAR(255) NULL,
        pilar NVARCHAR(255) NULL,
        unidade_apuradora NVARCHAR(255) NULL,
        diretoria_responsavel NVARCHAR(255) NULL,
        dados_entrada_json NVARCHAR(MAX) NULL,
        resultado_calculado NVARCHAR(MAX) NULL,
        resultado_oficial NVARCHAR(MAX) NULL,
        meta_referencia NVARCHAR(MAX) NULL,
        percentual_atingido NVARCHAR(100) NULL,
        situacao NVARCHAR(100) NULL,
        status NVARCHAR(100) NULL,
        observacao_unidade NVARCHAR(MAX) NULL,
        evidencia_id NVARCHAR(100) NULL,
        usuario_responsavel NVARCHAR(255) NULL,
        created_at NVARCHAR(40) NULL,
        updated_at NVARCHAR(40) NULL,
        CONSTRAINT fk_lancamentos_indicadores
            FOREIGN KEY (indicador_id) REFERENCES dbo.indicadores(id)
    );
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'idx_lancamentos_indicador_competencia'
      AND object_id = OBJECT_ID(N'dbo.lancamentos')
)
BEGIN
    CREATE UNIQUE INDEX idx_lancamentos_indicador_competencia
    ON dbo.lancamentos(indicador_id, competencia);
END;

IF OBJECT_ID(N'dbo.homologacoes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.homologacoes (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_homologacoes PRIMARY KEY,
        lancamento_id NVARCHAR(100) NOT NULL,
        acao NVARCHAR(100) NOT NULL,
        status_anterior NVARCHAR(100) NULL,
        status_novo NVARCHAR(100) NULL,
        justificativa NVARCHAR(MAX) NULL,
        usuario NVARCHAR(255) NULL,
        perfil_usuario NVARCHAR(100) NULL,
        data_acao NVARCHAR(40) NULL,
        created_at NVARCHAR(40) NULL,
        CONSTRAINT fk_homologacoes_lancamentos
            FOREIGN KEY (lancamento_id) REFERENCES dbo.lancamentos(id)
    );
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'idx_homologacoes_idempotencia'
      AND object_id = OBJECT_ID(N'dbo.homologacoes')
)
BEGIN
    CREATE UNIQUE INDEX idx_homologacoes_idempotencia
    ON dbo.homologacoes(lancamento_id, acao, data_acao);
END;

IF OBJECT_ID(N'dbo.solicitacoes_reabertura', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.solicitacoes_reabertura (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_solicitacoes_reabertura PRIMARY KEY,
        lancamento_id NVARCHAR(100) NOT NULL,
        indicador_id NVARCHAR(100) NULL,
        competencia NVARCHAR(40) NULL,
        solicitante_usuario NVARCHAR(255) NULL,
        solicitante_perfil NVARCHAR(100) NULL,
        solicitante_unidade NVARCHAR(255) NULL,
        tipo_ajuste NVARCHAR(100) NULL,
        justificativa NVARCHAR(MAX) NOT NULL,
        observacao_complementar NVARCHAR(MAX) NULL,
        status_solicitacao NVARCHAR(100) NOT NULL,
        administrador_responsavel NVARCHAR(255) NULL,
        decisao_administrador NVARCHAR(100) NULL,
        justificativa_decisao NVARCHAR(MAX) NULL,
        data_solicitacao NVARCHAR(40) NULL,
        data_decisao NVARCHAR(40) NULL,
        created_at NVARCHAR(40) NULL,
        updated_at NVARCHAR(40) NULL,
        CONSTRAINT fk_solicitacoes_reabertura_lancamentos
            FOREIGN KEY (lancamento_id) REFERENCES dbo.lancamentos(id)
    );
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'idx_solicitacoes_reabertura_pendente'
      AND object_id = OBJECT_ID(N'dbo.solicitacoes_reabertura')
)
BEGIN
    CREATE UNIQUE INDEX idx_solicitacoes_reabertura_pendente
    ON dbo.solicitacoes_reabertura(lancamento_id)
    WHERE status_solicitacao = N'Pendente';
END;

IF OBJECT_ID(N'dbo.retificacoes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.retificacoes (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_retificacoes PRIMARY KEY,
        lancamento_id NVARCHAR(100) NOT NULL,
        versao_anterior_json NVARCHAR(MAX) NULL,
        versao_nova_json NVARCHAR(MAX) NULL,
        justificativa NVARCHAR(MAX) NULL,
        usuario NVARCHAR(255) NULL,
        data_retificacao NVARCHAR(40) NULL,
        created_at NVARCHAR(40) NULL,
        CONSTRAINT fk_retificacoes_lancamentos
            FOREIGN KEY (lancamento_id) REFERENCES dbo.lancamentos(id)
    );
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'idx_retificacoes_idempotencia'
      AND object_id = OBJECT_ID(N'dbo.retificacoes')
)
BEGIN
    CREATE UNIQUE INDEX idx_retificacoes_idempotencia
    ON dbo.retificacoes(lancamento_id, data_retificacao);
END;

IF OBJECT_ID(N'dbo.evidencias', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.evidencias (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_evidencias PRIMARY KEY,
        lancamento_id NVARCHAR(100) NULL,
        nome_arquivo NVARCHAR(255) NULL,
        tipo_arquivo NVARCHAR(100) NULL,
        caminho_arquivo NVARCHAR(MAX) NULL,
        descricao NVARCHAR(MAX) NULL,
        data_upload NVARCHAR(40) NULL,
        usuario NVARCHAR(255) NULL,
        created_at NVARCHAR(40) NULL,
        CONSTRAINT fk_evidencias_lancamentos
            FOREIGN KEY (lancamento_id) REFERENCES dbo.lancamentos(id)
    );
END;

IF OBJECT_ID(N'dbo.auditoria', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.auditoria (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_auditoria PRIMARY KEY,
        entidade NVARCHAR(100) NULL,
        entidade_id NVARCHAR(100) NULL,
        acao NVARCHAR(100) NULL,
        descricao NVARCHAR(MAX) NULL,
        dados_anteriores_json NVARCHAR(MAX) NULL,
        dados_novos_json NVARCHAR(MAX) NULL,
        usuario NVARCHAR(255) NULL,
        perfil_usuario NVARCHAR(100) NULL,
        data_acao NVARCHAR(40) NULL,
        created_at NVARCHAR(40) NULL
    );
END;

IF OBJECT_ID(N'dbo.configuracoes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.configuracoes (
        chave NVARCHAR(255) NOT NULL CONSTRAINT pk_configuracoes PRIMARY KEY,
        valor_json NVARCHAR(MAX) NULL,
        updated_at NVARCHAR(40) NULL
    );
END;

IF OBJECT_ID(N'dbo.usuarios_validacao', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.usuarios_validacao (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_usuarios_validacao PRIMARY KEY,
        nome NVARCHAR(255) NULL,
        perfil NVARCHAR(100) NULL,
        unidade NVARCHAR(255) NULL,
        diretoria NVARCHAR(255) NULL,
        permissoes_json NVARCHAR(MAX) NULL,
        ativo BIT NOT NULL CONSTRAINT df_usuarios_validacao_ativo DEFAULT 1,
        created_at NVARCHAR(40) NULL,
        updated_at NVARCHAR(40) NULL
    );
END;

IF OBJECT_ID(N'dbo.backups_importacao', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.backups_importacao (
        id NVARCHAR(100) NOT NULL CONSTRAINT pk_backups_importacao PRIMARY KEY,
        tipo NVARCHAR(100) NULL,
        origem NVARCHAR(255) NULL,
        caminho_arquivo NVARCHAR(MAX) NULL,
        resumo NVARCHAR(MAX) NULL,
        data_backup NVARCHAR(40) NULL,
        created_at NVARCHAR(40) NULL
    );
END;

IF OBJECT_ID(N'dbo.usuarios_acesso', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.usuarios_acesso (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_usuarios_acesso PRIMARY KEY,
        matricula NVARCHAR(50) NOT NULL,
        nome NVARCHAR(255) NULL,
        email NVARCHAR(255) NULL,
        sg_unidade NVARCHAR(50) NULL,
        no_unidade NVARCHAR(255) NULL,
        perfil NVARCHAR(50) NOT NULL,
        unidade_apuradora NVARCHAR(255) NULL,
        diretoria_responsavel NVARCHAR(255) NULL,
        ativo BIT NOT NULL CONSTRAINT df_usuarios_acesso_ativo DEFAULT 1,
        created_at DATETIME2 NULL,
        updated_at DATETIME2 NULL,
        CONSTRAINT uq_usuarios_acesso_matricula UNIQUE (matricula)
    );
END;

IF OBJECT_ID(N'dbo.acessos_log', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.acessos_log (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_acessos_log PRIMARY KEY,
        matricula NVARCHAR(50) NULL,
        nome NVARCHAR(255) NULL,
        perfil NVARCHAR(50) NULL,
        sg_unidade NVARCHAR(50) NULL,
        ip NVARCHAR(100) NULL,
        user_agent NVARCHAR(MAX) NULL,
        data_acesso DATETIME2 NOT NULL CONSTRAINT df_acessos_log_data_acesso DEFAULT SYSUTCDATETIME()
    );
END;
"""


def parse_args():
    parser = argparse.ArgumentParser(
        description="Migra dados do SQLite local para SQL Server."
    )
    parser.add_argument("--sqlite", type=Path, default=DEFAULT_SQLITE)
    parser.add_argument("--schema", type=Path, default=DEFAULT_SCHEMA)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument(
        "--skip-schema",
        action="store_true",
        help="Nao executa schema antes da carga.",
    )
    parser.add_argument(
        "--schema-only",
        action="store_true",
        help="Cria apenas a estrutura no SQL Server, sem copiar dados do SQLite.",
    )
    parser.add_argument(
        "--truncate",
        action="store_true",
        help="Limpa as tabelas SQL Server antes de inserir os dados.",
    )
    parser.add_argument(
        "--seed-auth-users",
        action="store_true",
        help="Inclui usuarios locais de teste em dbo.usuarios_acesso. Use apenas em homologacao/local.",
    )
    return parser.parse_args()


def sqlserver_database_name():
    return os.getenv("SQLSERVER_DATABASE", "Estrategia")


def bracket(name):
    return "[" + name.replace("]", "]]") + "]"


def sqlserver_connection_string(database=None):
    host = os.getenv("SQLSERVER_HOST", "localhost")
    target_database = database or sqlserver_database_name()
    driver = os.getenv("SQLSERVER_DRIVER", "ODBC Driver 18 for SQL Server")
    encrypt = os.getenv("SQLSERVER_ENCRYPT", "yes")
    trust_cert = os.getenv("SQLSERVER_TRUST_SERVER_CERTIFICATE", "yes")

    parts = [
        f"DRIVER={{{driver}}}",
        f"SERVER={host}",
        f"DATABASE={target_database}",
        "Trusted_Connection=yes",
        f"Encrypt={encrypt}",
        f"TrustServerCertificate={trust_cert}",
    ]
    return ";".join(parts) + ";"


def connect_sqlite(path):
    if not path.exists():
        raise SystemExit(f"SQLite nao encontrado: {path}")
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def is_missing_database_error(error):
    message = str(error)
    return (
        "4060" in message
        or "Cannot open database" in message
        or "Nao e possivel abrir o banco de dados" in message
        or "Não é possível abrir o banco de dados" in message
    )


def ensure_sqlserver_database():
    database = sqlserver_database_name()
    connection = None
    try:
        connection = pyodbc.connect(
            sqlserver_connection_string("master"),
            autocommit=True,
        )
        cursor = connection.cursor()
        exists = cursor.execute("SELECT DB_ID(?)", database).fetchone()[0]
        if exists is None:
            cursor.execute(f"CREATE DATABASE {bracket(database)}")
            print(f"Banco SQL Server criado: {database}")
    except pyodbc.Error as exc:
        raise SystemExit(
            "Nao foi possivel abrir ou criar o banco SQL Server "
            f"'{database}'. Crie esse banco manualmente no SQL Server, "
            "ou libere permissao para o usuario Windows atual."
        ) from exc
    finally:
        if connection is not None:
            connection.close()


def connect_sqlserver():
    try:
        return pyodbc.connect(sqlserver_connection_string())
    except pyodbc.Error as exc:
        if not is_missing_database_error(exc):
            raise
        ensure_sqlserver_database()
        return pyodbc.connect(sqlserver_connection_string())


def split_sql_batches(sql):
    return [
        batch.strip()
        for batch in re.split(r"(?im)^\s*GO\s*;?\s*$", sql)
        if batch.strip()
    ]


def execute_schema(connection, schema_path):
    if schema_path.exists():
        sql = schema_path.read_text(encoding="utf-8")
        source = str(schema_path)
    else:
        sql = DEFAULT_SQLSERVER_SCHEMA
        source = "schema padrao embutido"

    cursor = connection.cursor()
    for batch in split_sql_batches(sql):
        cursor.execute(batch)
    connection.commit()
    return source


def sqlite_table_exists(connection, table):
    row = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table,),
    ).fetchone()
    return row is not None


def sqlite_columns(connection, table):
    return [row["name"] for row in connection.execute(f'PRAGMA table_info("{table}")')]


def sqlserver_columns(connection, table):
    cursor = connection.cursor()
    rows = cursor.execute(
        """
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
        """,
        table,
    ).fetchall()
    return [row[0] for row in rows]


def sqlserver_table_exists(connection, table):
    cursor = connection.cursor()
    return bool(
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = ?
            """,
            table,
        ).fetchone()[0]
    )


def normalize_value(table, column, value):
    if value is None:
        return None
    if column in BOOLEAN_COLUMNS.get(table, set()):
        if isinstance(value, str):
            return 1 if value.strip().lower() in {"1", "true", "sim", "yes"} else 0
        return 1 if value else 0
    if column in JSON_COLUMNS.get(table, set()):
        return normalize_json_value(value)
    return value


def normalize_json_value(value):
    if not isinstance(value, str) or value == "":
        return value
    try:
        json.loads(value)
        return value
    except json.JSONDecodeError:
        repaired = INVALID_JSON_ESCAPE.sub(r"\\\\", value)
    try:
        json.loads(repaired)
        return repaired
    except json.JSONDecodeError:
        return value


def delete_target_rows(connection):
    cursor = connection.cursor()
    for table in reversed(TABLES):
        cursor.execute(f"DELETE FROM dbo.{bracket(table)}")
    connection.commit()


def seed_auth_users(connection):
    cursor = connection.cursor()
    inserted = 0
    for user in AUTH_SEED_USERS:
        exists = cursor.execute(
            "SELECT COUNT(*) FROM dbo.usuarios_acesso WHERE matricula = ?",
            user["matricula"],
        ).fetchone()[0]
        if exists:
            continue

        cursor.execute(
            """
            INSERT INTO dbo.usuarios_acesso (
                matricula,
                nome,
                email,
                sg_unidade,
                no_unidade,
                perfil,
                unidade_apuradora,
                diretoria_responsavel,
                ativo,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, SYSUTCDATETIME(), SYSUTCDATETIME())
            """,
            user["matricula"],
            user["nome"],
            user["email"],
            user["sg_unidade"],
            user["no_unidade"],
            user["perfil"],
            user["unidade_apuradora"],
            user["diretoria_responsavel"],
        )
        inserted += 1

    connection.commit()
    return {"name": "seedAuthUsers", "status": "ok", "inserted": inserted}


def migrate_table(sqlite_conn, sqlserver_conn, table):
    if not sqlite_table_exists(sqlite_conn, table):
        return {"table": table, "status": "ignored", "rows": 0, "reason": "missing in SQLite"}

    source_columns = sqlite_columns(sqlite_conn, table)
    target_columns = sqlserver_columns(sqlserver_conn, table)
    columns = [column for column in source_columns if column in target_columns]

    if not columns:
        return {"table": table, "status": "ignored", "rows": 0, "reason": "no shared columns"}

    select_sql = "SELECT " + ", ".join(f'"{column}"' for column in columns) + f' FROM "{table}"'
    rows = sqlite_conn.execute(select_sql).fetchall()
    if not rows:
        return {"table": table, "status": "ok", "rows": 0}

    insert_sql = (
        f"INSERT INTO dbo.{bracket(table)} "
        + "("
        + ", ".join(bracket(column) for column in columns)
        + ") VALUES ("
        + ", ".join("?" for _ in columns)
        + ")"
    )
    values = [
        tuple(normalize_value(table, column, row[column]) for column in columns)
        for row in rows
    ]

    cursor = sqlserver_conn.cursor()
    cursor.fast_executemany = True
    cursor.executemany(insert_sql, values)
    sqlserver_conn.commit()
    return {"table": table, "status": "ok", "rows": len(rows)}


def table_count(connection, table, sqlserver=False):
    if sqlserver:
        return connection.cursor().execute(
            f"SELECT COUNT(*) FROM dbo.{bracket(table)}"
        ).fetchone()[0]
    return connection.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]


def auth_table_report(connection):
    report = {}
    for table in AUTH_TABLES:
        exists = sqlserver_table_exists(connection, table)
        report[table] = {
            "exists": exists,
            "sqlserver": table_count(connection, table, sqlserver=True) if exists else None,
        }
    return report


def write_report(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    args = parse_args()
    sqlite_conn = connect_sqlite(args.sqlite)
    sqlserver_conn = connect_sqlserver()

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sqlite": str(args.sqlite),
        "tables": {},
        "authTables": {},
        "steps": [],
    }

    try:
        if not args.skip_schema:
            source = execute_schema(sqlserver_conn, args.schema)
            report["steps"].append({"name": "schema", "status": "ok", "source": source})

        if args.seed_auth_users:
            report["steps"].append(seed_auth_users(sqlserver_conn))

        if args.schema_only:
            report["authTables"] = auth_table_report(sqlserver_conn)
            report["status"] = "ok"
            write_report(args.report, report)
            print(f"Estrutura SQL Server preparada. Relatorio: {args.report}")
            return

        if args.truncate:
            delete_target_rows(sqlserver_conn)
            report["steps"].append({"name": "truncate", "status": "ok"})

        for table in TABLES:
            result = migrate_table(sqlite_conn, sqlserver_conn, table)
            report["steps"].append(result)
            if result["status"] == "ok":
                report["tables"][table] = {
                    "sqlite": table_count(sqlite_conn, table),
                    "sqlserver": table_count(sqlserver_conn, table, sqlserver=True),
                }

        report["authTables"] = auth_table_report(sqlserver_conn)
        report["status"] = "ok"
        write_report(args.report, report)
        print(f"Migracao concluida. Relatorio: {args.report}")
    except Exception as exc:
        sqlserver_conn.rollback()
        report["status"] = "erro"
        report["error"] = str(exc)
        write_report(args.report, report)
        raise
    finally:
        sqlite_conn.close()
        sqlserver_conn.close()


if __name__ == "__main__":
    main()
