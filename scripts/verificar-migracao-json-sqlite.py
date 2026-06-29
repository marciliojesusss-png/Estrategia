import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
DB_FILE = ROOT / "database" / "indicadores.sqlite"
REPORT_FILE = ROOT / "database" / "migration-report.json"
BOOTSTRAP_FILE = ROOT / "assets" / "js" / "bootstrap-data.js"


BOOTSTRAP_CACHE = None


def load_bootstrap():
    global BOOTSTRAP_CACHE
    if BOOTSTRAP_CACHE is not None:
        return BOOTSTRAP_CACHE
    raw = BOOTSTRAP_FILE.read_text(encoding="utf-8").strip()
    prefix = "window.CAIXA_LOTERIAS_BOOTSTRAP_DATA = "
    if raw.startswith(prefix):
        raw = raw[len(prefix):]
    if raw.endswith(";"):
        raw = raw[:-1]
    BOOTSTRAP_CACHE = json.loads(raw)
    return BOOTSTRAP_CACHE


def load_json(name, default):
    path = DATA / name
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    key_by_name = {
        "usuarios.json": "usuarios",
        "planos.json": "planos",
        "pilares.json": "pilares",
        "unidades.json": "unidades",
        "diretorias.json": "diretorias",
        "indicadores.json": "indicadores",
        "metas-mensais.json": "metas",
        "regras-indicadores.json": "regrasIndicadores",
        "lancamentos.json": "lancamentos",
        "homologacoes.json": "homologacoes",
        "historico.json": "historico",
    }
    return load_bootstrap().get(key_by_name.get(name, ""), default)


def sha256_file(path):
    if not path.exists():
        return None
    return hashlib.sha256(path.read_bytes()).hexdigest()


def ids(values, key="id"):
    return sorted(str(item.get(key)) for item in values if item.get(key) is not None)


def competencias(values):
    result = []
    for item in values:
      indicador_id = item.get("indicadorId")
      competencia = item.get("competencia")
      if not competencia and item.get("ano") and item.get("mes"):
          competencia = f"{int(item['ano']):04d}-{int(item['mes']):02d}"
      if indicador_id is not None and competencia:
          result.append(f"{indicador_id}:{competencia}")
    return sorted(result)


def sqlite_column(connection, query):
    return [str(row[0]) for row in connection.execute(query).fetchall()]


def main():
    indicadores = load_json("indicadores.json", [])
    lancamentos = load_json("lancamentos.json", [])
    homologacoes = load_json("homologacoes.json", [])
    historico = load_json("historico.json", [])
    usuarios = load_json("usuarios.json", [])
    planos = load_json("planos.json", [])
    pilares = load_json("pilares.json", [])
    unidades = load_json("unidades.json", [])
    diretorias = load_json("diretorias.json", [])
    metas = load_json("metas-mensais.json", [])
    regras = load_json("regras-indicadores.json", [])

    connection = sqlite3.connect(DB_FILE)
    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "database": str(DB_FILE.relative_to(ROOT)),
        "databaseSha256": sha256_file(DB_FILE),
        "jsonFiles": {
            name: sha256_file(DATA / name)
            for name in [
                "usuarios.json",
                "planos.json",
                "pilares.json",
                "unidades.json",
                "diretorias.json",
                "indicadores.json",
                "metas-mensais.json",
                "regras-indicadores.json",
                "lancamentos.json",
                "homologacoes.json",
                "historico.json",
            ]
        },
        "counts": {
            "json": {
                "usuarios": len(usuarios),
                "planos": len(planos),
                "pilares": len(pilares),
                "unidades": len(unidades),
                "diretorias": len(diretorias),
                "indicadores": len(indicadores),
                "metas": len(metas),
                "regrasIndicadores": len(regras),
                "lancamentos": len(lancamentos),
                "homologacoes": len(homologacoes),
                "historico": len(historico),
            },
            "sqlite": {
                "usuarios": connection.execute("select count(*) from usuarios_validacao").fetchone()[0],
                "indicadores": connection.execute("select count(*) from indicadores").fetchone()[0],
                "lancamentos": connection.execute("select count(*) from lancamentos").fetchone()[0],
                "homologacoes": connection.execute("select count(*) from homologacoes").fetchone()[0],
                "auditoria": connection.execute("select count(*) from auditoria").fetchone()[0],
                "configuracoes": connection.execute("select count(*) from configuracoes").fetchone()[0],
            },
        },
        "checks": []
    }

    sqlite_indicadores = sorted(sqlite_column(connection, "select id from indicadores"))
    sqlite_lancamentos = sorted(
        f"{row[0]}:{row[1]}"
        for row in connection.execute("select indicador_id, competencia from lancamentos").fetchall()
    )
    sqlite_homologacoes = sorted(sqlite_column(connection, "select id from homologacoes"))
    sqlite_auditoria = sorted(sqlite_column(connection, "select id from auditoria"))
    sqlite_usuarios = sorted(sqlite_column(connection, "select id from usuarios_validacao"))

    sqlite_auditoria_sem_registro_tecnico = [item for item in sqlite_auditoria if item != "migracao-json-sql"]

    checks = [
        ("indicadores_ids", ids(indicadores), sqlite_indicadores),
        ("lancamentos_indicador_competencia", competencias(lancamentos), sqlite_lancamentos),
        ("homologacoes_ids", ids(homologacoes), sqlite_homologacoes),
        ("auditoria_ids", ids(historico), sqlite_auditoria_sem_registro_tecnico),
        ("usuarios_ids", ids(usuarios), sqlite_usuarios),
    ]

    ok = True
    for name, expected, actual in checks:
        missing = sorted(set(expected) - set(actual))
        extra = sorted(set(actual) - set(expected))
        passed = not missing and not extra
        ok = ok and passed
        report["checks"].append({
            "name": name,
            "passed": passed,
            "expectedCount": len(expected),
            "actualCount": len(actual),
            "missing": missing[:20],
            "extra": extra[:20],
        })

    report["status"] = "ok" if ok else "alertas"
    REPORT_FILE.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    connection.close()
    print(f"Relatorio gerado: {REPORT_FILE}")
    if not ok:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
