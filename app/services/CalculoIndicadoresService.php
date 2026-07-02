<?php
declare(strict_types=1);

require_once __DIR__ . '/SituacaoService.php';

final class CalculoIndicadoresService
{
    public function normalizarSituacao(?string $situacao): ?string
    {
        return SituacaoService::normalizar($situacao);
    }

    public function calcularIndicador(array $indicador, array $dadosEntrada, string $competencia): array
    {
        return [
            'resultado_calculado' => null,
            'resultado_oficial' => null,
            'meta_referencia' => null,
            'percentual_atingido' => null,
            'situacao' => 'Sem dados',
            'detalhes_calculo' => [
                'mensagem' => 'Motor PHP preparado; cálculo oficial preservado no frontend validado nesta etapa incremental.',
                'competencia' => $competencia,
                'indicadorId' => $indicador['id'] ?? null,
            ],
        ];
    }
}
