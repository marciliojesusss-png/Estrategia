<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/config/config.php';

if (PHP_SAPI !== 'cli') {
    header('Content-Type: text/plain; charset=utf-8');
    http_response_code(403);
    echo 'Diagnostico SQL Server deve ser executado pelo terminal.' . PHP_EOL;
    exit(1);
}

final class DiagnosticoSqlServer
{
    private $items = array();
    private $criticalFailure = false;
    private $reportPath = '';

    public function run()
    {
        $this->addHeader();
        $this->checkPhpRuntime();
        $this->checkConfiguration();
        $this->checkConnection();
        $this->finishReport();

        echo implode(PHP_EOL, $this->items) . PHP_EOL;
        return $this->criticalFailure ? 1 : 0;
    }

    private function addHeader()
    {
        $this->items[] = 'DIAGNOSTICO SQL SERVER - Estrategia';
        $this->items[] = 'Gerado em: ' . date('Y-m-d H:i:s');
        $this->items[] = 'Modo: CLI';
        $this->items[] = '';
    }

    private function add($status, $section, $label, $detail = '', $critical = false)
    {
        if ($status === 'FALHA' && $critical) {
            $this->criticalFailure = true;
        }
        $line = '[' . $status . '] ' . $section . ' - ' . $label;
        if ($detail !== '') {
            $line .= ': ' . $this->sanitize($detail);
        }
        $this->items[] = $line;
    }

    private function checkPhpRuntime()
    {
        $this->add('OK', 'PHP', 'versao', PHP_VERSION, false);
        $this->add('OK', 'PHP', 'SAPI', PHP_SAPI, false);
        $this->add('OK', 'PHP', 'executavel', defined('PHP_BINARY') ? PHP_BINARY : 'nao informado', false);
        $ini = php_ini_loaded_file();
        $this->add($ini ? 'OK' : 'AVISO', 'PHP', 'php.ini', $ini ? $ini : 'nao carregado', false);
        $this->add(extension_loaded('sqlsrv') ? 'OK' : 'FALHA', 'PHP', 'extensao sqlsrv', extension_loaded('sqlsrv') ? 'carregada' : 'ausente', true);
        $this->add(function_exists('sqlsrv_connect') ? 'OK' : 'FALHA', 'PHP', 'funcao sqlsrv_connect', function_exists('sqlsrv_connect') ? 'disponivel' : 'indisponivel', true);
        if (function_exists('sqlsrv_client_info')) {
            $info = @sqlsrv_client_info();
            $this->add(is_array($info) ? 'OK' : 'AVISO', 'PHP', 'sqlsrv_client_info', is_array($info) ? $this->formatArray($info) : 'nao retornou dados', false);
        } else {
            $this->add('AVISO', 'PHP', 'sqlsrv_client_info', 'funcao indisponivel', false);
        }
    }

    private function checkConfiguration()
    {
        $this->add(DB_DRIVER === 'sqlsrv' ? 'OK' : 'FALHA', 'CONFIG', 'DB_DRIVER', DB_DRIVER, true);
        $this->add(DB_CONNECTION === 'sqlsrv' ? 'OK' : 'FALHA', 'CONFIG', 'DB_CONNECTION', DB_CONNECTION, true);
        $this->add(SQLSERVER_HOST !== '' ? 'OK' : 'FALHA', 'CONFIG', 'servidor', SQLSERVER_HOST !== '' ? $this->mask(SQLSERVER_HOST) : 'ausente', true);
        $this->add(SQLSERVER_DATABASE !== '' ? 'OK' : 'FALHA', 'CONFIG', 'banco', SQLSERVER_DATABASE !== '' ? $this->mask(SQLSERVER_DATABASE) : 'ausente', true);
        $this->add('OK', 'CONFIG', 'porta', SQLSERVER_PORT !== '' ? SQLSERVER_PORT : 'padrao do driver', false);
        $this->add(in_array(DB_AUTH_MODE, array('sql', 'integrated'), true) ? 'OK' : 'FALHA', 'CONFIG', 'autenticacao', DB_AUTH_MODE, true);
        if (DB_AUTH_MODE === 'sql') {
            $this->add(SQLSERVER_USER !== '' ? 'OK' : 'FALHA', 'CONFIG', 'usuario SQL', SQLSERVER_USER !== '' ? 'configurado' : 'ausente', true);
            $this->add(SQLSERVER_PASSWORD !== '' ? 'OK' : 'FALHA', 'CONFIG', 'senha SQL', SQLSERVER_PASSWORD !== '' ? 'configurada' : 'ausente', true);
        }
        $this->add('OK', 'CONFIG', 'Encrypt', SQLSERVER_ENCRYPT === '' ? 'nao configurado' : SQLSERVER_ENCRYPT, false);
        $this->add('OK', 'CONFIG', 'TrustServerCertificate', SQLSERVER_TRUST_SERVER_CERTIFICATE === '' ? 'nao configurado' : SQLSERVER_TRUST_SERVER_CERTIFICATE, false);
    }

    private function checkConnection()
    {
        if (!function_exists('sqlsrv_connect')) {
            $this->add('FALHA', 'CONEXAO', 'sqlsrv_connect', 'funcao indisponivel; nao foi possivel testar conexao', true);
            return;
        }
        if (SQLSERVER_HOST === '' || SQLSERVER_DATABASE === '') {
            $this->add('FALHA', 'CONEXAO', 'configuracao minima', 'db_host e db_database sao obrigatorios', true);
            return;
        }

        $server = SQLSERVER_HOST . (SQLSERVER_PORT !== '' ? ',' . SQLSERVER_PORT : '');
        $options = array('Database' => SQLSERVER_DATABASE);
        if (SQLSERVER_USER !== '' || DB_AUTH_MODE === 'sql') {
            $options['UID'] = SQLSERVER_USER;
            $options['PWD'] = SQLSERVER_PASSWORD;
        }
        if (SQLSERVER_ENCRYPT !== '') {
            $options['Encrypt'] = SQLSERVER_ENCRYPT;
        }
        if (SQLSERVER_TRUST_SERVER_CERTIFICATE !== '') {
            $options['TrustServerCertificate'] = SQLSERVER_TRUST_SERVER_CERTIFICATE;
        }

        $this->add('OK', 'CONEXAO', 'servidor usado', $this->mask($server), false);
        $this->add('OK', 'CONEXAO', 'opcoes sqlsrv_connect', $this->safeConnectionOptions($options), false);

        $started = microtime(true);
        $connection = @sqlsrv_connect($server, $options);
        $elapsed = number_format((microtime(true) - $started) * 1000, 1, '.', '');
        if ($connection === false) {
            $this->add('FALHA', 'CONEXAO', 'sqlsrv_connect', 'falhou em ' . $elapsed . ' ms', true);
            $this->addSqlsrvErrors('CONEXAO');
            $this->addRecommendations();
            return;
        }

        $this->add('OK', 'CONEXAO', 'sqlsrv_connect', 'conectado em ' . $elapsed . ' ms', false);
        if (function_exists('sqlsrv_server_info')) {
            $serverInfo = @sqlsrv_server_info($connection);
            $this->add(is_array($serverInfo) ? 'OK' : 'AVISO', 'CONEXAO', 'sqlsrv_server_info', is_array($serverInfo) ? $this->formatArray($serverInfo) : 'nao retornou dados', false);
        }

        $this->queryScalar($connection, 'SELECT 1', 'CONSULTA', 'SELECT 1', true);
        $this->queryScalar($connection, 'SELECT DB_NAME()', 'CONSULTA', 'banco atual', false);
        $this->queryScalar($connection, 'SELECT SUSER_SNAME()', 'CONSULTA', 'login SQL atual', false);
        $this->queryScalar($connection, 'SELECT SYSTEM_USER', 'CONSULTA', 'system_user', false);
        $this->queryScalar($connection, 'SELECT @@VERSION', 'CONSULTA', 'versao SQL Server', false);

        foreach (array('indicadores', 'lancamentos', 'usuarios_acesso', 'acessos_log') as $table) {
            $sql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = ?";
            $stmt = @sqlsrv_query($connection, $sql, array($table));
            if ($stmt === false) {
                $this->add('FALHA', 'TABELA', $table, 'erro ao consultar INFORMATION_SCHEMA', true);
                $this->addSqlsrvErrors('TABELA');
                continue;
            }
            $row = @sqlsrv_fetch_array($stmt, SQLSRV_FETCH_NUMERIC);
            $exists = is_array($row) && isset($row[0]) && (int) $row[0] > 0;
            $this->add($exists ? 'OK' : 'FALHA', 'TABELA', 'dbo.' . $table, $exists ? 'existe' : 'ausente', !$exists);
            @sqlsrv_free_stmt($stmt);
        }

        @sqlsrv_close($connection);
        $this->addRecommendations();
    }

    private function queryScalar($connection, $sql, $section, $label, $critical)
    {
        $stmt = @sqlsrv_query($connection, $sql);
        if ($stmt === false) {
            $this->add('FALHA', $section, $label, 'erro ao executar: ' . $sql, $critical);
            $this->addSqlsrvErrors($section);
            return;
        }
        $row = @sqlsrv_fetch_array($stmt, SQLSRV_FETCH_NUMERIC);
        if (!is_array($row)) {
            $this->add('FALHA', $section, $label, 'sem retorno', $critical);
            $this->addSqlsrvErrors($section);
            @sqlsrv_free_stmt($stmt);
            return;
        }
        $this->add('OK', $section, $label, isset($row[0]) ? (string) $row[0] : '', false);
        @sqlsrv_free_stmt($stmt);
    }

    private function addSqlsrvErrors($section)
    {
        if (!function_exists('sqlsrv_errors')) {
            $this->add('FALHA', $section, 'sqlsrv_errors', 'funcao indisponivel', true);
            return;
        }
        $errors = defined('SQLSRV_ERR_ALL') ? @sqlsrv_errors(SQLSRV_ERR_ALL) : @sqlsrv_errors();
        if (!is_array($errors) || !$errors) {
            $this->add('AVISO', $section, 'sqlsrv_errors', 'nenhum detalhe retornado pelo driver', false);
            return;
        }
        foreach ($errors as $index => $error) {
            $sqlstate = isset($error['SQLSTATE']) ? (string) $error['SQLSTATE'] : '';
            $code = isset($error['code']) ? (string) $error['code'] : '';
            $message = isset($error['message']) ? (string) $error['message'] : '';
            $this->add('FALHA', $section, 'erro sqlsrv #' . ((int) $index + 1), 'SQLSTATE=' . $sqlstate . '; code=' . $code . '; message=' . $message, true);
        }
    }

    private function addRecommendations()
    {
        $this->items[] = '';
        $this->items[] = 'POSSIVEIS CAUSAS DO ERRO SQL SERVER';
        $this->items[] = '- Extensao sqlsrv ausente ou carregada no php.ini errado.';
        $this->items[] = '- PHP CLI diferente do PHP/FastCGI usado pelo IIS.';
        $this->items[] = '- DB_DRIVER/DB_CONNECTION diferente de sqlsrv.';
        $this->items[] = '- Servidor, banco, usuario ou senha incorretos em servidor.local.php.';
        $this->items[] = '- Login sem permissao para abrir o banco configurado.';
        $this->items[] = '- Banco/tabelas ainda nao criados ou schema nao aplicado.';
        $this->items[] = '- Firewall, porta SQL Server ou instancia inacessivel a partir do servidor web.';
        $this->items[] = '';
        $this->items[] = 'CORRECOES RECOMENDADAS';
        $this->items[] = '- Execute este script com o mesmo php.exe usado no IIS usando PHP_EXE quando necessario.';
        $this->items[] = '- Confirme extension=php_sqlsrv.dll no php.ini carregado.';
        $this->items[] = '- Mantenha db_driver como sqlsrv em app/config/servidor.local.php.';
        $this->items[] = '- Confira db_host, db_database, db_auth_mode, db_username e db_password sem versionar credenciais.';
        $this->items[] = '- Teste acesso ao SQL Server pela mesma rede/conta do servidor IIS.';
    }

    private function finishReport()
    {
        $this->items[] = '';
        $this->items[] = 'RESULTADO GERAL: ' . ($this->criticalFailure ? 'FALHA' : 'OK');
        $path = LOG_PATH . '/diagnostico-sqlserver-' . date('Y-m-d-His') . '.log';
        $this->reportPath = $path;
        if (is_dir(LOG_PATH) && is_writable(LOG_PATH)) {
            @file_put_contents($path, implode(PHP_EOL, $this->items) . PHP_EOL . 'RELATORIO GERADO: ' . $path . PHP_EOL);
        }
        $this->items[] = 'RELATORIO GERADO: ' . $path;
    }

    private function safeConnectionOptions(array $options)
    {
        $safe = array();
        foreach ($options as $key => $value) {
            if (preg_match('/pwd|password|senha|uid|user/i', (string) $key)) {
                $safe[] = $key . '=' . ($value === '' ? 'ausente' : 'configurado');
            } else {
                $safe[] = $key . '=' . (string) $value;
            }
        }
        return implode('; ', $safe);
    }

    private function formatArray(array $values)
    {
        $parts = array();
        foreach ($values as $key => $value) {
            if (is_array($value) || is_object($value)) {
                continue;
            }
            $parts[] = (string) $key . '=' . (string) $value;
        }
        return implode('; ', $parts);
    }

    private function mask($value)
    {
        $value = (string) $value;
        $length = strlen($value);
        if ($length <= 2) {
            return str_repeat('*', $length);
        }
        return substr($value, 0, 2) . str_repeat('*', min(6, $length - 2)) . ' (tamanho=' . $length . ')';
    }

    private function sanitize($text)
    {
        $text = str_replace(array("\r", "\n"), ' ', (string) $text);
        foreach (array(SQLSERVER_HOST, SQLSERVER_DATABASE, SQLSERVER_USER, SQLSERVER_PASSWORD) as $secret) {
            $secret = (string) $secret;
            if ($secret !== '') {
                $text = str_replace($secret, '[PROTEGIDO]', $text);
            }
        }
        $text = preg_replace('/(?i)(password|senha|pwd|token|secret|chave)\s*=\s*[^;&\s]+/', '$1=[PROTEGIDO]', $text);
        return $text;
    }
}

$diagnostico = new DiagnosticoSqlServer();
exit($diagnostico->run());
