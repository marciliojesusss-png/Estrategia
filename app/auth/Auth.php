<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Session.php';
require_once __DIR__ . '/../core/Csrf.php';
require_once __DIR__ . '/../core/Logger.php';

final class Auth
{
    const DEFAULT_PROFILE = 'usuario_companhia';

    private static $authenticated = false;
    private static $profileLabels = array(
        'usuario_companhia' => 'Usuario Companhia',
        'unidade_apuradora' => 'Unidade Apuradora',
        'homologador' => 'Diretoria Homologadora',
        'administrador' => 'Administrador',
    );
    private static $localUsers = array(
        'C000001' => array('matricula' => 'C000001', 'nome' => 'Administrador Local', 'funcao' => 'Desenvolvimento', 'unidade' => 'LOCAL', 'sg_unidade' => 'GERAL', 'no_unidade' => 'Ambiente Local'),
        'C000002' => array('matricula' => 'C000002', 'nome' => 'Unidade Apuradora Local', 'funcao' => 'Desenvolvimento', 'unidade' => 'SUCOL', 'sg_unidade' => 'SUCOL', 'no_unidade' => 'Unidade SUCOL'),
        'C000003' => array('matricula' => 'C000003', 'nome' => 'Homologador Local', 'funcao' => 'Desenvolvimento', 'unidade' => 'DIFIR', 'sg_unidade' => 'DIFIR', 'no_unidade' => 'Diretoria DIFIR'),
        'C000004' => array('matricula' => 'C000004', 'nome' => 'Usuario Companhia Local', 'funcao' => 'Desenvolvimento', 'unidade' => 'CAIXA', 'sg_unidade' => 'CAIXA', 'no_unidade' => 'CAIXA Loterias'),
    );

    public static function authenticate()
    {
        Session::start();
        if (self::$authenticated && !empty($_SESSION['matricula'])) {
            return self::sessionUser();
        }
        if (empty($_SESSION['_auth_initialized'])) {
            Session::regenerate();
            $_SESSION['_auth_initialized'] = true;
        }
        $corporate = self::loadCorporateData();
        $matricula = trim(isset($corporate['matricula']) ? (string) $corporate['matricula'] : '');
        if ($matricula === '') {
            self::deny('Usuario corporativo nao identificado.');
        }
        $access = self::findAccess($matricula);
        if ($access === null && !self::isLocalEnvironment()) {
            self::deny('Usuario sem acesso cadastrado.');
        }
        if ($access === null) {
            $access = self::localAccess($matricula);
        }
        $profile = self::normalizeProfile(isset($access['perfil']) ? $access['perfil'] : self::DEFAULT_PROFILE);
        $_SESSION['matricula'] = $matricula;
        $_SESSION['nome'] = isset($access['nome']) ? (string) $access['nome'] : (isset($corporate['nome']) ? (string) $corporate['nome'] : $matricula);
        $_SESSION['funcao'] = isset($corporate['funcao']) ? (string) $corporate['funcao'] : '';
        $_SESSION['unidade'] = isset($corporate['unidade']) ? (string) $corporate['unidade'] : '';
        $_SESSION['sg_unidade'] = isset($access['sg_unidade']) ? (string) $access['sg_unidade'] : (isset($corporate['sg_unidade']) ? (string) $corporate['sg_unidade'] : '');
        $_SESSION['no_unidade'] = isset($access['no_unidade']) ? (string) $access['no_unidade'] : (isset($corporate['no_unidade']) ? (string) $corporate['no_unidade'] : '');
        $_SESSION['perfil'] = $profile;
        $_SESSION['unidade_apuradora'] = isset($access['unidade_apuradora']) ? (string) $access['unidade_apuradora'] : '';
        $_SESSION['diretoria_responsavel'] = isset($access['diretoria_responsavel']) ? (string) $access['diretoria_responsavel'] : '';
        if (empty($_SESSION['_access_logged'])) {
            self::logAccess();
            $_SESSION['_access_logged'] = true;
        }
        self::$authenticated = true;
        return self::sessionUser();
    }

    public static function requireProfiles(array $profiles)
    {
        $user = self::authenticate();
        $allowed = array_map(array(__CLASS__, 'normalizeProfile'), $profiles);
        if (!in_array($user['perfil'], $allowed, true)) {
            http_response_code(403);
            require APP_ROOT . '/views/erros/403.php';
            exit;
        }
        return $user;
    }

    public static function requireApiProfiles(array $profiles)
    {
        $user = self::authenticate();
        $allowed = array_map(array(__CLASS__, 'normalizeProfile'), $profiles);
        if (!in_array($user['perfil'], $allowed, true)) {
            Response::error('Perfil nao autorizado para esta operacao.', 403);
            exit;
        }
        return $user;
    }

    public static function requireAnyAuthenticated()
    {
        return self::authenticate();
    }

    public static function currentUserForFrontend()
    {
        $user = self::authenticate();
        return array(
            'id' => $user['matricula'], 'matricula' => $user['matricula'], 'nome' => $user['nome'],
            'email' => $user['matricula'], 'perfil' => self::profileLabel($user['perfil']),
            'perfilCodigo' => $user['perfil'], 'funcao' => $user['funcao'], 'unidade' => $user['unidade'],
            'sgUnidade' => $user['sg_unidade'], 'noUnidade' => $user['no_unidade'],
            'unidadeApuradora' => $user['unidade_apuradora'], 'diretoriaResponsavel' => $user['diretoria_responsavel'],
            'csrfToken' => self::csrfToken(),
        );
    }

    public static function csrfToken()
    {
        return Csrf::token();
    }

    public static function requireCsrf()
    {
        $token = isset($_SERVER['HTTP_X_CSRF_TOKEN']) ? (string) $_SERVER['HTTP_X_CSRF_TOKEN'] : '';
        if (!Csrf::validate($token)) {
            Response::error('Token CSRF invalido ou ausente.', 403);
            exit;
        }
    }

    public static function homeForProfile($profile = null)
    {
        $normalized = self::normalizeProfile($profile !== null ? $profile : (isset($_SESSION['perfil']) ? $_SESSION['perfil'] : self::DEFAULT_PROFILE));
        if ($normalized === 'unidade_apuradora') {
            return '/lancamentos';
        }
        if ($normalized === 'homologador') {
            return '/homologacoes';
        }
        return '/dashboard';
    }

    public static function scopeFilters(array $filters = array())
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

    public static function normalizeProfile($profile)
    {
        $value = strtolower(trim(str_replace(array(' ', '-'), '_', self::removeAccents((string) $profile))));
        if (in_array($value, array('administrador', 'admin', 'administrador_sistema'), true)) return 'administrador';
        if ($value === 'unidade_apuradora') return 'unidade_apuradora';
        if (in_array($value, array('homologador', 'diretoria_homologadora'), true)) return 'homologador';
        return self::DEFAULT_PROFILE;
    }

    private static function sessionUser()
    {
        return array(
            'matricula' => isset($_SESSION['matricula']) ? (string) $_SESSION['matricula'] : '',
            'nome' => isset($_SESSION['nome']) ? (string) $_SESSION['nome'] : '',
            'funcao' => isset($_SESSION['funcao']) ? (string) $_SESSION['funcao'] : '',
            'unidade' => isset($_SESSION['unidade']) ? (string) $_SESSION['unidade'] : '',
            'sg_unidade' => isset($_SESSION['sg_unidade']) ? (string) $_SESSION['sg_unidade'] : '',
            'no_unidade' => isset($_SESSION['no_unidade']) ? (string) $_SESSION['no_unidade'] : '',
            'perfil' => self::normalizeProfile(isset($_SESSION['perfil']) ? $_SESSION['perfil'] : self::DEFAULT_PROFILE),
            'unidade_apuradora' => isset($_SESSION['unidade_apuradora']) ? (string) $_SESSION['unidade_apuradora'] : '',
            'diretoria_responsavel' => isset($_SESSION['diretoria_responsavel']) ? (string) $_SESSION['diretoria_responsavel'] : '',
        );
    }

    private static function loadCorporateData()
    {
        if (is_file(LDAP_PATH)) {
            $dados = array();
            require LDAP_PATH;
            return is_array($dados) ? $dados : array();
        }
        if (!self::isLocalEnvironment()) self::deny('Autenticacao corporativa indisponivel.');
        $selected = isset($_GET['dev_user']) ? $_GET['dev_user'] : (getenv('AUTH_LOCAL_USER') ?: (isset($_SESSION['dev_user']) ? $_SESSION['dev_user'] : 'C000004'));
        $selected = strtoupper((string) $selected);
        $_SESSION['dev_user'] = $selected;
        return isset(self::$localUsers[$selected]) ? self::$localUsers[$selected] : array('matricula' => $selected, 'nome' => $selected);
    }

    private static function localAccess($matricula)
    {
        $profiles = array('C000001' => 'administrador', 'C000002' => 'unidade_apuradora', 'C000003' => 'homologador', 'C000004' => 'usuario_companhia');
        $user = isset(self::$localUsers[$matricula]) ? self::$localUsers[$matricula] : array('matricula' => $matricula, 'nome' => $matricula);
        $user['perfil'] = isset($profiles[$matricula]) ? $profiles[$matricula] : self::DEFAULT_PROFILE;
        $user['unidade_apuradora'] = $matricula === 'C000002' ? 'SUCOL' : '';
        $user['diretoria_responsavel'] = $matricula === 'C000003' ? 'DIFIR' : '';
        return $user;
    }

    private static function isLocalEnvironment()
    {
        $env = strtolower((string) APP_ENV);
        $server = strtolower(isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : '');
        return in_array($env, array('local', 'development', 'dev'), true)
            || (PHP_SAPI === 'cli-server' && in_array($server, array('localhost', '127.0.0.1'), true));
    }

    private static function findAccess($matricula)
    {
        try {
            $stmt = Database::getConnection()->prepare('SELECT * FROM usuarios_acesso WHERE matricula = :matricula AND ativo = 1');
            $stmt->execute(array(':matricula' => $matricula));
            $row = $stmt->fetch();
            return is_array($row) ? $row : null;
        } catch (Exception $error) {
            Logger::error('Falha ao consultar acesso.', array('tipo' => get_class($error)));
            if (self::isLocalEnvironment()) return null;
            throw $error;
        }
    }

    private static function logAccess()
    {
        try {
            $stmt = Database::getConnection()->prepare('INSERT INTO acessos_log (matricula, nome, perfil, sg_unidade, ip, user_agent, data_acesso) VALUES (:matricula, :nome, :perfil, :sg_unidade, :ip, :user_agent, :data_acesso)');
            $stmt->execute(array(':matricula' => $_SESSION['matricula'], ':nome' => $_SESSION['nome'], ':perfil' => $_SESSION['perfil'], ':sg_unidade' => $_SESSION['sg_unidade'], ':ip' => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : null, ':user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : null, ':data_acesso' => date('Y-m-d H:i:s')));
        } catch (Exception $error) {
            Logger::error('Falha ao registrar acesso.', array('tipo' => get_class($error)));
        }
    }

    private static function deny($message)
    {
        http_response_code(401);
        echo htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
        exit;
    }

    private static function profileLabel($profile)
    {
        $normalized = self::normalizeProfile($profile);
        return isset(self::$profileLabels[$normalized]) ? self::$profileLabels[$normalized] : self::$profileLabels[self::DEFAULT_PROFILE];
    }

    private static function removeAccents($value)
    {
        $converted = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        return $converted === false ? $value : $converted;
    }
}
