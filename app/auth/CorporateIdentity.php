<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../core/Logger.php';
require_once __DIR__ . '/providers/IdentityProviderFactory.php';

final class CorporateIdentity
{
    public static function load($unused = null)
    {
        $remoteUser = isset($_SERVER['REMOTE_USER']) ? $_SERVER['REMOTE_USER'] : '';
        $matricula = self::normalizeRemoteUser($remoteUser);
        if ($matricula === null) {
            Logger::error('Identidade corporativa REMOTE_USER ausente ou invalida.');
            return null;
        }

        $provider = IdentityProviderFactory::create(AUTH_PROVIDER);
        return $provider->load($matricula);
    }

    public static function normalizeRemoteUser($remoteUser)
    {
        $value = trim((string) $remoteUser);
        if ($value === '') return null;

        $separator = strrpos($value, '\\');
        if ($separator !== false) $value = substr($value, $separator + 1);
        $at = strpos($value, '@');
        if ($at !== false) $value = substr($value, 0, $at);

        return self::normalizeMatricula($value);
    }

    public static function buildUserFilter($matricula)
    {
        $matricula = self::normalizeMatricula($matricula);
        if ($matricula === null || strpos(LDAP_USER_FILTER, '{matricula}') === false) return null;

        return str_replace('{matricula}', self::escapeFilterValue($matricula), LDAP_USER_FILTER);
    }

    public static function mapEntry(array $entry, $expectedMatricula)
    {
        $expectedMatricula = self::normalizeMatricula($expectedMatricula);
        if ($expectedMatricula === null) return null;

        $attributes = array(
            'matricula' => LDAP_ATTR_MATRICULA,
            'nome' => LDAP_ATTR_NOME,
            'funcao' => LDAP_ATTR_FUNCAO,
            'unidade' => LDAP_ATTR_UNIDADE,
            'sg_unidade' => LDAP_ATTR_SG_UNIDADE,
            'no_unidade' => LDAP_ATTR_NO_UNIDADE,
        );
        $identity = array();
        foreach ($attributes as $field => $attribute) {
            $value = self::entryValue($entry, $attribute);
            if ($value === '') return null;
            $identity[$field] = $value;
        }

        $identity['matricula'] = self::normalizeMatricula($identity['matricula']);
        if ($identity['matricula'] === null || $identity['matricula'] !== $expectedMatricula) return null;

        return array(
            'matricula' => $identity['matricula'],
            'nome' => $identity['nome'],
            'funcao' => $identity['funcao'],
            'unidade' => $identity['unidade'],
            'sg_unidade' => $identity['sg_unidade'],
            'no_unidade' => $identity['no_unidade'],
        );
    }

    public static function normalizeMatricula($value)
    {
        $value = strtoupper(trim((string) $value));
        return preg_match('/^[A-Z0-9._-]{2,50}$/', $value) ? $value : null;
    }

    private static function escapeFilterValue($value)
    {
        if (function_exists('ldap_escape')) return ldap_escape($value, '', LDAP_ESCAPE_FILTER);
        return strtr($value, array('\\' => '\\5c', '*' => '\\2a', '(' => '\\28', ')' => '\\29', "\0" => '\\00'));
    }

    private static function entryValue(array $entry, $attribute)
    {
        $key = strtolower(trim((string) $attribute));
        if ($key === '' || !isset($entry[$key])) return '';
        $value = $entry[$key];
        if (is_array($value)) $value = isset($value[0]) ? $value[0] : '';
        return trim((string) $value);
    }
}
