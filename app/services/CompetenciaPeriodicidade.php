<?php
declare(strict_types=1);

final class CompetenciaPeriodicidade
{
    private const MONTHS = array(
        'mensal' => array(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12),
        'trimestral' => array(3, 6, 9, 12),
        'semestral' => array(6, 12),
        'anual' => array(12),
    );

    public static function normalize($value): string
    {
        $text = strtolower(trim((string) $value));
        $text = strtr($text, array('á'=>'a','à'=>'a','â'=>'a','ã'=>'a','é'=>'e','ê'=>'e','í'=>'i','ó'=>'o','ô'=>'o','õ'=>'o','ú'=>'u','ç'=>'c'));
        return array_key_exists($text, self::MONTHS) ? $text : 'mensal';
    }

    public static function expectedMonths(array $indicator): array
    {
        $frequency = self::normalize($indicator['frequenciaCobrancaOperacional'] ?? $indicator['periodicidade'] ?? '');
        return self::MONTHS[$frequency];
    }

    public static function trackingMonths(array $indicator): array
    {
        if ((int)($indicator['id'] ?? $indicator['indicadorId'] ?? 0) === 1
            || !empty($indicator['permiteAcompanhamentoMensal'])) {
            return self::MONTHS['mensal'];
        }
        return self::expectedMonths($indicator);
    }

    public static function monthOf($competenceOrLaunch): ?int
    {
        if (is_array($competenceOrLaunch)) {
            if (isset($competenceOrLaunch['mes']) && is_numeric($competenceOrLaunch['mes'])) {
                return (int) $competenceOrLaunch['mes'];
            }
            $competenceOrLaunch = $competenceOrLaunch['competencia'] ?? '';
        }
        if (preg_match('/^\d{4}-(\d{2})$/', (string) $competenceOrLaunch, $matches)) {
            return (int) $matches[1];
        }
        return is_numeric($competenceOrLaunch) ? (int) $competenceOrLaunch : null;
    }

    public static function isExpected(array $indicator, $competenceOrLaunch): bool
    {
        $month = self::monthOf($competenceOrLaunch);
        return $month !== null && in_array($month, self::expectedMonths($indicator), true);
    }

    public static function assertExpected(array $indicator, $competenceOrLaunch): void
    {
        if (!self::isExpected($indicator, $competenceOrLaunch)) {
            throw new DomainException('A competência informada não pertence ao ciclo oficial do indicador.');
        }
    }

    public static function isTrackingAllowed(array $indicator, $competenceOrLaunch): bool
    {
        $month = self::monthOf($competenceOrLaunch);
        return $month !== null && in_array($month, self::trackingMonths($indicator), true);
    }

    public static function closingMonths(array $indicator, array $rule = array()): array
    {
        $params = isset($rule['parametrosCalculo']) && is_array($rule['parametrosCalculo'])
            ? $rule['parametrosCalculo']
            : array();
        $configured = $params['mesesFechamentoTrimestral'] ?? $rule['mesesFechamentoTrimestral'] ?? null;
        if (is_array($configured)) {
            $months = array_values(array_unique(array_filter(array_map('intval', $configured), function ($month) {
                return $month >= 1 && $month <= 12;
            })));
            if ($months !== array()) return $months;
        }
        return self::expectedMonths($indicator);
    }

    public static function isClosingCompetence(array $indicator, array $rule, $competenceOrLaunch): bool
    {
        $month = self::monthOf($competenceOrLaunch);
        return $month !== null && in_array($month, self::closingMonths($indicator, $rule), true);
    }

    public static function requiresEvidence(array $indicator, array $rule, $competenceOrLaunch): bool
    {
        if (empty($rule['exigeEvidencia'])) return false;
        $params = isset($rule['parametrosCalculo']) && is_array($rule['parametrosCalculo'])
            ? $rule['parametrosCalculo']
            : array();
        $legacyIndicator03Rule = (int)($indicator['id'] ?? $indicator['indicadorId'] ?? 0) === 3
            && !empty($params['mesesFechamentoTrimestral']);
        if (empty($rule['exigeEvidenciaNosFechamentos']) && !$legacyIndicator03Rule) return true;
        return self::isClosingCompetence($indicator, $rule, $competenceOrLaunch);
    }

    public static function assertTrackingAllowed(array $indicator, $competenceOrLaunch): void
    {
        if (!self::isTrackingAllowed($indicator, $competenceOrLaunch)) {
            throw new DomainException('A competência informada não pertence ao ciclo de acompanhamento do indicador.');
        }
    }
}
