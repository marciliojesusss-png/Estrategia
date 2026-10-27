<?php
declare(strict_types=1);

/** Calculadora deterministica do Indicador 02, compativel com PHP 7.1. */
final class NpsCalculator
{
    public static function calculate(array $current, $technicalTarget): array
    {
        $inputs = self::inputs($current);
        $positionType = isset($inputs['tipoPosicaoNPS']) ? (string)$inputs['tipoPosicaoNPS'] : '';
        $tracking = strpos($positionType, 'Acompanhamento') === 0 || $positionType === 'Revisão metodológica';
        $technicalTarget = self::number($technicalTarget);
        if ($technicalTarget === null || $technicalTarget <= 0) {
            if ($tracking) {
                return array(
                    'resultado_calculado' => null,
                    'resultado_oficial' => null,
                    'meta_referencia' => null,
                    'percentual_atingido' => null,
                    'situacao' => 'Em acompanhamento',
                    'atingimento_tecnico' => null,
                    'meta_documental' => null,
                );
            }
            throw new DomainException('Meta tecnica da competencia invalida para o NPS.');
        }

        $promoters = self::percentage(isset($inputs['percentualPromotores']) ? $inputs['percentualPromotores'] : null);
        $detractors = self::percentage(isset($inputs['percentualDetratores']) ? $inputs['percentualDetratores'] : null);
        $hasPromoters = self::provided(isset($inputs['percentualPromotores']) ? $inputs['percentualPromotores'] : null);
        $hasDetractors = self::provided(isset($inputs['percentualDetratores']) ? $inputs['percentualDetratores'] : null);

        if ($hasPromoters !== $hasDetractors) {
            throw new DomainException('Informe os percentuais de promotores e detratores em conjunto.');
        }
        if ($hasPromoters) {
            if ($promoters === null || $promoters < 0 || $promoters > 1) {
                throw new DomainException('Percentual de promotores deve estar entre 0 e 1.');
            }
            if ($detractors === null || $detractors < 0 || $detractors > 1) {
                throw new DomainException('Percentual de detratores deve estar entre 0 e 1.');
            }
            if ($promoters + $detractors > 1 + PHP_FLOAT_EPSILON) {
                throw new DomainException('A soma de promotores e detratores nao pode superar 1.');
            }
        }

        self::validateSample($inputs);

        $directResult = self::number(isset($inputs['npsApurado']) ? $inputs['npsApurado'] : null);
        $documentedResult = self::number(isset($inputs['resultadoDocumentalNPS']) ? $inputs['resultadoDocumentalNPS'] : null);
        $technicalResult = $hasPromoters ? ($promoters - $detractors) * 100 : $directResult;
        if ($technicalResult === null && $documentedResult !== null) $technicalResult = $documentedResult;
        self::validateNps($technicalResult, 'Resultado tecnico');
        self::validateNps($documentedResult, 'Resultado documental');

        $documentedTarget = self::number(isset($inputs['metaDocumentalNPS']) ? $inputs['metaDocumentalNPS'] : null);
        if ($documentedTarget !== null && $documentedTarget <= 0) {
            throw new DomainException('Meta documental do NPS deve ser maior que zero.');
        }
        $documentedPerformance = self::percentage(isset($inputs['percentualAtingidoOficialNPS']) ? $inputs['percentualAtingidoOficialNPS'] : null);
        if ($documentedPerformance !== null && $documentedPerformance < 0) {
            throw new DomainException('Atingimento documental do NPS nao pode ser negativo.');
        }

        $technicalPerformance = $technicalResult === null ? null : $technicalResult / $technicalTarget;
        $officialResult = $documentedResult !== null ? $documentedResult : $technicalResult;
        $officialTarget = $documentedTarget !== null ? $documentedTarget : $technicalTarget;
        $officialPerformance = $documentedPerformance !== null
            ? $documentedPerformance
            : ($officialResult === null ? null : $officialResult / $officialTarget);

        return array(
            'resultado_calculado' => $technicalResult,
            'resultado_oficial' => $officialResult,
            'meta_referencia' => $technicalTarget,
            'percentual_atingido' => $officialPerformance,
            'situacao' => $officialPerformance === null ? null : ($officialPerformance >= 1 ? 'Atingido' : 'Abaixo da meta'),
            'atingimento_tecnico' => $technicalPerformance,
            'meta_documental' => $documentedTarget,
        );
    }

    private static function validateSample(array $inputs): void
    {
        $names = array('totalRespondentesNPS', 'quantidadePromotoresNPS', 'quantidadeNeutrosNPS', 'quantidadeDetratoresNPS');
        $values = array();
        $provided = 0;
        foreach ($names as $name) {
            $raw = isset($inputs[$name]) ? $inputs[$name] : null;
            if (self::provided($raw)) $provided++;
            $value = self::number($raw);
            if ($value !== null && ($value < 0 || floor($value) !== $value)) {
                throw new DomainException('Componentes da amostra NPS devem ser inteiros nao negativos.');
            }
            $values[$name] = $value;
        }
        if ($provided === 0) return;
        if ($provided !== count($names)) {
            throw new DomainException('Informe a amostra NPS completa ou deixe todos os componentes vazios.');
        }
        if ($values['totalRespondentesNPS'] !== $values['quantidadePromotoresNPS']
            + $values['quantidadeNeutrosNPS'] + $values['quantidadeDetratoresNPS']) {
            throw new DomainException('Total de respondentes diverge da soma de promotores, neutros e detratores.');
        }
    }

    private static function validateNps($value, $label): void
    {
        if ($value !== null && ($value < -100 || $value > 100)) {
            throw new DomainException($label . ' do NPS deve estar entre -100 e 100 pontos.');
        }
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

    private static function percentage($value)
    {
        $number = self::number($value);
        if ($number === null) return null;
        return abs($number) > 1 ? $number / 100 : $number;
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
