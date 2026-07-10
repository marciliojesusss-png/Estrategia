import importlib.util
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "migrar-para-sqlserver.py"
SPEC = importlib.util.spec_from_file_location("sqlserver_migration", SCRIPT)
MIGRATION = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MIGRATION)


assert MIGRATION.MIGRATION_VERSION == "2026.07-php-views"
assert MIGRATION.normalize_json_value("2026") == "2026"
assert MIGRATION.normalize_json_value('"1.0"') == '"1.0"'
assert MIGRATION.normalize_json_value('{"ok":true}') == '{"ok":true}'

connection = sqlite3.connect(ROOT / "database" / "indicadores.sqlite")
connection.row_factory = sqlite3.Row
try:
    result = MIGRATION.validate_sqlite_source(connection)
finally:
    connection.close()

assert result["passed"], result["errors"]
print("Testes do migrador SQL Server OK")
