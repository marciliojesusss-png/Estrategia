import argparse
import json
import os
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

PRIMARY_KEYS = {
    "configuracoes": "chave",
}

JSON_COLUMNS = {
    "lancamentos": ["dados_entrada_json"],
    "retificacoes": ["versao_anterior_json", "versao_nova_json"],
    "auditoria": ["dados_anteriores_json", "dados_novos_json"],
    "configuracoes": ["valor_json"],
    "usuarios_validacao": ["permissoes_json"],
}

FOREIGN_KEY_CHECKS = [
    ("lancamentos", "indicador_id", "indicadores", "id"),
    ("homologacoes", "lancamento_id", "lancamentos", "id"),
    ("solicitacoes_reabertura", "lancamento_id", "lancamentos", "id"),
    ("retificacoes", "lancamento_id", "lancamentos", "id"),
    ("evidencias", "lancamento_id", "lancamentos", "id"),
]


def parse_args():
    parser = argparse.ArgumentParser(
        description="Valida a migracao do SQLite para SQL Server."
    )
    parser.add_argument("--sqlite", type=Path, default=DEFAULT_SQLITE)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
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
    return connection


def is_missing_database_error(error):
    message = str(error)
    return (
        "4060" in message
        or "Cannot open database" in message
        or "Nao e possivel abrir o banco de dados" in message
        or "Não é possível abrir o banco de dados" in message
    )


def connect_sqlserver():
    try:
        return pyodbc.connect(sqlserver_connection_string())
    except pyodbc.Error as exc:
        if not is_missing_database_error(exc):
            raise
        raise SystemExit(
            "Nao foi possivel abrir o banco SQL Server "
            f"'{sqlserver_database_name()}'. Rode primeiro o script de migracao, "
            "ou crie/libere esse banco para o usuario Windows atual."
        ) from exc


def primary_key(table):
    return PRIMARY_KEYS.get(table, "id")


def sqlite_scalar(connection, sql, params=()):
    return connection.execute(sql, params).fetchone()[0]


def sqlserver_scalar(connection, sql, params=()):
    return connection.cursor().execute(sql, params).fetchone()[0]


def sqlite_table_exists(connection, table):
    row = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table,),
    ).fetchone()
    return row is not None


def sqlserver_table_exists(connection, table):
    return bool(
        sqlserver_scalar(
            connection,
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = ?
            """,
            (table,),
        )
    )


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
    key = primary_key(table)
    rows = connection.execute(
        f'SELECT CAST("{key}" AS TEXT) AS value FROM "{table}" ORDER BY "{key}"'
    ).fetchall()
    return [row["value"] for row in rows]


def fetch_ids_sqlserver(connection, table):
    key = primary_key(table)
    rows = connection.cursor().execute(
        f"SELECT CAST({bracket(key)} AS NVARCHAR(4000)) AS value "
        f"FROM dbo.{bracket(table)} ORDER BY {bracket(key)}"
    ).fetchall()
    return [row[0] for row in rows]


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


def validate_json_sqlserver(connection):
    result = {}
    ok = True
    for table, columns in JSON_COLUMNS.items():
        table_errors = []
        key = primary_key(table)
        select_columns = ", ".join([bracket(key), *[bracket(column) for column in columns]])
        rows = connection.cursor().execute(
            f"SELECT {select_columns} FROM dbo.{bracket(table)}"
        ).fetchall()
        for row in rows:
            row_key = row[0]
            for index, column in enumerate(columns, start=1):
                value = row[index]
                if value in (None, ""):
                    continue
                try:
                    json.loads(value)
                except (TypeError, json.JSONDecodeError) as exc:
                    table_errors.append(
                        {"id": str(row_key), "column": column, "error": str(exc)}
                    )
        passed = not table_errors
        ok = ok and passed
        result[table] = {
            "passed": passed,
            "errors": table_errors[:20],
        }
    return ok, result


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
        "checks": {},
    }

    try:
        counts_ok, counts = compare_counts(sqlite_conn, sqlserver_conn)
        ids_ok, ids = compare_ids(sqlite_conn, sqlserver_conn)
        grouped_ok, grouped = compare_grouped_counts(sqlite_conn, sqlserver_conn)
        fks_ok, fks = validate_foreign_keys_sqlserver(sqlserver_conn)
        json_ok, json_checks = validate_json_sqlserver(sqlserver_conn)

        report["checks"] = {
            "counts": counts,
            "ids": ids,
            "groupedCounts": grouped,
            "foreignKeys": fks,
            "json": json_checks,
        }
        report["status"] = "ok" if all([counts_ok, ids_ok, grouped_ok, fks_ok, json_ok]) else "alertas"
        write_report(args.report, report)
        print(f"Verificacao concluida. Relatorio: {args.report}")
        if report["status"] != "ok":
            raise SystemExit(1)
    finally:
        sqlite_conn.close()
        sqlserver_conn.close()


if __name__ == "__main__":
    main()
