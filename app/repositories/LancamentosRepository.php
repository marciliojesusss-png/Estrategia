<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/SituacaoService.php';

final class LancamentosRepository
{
    public function __construct(private PDO $db)
    {
    }

    public function all(array $filters = []): array
    {
        $sql = 'SELECT * FROM lancamentos WHERE 1=1';
        $params = [];
        $map = [
            'indicadorId' => 'indicador_id',
            'ano' => 'ano',
            'mes' => 'mes',
            'trimestre' => 'trimestre',
            'unidadeApuradora' => 'unidade_apuradora',
            'status' => 'status',
        ];
        foreach ($map as $key => $column) {
            if (($filters[$key] ?? '') !== '' && ($filters[$key] ?? '') !== 'Todos') {
                $sql .= " AND {$column} = :{$key}";
                $params[":{$key}"] = $filters[$key];
            }
        }
        $sql .= ' ORDER BY indicador_id, ano, mes';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'map'], $stmt->fetchAll());
    }

    public function replaceAll(array $items): void
    {
        $this->db->beginTransaction();
        $stmt = $this->db->prepare(
            'INSERT OR REPLACE INTO lancamentos (
                id, indicador_id, competencia, ano, mes, trimestre, plano, pilar,
                unidade_apuradora, diretoria_responsavel, dados_entrada_json,
                resultado_calculado, resultado_oficial, meta_referencia,
                percentual_atingido, situacao, status, observacao_unidade,
                evidencia_id, usuario_responsavel, created_at, updated_at
             ) VALUES (
                :id, :indicador_id, :competencia, :ano, :mes, :trimestre, :plano, :pilar,
                :unidade_apuradora, :diretoria_responsavel, :dados_entrada_json,
                :resultado_calculado, :resultado_oficial, :meta_referencia,
                :percentual_atingido, :situacao, :status, :observacao_unidade,
                :evidencia_id, :usuario_responsavel, :created_at, :updated_at
             )'
        );

        $now = date('c');
        foreach ($items as $item) {
            $ano = (int) ($item['ano'] ?? 2026);
            $mes = (int) ($item['mes'] ?? 1);
            $competencia = $item['competencia'] ?? sprintf('%04d-%02d', $ano, $mes);
            $stmt->execute([
                ':id' => (string) ($item['id'] ?? uniqid('lancamento-', true)),
                ':indicador_id' => (string) ($item['indicadorId'] ?? $item['indicador_id'] ?? ''),
                ':competencia' => $competencia,
                ':ano' => $ano,
                ':mes' => $mes,
                ':trimestre' => $item['trimestre'] ?? (ceil($mes / 3) . 'TRI/' . $ano),
                ':plano' => $item['plano'] ?? null,
                ':pilar' => $item['pilar'] ?? null,
                ':unidade_apuradora' => $item['unidadeApuradora'] ?? null,
                ':diretoria_responsavel' => $item['diretoriaResponsavel'] ?? null,
                ':dados_entrada_json' => json_encode($item['camposEntrada'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                ':resultado_calculado' => $this->text($item['resultadoMensal'] ?? $item['realizadoMensal'] ?? null),
                ':resultado_oficial' => $this->text($item['resultadoOficialAnual'] ?? $item['resultadoAcumulado'] ?? $item['resultadoMensal'] ?? null),
                ':meta_referencia' => $this->text($item['metaMensal'] ?? $item['metaReferencia'] ?? null),
                ':percentual_atingido' => $this->text($item['percentualAtingidoAnual'] ?? $item['percentualAtingido'] ?? $item['percentualAtingidoMensal'] ?? null),
                ':situacao' => SituacaoService::normalizar($item['situacaoCalculada'] ?? null),
                ':status' => $item['status'] ?? null,
                ':observacao_unidade' => $item['observacaoArea'] ?? $item['justificativa'] ?? null,
                ':evidencia_id' => $item['evidenciaId'] ?? null,
                ':usuario_responsavel' => $item['preenchidoPor'] ?? $item['usuarioResponsavel'] ?? null,
                ':created_at' => $item['created_at'] ?? $item['dataPreenchimento'] ?? $now,
                ':updated_at' => $now,
            ]);
        }
        $this->db->commit();
    }

    private function map(array $row): array
    {
        $campos = json_decode((string) ($row['dados_entrada_json'] ?? '{}'), true);
        if (!is_array($campos)) {
            $campos = [];
        }
        $resultado = $this->numberOrNull($row['resultado_calculado']);
        $resultadoOficial = $this->numberOrNull($row['resultado_oficial']);
        $meta = $this->numberOrNull($row['meta_referencia']);
        $percentual = $this->numberOrNull($row['percentual_atingido']);

        return [
            'id' => is_numeric($row['id']) ? (int) $row['id'] : $row['id'],
            'indicadorId' => (int) $row['indicador_id'],
            'ano' => (int) $row['ano'],
            'mes' => (int) $row['mes'],
            'nomeMes' => $this->monthName((int) $row['mes']),
            'plano' => $row['plano'],
            'pilar' => $row['pilar'],
            'unidadeApuradora' => $row['unidade_apuradora'],
            'diretoriaResponsavel' => $row['diretoria_responsavel'],
            'metaMensal' => $meta,
            'status' => $row['status'],
            'camposEntrada' => $campos,
            'realizadoMensal' => $resultado,
            'resultadoMensal' => $resultado,
            'resultadoAcumulado' => $resultadoOficial,
            'resultadoOficialAnual' => $resultadoOficial,
            'percentualAtingido' => $percentual,
            'percentualAtingidoMensal' => $percentual,
            'percentualAtingidoAcumulado' => $percentual,
            'percentualAtingidoAnual' => $percentual,
            'situacaoCalculada' => SituacaoService::normalizar($row['situacao']),
            'observacaoArea' => $row['observacao_unidade'],
            'evidenciaId' => $row['evidencia_id'],
            'preenchidoPor' => $row['usuario_responsavel'],
            'competencia' => $row['competencia'],
            'trimestre' => $row['trimestre'],
        ];
    }

    private function numberOrNull(mixed $value): ?float
    {
        return $value === null || $value === '' || !is_numeric($value) ? null : (float) $value;
    }

    private function text(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        return is_scalar($value) ? (string) $value : json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private function monthName(int $month): string
    {
        $names = [1 => 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        return $names[$month] ?? (string) $month;
    }
}
