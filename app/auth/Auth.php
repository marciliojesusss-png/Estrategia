<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/Response.php';

final class Auth
{
    private const DEFAULT_PROFILE = 'usuario_companhia';

    private const PROFILE_LABELS = [
        'usuario_companhia' => 'Usuario Companhia',
        'unidade_apuradora' => 'Unidade Apuradora',
        'homologador' => 'Diretoria Homologadora',
        'administrador' => 'Administrador',
    ];

    private const LOCAL_USERS = [
        'C000001' => ['matricula' => 'C000001', 'nome' => 'Administrador Local', 'funcao' => 'Desenvolvimento', 'unidade' => 'LOCAL', 'sg_unidade' => 'GERAL', 'no_unidade' => 'Ambiente Local'],
        'C000002' => ['matricula' => 'C000002', 'nome' => 'Unidade Apuradora Local', 'funcao' => 'Desenvolvimento', 'unidade' => 'SUCOL', 'sg_unidade' => 'SUCOL', 'no_unidade' => 'Unidade SUCOL'],
        'C000003' => ['matricula' => 'C000003', 'nome' => 'Homologador Local', 'funcao' => 'Desenvolvimento', 'unidade' => 'DIFIR', 'sg_unidade' => 'DIFIR', 'no_unidade' => 'Diretoria DIFIR'],
        'C000004' => ['matricula' => 'C000004', 'nome' => 'Usuario Companhia Local', 'funcao' => 'Desenvolvimento', 'unidade' => 'CAIXA', 'sg_unidade' => 'CAIXA', 'no_unidade' => 'CAIXA Loterias'],
    ];

    private static bool $authenticated = false;

    public static function authenticate(): array
    {
        self::startSession();

        if (self::$authenticated && isset($_SESSION['matricula'])) {
            return self::sessionUser();
        }

        self::ensureTables();
        self::seedLocalUsersIfNeeded();

        $dados = self::loadCorporateData();
        $matricula = trim((string) ($dados['matricula'] ?? ''));

        if ($matricula === '') {
            self::deny('Usuario corporativo nao identificado.');
        }

        $access = self::findAccess($matricula);
        $profile = self::normalizeProfile((string) ($access['perfil'] ?? self::DEFAULT_PROFILE));

        $_SESSION['matricula'] = $matricula;
        $_SESSION['nome'] = (string) ($access['nome'] ?? $dados['nome'] ?? $matricula);
        $_SESSION['funcao'] = (string) ($dados['funcao'] ?? '');
        $_SESSION['unidade'] = (string) ($dados['unidade'] ?? '');
        $_SESSION['sg_unidade'] = (string) ($access['sg_unidade'] ?? $dados['sg_unidade'] ?? '');
        $_SESSION['no_unidade'] = (string) ($access['no_unidade'] ?? $dados['no_unidade'] ?? '');
        $_SESSION['perfil'] = $profile;
        $_SESSION['perfil_label'] = self::profileLabel($profile);
        $_SESSION['unidade_apuradora'] = (string) ($access['unidade_apuradora'] ?? '');
        $_SESSION['diretoria_responsavel'] = (string) ($access['diretoria_responsavel'] ?? '');

        if (empty($_SESSION['acesso_log_registrado'])) {
            self::logAccess();
            $_SESSION['acesso_log_registrado'] = true;
        }

        self::$authenticated = true;
        return self::sessionUser();
    }

    public static function requireProfiles(array $profiles): array
    {
        $user = self::authenticate();
        $allowed = array_map([self::class, 'normalizeProfile'], $profiles);
        if (!in_array($user['perfil'], $allowed, true)) {
            header('Location: /resumo-executivo.php?acesso=restrito');
            exit;
        }
        return $user;
    }

    public static function requireApiProfiles(array $profiles): array
    {
        $user = self::authenticate();
        $allowed = array_map([self::class, 'normalizeProfile'], $profiles);
        if (!in_array($user['perfil'], $allowed, true)) {
            Response::error('Perfil nao autorizado para esta operacao.', 403);
            exit;
        }
        return $user;
    }

    public static function requireAnyAuthenticated(): array
    {
        return self::authenticate();
    }

    public static function currentUserForFrontend(): array
    {
        $user = self::authenticate();
        return [
            'id' => $user['matricula'],
            'matricula' => $user['matricula'],
            'nome' => $user['nome'],
            'email' => $user['matricula'],
            'perfil' => self::profileLabel($user['perfil']),
            'perfilCodigo' => $user['perfil'],
            'funcao' => $user['funcao'],
            'unidade' => $user['unidade'],
            'sgUnidade' => $user['sg_unidade'],
            'noUnidade' => $user['no_unidade'],
            'unidadeApuradora' => $user['unidade_apuradora'],
            'diretoriaResponsavel' => $user['diretoria_responsavel'],
        ];
    }

    public static function homeForProfile(?string $profile = null): string
    {
        return match (self::normalizeProfile($profile ?? (string) ($_SESSION['perfil'] ?? self::DEFAULT_PROFILE))) {
            'unidade_apuradora' => '/lancamentos.php',
            'homologador' => '/homologacao.php',
            default => '/resumo-executivo.php',
        };
    }

    public static function scopeFilters(array $filters = []): array
    {
        $user = self::authenticate();
        if ($user['perfil'] === 'unidade_apuradora' && $user['unidade_apuradora'] !== '') {
            $filters['unidade_apuradora'] = $user['unidade_apuradora'];
            $filters['unidadeApuradora'] = $user['unidade_apuradora'];
        }
        if ($user['perfil'] === 'homologador' && $user['diretoria_responsavel'] !== '') {
            $filters['diretoria_responsavel'] = $user['diretoria_responsavel'];
            $filters['diretoriaResponsavel'] = $user['diretoria_responsavel'];
        }
        return $filters;
    }

    public static function normalizeProfile(string $profile): string
    {
        $value = strtolower(trim(str_replace([' ', '-'], '_', self::removeAccents($profile))));
        return match ($value) {
            'administrador', 'admin', 'administrador_sistema' => 'administrador',
            'unidade_apuradora' => 'unidade_apuradora',
            'homologador', 'diretoria_homologadora' => 'homologador',
            default => 'usuario_companhia',
        };
    }

    private static function startSession(): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
    }

    private static function sessionUser(): array
    {
        return [
            'matricula' => (string) ($_SESSION['matricula'] ?? ''),
            'nome' => (string) ($_SESSION['nome'] ?? ''),
            'funcao' => (string) ($_SESSION['funcao'] ?? ''),
            'unidade' => (string) ($_SESSION['unidade'] ?? ''),
            'sg_unidade' => (string) ($_SESSION['sg_unidade'] ?? ''),
            'no_unidade' => (string) ($_SESSION['no_unidade'] ?? ''),
            'perfil' => self::normalizeProfile((string) ($_SESSION['perfil'] ?? self::DEFAULT_PROFILE)),
            'unidade_apuradora' => (string) ($_SESSION['unidade_apuradora'] ?? ''),
            'diretoria_responsavel' => (string) ($_SESSION['diretoria_responsavel'] ?? ''),
        ];
    }

    private static function loadCorporateData(): array
    {
        $ldapPath = LDAP_PATH;
        if (is_file($ldapPath)) {
            $dados = [];
            require $ldapPath;
            return is_array($dados) ? $dados : [];
        }

        if (!self::isLocalEnvironment()) {
            self::deny('Autenticacao corporativa indisponivel.');
        }

        $selected = (string) ($_GET['dev_user'] ?? getenv('AUTH_LOCAL_USER') ?: ($_SESSION['dev_user'] ?? 'C000004'));
        $selected = strtoupper($selected);
        $_SESSION['dev_user'] = $selected;
        if (isset(self::LOCAL_USERS[$selected])) {
            return self::LOCAL_USERS[$selected];
        }

        return [
            ...self::LOCAL_USERS['C000004'],
            'matricula' => $selected,
            'nome' => $selected,
            'unidade' => '',
            'sg_unidade' => '',
            'no_unidade' => '',
        ];
    }

    private static function isLocalEnvironment(): bool
    {
        $env = strtolower((string) APP_ENV);
        $serverName = strtolower((string) ($_SERVER['SERVER_NAME'] ?? ''));
        $remoteAddr = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
        return in_array($env, ['local', 'development', 'dev'], true)
            || PHP_SAPI === 'cli-server'
            || in_array($serverName, ['localhost', '127.0.0.1'], true)
            || in_array($remoteAddr, ['127.0.0.1', '::1'], true);
    }

    private static function ensureTables(): void
    {
        $db = Database::getConnection();
        $driver = (string) $db->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver === 'sqlsrv') {
            $db->exec("IF OBJECT_ID(N'dbo.usuarios_acesso', N'U') IS NULL BEGIN CREATE TABLE dbo.usuarios_acesso (id INT IDENTITY(1,1) NOT NULL PRIMARY KEY, matricula NVARCHAR(50) NOT NULL UNIQUE, nome NVARCHAR(255) NULL, email NVARCHAR(255) NULL, sg_unidade NVARCHAR(50) NULL, no_unidade NVARCHAR(255) NULL, perfil NVARCHAR(50) NOT NULL, unidade_apuradora NVARCHAR(255) NULL, diretoria_responsavel NVARCHAR(255) NULL, ativo BIT NOT NULL DEFAULT 1, created_at DATETIME2 NULL, updated_at DATETIME2 NULL); END;");
            $db->exec("IF OBJECT_ID(N'dbo.acessos_log', N'U') IS NULL BEGIN CREATE TABLE dbo.acessos_log (id INT IDENTITY(1,1) NOT NULL PRIMARY KEY, matricula NVARCHAR(50) NULL, nome NVARCHAR(255) NULL, perfil NVARCHAR(50) NULL, sg_unidade NVARCHAR(50) NULL, ip NVARCHAR(100) NULL, user_agent NVARCHAR(MAX) NULL, data_acesso DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()); END;");
            return;
        }

        $db->exec("CREATE TABLE IF NOT EXISTS usuarios_acesso (id INTEGER PRIMARY KEY AUTOINCREMENT, matricula TEXT NOT NULL UNIQUE, nome TEXT, email TEXT, sg_unidade TEXT, no_unidade TEXT, perfil TEXT NOT NULL, unidade_apuradora TEXT, diretoria_responsavel TEXT, ativo INTEGER DEFAULT 1, created_at TEXT, updated_at TEXT);");
        $db->exec("CREATE TABLE IF NOT EXISTS acessos_log (id INTEGER PRIMARY KEY AUTOINCREMENT, matricula TEXT, nome TEXT, perfil TEXT, sg_unidade TEXT, ip TEXT, user_agent TEXT, data_acesso TEXT);");
    }

    private static function seedLocalUsersIfNeeded(): void
    {
        if (!self::isLocalEnvironment()) {
            return;
        }

        $db = Database::getConnection();
        $count = (int) $db->query('SELECT COUNT(*) FROM usuarios_acesso')->fetchColumn();
        if ($count > 0) {
            return;
        }

        $now = date('Y-m-d H:i:s');
        $stmt = $db->prepare('INSERT INTO usuarios_acesso (matricula, nome, email, sg_unidade, no_unidade, perfil, unidade_apuradora, diretoria_responsavel, ativo, created_at, updated_at) VALUES (:matricula, :nome, :email, :sg_unidade, :no_unidade, :perfil, :unidade_apuradora, :diretoria_responsavel, :ativo, :created_at, :updated_at)');
        foreach ([
            ['C000001', 'Administrador Local', 'administrador', '', ''],
            ['C000002', 'Unidade Apuradora Local', 'unidade_apuradora', 'SUCOL', ''],
            ['C000003', 'Homologador Local', 'homologador', '', 'DIFIR'],
            ['C000004', 'Usuario Companhia Local', 'usuario_companhia', '', ''],
        ] as [$matricula, $nome, $perfil, $unidade, $diretoria]) {
            $stmt->execute([
                ':matricula' => $matricula,
                ':nome' => $nome,
                ':email' => $matricula,
                ':sg_unidade' => $unidade ?: $diretoria ?: 'LOCAL',
                ':no_unidade' => 'Ambiente Local',
                ':perfil' => $perfil,
                ':unidade_apuradora' => $unidade,
                ':diretoria_responsavel' => $diretoria,
                ':ativo' => 1,
                ':created_at' => $now,
                ':updated_at' => $now,
            ]);
        }
    }

    private static function findAccess(string $matricula): ?array
    {
        $stmt = Database::getConnection()->prepare('SELECT * FROM usuarios_acesso WHERE matricula = :matricula AND ativo = 1');
        $stmt->execute([':matricula' => $matricula]);
        $row = $stmt->fetch();
        return is_array($row) ? $row : null;
    }

    private static function logAccess(): void
    {
        $stmt = Database::getConnection()->prepare('INSERT INTO acessos_log (matricula, nome, perfil, sg_unidade, ip, user_agent, data_acesso) VALUES (:matricula, :nome, :perfil, :sg_unidade, :ip, :user_agent, :data_acesso)');
        $stmt->execute([
            ':matricula' => $_SESSION['matricula'] ?? null,
            ':nome' => $_SESSION['nome'] ?? null,
            ':perfil' => $_SESSION['perfil'] ?? null,
            ':sg_unidade' => $_SESSION['sg_unidade'] ?? null,
            ':ip' => $_SERVER['REMOTE_ADDR'] ?? null,
            ':user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            ':data_acesso' => date('Y-m-d H:i:s'),
        ]);
    }

    private static function deny(string $message): never
    {
        http_response_code(401);
        exit($message);
    }

    private static function profileLabel(string $profile): string
    {
        return self::PROFILE_LABELS[self::normalizeProfile($profile)] ?? self::PROFILE_LABELS[self::DEFAULT_PROFILE];
    }

    private static function removeAccents(string $value): string
    {
        $converted = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        return $converted === false ? $value : $converted;
    }
}
