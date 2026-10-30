<?php
declare(strict_types=1);

require_once __DIR__ . '/../repositories/ConfiguracoesRepository.php';
require_once __DIR__ . '/../repositories/IndicadoresRepository.php';
require_once __DIR__ . '/../repositories/LancamentosRepository.php';
require_once __DIR__ . '/../repositories/PrazosApuracaoRepository.php';

final class ResumoExecutivoDadosService
{
    private $db;
    private $configuracoes;
    private $indicadores;
    private $lancamentos;
    private $prazos;

    public function __construct($db)
    {
        $this->db = $db;
        $this->configuracoes = new ConfiguracoesRepository($db);
        $this->indicadores = new IndicadoresRepository($db);
        $this->lancamentos = new LancamentosRepository($db);
        $this->prazos = new PrazosApuracaoRepository($db);
    }

    public function dados(array $filters = array()): array
    {
        $indicadores = $this->indicadores->all($filters);
        $lancamentos = array_map(array($this, 'normalizarLancamento'), $this->lancamentos->all($filters));
        return array(
            'indicadores' => $indicadores,
            'lancamentos' => $lancamentos,
            'governancaHomologacaoAtual' => $this->governancaHomologacaoAtual($lancamentos),
            'regrasIndicadores' => $this->configuracoes->get('regrasIndicadores', array()),
            'frequenciasCobrancaOperacional' => $this->frequenciasCobrancaOperacional($indicadores),
            'prazos' => $this->prazos->all(),
            'fonte' => array(
                'tipo' => 'banco_central',
                'driver' => (string) $this->db->getAttribute(PDO::ATTR_DRIVER_NAME),
                'banco' => defined('SQLSERVER_DATABASE') ? SQLSERVER_DATABASE : '',
            ),
        );
    }

    public function dadosInstitucionais(array $filters = array()): array
    {
        return self::projecaoInstitucional($this->dados($filters));
    }

    public static function projecaoInstitucional(array $data): array
    {
        $idMap = array();
        $launches = array();
        foreach (isset($data['lancamentos']) && is_array($data['lancamentos']) ? $data['lancamentos'] : array() as $launch) {
            if (!isset($launch['status']) || $launch['status'] !== 'Homologado') continue;
            $originalId = isset($launch['id']) ? (string) $launch['id'] : '';
            $institutionalId = 'institucional-' . (string) ($launch['indicadorId'] ?? '') . '-' . (string) ($launch['competencia'] ?? '');
            if ($originalId !== '') $idMap[$originalId] = $institutionalId;
            $launch['id'] = $institutionalId;
            $launch['camposEntrada'] = array();
            unset(
                $launch['observacaoArea'],
                $launch['referenciaEvidencia'],
                $launch['evidenciaId'],
                $launch['usuarioResponsavel'],
                $launch['createdAt'],
                $launch['updatedAt']
            );
            $launches[] = $launch;
        }
        $data['lancamentos'] = $launches;

        $governance = array();
        foreach (isset($data['governancaHomologacaoAtual']) && is_array($data['governancaHomologacaoAtual']) ? $data['governancaHomologacaoAtual'] : array() as $item) {
            $originalId = isset($item['lancamentoId']) ? (string) $item['lancamentoId'] : '';
            if (!isset($idMap[$originalId])) continue;
            $item['lancamentoId'] = $idMap[$originalId];
            $governance[] = $item;
        }
        $data['governancaHomologacaoAtual'] = $governance;
        $data['prazos'] = array();
        $data['fonte'] = array('tipo' => 'institucional');
        foreach (isset($data['indicadores']) && is_array($data['indicadores']) ? $data['indicadores'] : array() as $index => $indicator) {
            unset($indicator['createdAt'], $indicator['updatedAt']);
            $data['indicadores'][$index] = $indicator;
        }
        $data['acessoInstitucional'] = true;
        return $data;
    }

    private function governancaHomologacaoAtual(array $lancamentos): array
    {
        $visible = array();
        foreach ($lancamentos as $lancamento) $visible[(string)($lancamento['id'] ?? '')] = true;
        if (!$visible) return array();
        $sql = $this->governancaHomologacaoAtualSql();
        $rows = $this->db->query($sql)->fetchAll();
        $result = array();
        foreach ($rows as $row) {
            if (!isset($visible[(string)$row['lancamento_id']])) continue;
            $result[] = array('lancamentoId' => $row['lancamento_id'], 'versao' => (int)$row['versao_lancamento']);
        }
        return $result;
    }

    private function governancaHomologacaoAtualSql(
        $lancamentosTable = 'dbo.lancamentos',
        $auditoriaTable = 'dbo.auditoria',
        $homologacoesTable = 'dbo.homologacoes',
        $retificacoesTable = 'dbo.retificacoes'
    ): string {
        return "SELECT l.id AS lancamento_id,l.versao_atual AS versao_lancamento
                FROM {$lancamentosTable} l
                WHERE l.status=N'Homologado'
                  AND EXISTS(
                    SELECT 1
                    FROM {$homologacoesTable} h
                    WHERE h.lancamento_id=l.id
                      AND h.acao=N'homologacao_lancamento'
                      AND h.status_novo=N'Homologado'
                      AND h.id=(
                        SELECT TOP 1 hx.id
                        FROM {$homologacoesTable} hx
                        WHERE hx.lancamento_id=l.id
                          AND hx.acao IN (
                            N'homologacao_lancamento',
                            N'lancamento_reaberto',
                            N'reabertura_excepcional_pos_fechamento_ca'
                          )
                        ORDER BY
                          TRY_CONVERT(datetimeoffset(7),hx.data_acao,127) DESC,
                          TRY_CONVERT(datetimeoffset(7),hx.created_at,127) DESC,
                          hx.id DESC
                      )
                  )
                  AND EXISTS(
                    SELECT 1
                    FROM {$auditoriaTable} a
                    WHERE a.entidade=N'homologacoes'
                      AND a.entidade_id=CONVERT(nvarchar(100),l.id)
                      AND a.acao=N'homologacao_lancamento'
                      AND (
                        TRY_CONVERT(int,JSON_VALUE(a.dados_novos_json,'$.lancamento.versaoAtual'))=l.versao_atual
                        OR (
                          JSON_VALUE(a.dados_novos_json,'$.lancamento.versaoAtual') IS NULL
                          AND l.versao_atual=1
                        )
                      )
                      AND NOT EXISTS(
                        SELECT 1
                        FROM {$retificacoesTable} r
                        WHERE r.lancamento_id=l.id
                          AND r.versao_nova>COALESCE(
                            TRY_CONVERT(int,JSON_VALUE(a.dados_novos_json,'$.lancamento.versaoAtual')),
                            1
                          )
                      )
                  )";
    }

    private function normalizarLancamento(array $lancamento): array
    {
        $indicatorId = (string) ($lancamento['indicadorId'] ?? '');
        if ($indicatorId !== '' && ctype_digit($indicatorId)) {
            $lancamento['indicadorId'] = (int) $indicatorId;
        }
        return $lancamento;
    }

    private function frequenciasCobrancaOperacional(array $indicadores): array
    {
        $allowed = array('mensal', 'trimestral', 'semestral', 'anual');
        $stored = $this->configuracoes->get('frequenciasCobrancaOperacional', array());
        $byIndicator = array();
        foreach (is_array($stored) ? $stored : array() as $item) {
            if (!is_array($item)) continue;
            $indicatorId = (string) ($item['indicadorId'] ?? '');
            $frequency = strtolower(trim((string) ($item['frequenciaCobrancaOperacional'] ?? '')));
            if ($indicatorId !== '' && in_array($frequency, $allowed, true)) {
                $byIndicator[$indicatorId] = $frequency;
            }
        }

        $result = array();
        foreach ($indicadores as $indicador) {
            $indicatorId = (string) ($indicador['id'] ?? '');
            if ($indicatorId === '') continue;
            $result[] = array(
                'indicadorId' => $indicador['id'],
                'frequenciaCobrancaOperacional' => $byIndicator[$indicatorId] ?? 'mensal',
            );
        }
        return $result;
    }
}
