<?php
declare(strict_types=1);

/** Backend deterministico para a posicao acumulada do Indicador 09. */
final class RazaoPixCalculator
{
    public static function calculate(array $current, array $parameters, $target): ?array
    {
        $inputs = self::inputs($current);
        $numeratorField = isset($parameters['campoNumeradorAcumulado'])
            ? (string)$parameters['campoNumeradorAcumulado']
            : 'arrecadacaoPixAcumuladaCompetencia';
        $denominatorField = isset($parameters['campoDenominadorAcumulado'])
            ? (string)$parameters['campoDenominadorAcumulado']
            : 'arrecadacaoTotalCanaisEletronicosAcumuladaCompetencia';
        $officialResultField = isset($parameters['campoResultadoOficial'])
            ? (string)$parameters['campoResultadoOficial']
            : 'resultadoOficialPix';
        $officialPerformanceField = isset($parameters['campoPercentualAtingidoOficial'])
            ? (string)$parameters['campoPercentualAtingidoOficial']
            : 'percentualAtingidoOficialPix';

        $numerator = self::number(isset($inputs[$numeratorField]) ? $inputs[$numeratorField] : null);
        $denominator = self::number(isset($inputs[$denominatorField]) ? $inputs[$denominatorField] : null);
        $officialResult = self::percentage(isset($inputs[$officialResultField]) ? $inputs[$officialResultField] : null, 1.0);
        $officialPerformance = self::percentage(
            isset($inputs[$officialPerformanceField]) ? $inputs[$officialPerformanceField] : null,
            10.0
        );
        $target = self::percentage($target, 1.0);

        if ($numerator === null && $denominator === null && $officialResult === null && $officialPerformance === null) {
            return null;
        }
        if ($target === null || $target <= 0) {
            throw new DomainException('Meta da competencia invalida para o calculo da razao PIX.');
        }

        $month = (int)(isset($current['mes']) ? $current['mes'] : 0);
        $closingMonths = isset($parameters['mesesFechamentoTrimestral']) && is_array($parameters['mesesFechamentoTrimestral'])
            ? array_map('intval', $parameters['mesesFechamentoTrimestral'])
            : array(3, 6, 9, 12);
        $isClosing = in_array($month, $closingMonths, true);

        if ($numerator === null || $denominator === null) {
            if ($officialResult === null && $officialPerformance === null) {
                throw new DomainException('Informe os dois componentes acumulados para calcular a razao PIX.');
            }
            $performance = $officialPerformance !== null
                ? $officialPerformance
                : ($officialResult === null ? null : $officialResult / $target);
            return array(
                'resultado_calculado' => null,
                'resultado_oficial' => $officialResult,
                'meta_referencia' => $target,
                'percentual_atingido' => $performance,
                'situacao' => $isClosing ? self::situation($performance) : 'Em acompanhamento',
            );
        }

        if ($numerator < 0 || $denominator <= 0 || $numerator > $denominator) {
            throw new DomainException('Componentes acumulados invalidos para o calculo da razao PIX.');
        }

        // Os componentes sao posicoes acumuladas: nao somar competencias anteriores.
        $technicalResult = $numerator / $denominator;
        $technicalPerformance = $technicalResult / $target;
        $result = $officialResult !== null ? $officialResult : $technicalResult;
        $performance = $officialPerformance !== null ? $officialPerformance : $technicalPerformance;

        return array(
            'resultado_calculado' => $technicalResult,
            'resultado_oficial' => $result,
            'meta_referencia' => $target,
            'percentual_atingido' => $performance,
            'situacao' => $isClosing ? self::situation($performance) : 'Em acompanhamento',
        );
    }

    private static function inputs(array $launch): array
    {
        if (isset($launch['dados_entrada']) && is_array($launch['dados_entrada'])) return $launch['dados_entrada'];
        if (isset($launch['camposEntrada']) && is_array($launch['camposEntrada'])) return $launch['camposEntrada'];
        return array();
    }

    private static function situation($performance): string
    {
        if ($performance === null) return 'Sem calculo';
        return $performance >= 1 ? 'Atingido' : 'Abaixo da meta';
    }

    private static function percentage($value, $decimalThreshold): ?float
    {
        $number = self::number($value);
        if ($number === null) return null;
        return abs($number) > $decimalThreshold ? $number / 100 : $number;
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
