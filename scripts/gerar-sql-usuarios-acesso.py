import argparse
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SQLITE = ROOT / "database" / "indicadores.sqlite"
DEFAULT_OUTPUT = ROOT / "database" / "sqlserver" / "sincronizar-usuarios-acesso.sql"


def parse_args():
    parser = argparse.ArgumentParser(
        description="Gera SQL para sincronizar usuarios_acesso no SQL Server via SSMS."
    )
    parser.add_argument("--sqlite", type=Path, default=DEFAULT_SQLITE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--database", default="Estrategia")
    return parser.parse_args()


def sql_string(value):
    if value is None or str(value) == "":
        return "NULL"
    escaped = str(value).replace("'", "''")
    return f"N'{escaped}'"


def sql_bit(value):
    return "1" if int(value or 0) == 1 else "0"


def sqlite_table_exists(connection, table):
    row = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table,),
    ).fetchone()
    return row is not None


def load_users(sqlite_path):
    if not sqlite_path.exists():
        raise SystemExit(f"SQLite nao encontrado: {sqlite_path}")

    connection = sqlite3.connect(sqlite_path)
    connection.row_factory = sqlite3.Row
    try:
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
                ativo
            FROM usuarios_acesso
            ORDER BY matricula
            """
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()


def render_user_sql(user):
    values = [
        sql_string(str(user.get("matricula") or "").strip().upper()),
        sql_string(user.get("nome")),
        sql_string(user.get("email")),
        sql_string(user.get("sg_unidade")),
        sql_string(user.get("no_unidade")),
        sql_string(user.get("perfil") or "usuario_companhia"),
        sql_string(user.get("unidade_apuradora")),
        sql_string(user.get("diretoria_responsavel")),
        sql_bit(user.get("ativo")),
    ]

    return f"""
MERGE dbo.usuarios_acesso AS target
USING (
    VALUES ({", ".join(values)})
) AS source (
    matricula,
    nome,
    email,
    sg_unidade,
    no_unidade,
    perfil,
    unidade_apuradora,
    diretoria_responsavel,
    ativo
)
ON target.matricula = source.matricula
WHEN MATCHED THEN
    UPDATE SET
        nome = source.nome,
        email = source.email,
        sg_unidade = source.sg_unidade,
        no_unidade = source.no_unidade,
        perfil = source.perfil,
        unidade_apuradora = source.unidade_apuradora,
        diretoria_responsavel = source.diretoria_responsavel,
        ativo = source.ativo,
        updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (
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
    VALUES (
        source.matricula,
        source.nome,
        source.email,
        source.sg_unidade,
        source.no_unidade,
        source.perfil,
        source.unidade_apuradora,
        source.diretoria_responsavel,
        source.ativo,
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
    );
"""


def render_sql(database, users):
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


def main():
    args = parse_args()
    users = load_users(args.sqlite)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(render_sql(args.database, users), encoding="utf-8")
    print(f"SQL gerado: {args.output}")
    print(f"Usuarios incluidos no arquivo: {len(users)}")


if __name__ == "__main__":
    main()
