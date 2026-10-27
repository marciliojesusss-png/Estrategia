<?php
declare(strict_types=1);

/** Calculadora deterministica do Indicador 03, compativel com PHP 7.1. */
final class ClientesAtivosDigitaisCalculator
{
    public static function calculate(array $current, $target = 0.28): array
    {
        $inputs = self::inputs($current);
        $target = self::number($target);
        if ($target === null || $target <= 0) {
            throw new DomainException('Meta da competencia invalida para o Indicador 03.');
        }

        $qmaatuRaw = isset($inputs['qmaatu']) ? $inputs['qmaatu'] : null;
        $qmaantRaw = isset($inputs['qmaant']) ? $inputs['qmaant'] : null;
        $hasQmaatu = self::provided($qmaatuRaw);
        $hasQmaant = self::provided($qmaantRaw);
        if ($hasQmaatu !== $hasQmaant) {
            throw new DomainException('Informe QMAATU e QMAANT em conjunto ou deixe ambos ausentes.');
        }

        $qmaatu = $hasQmaatu ? self::positiveInteger($qmaatuRaw, 'QMAATU') : null;
        $qmaant = $hasQmaant ? self::positiveInteger($qmaantRaw, 'QMAANT') : null;

        $documentedRaw = isset($inputs['resultadoDocumentalClientesAtivos'])
            ? $inputs['resultadoDocumentalClientesAtivos'] : null;
        $performanceRaw = isset($inputs['percentualAtingidoOficialClientesAtivos'])
            ? $inputs['percentualAtingidoOficialClientesAtivos'] : null;
        $hasDocumented = self::provided($documentedRaw);
        $hasDocumentedPerformance = self::provided($performanceRaw);
        $documentedResult = $hasDocumented ? self::numberOrFail($documentedRaw, 'Resultado documental') : null;
        $documentedPerformance = $hasDocumentedPerformance
            ? self::numberOrFail($performanceRaw, 'Atingimento oficial documental') : null;
        $source = trim((string)(isset($inputs['fonteResultadoClientesAtivos']) ? $inputs['fonteResultadoClientesAtivos'] : ''));
        $positionType = trim((string)(isset($inputs['tipoPosicaoClientesAtivos']) ? $inputs['tipoPosicaoClientesAtivos'] : ''));

        if (($hasDocumented || $hasDocumentedPerformance) && ($source === '' || $positionType === '')) {
            throw new DomainException('Posicao documental exige natureza da posicao e fonte documental.');
        }

        if (!$hasQmaatu && !$hasDocumented) {
            return array(
                'resultado_calculado' => null,
                'resultado_oficial' => null,
                'meta_referencia' => $target,
                'percentual_atingido' => null,
                'situacao' => null,
                'atingimento_tecnico' => null,
            );
        }

        $technicalResult = $hasQmaatu ? $qmaatu / $qmaant - 1 : null;
        $technicalResultStorage = $hasQmaatu
            ? self::ratioMinusOneDecimal($qmaatu, $qmaant, 18)
            : null;
        if ($technicalResult !== null && !is_finite($technicalResult)) {
            throw new DomainException('Resultado tecnico invalido para o Indicador 03.');
        }
        $technicalPerformance = $technicalResult === null ? null : $technicalResult / $target;
        $officialResult = $documentedResult !== null ? $documentedResult : $technicalResult;
        $officialPerformance = $documentedPerformance !== null
            ? $documentedPerformance
            : ($officialResult === null ? null : $officialResult / $target);

        if (($technicalPerformance !== null && !is_finite($technicalPerformance))
            || ($officialPerformance !== null && !is_finite($officialPerformance))) {
            throw new DomainException('Atingimento invalido para o Indicador 03.');
        }

        return array(
            'resultado_calculado' => $technicalResultStorage,
            'resultado_oficial' => $documentedResult !== null ? $officialResult : $technicalResultStorage,
            'meta_referencia' => $target,
            'percentual_atingido' => $officialPerformance,
            'situacao' => $officialPerformance === null ? null : ($officialPerformance >= 1 ? 'Atingido' : 'Abaixo da meta'),
            'atingimento_tecnico' => $technicalPerformance,
        );
    }

    private static function inputs(array $launch): array
    {
        if (isset($launch['dados_entrada']) && is_array($launch['dados_entrada'])) return $launch['dados_entrada'];
        if (isset($launch['camposEntrada']) && is_array($launch['camposEntrada'])) return $launch['camposEntrada'];
        return array();
    }

    private static function provided($value): bool
    {
        return $value !== null && $value !== '';
    }

    private static function positiveInteger($value, $label): int
    {
        $number = self::numberOrFail($value, $label);
        if ($number <= 0 || floor($number) !== $number) {
            throw new DomainException($label . ' deve ser um numero inteiro maior que zero.');
        }
        return (int)$number;
    }

    private static function numberOrFail($value, $label): float
    {
        $number = self::number($value);
        if ($number === null) throw new DomainException($label . ' deve ser numerico e finito.');
        return $number;
    }

    private static function number($value)
    {
        if ($value === null || $value === '') return null;
        if (is_int($value) || is_float($value) || (is_string($value) && is_numeric(trim($value)))) {
            $number = (float)$value;
            return is_finite($number) ? $number : null;
        }
        return null;
    }

    /**
     * Serializa (numerador / denominador) - 1 sem entregar um float ao
     * driver SQLSRV, que reduz a representacao textual para seis casas.
     */
    private static function ratioMinusOneDecimal($numerator, $denominator, $scale): string
    {
        $difference = (int)$numerator - (int)$denominator;
        $negative = $difference < 0;
        $absolute = abs($difference);
        $denominator = (int)$denominator;
        $integer = intdiv($absolute, $denominator);
        $remainder = $absolute % $denominator;
        $digits = '';

        for ($position = 0; $position <= $scale; $position++) {
            $remainder *= 10;
            $digits .= (string)intdiv($remainder, $denominator);
            $remainder %= $denominator;
        }

        $fraction = substr($digits, 0, $scale);
        if ((int)$digits[$scale] >= 5) {
            $carry = 1;
            for ($position = $scale - 1; $position >= 0 && $carry === 1; $position--) {
                $digit = (int)$fraction[$position] + 1;
                $fraction[$position] = (string)($digit % 10);
                $carry = $digit >= 10 ? 1 : 0;
            }
            if ($carry === 1) $integer++;
        }

        return ($negative ? '-' : '') . $integer . '.' . $fraction;
    }
}
