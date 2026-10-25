<?php
declare(strict_types=1);

/** Backend deterministico para a razao acumulada de canais digitais. */
final class RazaoCanaisDigitaisCalculator
{
    public static function calculate(array $current, array $launches, $target): ?array
    {
        $inputs = self::inputs($current);
        $numerator = self::number($inputs['arrecadacaoCanaisEletronicosMes'] ?? null);
        $denominator = self::number($inputs['arrecadacaoTotalProdutosLoteriasMes'] ?? null);

        // Posicoes documentais diretas nao inventam componentes inexistentes.
        if ($numerator === null && $denominator === null) return null;
        if ($numerator === null || $denominator === null) {
            throw new DomainException('Informe os dois componentes mensais para calcular a razao de canais digitais.');
        }
        if ($numerator < 0 || $denominator <= 0 || $numerator > $denominator) {
            throw new DomainException('Componentes financeiros invalidos para o calculo da razao de canais digitais.');
        }

        $target = self::number($target);
        if ($target === null || $target <= 0) {
            throw new DomainException('Meta da competencia invalida para o calculo da razao de canais digitais.');
        }

        $currentMonth = (int)($current['mes'] ?? 0);
        $byMonth = array();
        foreach ($launches as $launch) {
            if (!is_array($launch)) continue;
            $month = (int)($launch['mes'] ?? 0);
            if ($month > 0 && $month <= $currentMonth) $byMonth[$month] = $launch;
        }
        $byMonth[$currentMonth] = $current;

        $accumulatedNumerator = 0.0;
        $accumulatedDenominator = 0.0;
        for ($month = 1; $month <= $currentMonth; $month++) {
            if (!isset($byMonth[$month])) {
                throw new DomainException('Competencia anterior ausente para o calculo acumulado de canais digitais.');
            }
            $monthInputs = self::inputs($byMonth[$month]);
            $monthNumerator = self::number($monthInputs['arrecadacaoCanaisEletronicosMes'] ?? null);
            $monthDenominator = self::number($monthInputs['arrecadacaoTotalProdutosLoteriasMes'] ?? null);
            if ($monthNumerator === null || $monthDenominator === null || $monthNumerator < 0
                || $monthDenominator <= 0 || $monthNumerator > $monthDenominator) {
                throw new DomainException('Componentes mensais anteriores incompletos para o calculo acumulado de canais digitais.');
            }
            $accumulatedNumerator += $monthNumerator;
            $accumulatedDenominator += $monthDenominator;
        }

        $accumulatedNumerator = round($accumulatedNumerator, 2);
        $accumulatedDenominator = round($accumulatedDenominator, 2);
        $monthlyResult = $numerator / $denominator;
        $officialResult = $accumulatedNumerator / $accumulatedDenominator;
        $performance = $officialResult / $target;

        return array(
            'resultado_calculado' => $monthlyResult,
            'resultado_oficial' => $officialResult,
            'meta_referencia' => $target,
            'percentual_atingido' => $performance,
            'situacao' => $performance >= 1 ? 'Atingido' : 'Abaixo da meta',
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
