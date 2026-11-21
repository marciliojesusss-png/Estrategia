<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Session.php';
require_once __DIR__ . '/../core/Csrf.php';
require_once __DIR__ . '/../core/Logger.php';
require_once __DIR__ . '/AccessLogger.php';
require_once __DIR__ . '/CorporateIdentity.php';
require_once __DIR__ . '/CaixaLoteriasAccessGate.php';
require_once __DIR__ . '/AccessPolicy.php';

final class Auth
{
    const DEFAULT_PROFILE = 'usuario_companhia';

    private static $authenticated = false;
    private static $profileLabels = array(
        'usuario_companhia' => 'Usuario Companhia',
        'unidade_apuradora' => 'Unidade Apuradora',
        'homologador' => 'Diretoria Homologadora',
        'consultor_diretoria' => 'Consultor da Diretoria',
        'auditor_caixa' => 'Auditor CAIXA',
        'administrador' => 'Administrador',
    );
    private static $administratorViews = null;
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
            Response::redirect(app_url('login'));
        }
        $corporate = self::loadCorporateData();
        $matricula = trim(isset($corporate['matricula']) ? (string) $corporate['matricula'] : '');
        if ($matricula === '') {
            self::deny('Usuario corporativo nao identificado.');
        }
        $access = self::findAccess($matricula);
        $isAuditor = $access !== null && self::normalizeProfile(isset($access['perfil']) ? $access['perfil'] : '') === 'auditor_caixa';
        if (!CaixaLoteriasAccessGate::allows($corporate) && !($isAuditor && self::validAuditorGrant($access))) {
            self::deny('Acesso restrito a empregados da CAIXA Loterias ou auditores CAIXA com concessao valida.');
        }
        if ($isAuditor && !self::validAuditorGrant($access)) {
            self::deny('A concessao temporaria de auditoria esta ausente, inativa ou fora da validade.');
        }
        if ($access === null) {
            if (self::isLocalEnvironment()) {
                self::deny('Usuario local sem acesso ativo no SQL Server.');
            } else {
                // Todo usuário corporativo sem cadastro de perfil especial é
                // tratado como usuário da companhia, conforme a regra de
                // acesso institucional.
                $access = array(
                    'matricula' => $matricula,
                    'nome' => isset($corporate['nome']) ? (string) $corporate['nome'] : $matricula,
                    'perfil' => self::DEFAULT_PROFILE,
                    'sg_unidade' => isset($corporate['sg_unidade']) ? (string) $corporate['sg_unidade'] : '',
                    'no_unidade' => isset($corporate['no_unidade']) ? (string) $corporate['no_unidade'] : '',
                );
            }
        }
        if (empty($_SESSION['_auth_initialized'])) {
            Session::regenerate();
            $_SESSION['_auth_initialized'] = true;
        }
        $profile = self::normalizeProfile(isset($access['perfil']) ? $access['perfil'] : self::DEFAULT_PROFILE);
        $identityChanged = !isset($_SESSION['matricula'], $_SESSION['perfil'])
            || $_SESSION['matricula'] !== $matricula
            || self::normalizeProfile($_SESSION['perfil']) !== $profile;
        $_SESSION['matricula'] = $matricula;
        $_SESSION['nome'] = isset($corporate['nome']) ? (string) $corporate['nome'] : $matricula;
        $_SESSION['funcao'] = isset($corporate['funcao']) ? (string) $corporate['funcao'] : '';
        $_SESSION['unidade'] = isset($corporate['unidade']) ? (string) $corporate['unidade'] : '';
        $_SESSION['sg_unidade'] = isset($corporate['sg_unidade']) ? (string) $corporate['sg_unidade'] : '';
        $_SESSION['no_unidade'] = isset($corporate['no_unidade']) ? (string) $corporate['no_unidade'] : '';
        if ($identityChanged) unset($_SESSION['_admin_view_mode']);
        $_SESSION['perfil'] = $profile;
        $_SESSION['grupo_preenchimento'] = $profile === 'unidade_apuradora' && !empty($access['grupo_preenchimento_codigo']) ? (string) $access['grupo_preenchimento_codigo'] : '';
        $_SESSION['grupo_tipo_escopo'] = $_SESSION['grupo_preenchimento'] !== '' ? (string) $access['grupo_tipo_escopo'] : '';
        $_SESSION['grupo_escopo_referencia'] = $_SESSION['grupo_preenchimento'] !== '' ? (string) $access['grupo_escopo_referencia'] : '';
        $_SESSION['unidade_apuradora'] = $profile === 'unidade_apuradora' ? self::operationalScope($access, 'UNIDADE', 'unidade_apuradora') : '';
        $_SESSION['diretoria_responsavel'] = $profile === 'unidade_apuradora'
            ? self::operationalScope($access, 'DIRETORIA', '')
            : (in_array($profile, array('homologador', 'consultor_diretoria'), true) ? self::accessScope($access, 'diretoria_responsavel') : '');
        $_SESSION['concessao_auditoria_fim'] = $profile === 'auditor_caixa' && !empty($access['concessao_data_fim']) ? (string) $access['concessao_data_fim'] : '';
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
        if (self::findAccess($matricula) === null) {
            self::deny('Usuario local sem acesso ativo no SQL Server.');
        }
        Session::start();
        unset($_SESSION['matricula'], $_SESSION['perfil'], $_SESSION['_access_logged'], $_SESSION['_admin_view_mode']);
        $_SESSION['dev_user'] = $matricula;
        self::$authenticated = false;
        return self::authenticate();
    }

    public static function isLocal()
    {
        return self::isLocalEnvironment();
    }

    public static function localLoginUsers()
    {
        if (!self::isLocalEnvironment()) {
            return array();
        }

        $stmt = Database::getConnection()->query(
            'SELECT u.matricula,u.nome,u.perfil,u.sg_unidade,u.no_unidade,u.unidade_apuradora,u.diretoria_responsavel,'
            . 'u.grupo_preenchimento_codigo,g.tipo_escopo AS grupo_tipo_escopo,g.escopo_referencia AS grupo_escopo_referencia '
            . 'FROM usuarios_acesso u LEFT JOIN grupos_preenchimento g ON g.codigo=u.grupo_preenchimento_codigo WHERE u.ativo = 1 ORDER BY u.nome,u.matricula'
        );
        $users = array();
        foreach ($stmt->fetchAll() as $row) {
            $profile = self::normalizeProfile(isset($row['perfil']) ? $row['perfil'] : self::DEFAULT_PROFILE);
            $users[] = array(
                'matricula' => (string) $row['matricula'],
                'nome' => !empty($row['nome']) ? (string) $row['nome'] : (string) $row['matricula'],
                'perfil' => self::profileLabel($profile),
                'unidade' => $profile === 'unidade_apuradora' ? self::operationalScope($row, 'UNIDADE', 'unidade_apuradora') : 'Todas',
                'diretoria' => $profile === 'unidade_apuradora' ? self::operationalScope($row, 'DIRETORIA', '') : (in_array($profile, array('homologador', 'consultor_diretoria'), true) ? self::accessScope($row, 'diretoria_responsavel') : 'Todas'),
            );
        }
        return $users;
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

    public static function requirePagePermission($module, $action)
    {
        $user = self::authenticate();
        if (!AccessPolicy::allowsPage($user['perfil'], $module, $action)) {
            AccessLogger::record('acesso_negado', $user, array('recurso' => $module . '/' . $action));
            http_response_code(403);
            require APP_ROOT . '/views/erros/403.php';
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
            'grupoPreenchimento' => $user['grupo_preenchimento'], 'grupoTipoEscopo' => $user['grupo_tipo_escopo'],
            'grupoEscopoReferencia' => $user['grupo_escopo_referencia'], 'concessaoAuditoriaFim' => $user['concessao_auditoria_fim'],
            'perfilOriginalCodigo' => $user['perfil_original'],
            'podeAlternarVisao' => $user['perfil_original'] === 'administrador',
            'visaoAdministrador' => self::administratorView(),
            'visoesAdministrador' => $user['perfil_original'] === 'administrador' ? self::administratorViewOptions() : array(),
            'csrfToken' => self::csrfToken(),
        );
    }

    public static function administratorViewOptions()
    {
        $user = self::authenticate();
        if ($user['perfil_original'] !== 'administrador') return array();
        $views = self::administratorViews();
        $options = array();
        foreach ($views as $mode => $view) {
            $options[] = array('valor' => $mode, 'rotulo' => $view['rotulo'], 'grupo' => $view['grupo']);
        }
        return $options;
    }

    public static function setAdministratorView($mode)
    {
        self::authenticate();
        if (self::normalizeProfile(isset($_SESSION['perfil']) ? $_SESSION['perfil'] : '') !== 'administrador') {
            throw new DomainException('Apenas administradores podem alternar a visao.');
        }
        if (!is_string($mode) || !array_key_exists($mode, self::administratorViews())) {
            throw new InvalidArgumentException('Visao solicitada invalida.');
        }
        Session::regenerate();
        if ($mode === 'administrador') unset($_SESSION['_admin_view_mode']);
        else $_SESSION['_admin_view_mode'] = $mode;
        $user = self::sessionUser();
        AccessLogger::record('troca_visao', $user, array('recurso' => 'visao/' . $mode));
        return $user;
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
            return app_url('lancamentos');
        }
        if (in_array($normalized, array('homologador', 'consultor_diretoria'), true)) {
            return app_url('homologacoes');
        }
        return app_url('dashboard');
    }

    public static function scopeFilters(array $filters = array())
    {
        $user = self::authenticate();
        return self::scopeFiltersForUser($user, $filters);
    }

    public static function scopeFiltersForUser(array $user, array $filters = array())
    {
        if ($user['perfil'] === 'unidade_apuradora' && !empty($user['grupo_preenchimento'])) {
            if (strtoupper((string) $user['grupo_tipo_escopo']) === 'DIRETORIA') {
                $filters['diretoria_responsavel'] = $user['grupo_escopo_referencia'];
                $filters['diretoriaResponsavel'] = $user['grupo_escopo_referencia'];
                unset($filters['unidade_apuradora'], $filters['unidadeApuradora']);
                return $filters;
            }
            $filters['unidade_apuradora'] = $user['grupo_escopo_referencia'];
            $filters['unidadeApuradora'] = $user['grupo_escopo_referencia'];
            return $filters;
        }
        if ($user['perfil'] === 'unidade_apuradora' && $user['unidade_apuradora'] !== '') {
            $filters['unidade_apuradora'] = $user['unidade_apuradora'];
            $filters['unidadeApuradora'] = $user['unidade_apuradora'];
        }
        if (in_array($user['perfil'], array('homologador', 'consultor_diretoria'), true) && $user['diretoria_responsavel'] !== '') {
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
        if (in_array($value, array('consultor_diretoria', 'consultor_da_diretoria'), true)) return 'consultor_diretoria';
        if (in_array($value, array('auditor_caixa', 'auditor'), true)) return 'auditor_caixa';
        return self::DEFAULT_PROFILE;
    }

    private static function sessionUser()
    {
        $originalProfile = self::normalizeProfile(isset($_SESSION['perfil']) ? $_SESSION['perfil'] : self::DEFAULT_PROFILE);
        $user = array(
            'matricula' => isset($_SESSION['matricula']) ? (string) $_SESSION['matricula'] : '',
            'nome' => isset($_SESSION['nome']) ? (string) $_SESSION['nome'] : '',
            'funcao' => isset($_SESSION['funcao']) ? (string) $_SESSION['funcao'] : '',
            'unidade' => isset($_SESSION['unidade']) ? (string) $_SESSION['unidade'] : '',
            'sg_unidade' => isset($_SESSION['sg_unidade']) ? (string) $_SESSION['sg_unidade'] : '',
            'no_unidade' => isset($_SESSION['no_unidade']) ? (string) $_SESSION['no_unidade'] : '',
            'perfil' => $originalProfile,
            'perfil_original' => $originalProfile,
            'unidade_apuradora' => isset($_SESSION['unidade_apuradora']) ? (string) $_SESSION['unidade_apuradora'] : '',
            'diretoria_responsavel' => isset($_SESSION['diretoria_responsavel']) ? (string) $_SESSION['diretoria_responsavel'] : '',
            'grupo_preenchimento' => isset($_SESSION['grupo_preenchimento']) ? (string) $_SESSION['grupo_preenchimento'] : '',
            'grupo_tipo_escopo' => isset($_SESSION['grupo_tipo_escopo']) ? (string) $_SESSION['grupo_tipo_escopo'] : '',
            'grupo_escopo_referencia' => isset($_SESSION['grupo_escopo_referencia']) ? (string) $_SESSION['grupo_escopo_referencia'] : '',
            'concessao_auditoria_fim' => isset($_SESSION['concessao_auditoria_fim']) ? (string) $_SESSION['concessao_auditoria_fim'] : '',
        );
        $mode = self::administratorView();
        if ($originalProfile === 'administrador' && $mode !== 'administrador') {
            $views = self::administratorViews();
            $view = $views[$mode];
            $user['perfil'] = $view['perfil'];
            $user['unidade_apuradora'] = $view['unidade_apuradora'];
            $user['diretoria_responsavel'] = $view['diretoria_responsavel'];
            $user['grupo_preenchimento'] = isset($view['grupo_preenchimento']) ? $view['grupo_preenchimento'] : '';
            $user['grupo_tipo_escopo'] = isset($view['grupo_tipo_escopo']) ? $view['grupo_tipo_escopo'] : '';
            $user['grupo_escopo_referencia'] = isset($view['grupo_escopo_referencia']) ? $view['grupo_escopo_referencia'] : '';
        }
        return $user;
    }

    private static function administratorView()
    {
        if (self::normalizeProfile(isset($_SESSION['perfil']) ? $_SESSION['perfil'] : '') !== 'administrador') return 'administrador';
        $mode = isset($_SESSION['_admin_view_mode']) ? (string) $_SESSION['_admin_view_mode'] : 'administrador';
        if ($mode === 'sucol') $mode = 'unidade:SUCOL';
        if ($mode === 'dicot') $mode = 'diretoria:DICOT';
        $views = self::administratorViews();
        if (strpos($mode, 'unidade:') === 0) {
            $legacyUnit = strtoupper(trim(substr($mode, strlen('unidade:'))));
            foreach ($views as $viewMode => $view) {
                if (!empty($view['unidades']) && in_array($legacyUnit, $view['unidades'], true)) {
                    $mode = $viewMode;
                    break;
                }
            }
        }
        return array_key_exists($mode, $views) ? $mode : 'administrador';
    }

    private static function administratorViews()
    {
        if (self::$administratorViews !== null) return self::$administratorViews;
        $views = array(
            'administrador' => array(
                'perfil' => 'administrador', 'unidade_apuradora' => '', 'diretoria_responsavel' => '',
                'grupo_preenchimento' => '', 'grupo_tipo_escopo' => '', 'grupo_escopo_referencia' => '',
                'rotulo' => 'Administrador', 'grupo' => 'geral', 'unidades' => array(),
            ),
        );
        $groupRows = Database::getConnection()->query(
            'SELECT g.codigo,g.tipo_escopo,g.escopo_referencia,u.unidade_codigo '
            . 'FROM dbo.grupos_preenchimento g '
            . 'LEFT JOIN dbo.grupos_preenchimento_unidades u ON u.grupo_codigo=g.codigo '
            . 'WHERE g.ativo=1 ORDER BY g.codigo,u.unidade_codigo'
        )->fetchAll();
        $groups = array();
        foreach ($groupRows as $row) {
            $code = strtoupper(trim((string) $row['codigo']));
            if ($code === '') continue;
            if (!isset($groups[$code])) {
                $groups[$code] = array(
                    'tipo' => strtoupper(trim((string) $row['tipo_escopo'])),
                    'escopo' => strtoupper(trim((string) $row['escopo_referencia'])),
                    'unidades' => array(),
                );
            }
            $unit = strtoupper(trim((string) $row['unidade_codigo']));
            if ($unit !== '') $groups[$code]['unidades'][] = $unit;
        }
        foreach ($groups as $code => $group) {
            $scopeType = $group['tipo'];
            $scopeReference = $group['escopo'];
            $displayCode = $code === 'SUCTF' && in_array('GELOF', $group['unidades'], true) ? 'SUCTF/GELOF' : $code;
            $views['grupo:' . $code] = array(
                'perfil' => 'unidade_apuradora',
                'unidade_apuradora' => $scopeType === 'UNIDADE' ? $scopeReference : '',
                'diretoria_responsavel' => $scopeType === 'DIRETORIA' ? $scopeReference : '',
                'grupo_preenchimento' => $code,
                'grupo_tipo_escopo' => $scopeType,
                'grupo_escopo_referencia' => $scopeReference,
                'rotulo' => 'Preenchimento - ' . $displayCode,
                'grupo' => 'preenchimento',
                'unidades' => array_values(array_unique($group['unidades'])),
            );
        }

        $directoryRows = Database::getConnection()->query(
            "SELECT escopo FROM ("
            . "SELECT LTRIM(RTRIM(diretoria_responsavel)) AS escopo FROM dbo.indicadores "
            . "WHERE NULLIF(LTRIM(RTRIM(diretoria_responsavel)), '') IS NOT NULL "
            . "UNION SELECT LTRIM(RTRIM(diretoria_responsavel)) FROM dbo.iniciativas_estrategicas "
            . "WHERE NULLIF(LTRIM(RTRIM(diretoria_responsavel)), '') IS NOT NULL"
            . ") AS diretorias ORDER BY escopo"
        )->fetchAll();
        foreach ($directoryRows as $row) {
            $scope = strtoupper(trim((string) $row['escopo']));
            if ($scope === '') continue;
            $views['diretoria:' . $scope] = array(
                'perfil' => 'homologador', 'unidade_apuradora' => '', 'diretoria_responsavel' => $scope,
                'grupo_preenchimento' => '', 'grupo_tipo_escopo' => '', 'grupo_escopo_referencia' => '',
                'rotulo' => 'Homologacao - ' . $scope, 'grupo' => 'diretoria', 'unidades' => array(),
            );
        }
        $views['usuario_companhia'] = array(
            'perfil' => 'usuario_companhia', 'unidade_apuradora' => '', 'diretoria_responsavel' => '',
            'grupo_preenchimento' => '', 'grupo_tipo_escopo' => '', 'grupo_escopo_referencia' => '',
            'rotulo' => 'Usuario da Companhia', 'grupo' => 'geral', 'unidades' => array(),
        );
        self::$administratorViews = $views;
        return $views;
    }

    private static function loadCorporateData()
    {
        if (!self::isLocalEnvironment()) {
            $identity = CorporateIdentity::load();
            if ($identity === null) self::deny('Identidade corporativa indisponivel ou invalida.');
            return $identity;
        }
        $selected = isset($_GET['dev_user']) ? $_GET['dev_user'] : (getenv('AUTH_LOCAL_USER') ?: (isset($_SESSION['dev_user']) ? $_SESSION['dev_user'] : ''));
        $selected = CorporateIdentity::normalizeMatricula($selected);
        if ($selected === null) {
            self::deny('Usuario local nao selecionado.');
        }
        $access = self::findAccess($selected);
        if ($access === null) {
            self::deny('Usuario local sem acesso ativo no SQL Server.');
        }
        $_SESSION['dev_user'] = $selected;
        return array(
            'matricula' => $selected,
            'nome' => !empty($access['nome']) ? (string) $access['nome'] : $selected,
            'funcao' => 'Desenvolvimento',
            'unidade' => !empty($access['no_unidade']) ? (string) $access['no_unidade'] : (string) $access['sg_unidade'],
            'sg_unidade' => (string) $access['sg_unidade'],
            'no_unidade' => (string) $access['no_unidade'],
        );
    }

    private static function isLocalEnvironment()
    {
        $env = strtolower((string) APP_ENV);
        if (!in_array($env, array('local', 'development', 'dev'), true)) return false;

        // Identidades simuladas nunca devem ser aceitas por um host publicado.
        // Isso evita que uma configuração APP_ENV=local no IIS exponha o
        // usuário ADMIN ou permita escolher perfis pelo formulário local.
        if (PHP_SAPI === 'cli') return true;
        $host = strtolower((string) (isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : (isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : '')));
        $host = preg_replace('/:\d+$/', '', $host);
        return in_array($host, array('', 'localhost', '127.0.0.1', '::1'), true);
    }

    private static function findAccess($matricula)
    {
        try {
            $stmt = Database::getConnection()->prepare("SELECT u.matricula,u.nome,u.perfil,u.sg_unidade,u.no_unidade,u.unidade_apuradora,u.diretoria_responsavel,u.grupo_preenchimento_codigo,g.tipo_escopo AS grupo_tipo_escopo,g.escopo_referencia AS grupo_escopo_referencia,u.ativo,ca.data_inicio AS concessao_data_inicio,ca.data_fim AS concessao_data_fim,ca.ativo AS concessao_ativa FROM usuarios_acesso u LEFT JOIN grupos_preenchimento g ON g.codigo=u.grupo_preenchimento_codigo OUTER APPLY (SELECT TOP (1) c.data_inicio,c.data_fim,c.ativo FROM concessoes_acesso_auditoria c WHERE c.usuario_acesso_id=u.id AND c.ativo=1 ORDER BY c.id DESC) ca WHERE u.matricula = :matricula AND u.ativo = 1");
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
        AccessLogger::record('login', self::sessionUser(), array('recurso' => self::requestResource()));
    }

    private static function deny($message)
    {
        AccessLogger::record('autenticacao_negada', array(), array('recurso' => self::requestResource()));
        if (strpos(self::requestResource(), '/api/') !== false) {
            Response::error($message, 401);
            exit;
        }
        http_response_code(401);
        $errorMessage = $message;
        require APP_ROOT . '/views/erros/401.php';
        exit;
    }

    private static function accessScope(array $access, $field)
    {
        if (!empty($access[$field])) return (string) $access[$field];
        return isset($access['sg_unidade']) ? (string) $access['sg_unidade'] : '';
    }

    private static function operationalScope(array $access, $expectedType, $legacyField)
    {
        if (!empty($access['grupo_preenchimento_codigo']) && strtoupper((string) $access['grupo_tipo_escopo']) === $expectedType) {
            return (string) $access['grupo_escopo_referencia'];
        }
        return $legacyField !== '' ? self::accessScope($access, $legacyField) : '';
    }

    private static function validAuditorGrant(array $access)
    {
        if (empty($access['concessao_ativa']) || empty($access['concessao_data_inicio']) || empty($access['concessao_data_fim'])) return false;
        $now = time();
        return strtotime((string) $access['concessao_data_inicio']) <= $now && strtotime((string) $access['concessao_data_fim']) > $now;
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
        return '/' . current_route('dashboard');
    }
}
