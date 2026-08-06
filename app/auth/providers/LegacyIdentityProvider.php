<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../core/Logger.php';

final class LegacyIdentityProvider
{
    private $path;

    public function __construct($path = null)
    {
        $this->path = $path !== null ? (string) $path : LDAP_LEGACY_PATH;
    }

    public function load($matricula = null)
    {
        $matricula = $matricula !== null
            ? CorporateIdentity::normalizeMatricula($matricula)
            : CorporateIdentity::normalizeRemoteUser(isset($_SERVER['REMOTE_USER']) ? $_SERVER['REMOTE_USER'] : '');

        if ($matricula === null) {
            Logger::error('[AUTH] REMOTE_USER ausente ou invalido para arquivo legado.');
            return null;
        }
        if ($this->path === '' || !is_file($this->path) || !is_readable($this->path)) {
            Logger::error('[AUTH] Arquivo LDAP legado nao localizado ou inacessivel.', array(
                'configurado' => $this->path !== '' ? 'sim' : 'nao',
                'esperado' => '../acessoldap/LDAP.php',
                'motivo' => $this->path === '' ? 'caminho vazio' : (!is_file($this->path) ? 'arquivo inexistente' : 'arquivo sem leitura'),
            ));
            return null;
        }

        $dados = $this->loadLegacyData($this->path);
        if (!is_array($dados)) {
            Logger::error('[AUTH] Arquivo LDAP legado nao retornou dados validos.');
            return null;
        }

        $identity = $this->mapLegacyData($dados, $matricula);
        if ($identity === null) {
            Logger::error('[AUTH] Dados do arquivo LDAP legado invalidos ou incompletos.');
        }
        return $identity;
    }

    private function loadLegacyData($path)
    {
        $loader = function ($legacyPath) {
            $dados = null;
            $previousDirectory = getcwd();
            $legacyDirectory = dirname($legacyPath);

            try {
                if ($legacyDirectory !== '' && is_dir($legacyDirectory)) {
                    chdir($legacyDirectory);
                }

                $result = require $legacyPath;
                if (is_array($result)) {
                    return $result;
                }
                if (is_array($dados)) {
                    return $dados;
                }
                return isset($GLOBALS['dados']) && is_array($GLOBALS['dados']) ? $GLOBALS['dados'] : null;
            } finally {
                if ($previousDirectory !== false) {
                    chdir($previousDirectory);
                }
            }
        };

        try {
            return $loader($path);
        } catch (Throwable $error) {
            Logger::error('[AUTH] Falha ao carregar arquivo LDAP legado.', array('tipo' => get_class($error)));
            return null;
        }
    }

    private function mapLegacyData(array $dados, $expectedMatricula)
    {
        $identity = array(
            'matricula' => $this->firstValue($dados, array('matricula', 'nu_matricula', 'co_matricula', 'login', 'usuario')),
            'nome' => $this->firstValue($dados, array('nome', 'no_empregado', 'no_usuario', 'displayname')),
            'funcao' => $this->firstValue($dados, array('funcao', 'no_funcao', 'cargo', 'title')),
            'unidade' => $this->firstValue($dados, array('unidade', 'co_unidade', 'lotacao', 'department')),
            'sg_unidade' => $this->firstValue($dados, array('sg_unidade', 'sigla_unidade', 'sg_lotacao', 'departmentnumber')),
            'no_unidade' => $this->firstValue($dados, array('no_unidade', 'nome_unidade', 'no_lotacao', 'department')),
        );

        $identity['matricula'] = CorporateIdentity::normalizeMatricula($identity['matricula']);
        if ($identity['matricula'] === null || $identity['matricula'] !== $expectedMatricula) {
            return null;
        }

        foreach ($identity as $value) {
            if (trim((string) $value) === '') {
                return null;
            }
        }

        return $identity;
    }

    private function firstValue(array $data, array $keys)
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $data)) {
                $value = $data[$key];
                if (is_array($value)) {
                    $value = isset($value[0]) ? $value[0] : '';
                }
                return trim((string) $value);
            }
        }
        return '';
    }
}
