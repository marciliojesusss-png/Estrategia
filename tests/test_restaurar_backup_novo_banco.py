import importlib.util
import sys
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "restaurar-backup-novo-banco.py"
SPEC = importlib.util.spec_from_file_location("restaurar_backup_novo_banco", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC is not None and SPEC.loader is not None
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class RestoreScriptTest(unittest.TestCase):
    def test_defaults_target_a_new_database(self):
        args = MODULE.parse_args([])
        self.assertEqual("DF7436SR439", args.servidor)
        self.assertEqual("Monitoramento_Estrategia", args.banco)
        self.assertFalse(args.executar)

    def test_system_database_is_rejected(self):
        with self.assertRaises(MODULE.RestoreError):
            MODULE.sql_identifier("master")

    def test_identifiers_and_strings_are_escaped(self):
        self.assertEqual("[Banco]]Teste]", MODULE.sql_identifier("Banco]Teste"))
        self.assertEqual("N'O''Brien'", MODULE.sql_string("O'Brien"))

    def test_unexpected_backup_source_is_rejected(self):
        backup_set = MODULE.BackupSet(1, "OutroBanco", None, False)
        with self.assertRaises(MODULE.RestoreError):
            MODULE.validate_backup_source(backup_set, "Estrategia")

    def test_expected_backup_source_is_case_insensitive(self):
        backup_set = MODULE.BackupSet(1, "ESTRATEGIA", None, False)
        MODULE.validate_backup_source(backup_set, "Estrategia")

    def test_physical_filename_is_sanitized(self):
        self.assertEqual("Banco_Novo", MODULE.safe_filename("Banco Novo"))


if __name__ == "__main__":
    unittest.main()
