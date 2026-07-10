<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Session.php';
require_once __DIR__ . '/../core/Csrf.php';
require_once __DIR__ . '/../core/Logger.php';
require_once __DIR__ . '/AccessLogger.php';
require_once __DIR__ . '/CorporateIdentity.php';
require_once __DIR__ . '/AccessPolicy.php';

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
        'ADMIN' => array('matricula' => 'ADMIN', 'nome' => 'Administrador Simulado', 'perfil' => 'administrador', 'sg_unidade' => 'GERAL', 'no_unidade' => 'Escopo geral'),
        'CONSULTA' => array('matricula' => 'CONSULTA', 'nome' => 'Consulta Gestão', 'perfil' => 'usuario_companhia', 'sg_unidade' => 'GERAL', 'no_unidade' => 'Escopo geral'),
        'USUARIO-COMPANHIA' => array('matricula' => 'USUARIO-COMPANHIA', 'nome' => 'Usuário da Companhia', 'perfil' => 'usuario_companhia', 'sg_unidade' => 'GERAL', 'no_unidade' => 'CAIXA Loterias'),
        'UNIDADE-GENOL' => array('matricula' => 'UNIDADE-GENOL', 'nome' => 'Unidade GENOL', 'perfil' => 'unidade_apuradora', 'sg_unidade' => 'GENOL', 'no_unidade' => 'GENOL'),
        'UNIDADE-GERIN' => array('matricula' => 'UNIDADE-GERIN', 'nome' => 'Unidade GERIN', 'perfil' => 'unidade_apuradora', 'sg_unidade' => 'GERIN', 'no_unidade' => 'GERIN'),
        'UNIDADE-SUCOL' => array('matricula' => 'UNIDADE-SUCOL', 'nome' => 'Unidade SUCOL', 'perfil' => 'unidade_apuradora', 'sg_unidade' => 'SUCOL', 'no_unidade' => 'SUCOL'),
        'UNIDADE-SUCTF' => array('matricula' => 'UNIDADE-SUCTF', 'nome' => 'Unidade SUCTF', 'perfil' => 'unidade_apuradora', 'sg_unidade' => 'SUCTF', 'no_unidade' => 'SUCTF'),
        'UNIDADE-SULOT' => array('matricula' => 'UNIDADE-SULOT', 'nome' => 'Unidade SULOT', 'perfil' => 'unidade_apuradora', 'sg_unidade' => 'SULOT', 'no_unidade' => 'SULOT'),
        'UNIDADE-SURCI' => array('matricula' => 'UNIDADE-SURCI', 'nome' => 'Unidade SURCI', 'perfil' => 'unidade_apuradora', 'sg_unidade' => 'SURCI', 'no_unidade' => 'SURCI'),
        'DIRETORIA-DICOT' => array('matricula' => 'DIRETORIA-DICOT', 'nome' => 'Diretoria DICOT', 'perfil' => 'homologador', 'sg_unidade' => 'DICOT', 'no_unidade' => 'DICOT'),
        'DIRETORIA-DICRI' => array('matricula' => 'DIRETORIA-DICRI', 'nome' => 'Diretoria DICRI', 'perfil' => 'homologador', 'sg_unidade' => 'DICRI', 'no_unidade' => 'DICRI'),
        'DIRETORIA-DIFIR' => array('matricula' => 'DIRETORIA-DIFIR', 'nome' => 'Diretoria DIFIR', 'perfil' => 'homologador', 'sg_unidade' => 'DIFIR', 'no_unidade' => 'DIFIR'),
        'DIRETORIA-DILOT' => array('matricula' => 'DIRETORIA-DILOT', 'nome' => 'Diretoria DILOT', 'perfil' => 'homologador', 'sg_unidade' => 'DILOT', 'no_unidade' => 'DILOT'),
    );

    public static function authenticate()
    {
        Session::start();
        if (Session::consumeExpired()) {
            AccessLogger::record('sessao_expirada', array());
        }
        if (self::$authenticated && !empty($_SESSION['matricula'])) {
            return self::sessionUser();
        }
        if (self::isLocalEnvironment() && empty($_SESSION['dev_user']) && !(getenv('AUTH_LOCAL_USER') ?: '')) {
            $resource = self::requestResource();
            if (strpos($resource, '/api/') === 0) {
                self::deny('Autenticacao local necessaria.');
            }
            Response::redirect('/login');
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
        $_SESSION['unidade_apuradora'] = $profile === 'unidade_apuradora' && isset($access['sg_unidade']) ? (string) $access['sg_unidade'] : '';
        $_SESSION['diretoria_responsavel'] = $profile === 'homologador' && isset($access['sg_unidade']) ? (string) $access['sg_unidade'] : '';
        if (empty($_SESSION['_access_logged'])) {
            self::logAccess();
            $_SESSION['_access_logged'] = true;
        }
        self::$authenticated = true;
        return self::sessionUser();
    }

    public static function hasAuthenticatedSession()
    {
        Session::start();
        return !empty($_SESSION['matricula']);
    }

    public static function loginLocal($matricula)
    {
        if (!self::isLocalEnvironment()) {
            self::deny('Login local indisponivel neste ambiente.');
        }
        $matricula = strtoupper(trim((string) $matricula));
        if (!isset(self::$localUsers[$matricula])) {
            self::deny('Usuario local invalido.');
        }
        Session::start();
        unset($_SESSION['matricula'], $_SESSION['perfil'], $_SESSION['_access_logged']);
        $_SESSION['dev_user'] = $matricula;
        self::$authenticated = false;
        return self::authenticate();
    }

    public static function isLocal()
    {
        return self::isLocalEnvironment();
    }

    public static function requireProfiles(array $profiles)
    {
        $user = self::authenticate();
        $allowed = array_map(array(__CLASS__, 'normalizeProfile'), $profiles);
        if (!in_array($user['perfil'], $allowed, true)) {
            AccessLogger::record('acesso_negado', $user, array('recurso' => self::requestResource()));
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
            AccessLogger::record('acesso_negado', $user, array('recurso' => self::requestResource()));
            Response::error('Perfil nao autorizado para esta operacao.', 403);
            exit;
        }
        return $user;
    }

    public static function requireAnyAuthenticated()
    {
        return self::authenticate();
    }

    public static function requirePermission($module, $action, $api = false)
    {
        $user = self::authenticate();
        if (!AccessPolicy::allows($user['perfil'], $module, $action)) {
            AccessLogger::record('acesso_negado', $user, array('recurso' => $module . '/' . $action));
            if ($api) Response::error('Acesso nao autorizado.', 403);
            else {
                http_response_code(403);
                require APP_ROOT . '/views/erros/403.php';
            }
            exit;
        }
        return $user;
    }

    public static function authorizeRecord(array $record, $api = true)
    {
        $user = self::authenticate();
        if (!AccessPolicy::scopeAllows($user, $record)) {
            AccessLogger::record('escopo_negado', $user, array('recurso' => self::requestResource()));
            if ($api) Response::error('Registro fora do escopo autorizado.', 403);
            else require APP_ROOT . '/views/erros/403.php';
            exit;
        }
        return $user;
    }

    public static function logout()
    {
        Session::start();
        $user = self::sessionUser();
        if ($user['matricula'] !== '') AccessLogger::record('logout', $user);
        self::$authenticated = false;
        Session::destroy();
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
        if ($token === '' && isset($_POST['_csrf_token'])) $token = (string) $_POST['_csrf_token'];
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
            $identity = CorporateIdentity::load(LDAP_PATH);
            if ($identity === null) self::deny('Identidade corporativa invalida.');
            return $identity;
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
        $user['perfil'] = isset($user['perfil']) ? $user['perfil'] : (isset($profiles[$matricula]) ? $profiles[$matricula] : self::DEFAULT_PROFILE);
        $user['unidade_apuradora'] = $user['perfil'] === 'unidade_apuradora' ? (isset($user['sg_unidade']) ? $user['sg_unidade'] : '') : '';
        $user['diretoria_responsavel'] = $user['perfil'] === 'homologador' ? (isset($user['sg_unidade']) ? $user['sg_unidade'] : '') : '';
        return $user;
    }

    private static function isLocalEnvironment()
    {
        $env = strtolower((string) APP_ENV);
        return in_array($env, array('local', 'development', 'dev'), true);
    }

    private static function findAccess($matricula)
    {
        try {
            $stmt = Database::getConnection()->prepare('SELECT matricula, nome, perfil, sg_unidade, no_unidade, ativo FROM usuarios_acesso WHERE matricula = :matricula AND ativo = 1');
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
        AccessLogger::record('login', self::sessionUser());
    }

    private static function deny($message)
    {
        AccessLogger::record('autenticacao_negada', array(), array('recurso' => self::requestResource()));
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

    private static function requestResource()
    {
        return isset($_SERVER['REQUEST_URI']) ? parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) : '';
    }
}
