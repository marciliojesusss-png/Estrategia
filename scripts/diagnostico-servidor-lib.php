<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/config/config.php';
require_once __DIR__ . '/../app/helpers/helpers.php';
require_once __DIR__ . '/../app/core/Database.php';
require_once __DIR__ . '/../app/core/Logger.php';

final class DiagnosticoServidor
{
    const OK = 'OK';
    const AVISO = 'AVISO';
    const FALHA = 'FALHA';

    private $items = array();
    private $reportPath = '';

    public function run(array $options = array())
    {
        $this->items = array();
        $this->reportPath = '';

        $this->checkPhp();
        $this->checkServerLocal();
        $this->checkPaths();
        $this->checkSqlConfig();
        $this->checkDatabase();
        $this->checkLdapLegacy();
        $this->checkIisIdentity();
        $this->checkWritablePaths();
        $this->checkRoutingHelpers();
        $this->checkRewriteIndependence();
        $this->checkRecentLogs();

        if (empty($options['skip_syntax'])) {
            $this->checkPhpSyntax();
        }

        $report = $this->renderReport(!empty($options['web']));
        $this->writeReport($report);
        $report = $this->renderReport(!empty($options['web']));
        if ($this->reportPath !== '') {
            $report .= PHP_EOL . 'RELATORIO GERADO: ' . $this->reportPath . PHP_EOL;
            if (is_dir(LOG_PATH) && is_writable(LOG_PATH)) {
                @file_put_contents($this->reportPath, $report);
            }
        }

        return array(
            'ok' => !$this->hasCriticalFailure(),
            'items' => $this->items,
            'report' => $report,
            'report_path' => $this->reportPath,
            'exit_code' => $this->hasCriticalFailure() ? 1 : 0,
        );
    }

    public function runPreflight()
    {
        $this->items = array();
        $this->checkPhp();
        $this->checkServerLocal();
        $this->checkSqlConfig();
        $this->checkLdapLegacy();
        $this->checkWritablePaths();
        $this->checkDatabase();

        $lines = array();
        foreach ($this->items as $item) {
            $lines[] = '[' . $item['section'] . '] ' . $item['label'] . ': ' . strtolower($item['status']) . ($item['detail'] !== '' ? ' - ' . $item['detail'] : '');
        }
        return array(
            'ok' => !$this->hasCriticalFailure(),
            'output' => implode(PHP_EOL, $lines) . PHP_EOL,
            'exit_code' => $this->hasCriticalFailure() ? 1 : 0,
        );
    }

    private function add($section, $label, $status, $detail = '', $correction = '', $critical = true)
    {
        $this->items[] = array(
            'section' => (string) $section,
            'label' => (string) $label,
            'status' => (string) $status,
            'detail' => $this->sanitize((string) $detail),
            'correction' => (string) $correction,
            'critical' => (bool) $critical,
        );
    }

    private function checkPhp()
    {
        $phpStatus = version_compare(PHP_VERSION, '7.1.19', '<')
            ? self::FALHA
            : (version_compare(PHP_VERSION, '7.2.0', '>=') ? self::AVISO : self::OK);
        $this->add('PHP', 'Versao do PHP', $phpStatus, PHP_VERSION, 'Configure o FastCGI/IIS para usar PHP 7.1.19.', $phpStatus === self::FALHA);
        $this->add('PHP', 'SAPI', PHP_SAPI === 'cli' || stripos(PHP_SAPI, 'cgi') !== false || stripos(PHP_SAPI, 'fastcgi') !== false ? self::OK : self::AVISO, PHP_SAPI, 'No IIS, confirme que a execucao esta pelo FastCGI correto.', false);

        $ini = php_ini_loaded_file();
        $this->add('PHP', 'php.ini carregado', $ini ? self::OK : self::AVISO, $ini ?: 'nao informado', 'Defina o php.ini usado pelo FastCGI.', false);

        $errorLog = (string) ini_get('error_log');
        $this->add('PHP', 'error_log configurado', $errorLog !== '' ? self::OK : self::AVISO, $errorLog !== '' ? $errorLog : 'nao configurado', 'Configure error_log no php.ini para facilitar a investigacao de erro 500.', false);

        foreach (array('sqlsrv', 'json', 'mbstring', 'openssl', 'ldap') as $extension) {
            $critical = $extension === 'sqlsrv';
            $this->add('PHP', 'extensao ' . $extension, extension_loaded($extension) ? self::OK : ($critical ? self::FALHA : self::AVISO), extension_loaded($extension) ? 'carregada' : 'ausente', 'Habilite a extensao ' . $extension . ' no php.ini utilizado pelo IIS.', $critical);
        }

        $this->add('PHP', 'funcao sqlsrv_connect', function_exists('sqlsrv_connect') ? self::OK : self::FALHA, function_exists('sqlsrv_connect') ? 'disponivel' : 'indisponivel', 'Instale/habilite Microsoft Drivers for PHP for SQL Server compativeis com o PHP em uso.');
    }

    private function checkServerLocal()
    {
        $path = APP_ROOT . '/app/config/servidor.local.php';
        if (!is_file($path)) {
            $this->add('CONFIG', 'servidor.local.php', self::FALHA, 'arquivo ausente', 'Crie app/config/servidor.local.php no servidor com as configuracoes locais.');
            return;
        }
        if (!is_readable($path)) {
            $this->add('CONFIG', 'servidor.local.php', self::FALHA, 'arquivo sem leitura', 'Ajuste permissao de leitura para a identidade do Application Pool.');
            return;
        }

        $values = $this->loadServerLocalValues($path);
        $this->add('CONFIG', 'servidor.local.php', is_array($values) ? self::OK : self::FALHA, is_array($values) ? 'carregado' : 'nao retornou array', 'O arquivo deve retornar um array PHP.');
        if (is_array($values)) {
            $keys = array_keys($values);
            sort($keys);
            $safeKeys = array();
            foreach ($keys as $key) {
                $safeKeys[] = $this->isSensitiveKey($key) ? $key . '=configurado' : $key;
            }
            $this->add('CONFIG', 'chaves locais', self::OK, implode(', ', $safeKeys), '', false);
        }

        $this->add('CONFIG', 'Dotenv', is_file(APP_ROOT . '/app/config/Dotenv.php') ? self::FALHA : self::OK, is_file(APP_ROOT . '/app/config/Dotenv.php') ? 'arquivo encontrado' : 'ausente', 'Remova carregadores .env do pacote publicado.');
    }

    private function checkPaths()
    {
        $this->add('APP', 'APP_ROOT', is_dir(APP_ROOT) ? self::OK : self::FALHA, APP_ROOT, 'Confirme a estrutura fisica do projeto.');
        $this->add('APP', 'APP_BASE_PATH', APP_BASE_PATH !== '' ? self::OK : self::AVISO, APP_BASE_PATH === '' ? '/' : APP_BASE_PATH, 'Configure app_base_path em servidor.local.php se a aplicacao estiver em diretorio virtual.', false);
        $this->add('APP', 'pasta public', is_dir(APP_ROOT . '/public') ? self::OK : self::FALHA, APP_ROOT . '/public', 'Publique a pasta public junto com o projeto.');

        foreach (array('public/index.php', 'index.php', 'app/bootstrap.php', 'app/config/config.php', 'app/helpers/helpers.php') as $file) {
            $this->add('APP', 'arquivo ' . $file, is_file(APP_ROOT . '/' . $file) ? self::OK : self::FALHA, is_file(APP_ROOT . '/' . $file) ? 'encontrado' : 'ausente', 'Restaure o arquivo esperado no pacote publicado.');
        }
    }

    private function checkSqlConfig()
    {
        $this->add('SQL', 'DB_DRIVER', DB_DRIVER === 'sqlsrv' ? self::OK : self::FALHA, DB_DRIVER, 'Configure db_driver como sqlsrv em servidor.local.php.');
        $this->add('SQL', 'DB_CONNECTION', DB_CONNECTION === 'sqlsrv' ? self::OK : self::FALHA, DB_CONNECTION, 'Mantenha DB_CONNECTION resolvido para sqlsrv.');
        $this->add('SQL', 'servidor SQL Server', SQLSERVER_HOST !== '' ? self::OK : self::FALHA, SQLSERVER_HOST !== '' ? $this->maskValue(SQLSERVER_HOST) : 'ausente', 'Informe db_host em servidor.local.php.');
        $this->add('SQL', 'banco SQL Server', SQLSERVER_DATABASE !== '' ? self::OK : self::FALHA, SQLSERVER_DATABASE !== '' ? $this->maskValue(SQLSERVER_DATABASE) : 'ausente', 'Informe db_database em servidor.local.php.');
        $this->add('SQL', 'modo de autenticacao', in_array(DB_AUTH_MODE, array('sql', 'integrated'), true) ? self::OK : self::FALHA, DB_AUTH_MODE, 'Use db_auth_mode como sql ou integrated.');

        if (DB_AUTH_MODE === 'sql') {
            $this->add('SQL', 'usuario SQL', SQLSERVER_USER !== '' ? self::OK : self::FALHA, SQLSERVER_USER !== '' ? 'configurado' : 'ausente', 'Informe db_username em servidor.local.php.');
            $this->add('SQL', 'senha SQL', SQLSERVER_PASSWORD !== '' ? self::OK : self::FALHA, SQLSERVER_PASSWORD !== '' ? 'configurada' : 'ausente', 'Informe db_password em servidor.local.php.');
        }

        $this->add('SQL', 'criptografia SQL', SQLSERVER_ENCRYPT === 'yes' ? self::OK : self::FALHA, SQLSERVER_ENCRYPT, 'Mantenha SQLSERVER_ENCRYPT como yes.');
        $this->add('SQL', 'validacao certificado SQL', SQLSERVER_TRUST_SERVER_CERTIFICATE === 'no' ? self::OK : self::FALHA, SQLSERVER_TRUST_SERVER_CERTIFICATE, 'Mantenha SQLSERVER_TRUST_SERVER_CERTIFICATE como no e instale a cadeia de certificados correta.');
        $this->add('SQL', 'pdo_sqlsrv nao requerido', extension_loaded('pdo_sqlsrv') ? self::AVISO : self::OK, extension_loaded('pdo_sqlsrv') ? 'carregado, mas nao usado' : 'ausente', 'A aplicacao usa somente sqlsrv_connect; pdo_sqlsrv pode permanecer desabilitado.', false);
    }

    private function checkDatabase()
    {
        try {
            $db = Database::getConnection();
            $driver = (string) $db->getAttribute(PDO::ATTR_DRIVER_NAME);
            $this->add('BANCO', 'conexao SQL Server', $driver === 'sqlsrv' ? self::OK : self::FALHA, 'driver=' . $driver, 'Corrija DB_DRIVER/DB_CONNECTION para sqlsrv.');

            $select = $db->query('SELECT 1')->fetchColumn();
            $this->add('BANCO', 'SELECT 1', (int) $select === 1 ? self::OK : self::FALHA, 'resultado=' . (string) $select, 'Verifique conectividade, permissao de login e banco configurado.');

            $databaseName = '';
            try {
                $databaseName = (string) $db->query('SELECT DB_NAME()')->fetchColumn();
            } catch (Exception $error) {
                $databaseName = '';
            }
            $this->add('BANCO', 'banco atual', $databaseName !== '' ? self::OK : self::AVISO, $databaseName !== '' ? $this->maskValue($databaseName) : 'nao identificado', 'Confirme se o login abriu o banco esperado.', false);

            foreach (array('indicadores', 'lancamentos', 'usuarios_acesso', 'acessos_log') as $table) {
                $exists = $this->tableExists($db, $driver, $table);
                $this->add('BANCO', 'tabela ' . $table, $exists ? self::OK : self::FALHA, $exists ? 'existe' : 'ausente', 'Execute o schema/migracao para criar a tabela ' . $table . '.');
            }
        } catch (Exception $error) {
            $this->add('BANCO', 'conexao SQL Server', self::FALHA, $error->getMessage(), 'Revise sqlsrv, servidor, banco, autenticacao, criptografia/certificado e firewall.');
        }
    }

    private function tableExists($db, $driver, $table)
    {
        if ($driver === 'sqlsrv') {
            $stmt = $db->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = :table");
            $stmt->execute(array(':table' => $table));
            return (int) $stmt->fetchColumn() > 0;
        }
        return false;
    }

    private function checkLdapLegacy()
    {
        $expected = dirname(APP_ROOT) . '/acessoldap/LDAP.php';
        $this->add('LDAP', 'AUTH_PROVIDER', AUTH_PROVIDER === 'legacy_file' ? self::OK : self::FALHA, AUTH_PROVIDER, "Configure 'auth_provider' => 'legacy_file' em servidor.local.php.");
        $this->add('LDAP', 'caminho esperado', LDAP_LEGACY_PATH === $expected ? self::OK : self::AVISO, LDAP_LEGACY_PATH, "Use dirname(APP_ROOT) . '/acessoldap/LDAP.php' ou caminho equivalente.", false);
        $this->add('LDAP', 'arquivo LDAP.php', is_file(LDAP_LEGACY_PATH) ? self::OK : self::FALHA, LDAP_LEGACY_PATH, 'Posicione o arquivo compartilhado em ../acessoldap/LDAP.php a partir da raiz do projeto.');
        $this->add('LDAP', 'leitura LDAP.php', is_readable(LDAP_LEGACY_PATH) ? self::OK : self::FALHA, is_readable(LDAP_LEGACY_PATH) ? 'legivel' : 'sem leitura', 'Ajuste permissao de leitura para a identidade do Application Pool.');
    }

    private function checkIisIdentity()
    {
        $serverSoftware = isset($_SERVER['SERVER_SOFTWARE']) ? (string) $_SERVER['SERVER_SOFTWARE'] : '';
        $isIis = stripos($serverSoftware, 'iis') !== false || stripos(PHP_SAPI, 'cgi') !== false || stripos(PHP_SAPI, 'fastcgi') !== false;
        $this->add('IIS', 'execucao IIS/FastCGI', $isIis ? self::OK : self::AVISO, $serverSoftware !== '' ? $serverSoftware . ' / ' . PHP_SAPI : PHP_SAPI, 'Execute o modo web pelo IIS para confirmar FastCGI.', false);

        foreach (array('REMOTE_USER', 'AUTH_USER', 'AUTH_TYPE') as $key) {
            $value = isset($_SERVER[$key]) ? trim((string) $_SERVER[$key]) : '';
            $this->add('IIS', $key, $value !== '' ? self::OK : self::AVISO, $value !== '' ? $this->maskIdentity($value) : 'ausente', 'Revise autenticacao do IIS/Windows Authentication se a identidade corporativa nao chegar ao PHP.', false);
        }
    }

    private function checkWritablePaths()
    {
        foreach (array(
            'storage/logs' => LOG_PATH,
            'storage/temporarios' => TEMP_PATH,
            'storage/backups' => BACKUP_DIR,
            'uploads/evidencias' => UPLOAD_PATH,
        ) as $label => $path) {
            $result = $this->testWrite($path);
            $this->add('PERMISSAO', $label . ' gravavel', $result['ok'] ? self::OK : self::FALHA, $result['detail'], 'Conceda permissao de gravacao para a identidade do Application Pool nesse diretorio.');
        }
    }

    private function testWrite($path)
    {
        if (!is_dir($path)) {
            return array('ok' => false, 'detail' => 'diretorio ausente: ' . $path);
        }
        if (!is_writable($path)) {
            return array('ok' => false, 'detail' => 'sem permissao de escrita: ' . $path);
        }
        $file = rtrim($path, '/\\') . DIRECTORY_SEPARATOR . '.diagnostico-' . getmypid() . '-' . uniqid('', true) . '.tmp';
        $ok = @file_put_contents($file, 'ok') !== false;
        if (is_file($file)) {
            @unlink($file);
        }
        return array('ok' => $ok, 'detail' => $ok ? 'escrita temporaria ok' : 'falha ao criar arquivo temporario');
    }

    private function checkRoutingHelpers()
    {
        $oldGet = $_GET;
        $_GET = array('route' => 'indicadores');
        $current = current_route();
        $_GET = $oldGet;

        $dashboardUrl = app_url('dashboard');
        $apiUrl = app_url('api/indicadores');
        $this->add('ROTAS', 'current_route()', $current === 'indicadores' ? self::OK : self::FALHA, $current, 'Revise app/helpers/helpers.php.');
        $this->add('ROTAS', 'app_url dashboard', strpos($dashboardUrl, '/index.php?route=dashboard') !== false ? self::OK : self::FALHA, $dashboardUrl, 'Garanta que app_url gere URLs por index.php?route=.');
        $this->add('ROTAS', 'app_url API', strpos($apiUrl, '/index.php?route=api/indicadores') !== false ? self::OK : self::FALHA, $apiUrl, 'Garanta que URLs de API passem pelo front controller.');
    }

    private function checkRewriteIndependence()
    {
        $rootWebConfig = $this->readFile(APP_ROOT . '/web.config');
        $publicWebConfig = $this->readFile(APP_ROOT . '/public/web.config');
        $index = $this->readFile(APP_ROOT . '/public/index.php');

        $hasRewrite = stripos($rootWebConfig, '<rewrite') !== false || stripos($publicWebConfig, '<rewrite') !== false || stripos($rootWebConfig, 'Rewrite') !== false || stripos($publicWebConfig, 'Rewrite') !== false;
        $this->add('ROTAS', 'URL Rewrite no web.config', !$hasRewrite ? self::OK : self::FALHA, !$hasRewrite ? 'nao encontrado' : 'encontrado', 'Remova regras de URL Rewrite dos web.config.');
        $this->add('ROTAS', 'front controller usa route', strpos($index, "\$_GET['route']") !== false ? self::OK : self::FALHA, 'public/index.php', 'Leia a rota exclusivamente de $_GET[route].');
        $this->add('ROTAS', 'front controller sem REQUEST_URI', strpos($index, 'REQUEST_URI') === false ? self::OK : self::FALHA, 'public/index.php', 'Nao use REQUEST_URI para identificar rota.');
        $this->add('ROTAS', 'parametro legado rota', strpos($index, "\$_GET['rota']") === false && strpos($index, 'rota=') === false ? self::OK : self::FALHA, 'public/index.php', 'Remova compatibilidade de roteamento por rota.');
    }

    private function checkRecentLogs()
    {
        $this->addLogPreview('LOG', 'storage/logs/aplicacao.log', LOG_PATH . '/aplicacao.log');
        $phpLog = (string) ini_get('error_log');
        if ($phpLog === '' || strtolower($phpLog) === 'syslog') {
            $this->add('LOG', 'php error_log', self::AVISO, $phpLog === '' ? 'nao configurado' : $phpLog, 'Configure error_log para um arquivo legivel no php.ini.', false);
            return;
        }
        $this->addLogPreview('LOG', 'php error_log', $phpLog);
    }

    private function addLogPreview($section, $label, $path)
    {
        if (!is_file($path)) {
            $this->add($section, $label, self::AVISO, 'arquivo nao encontrado: ' . $path, 'Confira se o log esta configurado e se houve escrita recente.', false);
            return;
        }
        if (!is_readable($path)) {
            $this->add($section, $label, self::AVISO, 'sem leitura: ' . $path, 'Conceda leitura ao usuario que executa o diagnostico.', false);
            return;
        }
        $lines = $this->tailLines($path, 8);
        $detail = $lines ? implode(' | ', $lines) : 'sem linhas recentes';
        $this->add($section, $label, self::OK, $detail, '', false);
    }

    private function tailLines($path, $limit)
    {
        $content = @file($path, FILE_IGNORE_NEW_LINES);
        if (!is_array($content)) {
            return array();
        }
        $lines = array_slice($content, -1 * (int) $limit);
        $safe = array();
        foreach ($lines as $line) {
            $safe[] = $this->sanitize($line);
        }
        return $safe;
    }

    private function checkPhpSyntax()
    {
        if (!$this->canExec()) {
            $this->add('SINTAXE', 'php -l', self::AVISO, 'exec indisponivel', 'Execute manualmente php -l nos arquivos PHP do pacote.', false);
            return;
        }
        $binary = defined('PHP_BINARY') ? PHP_BINARY : 'php';
        $files = $this->phpFiles();
        $errors = array();
        foreach ($files as $file) {
            $output = array();
            $code = 0;
            @exec(escapeshellarg($binary) . ' -l ' . escapeshellarg($file) . ' 2>&1', $output, $code);
            if ((int) $code !== 0) {
                $errors[] = $this->relativePath($file) . ': ' . implode(' ', $output);
            }
        }
        $this->add('SINTAXE', 'php -l arquivos PHP', !$errors ? self::OK : self::FALHA, !$errors ? count($files) . ' arquivo(s) validado(s)' : implode(' | ', array_slice($errors, 0, 10)), 'Corrija os erros de sintaxe indicados usando o PHP 7.1.19.');
    }

    private function phpFiles()
    {
        $roots = array('app', 'public', 'scripts', 'templates', 'views');
        $files = array(APP_ROOT . '/index.php');
        foreach ($roots as $root) {
            $base = APP_ROOT . '/' . $root;
            if (!is_dir($base)) {
                continue;
            }
            $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS));
            foreach ($iterator as $file) {
                if ($file->isFile() && strtolower($file->getExtension()) === 'php') {
                    $files[] = $file->getPathname();
                }
            }
        }
        sort($files);
        return array_values(array_unique($files));
    }

    private function canExec()
    {
        if (!function_exists('exec')) {
            return false;
        }
        $disabled = (string) ini_get('disable_functions');
        if ($disabled === '') {
            return true;
        }
        $parts = array_map('trim', explode(',', strtolower($disabled)));
        return !in_array('exec', $parts, true);
    }

    private function renderReport($web)
    {
        $lines = array();
        $lines[] = 'DIAGNOSTICO DO SERVIDOR - Estrategia';
        $lines[] = 'Gerado em: ' . date('Y-m-d H:i:s');
        $lines[] = 'Modo: ' . ($web ? 'WEB/IIS' : 'CLI');
        $lines[] = '';

        foreach ($this->items as $item) {
            $line = '[' . $item['status'] . '] ' . $item['section'] . ' - ' . $item['label'];
            if ($item['detail'] !== '') {
                $line .= ': ' . $item['detail'];
            }
            $lines[] = $line;
        }

        $lines[] = '';
        $lines[] = 'RESULTADO GERAL: ' . ($this->hasCriticalFailure() ? 'FALHA' : 'OK');
        $lines[] = '';
        $lines[] = 'POSSIVEIS CAUSAS DO ERRO 500:';
        foreach ($this->possible500Causes() as $cause) {
            $lines[] = '- ' . $cause;
        }
        $lines[] = '';
        $lines[] = 'CORRECOES RECOMENDADAS PARA FALHAS:';
        $failures = $this->failureCorrections();
        if (!$failures) {
            $lines[] = '- Nenhuma falha critica encontrada.';
        } else {
            foreach ($failures as $failure) {
                $lines[] = '- ' . $failure;
            }
        }

        return implode(PHP_EOL, $lines) . PHP_EOL;
    }

    private function possible500Causes()
    {
        $causes = array();
        foreach ($this->items as $item) {
            if ($item['status'] !== self::FALHA) {
                continue;
            }
            if (in_array($item['section'], array('PHP', 'SQL', 'BANCO', 'LDAP', 'PERMISSAO', 'SINTAXE'), true)) {
                $causes[] = $item['section'] . ' - ' . $item['label'] . ($item['detail'] !== '' ? ' (' . $item['detail'] . ')' : '');
            }
        }
        if (!$causes) {
            $causes[] = 'Nenhuma causa critica detectada; investigue regras de negocio, dados de entrada e logs completos.';
        }
        return $causes;
    }

    private function failureCorrections()
    {
        $lines = array();
        foreach ($this->items as $item) {
            if ($item['status'] === self::FALHA) {
                $lines[] = $item['section'] . ' - ' . $item['label'] . ': ' . ($item['correction'] !== '' ? $item['correction'] : 'Revise este item no servidor.');
            }
        }
        return $lines;
    }

    private function writeReport($report)
    {
        $path = LOG_PATH . '/diagnostico-servidor-' . date('Y-m-d-His') . '.log';
        if (!is_dir(LOG_PATH) || !is_writable(LOG_PATH)) {
            $this->add('LOG', 'gravacao do relatorio', self::FALHA, 'sem escrita em ' . LOG_PATH, 'Conceda permissao de escrita em storage/logs.');
            $this->reportPath = $path;
            return;
        }
        if (@file_put_contents($path, $report) === false) {
            $this->add('LOG', 'gravacao do relatorio', self::FALHA, 'falha ao gravar ' . $path, 'Conceda permissao de escrita em storage/logs.');
        }
        $this->reportPath = $path;
    }

    private function hasCriticalFailure()
    {
        foreach ($this->items as $item) {
            if ($item['status'] === self::FALHA && !empty($item['critical'])) {
                return true;
            }
        }
        return false;
    }

    private function loadServerLocalValues($path)
    {
        try {
            $values = require $path;
            return is_array($values) ? $values : null;
        } catch (Throwable $error) {
            return null;
        }
    }

    private function readFile($path)
    {
        $value = @file_get_contents($path);
        return $value === false ? '' : $value;
    }

    private function relativePath($path)
    {
        $path = str_replace('\\', '/', (string) $path);
        $root = str_replace('\\', '/', APP_ROOT);
        if (strpos($path, $root . '/') === 0) {
            return substr($path, strlen($root) + 1);
        }
        return $path;
    }

    private function isSensitiveKey($key)
    {
        return preg_match('/password|senha|token|secret|chave|authorization|cookie/i', (string) $key) === 1;
    }

    private function maskValue($value)
    {
        $value = (string) $value;
        $length = strlen($value);
        if ($length <= 2) {
            return str_repeat('*', $length);
        }
        return substr($value, 0, 2) . str_repeat('*', min(6, $length - 2)) . ' (tamanho=' . $length . ')';
    }

    private function maskIdentity($value)
    {
        $value = (string) $value;
        if ($value === '') {
            return 'ausente';
        }
        return 'presente, ' . $this->maskValue($value);
    }

    private function sanitize($text)
    {
        $text = str_replace(array("\r", "\n"), ' ', (string) $text);
        foreach (array('SQLSERVER_HOST', 'SQLSERVER_DATABASE', 'SQLSERVER_USER', 'SQLSERVER_PASSWORD', 'LDAP_BIND_DN', 'LDAP_BIND_PASSWORD') as $constant) {
            if (defined($constant)) {
                $value = (string) constant($constant);
                if ($value !== '') {
                    $text = str_replace($value, '[' . $constant . '_PROTEGIDO]', $text);
                }
            }
        }
        $text = preg_replace('/(password|senha|pwd|token|secret|authorization|cookie)(\s*[=:]\s*)([^;\s,"\']+)/i', '$1$2[PROTEGIDO]', $text);
        $text = preg_replace('/(UID|PWD)\s*=\s*[^;\s]+/i', '$1=[PROTEGIDO]', $text);
        $text = preg_replace('/Bearer\s+[A-Za-z0-9._~+\/=-]+/i', 'Bearer [PROTEGIDO]', $text);
        return (string) $text;
    }
}

function diagnostico_servidor_run(array $options = array())
{
    $diagnostico = new DiagnosticoServidor();
    return $diagnostico->run($options);
}

function diagnostico_servidor_preflight()
{
    $diagnostico = new DiagnosticoServidor();
    return $diagnostico->runPreflight();
}
