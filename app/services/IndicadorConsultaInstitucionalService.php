<?php
declare(strict_types=1);

require_once __DIR__ . '/../repositories/ConfiguracoesRepository.php';
require_once __DIR__ . '/../repositories/IndicadoresRepository.php';
require_once __DIR__ . '/../repositories/LancamentosRepository.php';
require_once __DIR__ . '/../auth/Auth.php';
require_once __DIR__ . '/../auth/AccessPolicy.php';

final class IndicadorConsultaInstitucionalService
{
    private $db;
    private $configuracoes;
    private $indicadores;
    private $lancamentos;

    public function __construct($db)
    {
        $this->db = $db;
        $this->configuracoes = new ConfiguracoesRepository($db);
        $this->indicadores = new IndicadoresRepository($db);
        $this->lancamentos = new LancamentosRepository($db);
    }

    public function detalhe($id, array $user): array
    {
        $indicador = $this->indicadores->find($id);
        if (!$indicador || empty($indicador['ativo'])) {
            throw new OutOfBoundsException('Indicador nao encontrado ou indisponivel.');
        }

        $profile = Auth::normalizeProfile(isset($user['perfil']) ? $user['perfil'] : '');
        $scopeAllows = AccessPolicy::scopeAllows($user, $indicador);
        $operationalScope = $profile === 'administrador' || (
            in_array($profile, array('homologador', 'unidade_apuradora'), true) && $scopeAllows
        );
        $institutionalReadOnly = !$operationalScope;

        $launches = $this->lancamentos->all(array('indicadorId' => $id));
        if ($institutionalReadOnly) {
            $launches = array_values(array_map(
                array($this, 'sanitizeInstitutionalLaunch'),
                array_filter($launches, static function ($launch) {
                    return isset($launch['status']) && $launch['status'] === 'Homologado';
                })
            ));
        }

        $rules = array_values(array_filter(
            $this->configuracoes->get('regrasIndicadores', array()),
            static function ($rule) use ($id) {
                return is_array($rule) && (string) ($rule['indicadorId'] ?? '') === (string) $id;
            }
        ));

        return array(
            'indicador' => $indicador,
            'lancamentos' => $launches,
            'regrasIndicadores' => $rules,
            'consulta' => array(
                'escopo' => 'geral',
                'institucional' => $institutionalReadOnly,
                'somenteLeitura' => $institutionalReadOnly,
                'dentroEscopoOperacional' => $operationalScope,
                'somenteHomologados' => $institutionalReadOnly,
            ),
            'fonte' => array(
                'tipo' => 'banco_central',
                'driver' => (string) $this->db->getAttribute(PDO::ATTR_DRIVER_NAME),
                'banco' => defined('SQLSERVER_DATABASE') ? SQLSERVER_DATABASE : '',
            ),
        );
    }

    private function sanitizeInstitutionalLaunch(array $launch): array
    {
        $restrictedEvidence = !empty($launch['evidenciaId']) || !empty($launch['referenciaEvidencia']);
        $inputs = isset($launch['camposEntrada']) && is_array($launch['camposEntrada'])
            ? $launch['camposEntrada']
            : array();

        foreach (array_keys($inputs) as $key) {
            if ($this->isRestrictedDocumentField($key)) {
                $value = $inputs[$key];
                $hasValue = is_array($value) ? count($value) > 0 : ($value !== null && trim((string) $value) !== '');
                $restrictedEvidence = $restrictedEvidence || $hasValue;
                unset($inputs[$key]);
            }
        }

        $launch['camposEntrada'] = $inputs;
        $launch['evidenciasRestritas'] = $restrictedEvidence;
        unset(
            $launch['evidenciaId'],
            $launch['referenciaEvidencia'],
            $launch['arquivoEvidencia'],
            $launch['linkEvidencia'],
            $launch['evidencia'],
            $launch['usuarioResponsavel']
        );
        return $launch;
    }

    private function isRestrictedDocumentField($key): bool
    {
        $value = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', (string) $key);
        $normalized = strtolower($value === false ? (string) $key : $value);
        foreach (array('evidencia', 'arquivo', 'anexo', 'documento', 'link', 'fonte') as $fragment) {
            if (strpos($normalized, $fragment) !== false) return true;
        }
        return false;
    }
}
