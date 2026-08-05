<?php
declare(strict_types=1);

require_once __DIR__ . '/LegacyIdentityProvider.php';
require_once __DIR__ . '/NativeLdapIdentityProvider.php';
require_once __DIR__ . '/../../core/Logger.php';

final class IdentityProviderFactory
{
    public static function create($provider)
    {
        $provider = strtolower(trim((string) $provider));
        if ($provider === 'legacy_file') {
            return new LegacyIdentityProvider();
        }
        if ($provider === 'native_ldap') {
            return new NativeLdapIdentityProvider();
        }

        Logger::error('[AUTH] Provedor de identidade corporativa invalido.', array('provider' => $provider));
        return new NativeLdapIdentityProvider();
    }
}
