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
