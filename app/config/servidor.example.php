<?php

return array(
    'app_env' => 'production',
    'app_base_path' => '/estrategia',

    'db_driver' => 'sqlsrv',
    'db_host' => 'SERVIDOR_SQL',
    'db_database' => 'NOME_DO_BANCO',
    'db_auth_mode' => 'sql',
    'db_username' => '',
    'db_password' => '',

    'auth_provider' => 'legacy_file',
    'ldap_legacy_path' => dirname(APP_ROOT) . '/acessoldap/LDAP.php',
);
