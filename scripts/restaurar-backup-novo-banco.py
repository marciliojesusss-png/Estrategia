#!/usr/bin/env python3
"""Restaura um backup como banco novo na instancia SQL Server da CAIXA.

O script nunca usa WITH REPLACE e recusa a execucao quando o banco ou algum
arquivo fisico de destino ja existe. A restauracao real exige --executar.
"""

from __future__ import annotations

import argparse
import hashlib
import ntpath
import os
import re
import shutil
import socket
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Sequence

try:
    import pyodbc
except ImportError:  # Permite consultar --help e gerar o plano sem pyodbc.
    pyodbc = None


ROOT = Path(__file__).resolve().parents[1]
BACKUP_FILENAME = "Estrategia_HOMOLOGACAO_INICIATIVAS_20261111_110041.bak"
DEFAULT_LOCAL_BACKUP = ROOT / "backup" / BACKUP_FILENAME
DEFAULT_SERVER_BACKUP = rf"D:\SQLBackups\{BACKUP_FILENAME}"
DEFAULT_SERVER = "DF7436SR439"
DEFAULT_DATABASE = "Monitoramento_Estrategia"
DEFAULT_OWNER_LOGIN = r"CORPCAIXA\c118119"
DEFAULT_APPLICATION_LOGIN = "s531902"
EXPECTED_OWNER_SID = bytes.fromhex(
    "010500000000000515000000C78A7EB26AEE162F1968276B896C0000"
)
EXPECTED_APPLICATION_SID = bytes.fromhex("401E46BC08211343899A19AC0768B6B8")
SYSTEM_DATABASES = {"master", "model", "msdb", "tempdb"}


class RestoreError(RuntimeError):
    """Erro operacional esperado, apresentado sem traceback por padrao."""


@dataclass(frozen=True)
class BackupSet:
    position: int
    database_name: str
    backup_finish_date: Any
    has_checksums: bool


@dataclass(frozen=True)
class RestoreFile:
    logical_name: str
    file_type: str
    destination: str


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Restaura o backup de homologacao como um banco novo no SQL Server "
            "da CAIXA, sem sobrescrever bancos existentes."
        )
    )
    parser.add_argument("--servidor", default=DEFAULT_SERVER)
    parser.add_argument("--banco", default=DEFAULT_DATABASE)
    parser.add_argument(
        "--backup-local",
        type=Path,
        default=DEFAULT_LOCAL_BACKUP,
        help="Arquivo do repositorio; usado para conferencia e copia opcional.",
    )
    parser.add_argument(
        "--backup-servidor",
        default=DEFAULT_SERVER_BACKUP,
        help=(
            "Caminho visto pelo servico do SQL Server. Em conexao remota, nao e "
            "o caminho da estacao cliente."
        ),
    )
    parser.add_argument(
        "--copiar-backup",
        action="store_true",
        help=(
            "Copia --backup-local para --backup-servidor. Permitido somente ao "
            "executar na propria maquina do SQL Server ou usar destino UNC."
        ),
    )
    parser.add_argument(
        "--backup-set",
        type=int,
        help="Posicao do conjunto no .bak; por padrao usa o ultimo backup completo.",
    )
    parser.add_argument(
        "--banco-origem-esperado",
        default="Estrategia",
        help="Nome de origem esperado no cabecalho do backup.",
    )
    parser.add_argument("--diretorio-dados", help="Diretorio de dados no servidor SQL.")
    parser.add_argument("--diretorio-logs", help="Diretorio de logs no servidor SQL.")
    parser.add_argument("--driver", help="Driver ODBC; detectado automaticamente se omitido.")
    parser.add_argument("--encrypt", choices=("yes", "no"), default="no")
    parser.add_argument(
        "--trust-server-certificate", choices=("yes", "no"), default="no"
    )
    parser.add_argument("--owner-login", default=DEFAULT_OWNER_LOGIN)
    parser.add_argument("--application-login", default=DEFAULT_APPLICATION_LOGIN)
    parser.add_argument(
        "--executar",
        action="store_true",
        help="Confirma a criacao e a restauracao do banco. Sem isto, mostra o plano.",
    )
    parser.add_argument(
        "--debug", action="store_true", help="Mostra traceback em caso de falha."
    )
    return parser.parse_args(argv)


def sql_identifier(value: str) -> str:
    if not value or not value.strip():
        raise RestoreError("O nome do banco nao pode ser vazio.")
    if len(value) > 128:
        raise RestoreError("O nome do banco excede 128 caracteres.")
    if any(ord(char) < 32 for char in value):
        raise RestoreError("O nome do banco contem caractere de controle.")
    if value.casefold() in SYSTEM_DATABASES:
        raise RestoreError(f"O banco de sistema '{value}' nao pode ser usado.")
    return "[" + value.replace("]", "]]" ) + "]"


def sql_string(value: str) -> str:
    if "\x00" in value:
        raise RestoreError("Um valor SQL contem caractere NUL.")
    return "N'" + value.replace("'", "''") + "'"


def safe_filename(value: str) -> str:
    result = re.sub(r"[^A-Za-z0-9_.-]+", "_", value).strip(" ._")
    if not result:
        raise RestoreError("Nao foi possivel gerar nomes fisicos para o banco.")
    return result[:100]


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def choose_driver(explicit_driver: str | None) -> str:
    if pyodbc is None:
        raise RestoreError(
            "Dependencia ausente. Instale com: python -m pip install pyodbc"
        )
    installed = list(pyodbc.drivers())
    if explicit_driver:
        if explicit_driver not in installed:
            raise RestoreError(
                f"Driver ODBC nao encontrado: {explicit_driver}. "
                f"Instalados: {', '.join(installed) or 'nenhum'}"
            )
        return explicit_driver
    for candidate in (
        "ODBC Driver 18 for SQL Server",
        "ODBC Driver 17 for SQL Server",
        "SQL Server Native Client 11.0",
        "SQL Server",
    ):
        if candidate in installed:
            return candidate
    raise RestoreError(
        "Nenhum driver ODBC para SQL Server foi encontrado. "
        f"Drivers instalados: {', '.join(installed) or 'nenhum'}"
    )


def connect_master(args: argparse.Namespace, driver: str):
    connection_string = ";".join(
        (
            f"DRIVER={{{driver}}}",
            f"SERVER={args.servidor}",
            "DATABASE=master",
            "Trusted_Connection=yes",
            f"Encrypt={args.encrypt}",
            f"TrustServerCertificate={args.trust_server_certificate}",
            "APP=Estrategia - restaurar backup como banco novo",
        )
    )
    try:
        return pyodbc.connect(connection_string, autocommit=True, timeout=15)
    except pyodbc.Error as exc:
        raise RestoreError(
            f"Falha ao conectar em {args.servidor} com autenticacao integrada: {exc}"
        ) from exc


def rows_as_dicts(cursor) -> list[dict[str, Any]]:
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def scalar(cursor, statement: str, *parameters: Any) -> Any:
    row = cursor.execute(statement, *parameters).fetchone()
    return None if row is None else row[0]


def server_file_exists(cursor, path: str) -> bool:
    result = scalar(
        cursor,
        """
        DECLARE @FileExists int = 0;
        EXEC master.dbo.xp_fileexist ?, @FileExists OUTPUT;
        SELECT @FileExists;
        """,
        path,
    )
    return int(result or 0) == 1


def ensure_target_absent(cursor, database: str) -> None:
    if scalar(cursor, "SELECT DB_ID(?)", database) is not None:
        raise RestoreError(
            f"O banco '{database}' ja existe. Escolha outro nome; o script nao sobrescreve."
        )


def server_information(cursor) -> dict[str, Any]:
    row = cursor.execute(
        """
        SELECT
            CONVERT(nvarchar(128), SERVERPROPERTY('MachineName')),
            CONVERT(nvarchar(128), SERVERPROPERTY('ServerName')),
            CONVERT(nvarchar(128), SERVERPROPERTY('ProductVersion')),
            CONVERT(nvarchar(4000), SERVERPROPERTY('InstanceDefaultDataPath')),
            CONVERT(nvarchar(4000), SERVERPROPERTY('InstanceDefaultLogPath')),
            IS_SRVROLEMEMBER('sysadmin'),
            HAS_PERMS_BY_NAME(NULL, NULL, 'CREATE ANY DATABASE');
        """
    ).fetchone()
    return {
        "machine": row[0],
        "server": row[1],
        "version": row[2],
        "data_directory": row[3],
        "log_directory": row[4],
        "sysadmin": int(row[5] or 0),
        "create_database": int(row[6] or 0),
    }


def validate_server_permissions(info: dict[str, Any]) -> None:
    if not info["sysadmin"] and not info["create_database"]:
        raise RestoreError(
            "A conta Windows conectada nao possui permissao CREATE ANY DATABASE "
            "nem a funcao sysadmin. Solicite autorizacao ao DBA."
        )


def validate_login(
    cursor, login: str, expected_sid: bytes, description: str
) -> None:
    row = cursor.execute(
        """
        SELECT SUSER_SID(?),
               COALESCE(CONVERT(int, LOGINPROPERTY(?, 'IsDisabled')), 0);
        """,
        login,
        login,
    ).fetchone()
    actual_sid = None if row is None or row[0] is None else bytes(row[0])
    if actual_sid is None:
        raise RestoreError(f"O login {description} '{login}' nao existe na instancia.")
    if actual_sid != expected_sid:
        raise RestoreError(
            f"O SID do login {description} '{login}' nao corresponde ao SID corporativo."
        )
    if int(row[1] or 0) == 1:
        raise RestoreError(f"O login {description} '{login}' esta desabilitado.")


def maybe_copy_backup(
    args: argparse.Namespace, cursor, info: dict[str, Any]
) -> None:
    if not args.copiar_backup:
        return
    source = args.backup_local.resolve()
    if not source.is_file():
        raise RestoreError(f"Backup local nao encontrado: {source}")
    destination_text = args.backup_servidor
    destination_is_unc = destination_text.startswith("\\\\")
    local_machine = os.environ.get("COMPUTERNAME", socket.gethostname())
    sql_machine = str(info["machine"] or "")
    if not destination_is_unc and local_machine.casefold() != sql_machine.casefold():
        raise RestoreError(
            "--copiar-backup com caminho local do servidor so pode ser usado na "
            f"maquina '{sql_machine}'. Esta maquina e '{local_machine}'. Copie o "
            "arquivo manualmente ou informe um caminho UNC acessivel."
        )
    destination = Path(destination_text)
    if destination.exists() or server_file_exists(cursor, destination_text):
        raise RestoreError(
            f"O destino do backup ja existe e nao sera sobrescrito: {destination_text}"
        )
    if not destination.parent.is_dir():
        raise RestoreError(f"Diretorio de backup inexistente: {destination.parent}")
    print(f"Copiando backup para {destination_text} ...")
    shutil.copy2(source, destination)
    if source.stat().st_size != destination.stat().st_size:
        raise RestoreError("A copia do backup terminou com tamanho divergente.")
    if file_sha256(source) != file_sha256(destination):
        raise RestoreError("A copia do backup terminou com SHA-256 divergente.")
    print("Copia concluida e conferida por SHA-256.")


def select_backup_set(cursor, backup_path: str, requested: int | None) -> BackupSet:
    cursor.execute(f"RESTORE HEADERONLY FROM DISK = {sql_string(backup_path)};")
    rows = rows_as_dicts(cursor)
    full_backups = [row for row in rows if int(row.get("BackupType") or 0) == 1]
    if requested is not None:
        full_backups = [
            row for row in full_backups if int(row.get("Position") or 0) == requested
        ]
        if not full_backups:
            raise RestoreError(
                f"Nao existe backup completo na posicao {requested} do arquivo."
            )
    if not full_backups:
        raise RestoreError("O arquivo nao contem um backup completo de banco.")
    selected = max(full_backups, key=lambda row: int(row.get("Position") or 0))
    return BackupSet(
        position=int(selected["Position"]),
        database_name=str(selected.get("DatabaseName") or ""),
        backup_finish_date=selected.get("BackupFinishDate"),
        has_checksums=bool(selected.get("HasBackupChecksums")),
    )


def validate_backup_source(backup_set: BackupSet, expected_database: str) -> None:
    if backup_set.database_name.casefold() != expected_database.casefold():
        raise RestoreError(
            "O backup completo selecionado pertence ao banco "
            f"'{backup_set.database_name}', mas era esperado '{expected_database}'."
        )


def default_directories(
    cursor, args: argparse.Namespace, info: dict[str, Any]
) -> tuple[str, str]:
    data_directory = args.diretorio_dados or info["data_directory"]
    log_directory = args.diretorio_logs or info["log_directory"]
    if not data_directory:
        master_path = scalar(
            cursor,
            "SELECT physical_name FROM master.sys.master_files "
            "WHERE database_id = 1 AND file_id = 1;",
        )
        data_directory = ntpath.dirname(str(master_path or ""))
    if not log_directory:
        master_log = scalar(
            cursor,
            "SELECT physical_name FROM master.sys.master_files "
            "WHERE database_id = 1 AND type = 1;",
        )
        log_directory = ntpath.dirname(str(master_log or ""))
    if not data_directory or not log_directory:
        raise RestoreError(
            "Nao foi possivel descobrir os diretorios do SQL Server. Informe "
            "--diretorio-dados e --diretorio-logs."
        )
    return str(data_directory), str(log_directory)


def build_restore_files(
    cursor,
    backup_path: str,
    backup_set: BackupSet,
    database: str,
    data_directory: str,
    log_directory: str,
) -> list[RestoreFile]:
    cursor.execute(
        f"RESTORE FILELISTONLY FROM DISK = {sql_string(backup_path)} "
        f"WITH FILE = {backup_set.position};"
    )
    rows = rows_as_dicts(cursor)
    if not rows:
        raise RestoreError("RESTORE FILELISTONLY nao retornou arquivos.")
    unsupported = sorted(
        {str(row.get("Type") or "") for row in rows if row.get("Type") not in ("D", "L")}
    )
    if unsupported:
        raise RestoreError(
            "O backup possui tipos de arquivo ainda nao suportados pelo script: "
            + ", ".join(unsupported)
        )

    base = safe_filename(database)
    data_index = 0
    log_index = 0
    result: list[RestoreFile] = []
    for row in rows:
        logical_name = str(row["LogicalName"])
        file_type = str(row["Type"])
        if file_type == "D":
            data_index += 1
            suffix = ".mdf" if data_index == 1 else f"_{data_index}.ndf"
            destination = ntpath.join(data_directory, base + suffix)
        else:
            log_index += 1
            suffix = "_log.ldf" if log_index == 1 else f"_log_{log_index}.ldf"
            destination = ntpath.join(log_directory, base + suffix)
        result.append(RestoreFile(logical_name, file_type, destination))
    return result


def verify_destinations_absent(cursor, files: Iterable[RestoreFile]) -> None:
    for restore_file in files:
        if server_file_exists(cursor, restore_file.destination):
            raise RestoreError(
                "O arquivo fisico de destino ja existe e nao sera sobrescrito: "
                + restore_file.destination
            )


def restore_database(
    cursor,
    database: str,
    backup_path: str,
    backup_set: BackupSet,
    files: Sequence[RestoreFile],
) -> None:
    print("Validando a integridade logica do backup ...")
    cursor.timeout = 0
    cursor.execute(
        f"RESTORE VERIFYONLY FROM DISK = {sql_string(backup_path)} "
        f"WITH FILE = {backup_set.position};"
    )
    while cursor.nextset():
        pass

    moves = ",\n    ".join(
        f"MOVE {sql_string(item.logical_name)} TO {sql_string(item.destination)}"
        for item in files
    )
    statement = (
        f"RESTORE DATABASE {sql_identifier(database)}\n"
        f"FROM DISK = {sql_string(backup_path)}\n"
        "WITH\n"
        f"    FILE = {backup_set.position},\n"
        f"    {moves},\n"
        "    RECOVERY,\n"
        "    STATS = 5;"
    )
    print(f"Restaurando o banco novo '{database}' ...")
    cursor.execute(statement)
    while cursor.nextset():
        pass


def configure_corporate_access(
    cursor,
    database: str,
    owner_login: str,
    application_login: str,
) -> None:
    database_sql = sql_identifier(database)
    owner_sql = sql_identifier(owner_login)
    app_sql = sql_identifier(application_login)
    cursor.execute(
        f"ALTER AUTHORIZATION ON DATABASE::{database_sql} TO {owner_sql};"
    )
    statement = f"""
    USE {database_sql};
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF EXISTS (
        SELECT 1
        FROM sys.database_permissions AS permission
        INNER JOIN sys.database_principals AS principal
            ON principal.principal_id = permission.grantee_principal_id
        WHERE principal.name = {sql_string(application_login)}
          AND permission.permission_name = N'CONNECT'
          AND permission.state = N'D'
    )
        THROW 56000, 'O backup contem DENY CONNECT para o usuario da aplicacao.', 1;

    IF USER_ID({sql_string(application_login)}) IS NULL
        CREATE USER {app_sql} FOR LOGIN {app_sql} WITH DEFAULT_SCHEMA = [dbo];
    ELSE
        ALTER USER {app_sql} WITH LOGIN = {app_sql}, DEFAULT_SCHEMA = [dbo];

    IF NOT EXISTS (
        SELECT 1
        FROM sys.database_role_members AS drm
        INNER JOIN sys.database_principals AS role_principal
            ON role_principal.principal_id = drm.role_principal_id
        INNER JOIN sys.database_principals AS member_principal
            ON member_principal.principal_id = drm.member_principal_id
        WHERE role_principal.name = N'db_datareader'
          AND member_principal.name = {sql_string(application_login)}
    )
        ALTER ROLE [db_datareader] ADD MEMBER {app_sql};

    IF NOT EXISTS (
        SELECT 1
        FROM sys.database_role_members AS drm
        INNER JOIN sys.database_principals AS role_principal
            ON role_principal.principal_id = drm.role_principal_id
        INNER JOIN sys.database_principals AS member_principal
            ON member_principal.principal_id = drm.member_principal_id
        WHERE role_principal.name = N'db_datawriter'
          AND member_principal.name = {sql_string(application_login)}
    )
        ALTER ROLE [db_datawriter] ADD MEMBER {app_sql};
    """
    cursor.execute(statement)
    while cursor.nextset():
        pass


def validate_restored_database(
    cursor, database: str, application_login: str
) -> None:
    database_sql = sql_identifier(database)
    row = cursor.execute(
        f"""
        SELECT
            database_info.state_desc,
            database_info.owner_sid,
            dbo_user.sid,
            app_user.sid,
            (SELECT COUNT(*)
             FROM {database_sql}.sys.database_role_members AS drm
             INNER JOIN {database_sql}.sys.database_principals AS role_principal
                ON role_principal.principal_id = drm.role_principal_id
             INNER JOIN {database_sql}.sys.database_principals AS member_principal
                ON member_principal.principal_id = drm.member_principal_id
             WHERE member_principal.name = ?
               AND role_principal.name IN (N'db_datareader', N'db_datawriter'))
        FROM master.sys.databases AS database_info
        CROSS JOIN {database_sql}.sys.database_principals AS dbo_user
        CROSS JOIN {database_sql}.sys.database_principals AS app_user
        WHERE database_info.name = ?
          AND dbo_user.name = N'dbo'
          AND app_user.name = ?;
        """,
        application_login,
        database,
        application_login,
    ).fetchone()
    if row is None:
        raise RestoreError("Nao foi possivel validar as identidades do banco restaurado.")
    if str(row[0]) != "ONLINE":
        raise RestoreError(f"O banco restaurado nao esta ONLINE: {row[0]}")
    if bytes(row[1]) != EXPECTED_OWNER_SID or bytes(row[2]) != EXPECTED_OWNER_SID:
        raise RestoreError("owner_sid ou SID de dbo nao corresponde ao SID corporativo.")
    if bytes(row[3]) != EXPECTED_APPLICATION_SID:
        raise RestoreError("O SID de s531902 nao corresponde ao SID corporativo.")
    if int(row[4]) != 2:
        raise RestoreError("s531902 nao possui db_datareader e db_datawriter.")

    print("Executando DBCC CHECKDB ...")
    cursor.timeout = 0
    cursor.execute(f"DBCC CHECKDB ({sql_string(database)}) WITH NO_INFOMSGS;")
    while cursor.nextset():
        pass


def print_plan(args: argparse.Namespace) -> None:
    local_status = "encontrado" if args.backup_local.is_file() else "NAO encontrado"
    print("PLANO DE RESTAURACAO (nenhuma alteracao executada)")
    print(f"Servidor:             {args.servidor}")
    print(f"Banco novo:           {args.banco}")
    print(f"Backup local:         {args.backup_local} ({local_status})")
    print(f"Backup no SQL Server: {args.backup_servidor}")
    print(f"Origem esperada:      {args.banco_origem_esperado}")
    print(f"Proprietario:         {args.owner_login}")
    print(f"Usuario da aplicacao: {args.application_login}")
    print(f"Copiar backup:        {'sim' if args.copiar_backup else 'nao'}")
    print()
    print("Para conectar, validar e restaurar, execute novamente com --executar.")


def execute(args: argparse.Namespace) -> None:
    sql_identifier(args.banco)
    sql_identifier(args.owner_login)
    sql_identifier(args.application_login)
    if not args.executar:
        print_plan(args)
        return
    if args.copiar_backup and not args.backup_local.is_file():
        raise RestoreError(f"Backup local nao encontrado: {args.backup_local}")

    driver = choose_driver(args.driver)
    print(f"Conectando a {args.servidor} com {driver} e autenticacao integrada ...")
    connection = connect_master(args, driver)
    try:
        cursor = connection.cursor()
        info = server_information(cursor)
        print(f"Instancia: {info['server']} | SQL Server {info['version']}")
        validate_server_permissions(info)
        ensure_target_absent(cursor, args.banco)
        validate_login(cursor, args.owner_login, EXPECTED_OWNER_SID, "proprietario")
        validate_login(
            cursor,
            args.application_login,
            EXPECTED_APPLICATION_SID,
            "da aplicacao",
        )
        maybe_copy_backup(args, cursor, info)
        if not server_file_exists(cursor, args.backup_servidor):
            raise RestoreError(
                "O servico do SQL Server nao encontrou o backup em "
                f"'{args.backup_servidor}'. Copie o arquivo para o servidor e "
                "garanta permissao de leitura para a conta do servico."
            )

        backup_set = select_backup_set(
            cursor, args.backup_servidor, args.backup_set
        )
        validate_backup_source(backup_set, args.banco_origem_esperado)
        data_directory, log_directory = default_directories(cursor, args, info)
        restore_files = build_restore_files(
            cursor,
            args.backup_servidor,
            backup_set,
            args.banco,
            data_directory,
            log_directory,
        )
        ensure_target_absent(cursor, args.banco)
        verify_destinations_absent(cursor, restore_files)

        print(f"Backup de origem: {backup_set.database_name or '(sem nome)'}")
        print(f"Conjunto: {backup_set.position} | Finalizado: {backup_set.backup_finish_date}")
        print(f"Checksum no backup: {'sim' if backup_set.has_checksums else 'nao'}")
        for item in restore_files:
            print(f"MOVE {item.logical_name} -> {item.destination}")

        restore_database(
            cursor, args.banco, args.backup_servidor, backup_set, restore_files
        )
        print("Configurando owner/dbo e acesso corporativo ...")
        configure_corporate_access(
            cursor, args.banco, args.owner_login, args.application_login
        )
        validate_restored_database(cursor, args.banco, args.application_login)
    except Exception as exc:
        try:
            created = scalar(connection.cursor(), "SELECT DB_ID(?)", args.banco)
        except Exception:
            created = None
        if created is not None:
            print(
                f"ATENCAO: o banco '{args.banco}' existe apos a falha e foi "
                "preservado para diagnostico. O script nunca o remove automaticamente.",
                file=sys.stderr,
            )
        raise exc
    finally:
        connection.close()

    print()
    print("RESTAURACAO CONCLUIDA")
    print(f"Banco novo: {args.banco}")
    print(f"Servidor:   {args.servidor}")
    print("DBCC CHECKDB, owner/dbo, SID e papeis de s531902 validados.")


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        execute(args)
        return 0
    except (RestoreError, OSError) as exc:
        print(f"ERRO: {exc}", file=sys.stderr)
        if args.debug:
            raise
        return 1
    except Exception as exc:
        print(f"ERRO INESPERADO: {exc}", file=sys.stderr)
        if args.debug:
            raise
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
