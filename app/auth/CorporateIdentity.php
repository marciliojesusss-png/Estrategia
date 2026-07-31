<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../core/Logger.php';

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

        return self::loadFromLdap($matricula);
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

    private static function loadFromLdap($matricula)
    {
        if (!function_exists('ldap_connect')) {
            Logger::error('Extensao LDAP indisponivel no PHP.');
            return null;
        }
        if (LDAP_URI === '' || LDAP_BASE_DN === '' || LDAP_BIND_DN === '' || LDAP_BIND_PASSWORD === '') {
            Logger::error('Configuracao LDAP corporativa incompleta.');
            return null;
        }

        $isLdaps = stripos(LDAP_URI, 'ldaps://') === 0;
        if (LDAP_REQUIRE_TLS && !$isLdaps && !LDAP_STARTTLS) {
            Logger::error('LDAP corporativo exige canal TLS.');
            return null;
        }

        $connection = @ldap_connect(LDAP_URI);
        if ($connection === false) {
            Logger::error('Nao foi possivel conectar ao LDAP corporativo.');
            return null;
        }

        @ldap_set_option($connection, LDAP_OPT_PROTOCOL_VERSION, 3);
        @ldap_set_option($connection, LDAP_OPT_REFERRALS, 0);
        if (!$isLdaps && LDAP_STARTTLS && !@ldap_start_tls($connection)) {
            @ldap_close($connection);
            Logger::error('Nao foi possivel iniciar TLS no LDAP corporativo.');
            return null;
        }
        if (!@ldap_bind($connection, LDAP_BIND_DN, LDAP_BIND_PASSWORD)) {
            @ldap_close($connection);
            Logger::error('Falha de bind no LDAP corporativo.');
            return null;
        }

        $filter = self::buildUserFilter($matricula);
        if ($filter === null) {
            @ldap_close($connection);
            Logger::error('Filtro LDAP corporativo invalido.');
            return null;
        }
        $attributes = array_values(array_unique(array(
            LDAP_ATTR_MATRICULA, LDAP_ATTR_NOME, LDAP_ATTR_FUNCAO,
            LDAP_ATTR_UNIDADE, LDAP_ATTR_SG_UNIDADE, LDAP_ATTR_NO_UNIDADE,
        )));
        $search = @ldap_search($connection, LDAP_BASE_DN, $filter, $attributes, 0, 2);
        if ($search === false) {
            @ldap_close($connection);
            Logger::error('Consulta ao LDAP corporativo falhou.');
            return null;
        }
        $entries = @ldap_get_entries($connection, $search);
        @ldap_close($connection);
        if (!is_array($entries) || !isset($entries['count']) || (int) $entries['count'] !== 1) {
            Logger::error('Matricula corporativa nao localizada de forma univoca no LDAP.');
            return null;
        }

        $identity = self::mapEntry($entries[0], $matricula);
        if ($identity === null) Logger::error('Atributos corporativos LDAP invalidos ou incompletos.');
        return $identity;
    }

    private static function normalizeMatricula($value)
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
