<?php

return array(
    'app_env' => 'local',
    'app_base_path' => '/estrategia',

    'db_driver' => 'sqlsrv',
    'db_host' => 'DF7436SR439',
    'db_database' => 'DB5319_IndicadoresEstrategicos',
    'db_auth_mode' => 'sql',
    'db_username' => 's531902',
    'db_password' => 'Gelot02',

    'auth_provider' => 'legacy_file',
    'ldap_legacy_path' => dirname(APP_ROOT) . '/acessoldap/LDAP.php',
    'auth_require_caixa_loterias_unit' => true,

    'diagnostico_php_version' => '',
);
