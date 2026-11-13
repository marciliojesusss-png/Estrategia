import argparse
import decimal
import shutil
import json
import os
import re
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

try:
    import pyodbc
except ImportError:
    pyodbc = None


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SQLITE = ROOT / "database" / "indicadores.sqlite"
DEFAULT_SCHEMA = ROOT / "database" / "sqlserver" / "schema.sql"
DEFAULT_REPORT = ROOT / "database" / "sqlserver" / "migration-report.json"
DEFAULT_AUTH_REPORT = ROOT / "database" / "sqlserver" / "usuarios-acesso-sync-report.json"
DEFAULT_AUTH_SQL = ROOT / "database" / "sqlserver" / "sincronizar-usuarios-acesso.sql"
MIGRATION_VERSION = "2026.11-sqlserver-sqlite-roundtrip"
DEFAULT_SOURCE_DATABASE = "Estrategia"
DEFAULT_TARGET_DATABASE = "Monitoramento_Estrategia"

TABLES = [
    "indicadores",
    "prazos_apuracao",
    "lancamentos",
    "homologacoes",
    "solicitacoes_reabertura",
    "retificacoes",
    "evidencias",
    "lancamentos_observacoes_documentais",
    "lancamentos_resultados_homologados",
    "auditoria",
    "configuracoes",
    "usuarios_validacao",
    "backups_importacao",
    "usuarios_acesso",
    "acessos_log",
    "iniciativas_estrategicas",
    "iniciativas_acompanhamentos",
    "iniciativas_acompanhamento_itens",
    "iniciativas_homologacoes",
    "iniciativas_evidencias",
]

AUTH_TABLE_COLUMNS = {
    "usuarios_acesso": [
        "id",
        "matricula",
        "nome",
        "email",
        "sg_unidade",
        "no_unidade",
        "perfil",
        "unidade_apuradora",
        "diretoria_responsavel",
        "ativo",
        "created_at",
        "updated_at",
    ],
    "acessos_log": [
        "id",
        "matricula",
        "nome",
        "perfil",
        "sg_unidade",
        "ip",
        "user_agent",
        "data_acesso",
    ],
}

AUTH_USER_COLUMNS = [
    "matricula",
    "nome",
    "email",
    "sg_unidade",
    "no_unidade",
    "perfil",
    "unidade_apuradora",
    "diretoria_responsavel",
    "ativo",
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
    "prazos_apuracao": {"ativo"},
    "usuarios_validacao": {"ativo"},
    "usuarios_acesso": {"ativo"},
    "iniciativas_estrategicas": {"ativo", "exige_evidencia"},
    "iniciativas_acompanhamento_itens": {"destaque_ca"},
}

JSON_COLUMNS = {
    "lancamentos": {"dados_entrada_json"},
    "retificacoes": {"versao_anterior_json", "versao_nova_json"},
    "auditoria": {"dados_anteriores_json", "dados_novos_json"},
    "configuracoes": {"valor_json"},
    "usuarios_validacao": {"permissoes_json"},
    "lancamentos_resultados_homologados": {"detalhes_json"},
}

PRIMARY_KEYS = {
    "configuracoes": ("chave",),
    "lancamentos_resultados_homologados": ("lancamento_id", "versao_lancamento"),
}

FOREIGN_KEY_CHECKS = [
    ("lancamentos", "indicador_id", "indicadores", "id"),
    ("homologacoes", "lancamento_id", "lancamentos", "id"),
    ("solicitacoes_reabertura", "lancamento_id", "lancamentos", "id"),
    ("retificacoes", "lancamento_id", "lancamentos", "id"),
    ("evidencias", "lancamento_id", "lancamentos", "id"),
    ("lancamentos_observacoes_documentais", "lancamento_id", "lancamentos", "id"),
    ("lancamentos_resultados_homologados", "lancamento_id", "lancamentos", "id"),
    ("iniciativas_acompanhamentos", "iniciativa_id", "iniciativas_estrategicas", "id"),
    ("iniciativas_acompanhamento_itens", "acompanhamento_id", "iniciativas_acompanhamentos", "id"),
    ("iniciativas_homologacoes", "acompanhamento_id", "iniciativas_acompanhamentos", "id"),
    ("iniciativas_evidencias", "acompanhamento_id", "iniciativas_acompanhamentos", "id"),
]

INVALID_JSON_ESCAPE = re.compile(r'\\(?!["\\/u])')


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description=(
            "Exporta Estrategia do SQL Server para SQLite ou migra o SQLite "
            "para o banco novo Monitoramento_Estrategia."
        )
    )
    parser.add_argument("--ambiente", "-Ambiente", choices=["homologacao", "producao"], default="homologacao")
    parser.add_argument(
        "--servidor",
        "-Servidor",
        default=os.getenv("SQLSERVER_HOST", r"localhost\SQLEXPRESS01"),
    )
    parser.add_argument(
        "--banco",
        "-Banco",
        default=os.getenv("SQLSERVER_TARGET_DATABASE", DEFAULT_TARGET_DATABASE),
        help="Banco novo de destino. Padrao: Monitoramento_Estrategia.",
    )
    parser.add_argument(
        "--banco-origem",
        default=os.getenv("SQLSERVER_SOURCE_DATABASE", DEFAULT_SOURCE_DATABASE),
        help="Banco SQL Server exportado para SQLite. Padrao: Estrategia.",
    )
    parser.add_argument("--driver", "-Driver", default=os.getenv("SQLSERVER_DRIVER"))
    parser.add_argument("--encrypt", "-Encrypt", default=os.getenv("SQLSERVER_ENCRYPT"))
    parser.add_argument(
        "--trust-server-certificate",
        "-TrustServerCertificate",
        dest="trust_server_certificate",
        default=os.getenv("SQLSERVER_TRUST_SERVER_CERTIFICATE"),
    )
    parser.add_argument("--sqlite", "-Sqlite", type=Path, default=DEFAULT_SQLITE)
    parser.add_argument("--schema", "-Schema", type=Path, default=DEFAULT_SCHEMA)
    parser.add_argument("--report", "-Report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--auth-report", type=Path, default=DEFAULT_AUTH_REPORT)
    parser.add_argument("--auth-sql-output", type=Path, default=DEFAULT_AUTH_SQL)
    parser.add_argument("--database", default=None)
    parser.add_argument(
        "--exportar-sqlserver-para-sqlite",
        action="store_true",
        help="Exporta o banco --banco-origem para --sqlite e encerra.",
    )
    parser.add_argument(
        "--sobrescrever-sqlite",
        action="store_true",
        help="Substitui o SQLite existente depois de criar uma copia de seguranca.",
    )
    parser.add_argument(
        "--skip-schema",
        "-SkipSchema",
        action="store_true",
        help="Nao executa schema antes da carga.",
    )
    parser.add_argument(
        "--schema-only",
        "-SchemaOnly",
        action="store_true",
        help="Cria apenas a estrutura no SQL Server, sem copiar dados do SQLite.",
    )
    parser.add_argument(
        "--truncate",
        "-Truncate",
        action="store_true",
        help="Limpa as tabelas SQL Server antes de inserir os dados.",
    )
    parser.add_argument(
        "--seed-auth-users",
        "-SeedAuthUsers",
        action="store_true",
        help="Inclui usuarios locais de teste em dbo.usuarios_acesso. Use apenas em homologacao/local.",
    )
    parser.add_argument("--sync-auth-users", "-SyncAuthUsers", action="store_true")
    parser.add_argument("--gerar-sql-auth-users", "-GerarSqlAuthUsers", action="store_true")
    parser.add_argument("--skip-backup", "-SkipBackup", action="store_true")
    parser.add_argument("--skip-verify", "-SkipVerify", action="store_true")
    parser.add_argument("--verify-only", "-VerifyOnly", action="store_true")
    parser.add_argument("--yes", "-Yes", action="store_true")
    return parser.parse_args(argv)


def sqlserver_database_name():
    return os.getenv("SQLSERVER_DATABASE", DEFAULT_TARGET_DATABASE)


def env_default(value, fallback):
    return value if value not in (None, "") else fallback


def choose_odbc_driver(explicit=None):
    if pyodbc is None:
        return explicit or "ODBC Driver 18 for SQL Server"
    installed = list(pyodbc.drivers())
    if explicit:
        if explicit not in installed:
            raise SystemExit(
                f"Driver ODBC nao encontrado: {explicit}. "
                f"Instalados: {', '.join(installed) or 'nenhum'}"
            )
        return explicit
    for candidate in (
        "ODBC Driver 18 for SQL Server",
        "ODBC Driver 17 for SQL Server",
        "SQL Server Native Client 11.0",
        "SQL Server",
    ):
        if candidate in installed:
            return candidate
    raise SystemExit("Nenhum driver ODBC para SQL Server foi encontrado.")


def configure_environment(args, database):
    servidor = env_default(args.servidor, r"localhost\SQLEXPRESS01")
    banco = env_default(database, DEFAULT_TARGET_DATABASE)
    driver = choose_odbc_driver(args.driver)
    encrypt = env_default(args.encrypt, "no")
    trust_cert = args.trust_server_certificate
    if trust_cert is None:
        trust_cert = ""

    os.environ["SQLSERVER_HOST"] = servidor
    os.environ["SQLSERVER_DATABASE"] = banco
    os.environ["SQLSERVER_DRIVER"] = driver
    os.environ["SQLSERVER_ENCRYPT"] = encrypt
    os.environ["SQLSERVER_TRUST_SERVER_CERTIFICATE"] = trust_cert

    return {
        "servidor": servidor,
        "banco": banco,
        "driver": driver,
        "encrypt": encrypt,
        "trustServerCertificate": trust_cert,
    }


def write_step(message):
    print("")
    print(f"==> {message}")


def write_ok(message):
    print(f"OK  {message}")


def write_warn(message):
    print(f"AVISO  {message}")


def confirm_step(message, yes=False):
    if yes:
        return
    answer = input(f"{message} Digite SIM para continuar: ")
    if answer != "SIM":
        raise SystemExit("Operacao cancelada pelo usuario.")


def is_yes(value):
    return str(value or "").strip().lower() in {"yes", "true", "1", "sim"}


def print_header(args, config):
    print("Migracao SQLite -> SQL Server")
    print(f"Ambiente: {args.ambiente}")
    print(f"Servidor SQL Server: {config['servidor']}")
    print(f"Banco SQL Server: {config['banco']}")
    print(f"Driver ODBC: {config['driver']}")
    print(f"Encrypt: {config['encrypt']}")
    print(f"TrustServerCertificate: {config['trustServerCertificate'] or 'nao configurado'}")
    print(f"SQLite origem: {args.sqlite}")


def validate_options(args, config):
    if args.ambiente == "producao":
        if args.truncate:
            raise SystemExit("Por seguranca, este migrador nao permite -Truncate em producao.")
        if args.seed_auth_users:
            raise SystemExit("Por seguranca, este migrador nao permite -SeedAuthUsers em producao.")
        confirm_step("Voce esta prestes a executar migracao em PRODUCAO.", args.yes)

    if args.truncate:
        confirm_step(
            "A opcao -Truncate apaga dados das tabelas de destino antes da carga.",
            args.yes,
        )


def validate_files(args):
    write_step("Validando arquivos e dependencias")
    if not args.sqlite.exists():
        raise SystemExit(f"SQLite nao encontrado: {args.sqlite}")
    if not args.schema.exists():
        raise SystemExit(f"Schema SQL Server nao encontrado: {args.schema}")
    if pyodbc is None:
        raise SystemExit(
            "Dependencia ausente: instale o pacote 'pyodbc' para conectar ao SQL Server."
        )
    write_ok("Python encontrado")
    write_ok("Modulo Python pyodbc encontrado")


def create_backup(sqlite_path):
    write_step("Criando backup do SQLite")
    backup_dir = ROOT / "database" / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = backup_dir / f"indicadores-antes-sqlserver-{timestamp}.sqlite"
    shutil.copy2(sqlite_path, backup_path)
    write_ok(f"Backup criado: {backup_path}")
    return backup_path


def bracket(name):
    return "[" + name.replace("]", "]]") + "]"


def sqlserver_connection_string(database=None):
    host = os.getenv("SQLSERVER_HOST", "localhost")
    target_database = database or sqlserver_database_name()
    driver = os.getenv("SQLSERVER_DRIVER", "ODBC Driver 18 for SQL Server")
    encrypt = os.getenv("SQLSERVER_ENCRYPT", "no")
    trust_cert = os.getenv("SQLSERVER_TRUST_SERVER_CERTIFICATE", "")

    parts = [
        f"DRIVER={{{driver}}}",
        f"SERVER={host}",
        f"DATABASE={target_database}",
        "Trusted_Connection=yes",
    ]
    if encrypt:
        parts.append(f"Encrypt={encrypt}")
    if trust_cert:
        parts.append(f"TrustServerCertificate={trust_cert}")
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


def ensure_target_database_absent():
    database = sqlserver_database_name()
    connection = pyodbc.connect(
        sqlserver_connection_string("master"),
        autocommit=True,
    )
    try:
        exists = connection.cursor().execute("SELECT DB_ID(?)", database).fetchone()[0]
        if exists is not None:
            raise SystemExit(
                f"O banco de destino '{database}' ja existe. "
                "A migracao exige um banco novo e nunca sobrescreve um existente."
            )
    finally:
        connection.close()


def sqlite_identifier(name):
    return '"' + name.replace('"', '""') + '"'


def sqlite_affinity(sqlserver_type):
    normalized = str(sqlserver_type).lower()
    if normalized in {"bigint", "int", "smallint", "tinyint", "bit"}:
        return "INTEGER"
    if normalized in {"binary", "varbinary", "image", "timestamp", "rowversion"}:
        return "BLOB"
    if normalized in {"float", "real"}:
        return "REAL"
    # DECIMAL/NUMERIC ficam em texto para evitar perda de precisao no SQLite.
    return "TEXT"


def export_value(value):
    if value is None:
        return None
    if isinstance(value, decimal.Decimal):
        return format(value, "f")
    if isinstance(value, (datetime,)):
        return value.isoformat()
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, memoryview):
        return value.tobytes()
    if isinstance(value, bytearray):
        return bytes(value)
    if isinstance(value, bool):
        return int(value)
    return value


def sqlserver_export_columns(connection, table):
    rows = connection.cursor().execute(
        """
        SELECT column_info.name, type_info.name, column_info.max_length,
               column_info.precision, column_info.scale, column_info.is_nullable,
               column_info.is_identity, column_info.is_computed
        FROM sys.tables AS table_info
        INNER JOIN sys.schemas AS schema_info
            ON schema_info.schema_id = table_info.schema_id
        INNER JOIN sys.columns AS column_info
            ON column_info.object_id = table_info.object_id
        INNER JOIN sys.types AS type_info
            ON type_info.user_type_id = column_info.user_type_id
        WHERE schema_info.name = N'dbo'
          AND table_info.name = ?
        ORDER BY column_info.column_id
        """,
        table,
    ).fetchall()
    return [
        {
            "name": row[0],
            "type": row[1],
            "maxLength": row[2],
            "precision": row[3],
            "scale": row[4],
            "nullable": bool(row[5]),
            "identity": bool(row[6]),
            "computed": bool(row[7]),
        }
        for row in rows
        if not bool(row[7])
    ]


def sqlserver_export_expression(column):
    name = bracket(column["name"])
    sql_type = str(column["type"]).lower()
    if sql_type == "datetimeoffset":
        return f"CONVERT(NVARCHAR(50), {name}, 127) AS {name}"
    if sql_type in {"datetime", "datetime2", "smalldatetime", "date", "time"}:
        return f"CONVERT(NVARCHAR(50), {name}, 126) AS {name}"
    if sql_type == "uniqueidentifier":
        return f"CONVERT(NVARCHAR(36), {name}) AS {name}"
    return name


def export_sqlserver_to_sqlite(args, config):
    destination = args.sqlite.resolve()
    if destination.exists() and not args.sobrescrever_sqlite:
        raise SystemExit(
            f"SQLite ja existe: {destination}. Use --sobrescrever-sqlite para substitui-lo."
        )
    if destination.exists():
        create_backup(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(destination.name + f".tmp-{os.getpid()}")
    if temporary.exists():
        temporary.unlink()

    sqlserver_conn = None
    sqlite_conn = None
    manifest = {
        "formatVersion": 1,
        "migrationVersion": MIGRATION_VERSION,
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "sourceServer": config["servidor"],
        "sourceDatabase": config["banco"],
        "tables": {},
    }
    try:
        sqlserver_conn = pyodbc.connect(sqlserver_connection_string(), timeout=15)
        actual_database = sqlserver_conn.cursor().execute("SELECT DB_NAME()").fetchone()[0]
        if str(actual_database).casefold() != str(args.banco_origem).casefold():
            raise SystemExit(
                f"Conexao abriu o banco '{actual_database}', mas era esperado "
                f"'{args.banco_origem}'."
            )

        sqlite_conn = sqlite3.connect(temporary)
        sqlite_conn.execute("PRAGMA journal_mode = DELETE")
        sqlite_conn.execute("PRAGMA synchronous = FULL")
        sqlite_conn.execute(
            "CREATE TABLE _migration_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)"
        )

        for table in TABLES:
            if not sqlserver_table_exists(sqlserver_conn, table):
                raise SystemExit(f"Tabela obrigatoria ausente no SQL Server: dbo.{table}")
            columns = sqlserver_export_columns(sqlserver_conn, table)
            if not columns:
                raise SystemExit(f"Nenhuma coluna exportavel em dbo.{table}")
            definition = ", ".join(
                f"{sqlite_identifier(column['name'])} {sqlite_affinity(column['type'])}"
                for column in columns
            )
            sqlite_conn.execute(
                f"CREATE TABLE {sqlite_identifier(table)} ({definition})"
            )
            names = [column["name"] for column in columns]
            source_cursor = sqlserver_conn.cursor()
            source_cursor.execute(
                "SELECT "
                + ", ".join(sqlserver_export_expression(column) for column in columns)
                + f" FROM dbo.{bracket(table)}"
            )
            placeholders = ", ".join("?" for _ in names)
            insert_sql = (
                f"INSERT INTO {sqlite_identifier(table)} ("
                + ", ".join(sqlite_identifier(name) for name in names)
                + f") VALUES ({placeholders})"
            )
            exported = 0
            while True:
                rows = source_cursor.fetchmany(500)
                if not rows:
                    break
                values = [tuple(export_value(value) for value in row) for row in rows]
                sqlite_conn.executemany(insert_sql, values)
                exported += len(values)
            source_count = sqlserver_scalar(
                sqlserver_conn, f"SELECT COUNT(*) FROM dbo.{bracket(table)}"
            )
            if exported != source_count:
                raise RuntimeError(
                    f"Contagem divergente em {table}: exportado={exported}, "
                    f"sqlserver={source_count}"
                )
            manifest["tables"][table] = {
                "rows": exported,
                "columns": columns,
                "primaryKey": list(primary_keys(table)),
            }
            print(f"Exportado dbo.{table}: {exported} registro(s)")

        sqlite_conn.execute(
            "INSERT INTO _migration_metadata (key, value) VALUES (?, ?)",
            ("manifest", json.dumps(manifest, ensure_ascii=False, separators=(",", ":"))),
        )
        sqlite_conn.commit()
        integrity = sqlite_conn.execute("PRAGMA integrity_check").fetchone()[0]
        if integrity != "ok":
            raise RuntimeError(f"PRAGMA integrity_check falhou: {integrity}")
        sqlite_conn.close()
        sqlite_conn = None
        os.replace(temporary, destination)
        total = sum(item["rows"] for item in manifest["tables"].values())
        print("")
        write_ok(f"SQLite criado: {destination}")
        write_ok(f"Tabelas exportadas: {len(TABLES)}; registros: {total}")
        return manifest
    except Exception:
        if sqlite_conn is not None:
            sqlite_conn.close()
        if temporary.exists():
            temporary.unlink()
        raise
    finally:
        if sqlserver_conn is not None:
            sqlserver_conn.close()


def split_sql_batches(sql):
    return [
        batch.strip()
        for batch in re.split(r"(?im)^\s*GO\s*;?\s*$", sql)
        if batch.strip()
    ]


def execute_schema(connection, schema_path):
    if not schema_path.exists():
        raise SystemExit(f"Schema SQL Server nao encontrado: {schema_path}")

    sql = schema_path.read_text(encoding="utf-8")
    cursor = connection.cursor()
    for batch in split_sql_batches(sql):
        cursor.execute(batch)
    connection.commit()
    return str(schema_path)


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


def sqlserver_identity_columns(connection, table):
    rows = connection.cursor().execute(
        """
        SELECT column_info.name
        FROM sys.tables AS table_info
        INNER JOIN sys.schemas AS schema_info
            ON schema_info.schema_id = table_info.schema_id
        INNER JOIN sys.columns AS column_info
            ON column_info.object_id = table_info.object_id
        WHERE schema_info.name = N'dbo'
          AND table_info.name = ?
          AND column_info.is_identity = 1
        ORDER BY column_info.column_id
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


def validate_sqlite_source(connection):
    errors = []
    for table in TABLES:
        if not sqlite_table_exists(connection, table):
            errors.append(f"Tabela obrigatoria ausente no SQLite: {table}")
    for table, columns in JSON_COLUMNS.items():
        if not sqlite_table_exists(connection, table):
            continue
        available = set(sqlite_columns(connection, table))
        key = primary_key(table)
        for column in columns:
            if column not in available:
                errors.append(f"Coluna JSON ausente no SQLite: {table}.{column}")
                continue
            rows = connection.execute(
                f'SELECT "{key}", "{column}" FROM "{table}" '
                f'WHERE "{column}" IS NOT NULL AND "{column}" <> ?',
                ("",),
            ).fetchall()
            for row in rows:
                try:
                    json.loads(row[column])
                except (TypeError, json.JSONDecodeError):
                    errors.append(f"JSON invalido no SQLite: {table}.{column}, id={row[key]}")
    foreign_keys = connection.execute("PRAGMA foreign_key_check").fetchall()
    for row in foreign_keys:
        errors.append(f"Chave estrangeira invalida no SQLite: {tuple(row)}")
    return {"passed": not errors, "errors": errors}


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
    missing_target_columns = [
        column for column in source_columns if column not in target_columns
    ]
    if missing_target_columns:
        raise RuntimeError(
            f"Schema de destino incompleto em dbo.{table}; colunas ausentes: "
            + ", ".join(missing_target_columns)
        )
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
    identity_columns = [
        column for column in sqlserver_identity_columns(sqlserver_conn, table)
        if column in columns
    ]
    identity_insert = bool(identity_columns)
    try:
        if identity_insert:
            cursor.execute(f"SET IDENTITY_INSERT dbo.{bracket(table)} ON")
        # O fast_executemany pode inferir o tipo pelo primeiro valor e falhar
        # quando as linhas seguintes alternam entre NULL, texto e numericos.
        cursor.fast_executemany = False
        try:
            cursor.executemany(insert_sql, values)
        except pyodbc.Error as exc:
            raise RuntimeError(
                f"Falha ao importar dbo.{table} ({len(values)} registros): {exc}"
            ) from exc
    finally:
        if identity_insert:
            cursor.execute(f"SET IDENTITY_INSERT dbo.{bracket(table)} OFF")
    return {"table": table, "status": "ok", "rows": len(rows)}


def table_count(connection, table, sqlserver=False):
    if sqlserver:
        return connection.cursor().execute(
            f"SELECT COUNT(*) FROM dbo.{bracket(table)}"
        ).fetchone()[0]
    return connection.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]


def auth_table_report(connection):
    report = {}
    for table in AUTH_TABLE_COLUMNS:
        exists = sqlserver_table_exists(connection, table)
        report[table] = {
            "exists": exists,
            "sqlserver": table_count(connection, table, sqlserver=True) if exists else None,
        }
    return report


def primary_keys(table):
    return PRIMARY_KEYS.get(table, ("id",))


def primary_key(table):
    return primary_keys(table)[0]


def sqlite_scalar(connection, sql, params=()):
    return connection.execute(sql, params).fetchone()[0]


def sqlserver_scalar(connection, sql, params=()):
    return connection.cursor().execute(sql, params).fetchone()[0]


def compare_counts(sqlite_conn, sqlserver_conn):
    result = {}
    ok = True
    for table in TABLES:
        sqlite_exists = sqlite_table_exists(sqlite_conn, table)
        sqlserver_exists = sqlserver_table_exists(sqlserver_conn, table)
        sqlite_count = (
            sqlite_scalar(sqlite_conn, f'SELECT COUNT(*) FROM "{table}"')
            if sqlite_exists
            else None
        )
        sqlserver_count = (
            sqlserver_scalar(sqlserver_conn, f"SELECT COUNT(*) FROM dbo.{bracket(table)}")
            if sqlserver_exists
            else None
        )
        passed = sqlite_count == sqlserver_count
        ok = ok and passed
        result[table] = {
            "sqlite": sqlite_count,
            "sqlserver": sqlserver_count,
            "passed": passed,
        }
    return ok, result


def fetch_ids_sqlite(connection, table):
    keys = primary_keys(table)
    rows = connection.execute(
        "SELECT "
        + ", ".join(sqlite_identifier(key) for key in keys)
        + f" FROM {sqlite_identifier(table)} ORDER BY "
        + ", ".join(sqlite_identifier(key) for key in keys)
    ).fetchall()
    return [json.dumps(list(row), ensure_ascii=False, default=str) for row in rows]


def fetch_ids_sqlserver(connection, table):
    keys = primary_keys(table)
    rows = connection.cursor().execute(
        "SELECT "
        + ", ".join(bracket(key) for key in keys)
        + f" FROM dbo.{bracket(table)} ORDER BY "
        + ", ".join(bracket(key) for key in keys)
    ).fetchall()
    return [json.dumps(list(row), ensure_ascii=False, default=str) for row in rows]


def compare_ids(sqlite_conn, sqlserver_conn):
    result = {}
    ok = True
    for table in TABLES:
        if not sqlite_table_exists(sqlite_conn, table) or not sqlserver_table_exists(sqlserver_conn, table):
            result[table] = {"passed": False, "missing": [], "extra": ["table missing"]}
            ok = False
            continue
        sqlite_ids = fetch_ids_sqlite(sqlite_conn, table)
        sqlserver_ids = fetch_ids_sqlserver(sqlserver_conn, table)
        missing = sorted(set(sqlite_ids) - set(sqlserver_ids))
        extra = sorted(set(sqlserver_ids) - set(sqlite_ids))
        passed = not missing and not extra
        ok = ok and passed
        result[table] = {
            "passed": passed,
            "sqliteCount": len(sqlite_ids),
            "sqlserverCount": len(sqlserver_ids),
            "missing": missing[:20],
            "extra": extra[:20],
        }
    return ok, result


def grouped_counts_sqlite(connection, table, column):
    rows = connection.execute(
        f'SELECT "{column}" AS key_value, COUNT(*) AS total '
        f'FROM "{table}" GROUP BY "{column}"'
    ).fetchall()
    return {str(row["key_value"]): row["total"] for row in rows}


def grouped_counts_sqlserver(connection, table, column):
    rows = connection.cursor().execute(
        f"SELECT CAST({bracket(column)} AS NVARCHAR(4000)) AS key_value, COUNT(*) AS total "
        f"FROM dbo.{bracket(table)} GROUP BY {bracket(column)}"
    ).fetchall()
    return {str(row[0]): row[1] for row in rows}


def compare_grouped_counts(sqlite_conn, sqlserver_conn):
    checks = {
        "lancamentos_por_indicador": ("lancamentos", "indicador_id"),
        "homologacoes_por_lancamento": ("homologacoes", "lancamento_id"),
    }
    result = {}
    ok = True
    for name, (table, column) in checks.items():
        sqlite_counts = grouped_counts_sqlite(sqlite_conn, table, column)
        sqlserver_counts = grouped_counts_sqlserver(sqlserver_conn, table, column)
        mismatched = {
            key: {"sqlite": sqlite_counts.get(key), "sqlserver": sqlserver_counts.get(key)}
            for key in sorted(set(sqlite_counts) | set(sqlserver_counts))
            if sqlite_counts.get(key) != sqlserver_counts.get(key)
        }
        passed = not mismatched
        ok = ok and passed
        result[name] = {
            "passed": passed,
            "mismatched": dict(list(mismatched.items())[:20]),
        }
    return ok, result


def validate_foreign_keys_sqlserver(connection):
    result = {}
    ok = True
    for table, column, ref_table, ref_column in FOREIGN_KEY_CHECKS:
        count = sqlserver_scalar(
            connection,
            f"""
            SELECT COUNT(*)
            FROM dbo.{bracket(table)} child
            LEFT JOIN dbo.{bracket(ref_table)} parent
              ON child.{bracket(column)} = parent.{bracket(ref_column)}
            WHERE child.{bracket(column)} IS NOT NULL
              AND parent.{bracket(ref_column)} IS NULL
            """,
        )
        passed = count == 0
        ok = ok and passed
        result[f"{table}.{column}"] = {"passed": passed, "orphans": count}
    return ok, result


def validate_auth_tables_sqlserver(connection):
    result = {}
    ok = True
    for table, expected_columns in AUTH_TABLE_COLUMNS.items():
        exists = sqlserver_table_exists(connection, table)
        columns = sqlserver_columns(connection, table) if exists else []
        missing_columns = [
            column for column in expected_columns if column not in columns
        ]
        row_count = (
            sqlserver_scalar(connection, f"SELECT COUNT(*) FROM dbo.{bracket(table)}")
            if exists
            else None
        )
        passed = exists and not missing_columns
        ok = ok and passed
        result[table] = {
            "passed": passed,
            "exists": exists,
            "rows": row_count,
            "missingColumns": missing_columns,
        }
    return ok, result


def validate_json_sqlserver(connection):
    result = {}
    ok = True
    for table, columns in JSON_COLUMNS.items():
        table_errors = []
        key = primary_key(table)
        for column in columns:
            rows = connection.cursor().execute(
                f"""
                SELECT TOP (20) CAST({bracket(key)} AS NVARCHAR(4000)) AS id_value
                FROM dbo.{bracket(table)}
                WHERE {bracket(column)} IS NOT NULL
                  AND {bracket(column)} <> N''
                  AND ISJSON({bracket(column)}) <> 1
                  AND ISJSON(CONCAT(N'[', {bracket(column)}, N']')) <> 1
                ORDER BY {bracket(key)}
                """
            ).fetchall()
            for row in rows:
                table_errors.append(
                    {
                        "id": str(row[0]),
                        "column": column,
                        "error": "valor nao e JSON valido (objeto, array ou escalar)",
                    }
                )
                if len(table_errors) >= 20:
                    break
            if len(table_errors) >= 20:
                break
        passed = not table_errors
        ok = ok and passed
        result[table] = {
            "passed": passed,
            "errors": table_errors,
        }
    return ok, result


def verification_alerts(report):
    alerts = []
    for table, payload in report.get("checks", {}).get("json", {}).items():
        if payload.get("passed"):
            continue
        for error_item in payload.get("errors", []):
            alerts.append(
                "JSON invalido em "
                f"{table}.{error_item.get('column')}, "
                f"id={error_item.get('id')}: {error_item.get('error')}"
            )
    return alerts


def run_verification(sqlite_conn, sqlserver_conn, sqlite_path, report_path):
    counts_ok, counts = compare_counts(sqlite_conn, sqlserver_conn)
    ids_ok, ids = compare_ids(sqlite_conn, sqlserver_conn)
    grouped_ok, grouped = compare_grouped_counts(sqlite_conn, sqlserver_conn)
    fks_ok, fks = validate_foreign_keys_sqlserver(sqlserver_conn)
    json_ok, json_checks = validate_json_sqlserver(sqlserver_conn)
    auth_ok, auth_tables = validate_auth_tables_sqlserver(sqlserver_conn)

    report = {
        "migrationVersion": MIGRATION_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sqlite": str(sqlite_path),
        "checks": {
            "counts": counts,
            "ids": ids,
            "groupedCounts": grouped,
            "foreignKeys": fks,
            "json": json_checks,
            "authTables": auth_tables,
        },
    }
    report["status"] = (
        "ok"
        if all([counts_ok, ids_ok, grouped_ok, fks_ok, json_ok, auth_ok])
        else "alertas"
    )
    write_report(report_path, report)
    return report


def load_sqlite_users(connection):
    if not sqlite_table_exists(connection, "usuarios_acesso"):
        return []

    columns = ", ".join(AUTH_USER_COLUMNS)
    rows = connection.execute(
        f"SELECT {columns} FROM usuarios_acesso ORDER BY matricula"
    ).fetchall()
    return [dict(row) for row in rows]


def normalize_user(row):
    user = {column: row.get(column) or "" for column in AUTH_USER_COLUMNS}
    user["matricula"] = str(user["matricula"]).strip().upper()
    user["perfil"] = user["perfil"] or "usuario_companhia"
    user["ativo"] = 1 if int(user["ativo"] or 0) == 1 else 0
    return user


def sync_users(sqlserver_conn, users):
    cursor = sqlserver_conn.cursor()
    inserted = 0
    updated = 0
    ignored = 0
    update_columns = AUTH_USER_COLUMNS[1:]
    update_sql = ",\n                    ".join(
        f"{bracket(column)} = ?" for column in update_columns
    )
    insert_columns = ",\n                ".join(bracket(column) for column in AUTH_USER_COLUMNS)
    insert_placeholders = ", ".join("?" for _ in AUTH_USER_COLUMNS)

    for raw_user in users:
        user = normalize_user(raw_user)
        if not user["matricula"]:
            ignored += 1
            continue

        exists = cursor.execute(
            "SELECT COUNT(*) FROM dbo.usuarios_acesso WHERE matricula = ?",
            user["matricula"],
        ).fetchone()[0]

        if exists:
            cursor.execute(
                f"""
                UPDATE dbo.usuarios_acesso
                SET {update_sql},
                    updated_at = SYSUTCDATETIME()
                WHERE matricula = ?
                """,
                *[user[column] for column in update_columns],
                user["matricula"]
            )
            updated += 1
            continue

        cursor.execute(
            f"""
            INSERT INTO dbo.usuarios_acesso (
                {insert_columns},
                created_at,
                updated_at
            )
            VALUES ({insert_placeholders}, SYSUTCDATETIME(), SYSUTCDATETIME())
            """,
            *[user[column] for column in AUTH_USER_COLUMNS],
        )
        inserted += 1

    sqlserver_conn.commit()
    return {"inserted": inserted, "updated": updated, "ignored": ignored}


def run_auth_sync(sqlite_conn, sqlserver_conn, sqlite_path, report_path):
    users = load_sqlite_users(sqlite_conn)
    result = sync_users(sqlserver_conn, users)
    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sqlite": str(sqlite_path),
        "sqlserverDatabase": sqlserver_database_name(),
        **result,
        "status": "ok",
    }
    write_report(report_path, report)
    return result


def sql_string(value):
    if value is None or str(value) == "":
        return "NULL"
    escaped = str(value).replace("'", "''")
    return f"N'{escaped}'"


def sql_bit(value):
    return "1" if int(value or 0) == 1 else "0"


def render_user_sql(user):
    values = [
        sql_bit(user.get(column)) if column == "ativo" else sql_string(
            str(user.get(column) or "").strip().upper()
            if column == "matricula"
            else user.get(column) or ("usuario_companhia" if column == "perfil" else None)
        )
        for column in AUTH_USER_COLUMNS
    ]
    source_columns = ",\n    ".join(AUTH_USER_COLUMNS)
    update_set = ",\n        ".join(
        f"{column} = source.{column}" for column in AUTH_USER_COLUMNS[1:]
    )
    insert_columns = ",\n        ".join([*AUTH_USER_COLUMNS, "created_at", "updated_at"])
    insert_values = ",\n        ".join(
        [*(f"source.{column}" for column in AUTH_USER_COLUMNS), "SYSUTCDATETIME()", "SYSUTCDATETIME()"]
    )

    return f"""
MERGE dbo.usuarios_acesso AS target
USING (
    VALUES ({", ".join(values)})
) AS source (
    {source_columns}
)
ON target.matricula = source.matricula
WHEN MATCHED THEN
    UPDATE SET
        {update_set},
        updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (
        {insert_columns}
    )
    VALUES (
        {insert_values}
    );
"""


def render_auth_sql(database, users):
    body = "\n".join(render_user_sql(user) for user in users)
    return f"""USE [{database}];
GO

SET XACT_ABORT ON;
BEGIN TRAN;

{body}

COMMIT;

SELECT
    id,
    matricula,
    nome,
    perfil,
    unidade_apuradora,
    diretoria_responsavel,
    ativo,
    created_at,
    updated_at
FROM dbo.usuarios_acesso
ORDER BY ativo DESC, nome ASC, matricula ASC;
"""


def generate_auth_sql(sqlite_conn, output_path, database):
    users = load_sqlite_users(sqlite_conn)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(render_auth_sql(database, users), encoding="utf-8")
    return len(users)


def write_report(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def set_target_constraints(connection, enabled):
    cursor = connection.cursor()
    for table in TABLES:
        action = "WITH CHECK CHECK" if enabled else "NOCHECK"
        cursor.execute(
            f"ALTER TABLE dbo.{bracket(table)} {action} CONSTRAINT ALL"
        )


def run_migration(sqlite_conn, sqlserver_conn, args):
    report = {
        "migrationVersion": MIGRATION_VERSION,
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
            return report

        if args.truncate:
            delete_target_rows(sqlserver_conn)
            report["steps"].append({"name": "truncate", "status": "ok"})

        set_target_constraints(sqlserver_conn, False)
        try:
            for table in TABLES:
                result = migrate_table(sqlite_conn, sqlserver_conn, table)
                report["steps"].append(result)
                if result["status"] == "ok":
                    report["tables"][table] = {
                        "sqlite": table_count(sqlite_conn, table),
                        "sqlserver": table_count(sqlserver_conn, table, sqlserver=True),
                    }
            set_target_constraints(sqlserver_conn, True)
            sqlserver_conn.commit()
        except Exception:
            sqlserver_conn.rollback()
            raise

        report["authTables"] = auth_table_report(sqlserver_conn)
        report["status"] = "ok"
        write_report(args.report, report)
        print(f"Migracao concluida. Relatorio: {args.report}")
        return report
    except Exception as exc:
        sqlserver_conn.rollback()
        report["status"] = "erro"
        report["error"] = str(exc)
        write_report(args.report, report)
        raise


def is_tls_certificate_error(error):
    message = str(error)
    return any(
        pattern in message
        for pattern in [
            "cadeia de certifica",
            "authority that is not trusted",
            "certificate chain",
            "SSL Provider",
        ]
    )


def print_tls_guidance(args, config):
    print("")
    write_warn("Falha de TLS/certificado na conexao com o SQL Server.")
    print(
        "O driver ODBC esta com "
        f"Encrypt={config['encrypt']} e "
        f"TrustServerCertificate={config['trustServerCertificate'] or 'nao configurado'}."
    )
    print("")
    print("O padrao atual do projeto e conectar ao SQL Server sem criptografia:")
    print("Encrypt=no")
    print("TrustServerCertificate nao configurado")
    print("")


def print_next_steps():
    write_step("Proximos passos")
    print("1. Configure a aplicacao no servidor com DB_CONNECTION=sqlsrv e APP_ENV=production.")
    print("2. Configure LDAP_URI, LDAP_BASE_DN e as credenciais de bind no ambiente corporativo.")
    print("3. Cadastre ou revise os usuarios em dbo.usuarios_acesso.")
    print("4. Teste login, lancamentos, homologacao, relatorios e administracao.")
    print("")
    write_ok("Processo finalizado.")


def main():
    args = parse_args()
    selected_database = (
        args.banco_origem if args.exportar_sqlserver_para_sqlite else args.banco
    )
    config = configure_environment(args, selected_database)

    if args.exportar_sqlserver_para_sqlite:
        print("Exportacao SQL Server -> SQLite")
        print(f"Servidor SQL Server: {config['servidor']}")
        print(f"Banco SQL Server origem: {config['banco']}")
        print(f"Driver ODBC: {config['driver']}")
        print(f"SQLite destino: {args.sqlite.resolve()}")
        if pyodbc is None:
            raise SystemExit(
                "Dependencia ausente: instale com python -m pip install pyodbc"
            )
        export_sqlserver_to_sqlite(args, config)
        return

    if args.database is None:
        args.database = config["banco"]

    print_header(args, config)
    validate_options(args, config)
    validate_files(args)

    sqlite_conn = None
    sqlserver_conn = None

    try:
        if not args.skip_backup and not args.schema_only and not args.verify_only:
            create_backup(args.sqlite)

        sqlite_conn = connect_sqlite(args.sqlite)
        source_validation = validate_sqlite_source(sqlite_conn)
        if not source_validation["passed"]:
            for error in source_validation["errors"]:
                write_warn(error)
            raise SystemExit("A origem SQLite falhou no preflight da migracao.")
        write_ok("Preflight da origem SQLite aprovado")
        if not args.verify_only:
            ensure_target_database_absent()
        sqlserver_conn = connect_sqlserver()

        if args.verify_only:
            write_step("Verificando migracao")
            verification_report = run_verification(sqlite_conn, sqlserver_conn, args.sqlite, args.report)
            print(f"Verificacao concluida. Relatorio: {args.report}")
            if verification_report["status"] != "ok":
                for alert in verification_alerts(verification_report):
                    write_warn(alert)
                raise SystemExit("Verificacao encontrou alertas. Consulte database\\sqlserver\\migration-report.json.")
            write_ok("Verificacao concluida sem alertas")
            print_next_steps()
            return

        write_step("Executando migracao")
        run_migration(sqlite_conn, sqlserver_conn, args)
        write_ok("Migracao concluida")

        if args.sync_auth_users:
            write_step("Sincronizando usuarios_acesso para SQL Server")
            result = run_auth_sync(sqlite_conn, sqlserver_conn, args.sqlite, args.auth_report)
            print(
                "Sincronizacao concluida. "
                f"Inseridos: {result['inserted']}. "
                f"Atualizados: {result['updated']}. "
                f"Ignorados: {result['ignored']}. "
                f"Relatorio: {args.auth_report}"
            )
            write_ok("usuarios_acesso sincronizado")

        if args.gerar_sql_auth_users:
            write_step("Gerando SQL de usuarios_acesso para execucao manual no SSMS")
            total = generate_auth_sql(sqlite_conn, args.auth_sql_output, args.database)
            print(f"SQL gerado: {args.auth_sql_output}")
            print(f"Usuarios incluidos no arquivo: {total}")
            write_ok(f"SQL gerado em {args.auth_sql_output}")

        if not args.schema_only and not args.skip_verify:
            write_step("Verificando migracao")
            verification_report = run_verification(sqlite_conn, sqlserver_conn, args.sqlite, args.report)
            print(f"Verificacao concluida. Relatorio: {args.report}")
            if verification_report["status"] != "ok":
                for alert in verification_alerts(verification_report):
                    write_warn(alert)
                raise SystemExit("Verificacao encontrou alertas. Consulte database\\sqlserver\\migration-report.json.")
            write_ok("Verificacao concluida sem alertas")

        print_next_steps()
    except pyodbc.Error as exc:
        if is_tls_certificate_error(exc):
            print_tls_guidance(args, config)
        raise
    finally:
        if sqlite_conn is not None:
            sqlite_conn.close()
        if sqlserver_conn is not None:
            sqlserver_conn.close()


if __name__ == "__main__":
    main()
