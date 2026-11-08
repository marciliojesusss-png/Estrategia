<?php
declare(strict_types=1);

final class LancamentosResultadosHomologadosRepository
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function save(array $snapshot): void
    {
        $currencyScale = in_array((int)$snapshot['indicadorId'], array(7,17), true) ? 2 : 12;
        $sql = 'INSERT INTO lancamentos_resultados_homologados '
            . '(lancamento_id,versao_lancamento,indicador_id,competencia,meta_oficial,'
            . 'resultado_calculado,resultado_oficial,percentual_atingido,situacao,origem_resultado,'
            . 'versao_formula,detalhes_json,homologado_por,homologado_em,created_at) '
            . 'VALUES (:lancamento,:versao,:indicador,:competencia,:meta,:calculado,:oficial,'
            . ':percentual,:situacao,:origem,:formula,:detalhes,:usuario,:homologado,:criado)';
        $stmt = $this->db->prepare($sql);
        $stmt->execute(array(
            ':lancamento' => (string) $snapshot['lancamentoId'],
            ':versao' => (int) $snapshot['versaoLancamento'],
            ':indicador' => (string) $snapshot['indicadorId'],
            ':competencia' => (string) $snapshot['competencia'],
            ':meta' => $this->decimalParameter($snapshot['metaOficial'], $currencyScale),
            ':calculado' => $this->decimalParameter($snapshot['resultadoCalculado'], $currencyScale),
            ':oficial' => $this->decimalParameter($snapshot['resultadoOficial'], $currencyScale),
            ':percentual' => $this->decimalParameter($snapshot['percentualAtingido'], 12),
            ':situacao' => $snapshot['situacao'],
            ':origem' => (string) $snapshot['origemResultado'],
            ':formula' => (string) $snapshot['versaoFormula'],
            ':detalhes' => json_encode($snapshot['detalhes'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ':usuario' => (string) $snapshot['homologadoPor'],
            ':homologado' => (string) $snapshot['homologadoEm'],
            ':criado' => (string) $snapshot['homologadoEm'],
        ));
    }

    public function exists($launchId, $version): bool
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM lancamentos_resultados_homologados WHERE lancamento_id=:id AND versao_lancamento=:versao');
        $stmt->execute(array(':id'=>(string)$launchId, ':versao'=>(int)$version));
        return (int)$stmt->fetchColumn() > 0;
    }

    public function updateValues(array $snapshot): void
    {
        $scale = in_array((int)$snapshot['indicadorId'], array(7,17), true) ? 2 : 12;
        $stmt = $this->db->prepare('UPDATE lancamentos_resultados_homologados SET meta_oficial=:meta, '
            . 'resultado_calculado=:calculado, resultado_oficial=:oficial, percentual_atingido=:percentual, '
            . 'situacao=:situacao, origem_resultado=:origem, versao_formula=:formula, detalhes_json=:detalhes '
            . 'WHERE lancamento_id=:id AND versao_lancamento=:versao');
        $stmt->execute(array(':meta'=>$this->decimalParameter($snapshot['metaOficial'],$scale),
            ':calculado'=>$this->decimalParameter($snapshot['resultadoCalculado'],$scale),
            ':oficial'=>$this->decimalParameter($snapshot['resultadoOficial'],$scale),
            ':percentual'=>$this->decimalParameter($snapshot['percentualAtingido'],12),':situacao'=>$snapshot['situacao'],
            ':origem'=>$snapshot['origemResultado'],':formula'=>$snapshot['versaoFormula'],
            ':detalhes'=>json_encode($snapshot['detalhes'],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
            ':id'=>(string)$snapshot['lancamentoId'],':versao'=>(int)$snapshot['versaoLancamento']));
    }

    public function applyCurrentSnapshots(array $launches): array
    {
        if (!$launches) return $launches;
        $keys = array();
        foreach ($launches as $launch) {
            if (!isset($launch['id'])) continue;
            $keys[(string) $launch['id'] . ':' . (int) ($launch['versaoAtual'] ?? 1)] = true;
        }
        if (!$keys) return $launches;

        $ids = array_values(array_unique(array_map(function ($launch) {
            return (string) $launch['id'];
        }, array_filter($launches, function ($launch) { return isset($launch['id']); }))));
        $params = array();
        $placeholders = array();
        foreach ($ids as $index => $id) {
            $name = ':id' . $index;
            $placeholders[] = $name;
            $params[$name] = $id;
        }
        $stmt = $this->db->prepare(
            'SELECT * FROM lancamentos_resultados_homologados WHERE lancamento_id IN ('
            . implode(',', $placeholders) . ')'
        );
        $stmt->execute($params);
        $snapshots = array();
        foreach ($stmt->fetchAll() as $row) {
            $snapshots[(string) $row['lancamento_id'] . ':' . (int) $row['versao_lancamento']] = $row;
        }

        foreach ($launches as &$launch) {
            $key = (string) ($launch['id'] ?? '') . ':' . (int) ($launch['versaoAtual'] ?? 1);
            if (!isset($snapshots[$key])) continue;
            $snapshot = $snapshots[$key];
            $launch['metaReferencia'] = $snapshot['meta_oficial'];
            $launch['resultadoMensal'] = $snapshot['resultado_calculado'];
            $launch['resultadoOficialAnual'] = $snapshot['resultado_oficial'];
            $launch['percentualAtingido'] = $snapshot['percentual_atingido'];
            $launch['situacaoCalculada'] = $snapshot['situacao'];
            $launch['snapshotHomologado'] = true;
            $launch['versaoFormulaHomologada'] = $snapshot['versao_formula'];
        }
        unset($launch);
        return $launches;
    }

    private function decimalParameter($value, $scale)
    {
        if ($value === null || $value === '') return null;
        if (!is_numeric($value)) return $value;
        return number_format((float)$value, (int)$scale, '.', '');
    }
}
