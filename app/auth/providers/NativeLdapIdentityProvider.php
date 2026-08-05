<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../core/Logger.php';

final class NativeLdapIdentityProvider
{
    public function load($matricula = null)
    {
        $matricula = $matricula !== null
            ? CorporateIdentity::normalizeMatricula($matricula)
            : CorporateIdentity::normalizeRemoteUser(isset($_SERVER['REMOTE_USER']) ? $_SERVER['REMOTE_USER'] : '');

        if ($matricula === null) {
            Logger::error('[AUTH] REMOTE_USER ausente ou invalido para LDAP nativo.');
            return null;
        }
        if (!function_exists('ldap_connect')) {
            Logger::error('[AUTH] Extensao LDAP indisponivel no PHP.');
            return null;
        }
        if (LDAP_URI === '' || LDAP_BASE_DN === '' || LDAP_BIND_DN === '' || LDAP_BIND_PASSWORD === '') {
            Logger::error('[AUTH] Configuracao LDAP corporativa incompleta.');
            return null;
        }

        $isLdaps = stripos(LDAP_URI, 'ldaps://') === 0;
        if (LDAP_REQUIRE_TLS && !$isLdaps && !LDAP_STARTTLS) {
            Logger::error('[AUTH] LDAP corporativo exige canal TLS.');
            return null;
        }

        $connection = @ldap_connect(LDAP_URI);
        if ($connection === false) {
            Logger::error('[AUTH] Nao foi possivel conectar ao LDAP corporativo.');
            return null;
        }

        @ldap_set_option($connection, LDAP_OPT_PROTOCOL_VERSION, 3);
        @ldap_set_option($connection, LDAP_OPT_REFERRALS, 0);
        if (!$isLdaps && LDAP_STARTTLS && !@ldap_start_tls($connection)) {
            @ldap_close($connection);
            Logger::error('[AUTH] Nao foi possivel iniciar TLS no LDAP corporativo.');
            return null;
        }
        if (!@ldap_bind($connection, LDAP_BIND_DN, LDAP_BIND_PASSWORD)) {
            @ldap_close($connection);
            Logger::error('[AUTH] Falha de bind no LDAP corporativo.');
            return null;
        }

        $filter = CorporateIdentity::buildUserFilter($matricula);
        if ($filter === null) {
            @ldap_close($connection);
            Logger::error('[AUTH] Filtro LDAP corporativo invalido.');
            return null;
        }
        $attributes = array_values(array_unique(array(
            LDAP_ATTR_MATRICULA, LDAP_ATTR_NOME, LDAP_ATTR_FUNCAO,
            LDAP_ATTR_UNIDADE, LDAP_ATTR_SG_UNIDADE, LDAP_ATTR_NO_UNIDADE,
        )));
        $search = @ldap_search($connection, LDAP_BASE_DN, $filter, $attributes, 0, 2);
        if ($search === false) {
            @ldap_close($connection);
            Logger::error('[AUTH] Consulta ao LDAP corporativo falhou.');
            return null;
        }
        $entries = @ldap_get_entries($connection, $search);
        @ldap_close($connection);
        if (!is_array($entries) || !isset($entries['count']) || (int) $entries['count'] !== 1) {
            Logger::error('[AUTH] Matricula corporativa nao localizada de forma univoca no LDAP.');
            return null;
        }

        $identity = CorporateIdentity::mapEntry($entries[0], $matricula);
        if ($identity === null) {
            Logger::error('[AUTH] Atributos corporativos LDAP invalidos ou incompletos.');
        }
        return $identity;
    }
}
