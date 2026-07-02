import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
BOOTSTRAP_FILE = ROOT / "assets" / "js" / "bootstrap-data.js"
DATABASE = ROOT / "database"
DB_FILE = DATABASE / "indicadores.sqlite"
BACKUP_DIR = DATABASE / "backups"
AUDIT_DESCRIPTION = "Categoria Crítico substituída por Abaixo da meta conforme orientação de gestão."


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def stamp():
    return datetime.now().strftime("%Y-%m-%d-%H%M%S")


def normalize_text_file(path):
    if not path.exists():
        return 0
    original = path.read_text(encoding="utf-8")
    updated = (
        original
        .replace("Crítico", "Abaixo da meta")
        .replace("Critico", "Abaixo da meta")
        .replace("crítico", "Abaixo da meta")
        .replace("critico", "Abaixo da meta")
    )
    if updated == original:
        return 0
    path.write_text(updated, encoding="utf-8")
    return original.count("Crítico") + original.count("Critico") + original.count("crítico") + original.count("critico")


def normalize_json_files():
    files = []
    if BOOTSTRAP_FILE.exists():
        files.append(BOOTSTRAP_FILE)
    if DATA.exists():
        files.extend(DATA.rglob("*.json"))
    return sum(normalize_text_file(path) for path in files)


def normalize_sqlite():
    if not DB_FILE.exists():
        return 0

    BACKUP_DIR.mkdir(exist_ok=True)
    backup = BACKUP_DIR / f"indicadores-normalizacao-situacao-{stamp()}.sqlite"
    shutil.copy2(DB_FILE, backup)

    connection = sqlite3.connect(DB_FILE)
    cursor = connection.cursor()
    cursor.execute(
        """
        UPDATE lancamentos
           SET situacao = 'Abaixo da meta',
               updated_at = ?
         WHERE lower(replace(situacao, 'í', 'i')) = 'critico'
        """,
        (now_iso(),),
    )
    updated = cursor.rowcount

    if updated:
        audit_id = f"normalizacao-situacao-critico-{stamp()}"
        cursor.execute(
            """
            INSERT OR REPLACE INTO auditoria (
              id, entidade, entidade_id, acao, descricao, dados_anteriores_json,
              dados_novos_json, usuario, perfil_usuario, data_acao, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                audit_id,
                "lancamentos",
                "situacao",
                "normalizar_situacao_critico",
                AUDIT_DESCRIPTION,
                '{"situacao":["Crítico","Critico","crítico","critico"]}',
                f'{{"situacao":"Abaixo da meta","registros":{updated},"backup":"{backup.relative_to(ROOT)}"}}',
                "sistema",
                "Sistema",
                now_iso(),
                now_iso(),
            ),
        )

    connection.commit()
    connection.close()
    return updated


def main():
    json_updates = normalize_json_files()
    sqlite_updates = normalize_sqlite()
    print(f"Normalização concluída. JSON/texto: {json_updates}; SQLite: {sqlite_updates}.")


if __name__ == "__main__":
    main()
