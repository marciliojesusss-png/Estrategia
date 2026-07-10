<?php
declare(strict_types=1);

require_once __DIR__ . '/BaseDadosService.php';
require_once __DIR__ . '/SituacaoService.php';

final class ResumoExecutivoService
{
    private $base;
    public function __construct(BaseDadosService $base = null) { $this->base = $base ?: new BaseDadosService(); }

    public function resumo(array $filters = []): array
    {
        $indicadores = $this->base->collection('indicadores', $filters);
        $lancamentos = $this->base->collection('lancamentos', $filters);
        $ultimos = [];
        foreach ($lancamentos as $lancamento) {
            $id = (int) $lancamento['indicadorId'];
            if (!isset($ultimos[$id]) || strcmp((string) $lancamento['competencia'], (string) $ultimos[$id]['competencia']) > 0) {
                $ultimos[$id] = $lancamento;
            }
        }

        $tabela = [];
        foreach ($indicadores as $indicador) {
            $lancamento = $ultimos[(int) $indicador['id']] ?? null;
            $situacao = SituacaoService::normalizar($lancamento['situacaoCalculada'] ?? null) ?? 'Sem dados';
            $tabela[] = [
                'indicador' => $indicador,
                'lancamento' => $lancamento,
                'pilar' => $indicador['pilar'],
                'situacao' => $situacao,
                'status' => $lancamento['status'] ?? 'Não iniciado',
                'competencia' => $lancamento['nomeMes'] ?? null,
            ];
        }

        $cards = [
            'totalIndicadores' => count($indicadores),
            'indicadoresAtingidos' => count(array_filter($tabela, function ($r) { return $r['situacao'] === 'Atingido'; })),
            'indicadoresAbaixoMeta' => count(array_filter($tabela, function ($r) { return $r['situacao'] === 'Abaixo da meta'; })),
            'indicadoresSemDados' => count(array_filter($tabela, function ($r) { return $r['situacao'] === 'Sem dados'; })),
            'indicadoresHomologados' => count(array_filter($tabela, function ($r) { return $r['status'] === 'Homologado'; })),
            'pendentesHomologacao' => count(array_filter($tabela, function ($r) { return $r['status'] === 'Enviado para homologação'; })),
        ];

        $distribuicao = [];
        foreach ($tabela as $row) {
            $pilar = $row['pilar'] ?: 'Não informado';
            if (!isset($distribuicao[$pilar])) $distribuicao[$pilar] = ['pilar' => $pilar, 'Atingido' => 0, 'Abaixo da meta' => 0, 'Sem dados' => 0];
            $key = in_array($row['situacao'], ['Atingido', 'Abaixo da meta'], true) ? $row['situacao'] : 'Sem dados';
            $distribuicao[$pilar][$key]++;
        }

        return [
            'cards' => $cards,
            'distribuicaoPorPilar' => array_values($distribuicao),
            'destaques' => array_slice($tabela, 0, 12),
            'tabelaExecutiva' => $tabela,
        ];
    }
}
