<?php
declare(strict_types=1);

/** Calculadora canônica do Indicador 23, sempre em escala de índice. */
final class RedeLotericaPeriodoEquivalenteCalculator
{
    public static function calculate(array $current, array $launches, $target): array
    {
        $target = self::number($target);
        if ($target === null || $target <= 0) {
            throw new DomainException('Meta em indice invalida para o calculo da Rede Loterica.');
        }

        $inputs = self::inputs($current);
        $baseAccumulated = self::number(isset($inputs['arrecadacaoRedeLoterica2025Acumulada']) ? $inputs['arrecadacaoRedeLoterica2025Acumulada'] : null);
        $currentAccumulated = self::number(isset($inputs['arrecadacaoRedeLotericaAcumulada2026']) ? $inputs['arrecadacaoRedeLotericaAcumulada2026'] : null);
        $hasAccumulated = $baseAccumulated !== null || $currentAccumulated !== null;

        if ($hasAccumulated) {
            if ($baseAccumulated === null || $currentAccumulated === null) {
                throw new DomainException('Informe conjuntamente os acumulados da Rede Loterica de 2025 e 2026.');
            }
            return self::fromComponents($baseAccumulated, $currentAccumulated, $target);
        }

        $currentMonth = (int)(isset($current['mes']) ? $current['mes'] : 0);
        $byMonth = array();
        $hasMonthlyComponent = false;
        foreach ($launches as $launch) {
            if (!is_array($launch)) continue;
            $month = (int)(isset($launch['mes']) ? $launch['mes'] : 0);
            if ($month <= 0 || $month > $currentMonth) continue;
            $byMonth[$month] = $launch;
            $monthInputs = self::inputs($launch);
            if (self::number(isset($monthInputs['arrecadacaoRedeLoterica2025PeriodoEquivalente']) ? $monthInputs['arrecadacaoRedeLoterica2025PeriodoEquivalente'] : null) !== null
                || self::number(isset($monthInputs['arrecadacaoRedeLotericaMes2026']) ? $monthInputs['arrecadacaoRedeLotericaMes2026'] : null) !== null) {
                $hasMonthlyComponent = true;
            }
        }
        $byMonth[$currentMonth] = $current;
        if (self::number(isset($inputs['arrecadacaoRedeLoterica2025PeriodoEquivalente']) ? $inputs['arrecadacaoRedeLoterica2025PeriodoEquivalente'] : null) !== null
            || self::number(isset($inputs['arrecadacaoRedeLotericaMes2026']) ? $inputs['arrecadacaoRedeLotericaMes2026'] : null) !== null) {
            $hasMonthlyComponent = true;
        }
        $hasCurrentMonthlyComponent = self::number(isset($inputs['arrecadacaoRedeLoterica2025PeriodoEquivalente']) ? $inputs['arrecadacaoRedeLoterica2025PeriodoEquivalente'] : null) !== null
            || self::number(isset($inputs['arrecadacaoRedeLotericaMes2026']) ? $inputs['arrecadacaoRedeLotericaMes2026'] : null) !== null;

        if ($hasMonthlyComponent) {
            $base = 0.0;
            $realized = 0.0;
            $monthlySeriesComplete = true;
            for ($month = 1; $month <= $currentMonth; $month++) {
                if (!isset($byMonth[$month])) {
                    $monthlySeriesComplete = false;
                    break;
                }
                $monthInputs = self::inputs($byMonth[$month]);
                $monthBase = self::number(isset($monthInputs['arrecadacaoRedeLoterica2025PeriodoEquivalente']) ? $monthInputs['arrecadacaoRedeLoterica2025PeriodoEquivalente'] : null);
                $monthRealized = self::number(isset($monthInputs['arrecadacaoRedeLotericaMes2026']) ? $monthInputs['arrecadacaoRedeLotericaMes2026'] : null);
                if ($monthBase === null || $monthRealized === null) {
                    $monthlySeriesComplete = false;
                    break;
                }
                $base += $monthBase;
                $realized += $monthRealized;
            }
            if ($monthlySeriesComplete) {
                return self::fromComponents($base, $realized, $target);
            }

            $documentFallback = self::fromDocumentOrNoData($current, $inputs, $target);
            if ($documentFallback['resultado_calculado'] !== null) {
                return $documentFallback;
            }
            if (!$hasCurrentMonthlyComponent) {
                return $documentFallback;
            }
            throw new DomainException('Serie mensal 2025/2026 incompleta para o acumulado equivalente da Rede Loterica.');
        }

        return self::fromDocumentOrNoData($current, $inputs, $target);
    }

    private static function fromComponents($base, $realized, $target): array
    {
        if ($base <= 0 || $realized < 0) {
            throw new DomainException('Componentes financeiros invalidos para o indice da Rede Loterica.');
        }
        $index = $realized / $base;
        $performance = $index / $target;
        return array(
            'meta_referencia' => $target,
            'resultado_calculado' => $index,
            'resultado_oficial' => $index,
            'percentual_atingido' => $performance,
            'situacao' => $index >= $target ? 'Atingido' : 'Abaixo da meta',
        );
    }

    private static function fromDocumentOrNoData(array $current, array $inputs, $target): array
    {
        $documentedResult = self::number(isset($inputs['resultadoDocumentalRedeLoterica']) ? $inputs['resultadoDocumentalRedeLoterica'] : null);
        $officialPerformance = self::number(isset($inputs['percentualAtingidoOficialRedeLoterica']) ? $inputs['percentualAtingidoOficialRedeLoterica'] : null);
        $positionType = trim((string)(isset($inputs['tipoPosicaoRedeLoterica']) ? $inputs['tipoPosicaoRedeLoterica'] : ''));
        $source = trim((string)(isset($inputs['fonteResultadoRedeLoterica']) ? $inputs['fonteResultadoRedeLoterica'] : ''));
        $scale = strtolower(trim((string)(isset($inputs['escalaResultadoDocumentalRedeLoterica']) ? $inputs['escalaResultadoDocumentalRedeLoterica'] : 'indice')));
        $hasDocument = $documentedResult !== null || $officialPerformance !== null || $positionType !== '' || $source !== '';

        if (!$hasDocument) {
            return array(
                'meta_referencia' => $target,
                'resultado_calculado' => null,
                'resultado_oficial' => null,
                'percentual_atingido' => null,
                'situacao' => null,
            );
        }

        $month = (int)(isset($current['mes']) ? $current['mes'] : 0);
        if ($positionType !== 'fechamento_trimestral' || !in_array($month, array(3, 6, 9, 12), true)) {
            throw new DomainException('Posicao documental da Rede Loterica permitida apenas no fechamento trimestral.');
        }
        if ($documentedResult === null || $officialPerformance === null || $source === '') {
            throw new DomainException('Fechamento documental requer resultado, atingimento oficial e fonte.');
        }
        if (!in_array($scale, array('indice', 'incremento'), true)) {
            throw new DomainException('Escala documental invalida para a Rede Loterica.');
        }

        $index = $scale === 'incremento' ? 1 + $documentedResult : $documentedResult;
        $performance = $index / $target;
        return array(
            'meta_referencia' => $target,
            'resultado_calculado' => $index,
            'resultado_oficial' => $index,
            'percentual_atingido' => $performance,
            'situacao' => $index >= $target ? 'Atingido' : 'Abaixo da meta',
        );
    }

    private static function inputs(array $launch): array
    {
        if (isset($launch['dados_entrada']) && is_array($launch['dados_entrada'])) return $launch['dados_entrada'];
        if (isset($launch['camposEntrada']) && is_array($launch['camposEntrada'])) return $launch['camposEntrada'];
        return array();
    }

    private static function number($value): ?float
    {
        if ($value === null || $value === '') return null;
        if (is_int($value) || is_float($value) || (is_string($value) && is_numeric(trim($value)))) {
            $number = (float)$value;
            return is_finite($number) ? $number : null;
        }
        if (!is_string($value)) return null;
        $normalized = preg_replace('/[^0-9,.-]/', '', trim($value));
        if (strpos($normalized, ',') !== false) {
            $normalized = str_replace('.', '', $normalized);
            $normalized = str_replace(',', '.', $normalized);
        }
        if (!is_numeric($normalized)) return null;
        $number = (float)$normalized;
        return is_finite($number) ? $number : null;
    }
}
