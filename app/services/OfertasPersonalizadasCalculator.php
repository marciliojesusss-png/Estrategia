<?php
declare(strict_types=1);

/** Calculadora deterministica do Indicador 01, compativel com PHP 7.1. */
final class OfertasPersonalizadasCalculator
{
    public static function calculate(array $current, $target): array
    {
        $inputs = self::inputs($current);
        $denominator = self::number(isset($inputs['baseClientesAtivosCompetencia']) ? $inputs['baseClientesAtivosCompetencia'] : null);
        $numerator = self::number(isset($inputs['clientesUnicosComOfertaPersonalizadaCompetencia']) ? $inputs['clientesUnicosComOfertaPersonalizadaCompetencia'] : null);
        $documentedResult = self::number(isset($inputs['resultadoDocumentalOfertasPersonalizadas']) ? $inputs['resultadoDocumentalOfertasPersonalizadas'] : null);
        $documentedPerformance = self::number(isset($inputs['percentualAtingidoOficialOfertasPersonalizadas']) ? $inputs['percentualAtingidoOficialOfertasPersonalizadas'] : null);
        $target = self::number($target);

        if ($target === null || $target <= 0) {
            throw new DomainException('Meta da competencia invalida para o Indicador 01.');
        }
        if (($numerator === null) !== ($denominator === null)) {
            throw new DomainException('Informe os dois componentes ou deixe ambos ausentes.');
        }
        if ($denominator !== null && $denominator <= 0) {
            throw new DomainException('A base de clientes ativos deve ser maior que zero.');
        }
        if ($numerator !== null && $numerator < 0) {
            throw new DomainException('Clientes alcancados nao pode ser negativo.');
        }
        if ($documentedResult !== null && $documentedResult < 0) {
            throw new DomainException('Resultado documental nao pode ser negativo.');
        }
        if ($documentedPerformance !== null && $documentedPerformance < 0) {
            throw new DomainException('Atingimento oficial documental nao pode ser negativo.');
        }

        $technicalResult = $numerator === null ? null : $numerator / $denominator;
        $officialResult = $documentedResult !== null ? $documentedResult : $technicalResult;
        $technicalPerformance = $technicalResult === null ? null : $technicalResult / $target;
        $officialPerformance = $documentedPerformance !== null
            ? $documentedPerformance
            : ($officialResult === null ? null : $officialResult / $target);

        return array(
            'resultado_calculado' => $technicalResult,
            'resultado_oficial' => $officialResult,
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

    private static function number($value)
    {
        if ($value === null || $value === '') return null;
        if (is_int($value) || is_float($value) || (is_string($value) && is_numeric(trim($value)))) {
            $number = (float)$value;
            return is_finite($number) ? $number : null;
        }
        return null;
    }
}
