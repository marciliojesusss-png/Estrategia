import importlib.util
import sys
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "migrar-para-sqlserver.py"
SPEC = importlib.util.spec_from_file_location("migrar_para_sqlserver", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC is not None and SPEC.loader is not None
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class MigrationScriptTest(unittest.TestCase):
    def test_defaults_use_expected_source_and_new_target(self):
        args = MODULE.parse_args([])
        self.assertEqual("Estrategia", args.banco_origem)
        self.assertEqual("Monitoramento_Estrategia", args.banco)

    def test_decimal_uses_text_affinity_to_preserve_precision(self):
        self.assertEqual("TEXT", MODULE.sqlite_affinity("decimal"))
        self.assertEqual("TEXT", MODULE.sqlite_affinity("numeric"))

    def test_identity_types_use_integer_affinity(self):
        self.assertEqual("INTEGER", MODULE.sqlite_affinity("int"))
        self.assertEqual("INTEGER", MODULE.sqlite_affinity("bit"))

    def test_datetimeoffset_is_exported_as_iso_text(self):
        expression = MODULE.sqlserver_export_expression(
            {"name": "homologado_em", "type": "datetimeoffset"}
        )
        self.assertIn("CONVERT(NVARCHAR(50)", expression)
        self.assertIn("127", expression)

    def test_composite_primary_key_is_preserved(self):
        self.assertEqual(
            ("lancamento_id", "versao_lancamento"),
            MODULE.primary_keys("lancamentos_resultados_homologados"),
        )


if __name__ == "__main__":
    unittest.main()
