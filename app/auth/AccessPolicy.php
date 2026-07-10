<?php
declare(strict_types=1);

final class AccessPolicy
{
    private static $matrix = array(
        'dashboard' => array('visualizar' => array('administrador', 'homologador', 'unidade_apuradora', 'usuario_companhia')),
        'visao_trimestral' => array('visualizar' => array('administrador', 'homologador', 'unidade_apuradora', 'usuario_companhia')),
        'indicadores' => array(
            'visualizar' => array('administrador', 'homologador', 'unidade_apuradora', 'usuario_companhia'),
            'gerenciar' => array('administrador'),
        ),
        'lancamentos' => array(
            'visualizar' => array('administrador', 'homologador', 'unidade_apuradora'),
            'gerenciar' => array('administrador', 'unidade_apuradora'),
        ),
        'homologacoes' => array(
            'visualizar' => array('administrador', 'homologador', 'unidade_apuradora'),
            'decidir' => array('administrador', 'homologador'),
        ),
        'relatorios' => array('visualizar' => array('administrador', 'homologador', 'unidade_apuradora', 'usuario_companhia')),
        'administracao' => array('gerenciar' => array('administrador')),
        'auditoria' => array('visualizar' => array('administrador')),
        'configuracoes' => array('gerenciar' => array('administrador')),
        'reaberturas' => array(
            'solicitar' => array('administrador', 'homologador', 'unidade_apuradora'),
            'decidir' => array('administrador'),
        ),
    );

    public static function allows($profile, $module, $action)
    {
        $profile = Auth::normalizeProfile($profile);
        return isset(self::$matrix[$module][$action])
            && in_array($profile, self::$matrix[$module][$action], true);
    }

    public static function scopeAllows(array $user, array $record)
    {
        $profile = isset($user['perfil']) ? Auth::normalizeProfile($user['perfil']) : Auth::DEFAULT_PROFILE;
        if ($profile === 'administrador' || $profile === 'usuario_companhia') return true;
        if ($profile === 'unidade_apuradora') {
            $unit = isset($record['unidade_apuradora']) ? $record['unidade_apuradora'] : (isset($record['unidadeApuradora']) ? $record['unidadeApuradora'] : '');
            return $unit !== '' && self::sameScope($unit, isset($user['unidade_apuradora']) ? $user['unidade_apuradora'] : '');
        }
        if ($profile === 'homologador') {
            $board = isset($record['diretoria_responsavel']) ? $record['diretoria_responsavel'] : (isset($record['diretoriaResponsavel']) ? $record['diretoriaResponsavel'] : '');
            return $board !== '' && self::sameScope($board, isset($user['diretoria_responsavel']) ? $user['diretoria_responsavel'] : '');
        }
        return false;
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
