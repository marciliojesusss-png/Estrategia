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
DEFAULT_REPORT = ROOT / "database" / "sqlserver" / "usuarios-acesso-sync-report.json"


def parse_args():
    parser = argparse.ArgumentParser(
        description="Sincroniza usuarios_acesso do SQLite local para SQL Server."
    )
    parser.add_argument("--sqlite", type=Path, default=DEFAULT_SQLITE)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    return parser.parse_args()


def sqlserver_database_name():
    return os.getenv("SQLSERVER_DATABASE", "Estrategia")


def sqlserver_connection_string():
    host = os.getenv("SQLSERVER_HOST", "localhost")
    database = sqlserver_database_name()
    driver = os.getenv("SQLSERVER_DRIVER", "ODBC Driver 18 for SQL Server")
    encrypt = os.getenv("SQLSERVER_ENCRYPT", "yes")
    trust_cert = os.getenv("SQLSERVER_TRUST_SERVER_CERTIFICATE", "yes")

    parts = [
        f"DRIVER={{{driver}}}",
        f"SERVER={host}",
        f"DATABASE={database}",
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


def connect_sqlserver():
    return pyodbc.connect(sqlserver_connection_string())


def ensure_sqlserver_tables(connection):
    cursor = connection.cursor()
    cursor.execute(
        """
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
        """
    )
    connection.commit()


def sqlite_table_exists(connection, table):
    row = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table,),
    ).fetchone()
    return row is not None


def load_sqlite_users(connection):
    if not sqlite_table_exists(connection, "usuarios_acesso"):
        return []

    rows = connection.execute(
        """
        SELECT
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
        FROM usuarios_acesso
        ORDER BY matricula
        """
    ).fetchall()
    return [dict(row) for row in rows]


def normalize_user(row):
    return {
        "matricula": str(row.get("matricula") or "").strip().upper(),
        "nome": row.get("nome") or "",
        "email": row.get("email") or "",
        "sg_unidade": row.get("sg_unidade") or "",
        "no_unidade": row.get("no_unidade") or "",
        "perfil": row.get("perfil") or "usuario_companhia",
        "unidade_apuradora": row.get("unidade_apuradora") or "",
        "diretoria_responsavel": row.get("diretoria_responsavel") or "",
        "ativo": 1 if int(row.get("ativo") or 0) == 1 else 0,
        "created_at": row.get("created_at") or None,
        "updated_at": row.get("updated_at") or None,
    }


def sync_users(sqlserver_conn, users):
    cursor = sqlserver_conn.cursor()
    inserted = 0
    updated = 0
    ignored = 0

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
                """
                UPDATE dbo.usuarios_acesso
                SET nome = ?,
                    email = ?,
                    sg_unidade = ?,
                    no_unidade = ?,
                    perfil = ?,
                    unidade_apuradora = ?,
                    diretoria_responsavel = ?,
                    ativo = ?,
                    updated_at = SYSUTCDATETIME()
                WHERE matricula = ?
                """,
                user["nome"],
                user["email"],
                user["sg_unidade"],
                user["no_unidade"],
                user["perfil"],
                user["unidade_apuradora"],
                user["diretoria_responsavel"],
                user["ativo"],
                user["matricula"],
            )
            updated += 1
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
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, SYSUTCDATETIME(), SYSUTCDATETIME())
            """,
            user["matricula"],
            user["nome"],
            user["email"],
            user["sg_unidade"],
            user["no_unidade"],
            user["perfil"],
            user["unidade_apuradora"],
            user["diretoria_responsavel"],
            user["ativo"],
        )
        inserted += 1

    sqlserver_conn.commit()
    return {"inserted": inserted, "updated": updated, "ignored": ignored}


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
        "sqlserverDatabase": sqlserver_database_name(),
    }

    try:
        ensure_sqlserver_tables(sqlserver_conn)
        users = load_sqlite_users(sqlite_conn)
        result = sync_users(sqlserver_conn, users)
        report.update(result)
        report["status"] = "ok"
        write_report(args.report, report)
        print(
            "Sincronizacao concluida. "
            f"Inseridos: {result['inserted']}. "
            f"Atualizados: {result['updated']}. "
            f"Ignorados: {result['ignored']}. "
            f"Relatorio: {args.report}"
        )
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
