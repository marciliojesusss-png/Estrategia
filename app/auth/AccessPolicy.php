<?php
declare(strict_types=1);

final class AccessPolicy
{
    private static $matrix = array(
        'dashboard' => array('visualizar' => array('administrador', 'homologador', 'consultor_diretoria', 'unidade_apuradora', 'usuario_companhia', 'auditor_caixa')),
        'visao_trimestral' => array('visualizar' => array('administrador', 'homologador', 'consultor_diretoria', 'unidade_apuradora', 'auditor_caixa')),
        'indicadores' => array(
            'visualizar' => array('administrador', 'homologador', 'consultor_diretoria', 'unidade_apuradora', 'usuario_companhia', 'auditor_caixa'),
            'gerenciar' => array('administrador'),
        ),
        'lancamentos' => array(
            'visualizar' => array('administrador', 'homologador', 'consultor_diretoria', 'unidade_apuradora', 'auditor_caixa'),
            'gerenciar' => array('administrador', 'unidade_apuradora'),
        ),
        'homologacoes' => array(
            'visualizar' => array('administrador', 'homologador', 'consultor_diretoria', 'unidade_apuradora', 'auditor_caixa'),
            'decidir' => array('administrador', 'homologador', 'consultor_diretoria'),
        ),
        'relatorios' => array('visualizar' => array('administrador', 'homologador', 'consultor_diretoria', 'unidade_apuradora', 'auditor_caixa')),
        'administracao' => array('gerenciar' => array('administrador')),
        'auditoria' => array('visualizar' => array('administrador', 'auditor_caixa')),
        'configuracoes' => array('gerenciar' => array('administrador')),
        'reaberturas' => array(
            'solicitar' => array('administrador', 'homologador', 'consultor_diretoria', 'unidade_apuradora'),
            'decidir' => array('administrador'),
            'reabrir' => array('administrador', 'homologador', 'consultor_diretoria'),
        ),
        'iniciativas' => array(
            'visualizar' => array('administrador', 'homologador', 'consultor_diretoria', 'unidade_apuradora', 'auditor_caixa'),
            'gerenciar' => array('administrador', 'unidade_apuradora'),
            'administrar' => array('administrador'),
            'decidir' => array('administrador', 'homologador', 'consultor_diretoria'),
            'consolidar' => array('administrador'),
        ),
    );

    public static function allows($profile, $module, $action)
    {
        $profile = Auth::normalizeProfile($profile);
        return isset(self::$matrix[$module][$action])
            && in_array($profile, self::$matrix[$module][$action], true);
    }

    public static function allowsPage($profile, $module, $action)
    {
        $profile = Auth::normalizeProfile($profile);
        if ($profile === 'usuario_companhia') {
            return $module === 'dashboard' && $action === 'visualizar';
        }
        return self::allows($profile, $module, $action);
    }

    public static function scopeAllows(array $user, array $record)
    {
        $profile = isset($user['perfil']) ? Auth::normalizeProfile($user['perfil']) : Auth::DEFAULT_PROFILE;
        if (in_array($profile, array('administrador', 'auditor_caixa'), true)) return true;
        if ($profile === 'usuario_companhia') return false;
        if ($profile === 'unidade_apuradora') {
            if (!empty($user['grupo_preenchimento']) && strtoupper((string) $user['grupo_tipo_escopo']) === 'DIRETORIA') {
                $board = self::firstScope($record, array('diretoria_responsavel', 'diretoriaResponsavel', 'diretoria_snapshot', 'diretoriaSnapshot'));
                return $board !== '' && self::sameScope($board, $user['grupo_escopo_referencia']);
            }
            $unit = isset($record['unidade_apuradora']) ? $record['unidade_apuradora'] : (isset($record['unidadeApuradora']) ? $record['unidadeApuradora'] : '');
            $scope = !empty($user['grupo_preenchimento']) ? $user['grupo_escopo_referencia'] : (isset($user['unidade_apuradora']) ? $user['unidade_apuradora'] : '');
            return $unit !== '' && self::sameScope($unit, $scope);
        }
        if (in_array($profile, array('homologador', 'consultor_diretoria'), true)) {
            $board = isset($record['diretoria_responsavel']) ? $record['diretoria_responsavel'] : (isset($record['diretoriaResponsavel']) ? $record['diretoriaResponsavel'] : '');
            return $board !== '' && self::sameScope($board, isset($user['diretoria_responsavel']) ? $user['diretoria_responsavel'] : '');
        }
        return false;
    }

    public static function allowsGeneralDashboard(array $user)
    {
        $profile = isset($user['perfil']) ? Auth::normalizeProfile($user['perfil']) : Auth::DEFAULT_PROFILE;
        return in_array($profile, array('administrador', 'homologador', 'consultor_diretoria', 'unidade_apuradora', 'auditor_caixa'), true);
    }

    public static function initiativeScopeAllows(array $user, array $record)
    {
        $profile = isset($user['perfil']) ? Auth::normalizeProfile($user['perfil']) : Auth::DEFAULT_PROFILE;
        if (in_array($profile, array('administrador', 'auditor_caixa'), true)) return true;
        if ($profile === 'usuario_companhia') return false;
        if ($profile === 'unidade_apuradora') {
            if (!empty($user['grupo_preenchimento']) && strtoupper((string) $user['grupo_tipo_escopo']) === 'DIRETORIA') {
                $board = self::firstScope($record, array('diretoria_snapshot', 'diretoria_responsavel', 'diretoriaSnapshot', 'diretoriaResponsavel'));
                return $board !== '' && self::sameScope($board, $user['grupo_escopo_referencia']);
            }
            $unit = self::firstScope($record, array('unidade_snapshot', 'unidade_responsavel', 'unidadeSnapshot', 'unidadeResponsavel'));
            $scope = !empty($user['grupo_preenchimento']) ? $user['grupo_escopo_referencia'] : (isset($user['unidade_apuradora']) ? $user['unidade_apuradora'] : '');
            return $unit !== '' && self::sameScope($unit, $scope);
        }
        if (in_array($profile, array('homologador', 'consultor_diretoria'), true)) {
            $board = self::firstScope($record, array('diretoria_snapshot', 'diretoria_responsavel', 'diretoriaSnapshot', 'diretoriaResponsavel'));
            return $board !== '' && self::sameScope($board, isset($user['diretoria_responsavel']) ? $user['diretoria_responsavel'] : '');
        }
        return false;
    }

    private static function firstScope(array $record, array $keys)
    {
        foreach ($keys as $key) {
            if (isset($record[$key]) && trim((string) $record[$key]) !== '') return (string) $record[$key];
        }
        return '';
    }

    private static function sameScope($left, $right)
    {
        return self::normalizeScope($left) === self::normalizeScope($right);
    }

    private static function normalizeScope($value)
    {
        $value = trim((string) $value);
        $converted = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        return strtoupper($converted === false ? $value : $converted);
    }
}
