<?php
declare(strict_types=1);

/** Calculadora canonica do Indicador 22, compativel com PHP 7.1. */
final class EcossistemaLotexCalculator
{
    public static function calculate(array $current): array
    {
        $inputs = self::inputs($current);
        $month = (int)(isset($current['mes']) ? $current['mes'] : 0);
        if ($month < 1 || $month > 12) {
            throw new DomainException('Competencia invalida para o Indicador 22.');
        }

        $total2025 = self::optionalNumber($inputs, 'arrTotal2025', 'ARR Total 2025');
        $lotex2025 = self::optionalNumber($inputs, 'arrEcoLotex2025', 'ARR Eco Lotex 2025');
        $marketplace2025 = self::optionalNumber($inputs, 'arrEcoMarketplace2025', 'ARR Eco Marketplace 2025');
        $total2026 = self::optionalNumber($inputs, 'arrTotal2026', 'ARR Total 2026');
        $lotex2026 = self::optionalNumber($inputs, 'arrEcoLotex2026', 'ARR Eco Lotex 2026');
        $marketplace2026 = self::optionalNumber($inputs, 'arrEcoMarketplace2026', 'ARR Eco Marketplace 2026');

        self::assertPair($total2025, $lotex2025, 'ARR Total 2025 e ARR Eco Lotex 2025');
        self::assertPair($total2026, $lotex2026, 'ARR Total 2026 e ARR Eco Lotex 2026');
        self::assertPositiveTotal($total2025, 'ARR Total 2025');
        self::assertPositiveTotal($total2026, 'ARR Total 2026');
        self::assertNonNegative($lotex2025, 'ARR Eco Lotex 2025');
        self::assertNonNegative($lotex2026, 'ARR Eco Lotex 2026');
        self::assertNonNegative($marketplace2025, 'ARR Eco Marketplace 2025');
        self::assertNonNegative($marketplace2026, 'ARR Eco Marketplace 2026');

        $reference2025 = $total2025 === null ? null : $lotex2025 / $total2025;
        $factor = self::factorForMonth($month);
        $technicalTarget = $reference2025 === null ? null : $reference2025 * $factor;
        $technicalResult = $total2026 === null ? null : $lotex2026 / $total2026;
        $technicalPerformance = $technicalResult !== null && $technicalTarget !== null && $technicalTarget > 0
            ? $technicalResult / $technicalTarget
            : null;

        $documentedResult = self::optionalNumber($inputs, 'resultadoDocumentalEcossistema', 'Resultado documental');
        $documentedPerformance = self::optionalNumber($inputs, 'percentualAtingidoOficialEcossistema', 'Atingimento documental');
        $documentedTarget = self::optionalNumber($inputs, 'metaDocumentalEcossistema', 'Meta documental');
        $positionType = trim((string)(isset($inputs['tipoPosicaoEcossistema']) ? $inputs['tipoPosicaoEcossistema'] : ''));
        $source = trim((string)(isset($inputs['fonteResultadoEcossistema']) ? $inputs['fonteResultadoEcossistema'] : ''));
        $hasDocument = $documentedResult !== null || $documentedPerformance !== null || $documentedTarget !== null || $source !== '';

        if ($hasDocument) {
            if ($positionType !== 'fechamento_trimestral' || !in_array($month, array(3, 6, 9, 12), true)) {
                throw new DomainException('Posicao documental do Indicador 22 permitida apenas no fechamento trimestral.');
            }
            if ($documentedResult === null || $documentedPerformance === null || $documentedTarget === null || $source === '') {
                throw new DomainException('Fechamento documental do Indicador 22 requer meta, resultado, atingimento e fonte.');
            }
        }

        $officialResult = $hasDocument ? $documentedResult : $technicalResult;
        $officialPerformance = $hasDocument ? $documentedPerformance : $technicalPerformance;
        $storageTarget = $technicalTarget;

        return array(
            'meta_referencia' => $storageTarget,
            'resultado_calculado' => $technicalResult,
            'resultado_oficial' => $officialResult,
            'percentual_atingido' => $officialPerformance,
            'situacao' => $officialPerformance === null ? null : ($officialPerformance >= 1 ? 'Atingido' : 'Abaixo da meta'),
            'referencia_2025' => $reference2025,
            'fator_meta' => $factor,
            'meta_tecnica' => $technicalTarget,
            'atingimento_tecnico' => $technicalPerformance,
            'resultado_oficial_documental' => $hasDocument ? $documentedResult : null,
            'percentual_atingido_oficial_documental' => $hasDocument ? $documentedPerformance : null,
        );
    }

    public static function factorForMonth($month): float
    {
        return (int)$month <= 7 ? 1.10 : 1.01;
    }

    private static function inputs(array $launch): array
    {
        if (isset($launch['dados_entrada']) && is_array($launch['dados_entrada'])) return $launch['dados_entrada'];
        if (isset($launch['camposEntrada']) && is_array($launch['camposEntrada'])) return $launch['camposEntrada'];
        return array();
    }

    private static function assertPair($first, $second, $label): void
    {
        if (($first === null) !== ($second === null)) {
            throw new DomainException('Informe ' . $label . ' em conjunto ou deixe ambos ausentes.');
        }
    }

    private static function assertPositiveTotal($value, $label): void
    {
        if ($value !== null && $value <= 0) throw new DomainException($label . ' deve ser maior que zero.');
    }

    private static function assertNonNegative($value, $label): void
    {
        if ($value !== null && $value < 0) throw new DomainException($label . ' nao pode ser negativo.');
    }

    private static function optionalNumber(array $inputs, $field, $label)
    {
        if (!array_key_exists($field, $inputs) || $inputs[$field] === null || $inputs[$field] === '') return null;
        $number = self::number($inputs[$field]);
        if ($number === null) throw new DomainException($label . ' deve ser numerico e finito.');
        return $number;
    }

    private static function number($value)
    {
        if (is_int($value) || is_float($value) || (is_string($value) && is_numeric(trim($value)))) {
            $number = (float)$value;
            return is_finite($number) ? $number : null;
        }
        return null;
    }
}
