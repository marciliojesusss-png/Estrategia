import json
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
BOOTSTRAP_FILE = ROOT / "assets" / "js" / "bootstrap-data.js"
DATABASE = ROOT / "database"
DB_FILE = DATABASE / "indicadores.sqlite"
SCHEMA_FILE = DATABASE / "schema.sql"
BACKUP_DIR = DATABASE / "backups"


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def stamp():
    return datetime.now().strftime("%Y-%m-%d-%H%M")


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


def dump(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def text(value):
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return dump(value)
    return str(value)


def normalizar_situacao(value):
    if value is None:
        return None
    normalized = str(value).strip().lower()
    if normalized in {"crítico", "critico"}:
        return "Abaixo da meta"
    return value


def clean_indicator_name(value):
    raw = str(value or "").strip()
    parts = raw.split(". ", 1)
    if len(parts) == 2 and parts[0].strip().isdigit():
        return parts[1].strip()
    return raw


def competencia(item):
    if item.get("competencia"):
        return str(item["competencia"])
    ano = item.get("ano")
    mes = item.get("mes")
    if ano and mes:
        return f"{int(ano):04d}-{int(mes):02d}"
    return ""


def init_database():
    DATABASE.mkdir(exist_ok=True)
    BACKUP_DIR.mkdir(exist_ok=True)
    if DB_FILE.exists():
        backup = BACKUP_DIR / f"indicadores-backup-{stamp()}.sqlite"
        shutil.copy2(DB_FILE, backup)
    connection = sqlite3.connect(DB_FILE)
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(SCHEMA_FILE.read_text(encoding="utf-8"))
    return connection


def migrate():
    migrated_at = now_iso()
    indicadores = load_json("indicadores.json", [])
    lancamentos = load_json("lancamentos.json", [])
    homologacoes = load_json("homologacoes.json", [])
    historico = load_json("historico.json", [])
    usuarios = load_json("usuarios.json", [])
    configuracoes = {
        "planos": load_json("planos.json", []),
        "pilares": load_json("pilares.json", []),
        "unidades": load_json("unidades.json", []),
        "diretorias": load_json("diretorias.json", []),
        "metas": load_json("metas-mensais.json", []),
        "regrasIndicadores": load_json("regras-indicadores.json", []),
    }

    connection = init_database()
    cursor = connection.cursor()
    situacoes_normalizadas = 0

    for indicador in indicadores:
        cursor.execute(
            """
            INSERT OR REPLACE INTO indicadores (
              id, numero, nome, plano, pilar, unidade_apuradora, diretoria_responsavel,
              periodicidade, unidade_medida, tipo_calculo, tipo_consolidacao, meta_anual,
              formula_referencia, observacao_acompanhamento, ativo, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(indicador.get("id")),
                indicador.get("numero"),
                clean_indicator_name(indicador.get("indicador") or indicador.get("nome")),
                indicador.get("plano"),
                indicador.get("pilar"),
                indicador.get("unidadeApuradora"),
                indicador.get("diretoriaResponsavel"),
                indicador.get("periodicidade"),
                indicador.get("unidadeMedida"),
                indicador.get("tipoCalculo"),
                indicador.get("tipoConsolidacao"),
                indicador.get("metaAnualDescricao"),
                indicador.get("metrica") or indicador.get("formulaReferencia"),
                indicador.get("observacaoAcompanhamento"),
                1 if indicador.get("ativo", True) else 0,
                migrated_at,
                migrated_at,
            ),
        )

    for lancamento in lancamentos:
        lancamento_id = str(lancamento.get("id"))
        situacao_original = lancamento.get("situacaoCalculada")
        situacao_normalizada = normalizar_situacao(situacao_original)
        if situacao_normalizada != situacao_original:
            situacoes_normalizadas += 1
        cursor.execute(
            """
            INSERT OR REPLACE INTO lancamentos (
              id, indicador_id, competencia, ano, mes, trimestre, plano, pilar,
              unidade_apuradora, diretoria_responsavel, dados_entrada_json,
              resultado_calculado, resultado_oficial, meta_referencia, percentual_atingido,
              situacao, status, observacao_unidade, evidencia_id, usuario_responsavel,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                lancamento_id,
                str(lancamento.get("indicadorId")),
                competencia(lancamento),
                lancamento.get("ano"),
                lancamento.get("mes"),
                lancamento.get("trimestre"),
                lancamento.get("plano"),
                lancamento.get("pilar"),
                lancamento.get("unidadeApuradora"),
                lancamento.get("diretoriaResponsavel"),
                dump(lancamento.get("camposEntrada") or {}),
                text(lancamento.get("resultadoMensal") or lancamento.get("realizadoMensal") or lancamento.get("realizado")),
                text(lancamento.get("resultadoOficialAnual") or lancamento.get("resultadoAcumulado") or lancamento.get("resultadoMensal")),
                text(lancamento.get("metaReferencia") or lancamento.get("metaMensal")),
                text(lancamento.get("percentualAtingido") or lancamento.get("percentualAtingidoMensal")),
                situacao_normalizada,
                lancamento.get("status"),
                lancamento.get("observacaoArea") or lancamento.get("justificativa"),
                f"evidencia-{lancamento_id}" if any(lancamento.get(k) for k in ("evidencia", "linkEvidencia", "arquivoEvidencia")) else None,
                lancamento.get("preenchidoPor") or lancamento.get("enviadoPor") or lancamento.get("homologadoPor"),
                lancamento.get("dataPreenchimento") or migrated_at,
                migrated_at,
            ),
        )

        if any(lancamento.get(k) for k in ("evidencia", "linkEvidencia", "arquivoEvidencia")):
            cursor.execute(
                """
                INSERT OR REPLACE INTO evidencias (
                  id, lancamento_id, nome_arquivo, tipo_arquivo, caminho_arquivo,
                  descricao, data_upload, usuario, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    f"evidencia-{lancamento_id}",
                    lancamento_id,
                    lancamento.get("arquivoEvidencia") or lancamento.get("linkEvidencia") or "referencia-textual",
                    None,
                    lancamento.get("linkEvidencia") or lancamento.get("arquivoEvidencia"),
                    lancamento.get("evidencia"),
                    lancamento.get("dataPreenchimento") or migrated_at,
                    lancamento.get("preenchidoPor"),
                    migrated_at,
                ),
            )

    for homologacao in homologacoes:
        data_acao = homologacao.get("dataHomologacao") or homologacao.get("dataDevolucao") or migrated_at
        status = homologacao.get("status")
        acao = "homologado" if status == "Homologado" else "devolvido_para_ajuste" if status == "Devolvido para ajuste" else "enviado_para_homologacao"
        cursor.execute(
            """
            INSERT OR REPLACE INTO homologacoes (
              id, lancamento_id, acao, status_anterior, status_novo, justificativa,
              usuario, perfil_usuario, data_acao, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(homologacao.get("id")),
                str(homologacao.get("lancamentoId")),
                acao,
                None,
                status,
                homologacao.get("observacaoDiretoria"),
                homologacao.get("homologadoPor") or homologacao.get("devolvidoPor"),
                "Diretoria Homologadora",
                data_acao,
                migrated_at,
            ),
        )

    for item in historico:
        cursor.execute(
            """
            INSERT OR REPLACE INTO auditoria (
              id, entidade, entidade_id, acao, descricao, dados_anteriores_json,
              dados_novos_json, usuario, perfil_usuario, data_acao, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(item.get("id")),
                item.get("entidade"),
                text(item.get("registroId")),
                item.get("acao"),
                item.get("descricao"),
                dump(item.get("valorAnterior")) if item.get("valorAnterior") is not None else None,
                dump(item.get("valorNovo")) if item.get("valorNovo") is not None else None,
                item.get("usuario"),
                item.get("perfilUsuario"),
                item.get("dataHora") or migrated_at,
                migrated_at,
            ),
        )
        if "retific" in str(item.get("acao", "")).lower():
            cursor.execute(
                """
                INSERT OR REPLACE INTO retificacoes (
                  id, lancamento_id, versao_anterior_json, versao_nova_json,
                  justificativa, usuario, data_retificacao, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    f"retificacao-{item.get('id')}",
                    text(item.get("registroId")),
                    dump(item.get("valorAnterior")) if item.get("valorAnterior") is not None else None,
                    dump(item.get("valorNovo")) if item.get("valorNovo") is not None else None,
                    item.get("descricao"),
                    item.get("usuario"),
                    item.get("dataHora") or migrated_at,
                    migrated_at,
                ),
            )

    for usuario in usuarios:
        cursor.execute(
            """
            INSERT OR REPLACE INTO usuarios_validacao (
              id, nome, perfil, unidade, diretoria, permissoes_json, ativo, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(usuario.get("id")),
                usuario.get("nome"),
                usuario.get("perfil"),
                usuario.get("unidadeApuradora"),
                usuario.get("diretoriaResponsavel"),
                dump(usuario),
                1,
                migrated_at,
                migrated_at,
            ),
        )

    config_values = {
        "modo_validacao_local": {"modo": "sql_local", "banco": "SQLite"},
        "ano_referencia": 2026,
        "versao_base": "1.0",
        "ultima_migracao_json_sql": migrated_at,
        **configuracoes,
    }
    for key, value in config_values.items():
        cursor.execute(
            "INSERT OR REPLACE INTO configuracoes (chave, valor_json, updated_at) VALUES (?, ?, ?)",
            (key, dump(value), migrated_at),
        )

    cursor.execute(
        """
        INSERT OR REPLACE INTO backups_importacao (
          id, tipo, origem, caminho_arquivo, resumo, data_backup, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            f"migracao-json-sql-{stamp()}",
            "migracao_json_sql",
            "assets/js/bootstrap-data.js",
            str(DB_FILE.relative_to(ROOT)),
            f"{len(indicadores)} indicadores, {len(lancamentos)} lancamentos, {len(homologacoes)} homologacoes",
            migrated_at,
            migrated_at,
        ),
    )

    cursor.execute(
        """
        INSERT OR REPLACE INTO auditoria (
          id, entidade, entidade_id, acao, descricao, dados_anteriores_json,
          dados_novos_json, usuario, perfil_usuario, data_acao, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "migracao-json-sql",
            "database",
            "indicadores.sqlite",
            "migrar_json_para_sql",
            "Base JSON migrada para SQLite local versionavel.",
            None,
            dump({"indicadores": len(indicadores), "lancamentos": len(lancamentos), "homologacoes": len(homologacoes)}),
            "sistema",
            "Sistema",
            migrated_at,
            migrated_at,
        ),
    )

    if situacoes_normalizadas:
        cursor.execute(
            """
            INSERT OR REPLACE INTO auditoria (
              id, entidade, entidade_id, acao, descricao, dados_anteriores_json,
              dados_novos_json, usuario, perfil_usuario, data_acao, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                f"normalizacao-situacao-critico-{stamp()}",
                "lancamentos",
                "situacao",
                "normalizar_situacao_critico",
                "Categoria Crítico substituída por Abaixo da meta conforme orientação de gestão.",
                dump({"situacao": ["Crítico", "Critico", "crítico", "critico"]}),
                dump({"situacao": "Abaixo da meta", "registros": situacoes_normalizadas}),
                "sistema",
                "Sistema",
                migrated_at,
                migrated_at,
            ),
        )

    connection.commit()
    connection.close()
    print(f"SQLite local atualizado: {DB_FILE}")


if __name__ == "__main__":
    migrate()
