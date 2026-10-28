<?php
declare(strict_types=1);

require_once __DIR__ . '/ResumoExecutivoDadosService.php';
require_once __DIR__ . '/../auth/Auth.php';
require_once __DIR__ . '/../auth/AccessPolicy.php';
require_once __DIR__ . '/../repositories/IndicadoresRepository.php';
require_once __DIR__ . '/../repositories/HomologacoesRepository.php';
require_once __DIR__ . '/../repositories/EvidenciasRepository.php';
require_once __DIR__ . '/../repositories/RetificacoesRepository.php';
require_once __DIR__ . '/../repositories/LancamentosObservacoesDocumentaisRepository.php';

final class RelatorioIndicadorService
{
    private $dadosService;
    private $indicadores;
    private $homologacoes;
    private $evidencias;
    private $retificacoes;
    private $observacoes;

    public function __construct($db)
    {
        $this->dadosService = new ResumoExecutivoDadosService($db);
        $this->indicadores = new IndicadoresRepository($db);
        $this->homologacoes = new HomologacoesRepository($db);
        $this->evidencias = new EvidenciasRepository($db);
        $this->retificacoes = new RetificacoesRepository($db);
        $this->observacoes = new LancamentosObservacoesDocumentaisRepository($db);
    }

    public function gerar($indicatorId, array $filters, array $user)
    {
        $indicatorId = trim((string) $indicatorId);
        if ($indicatorId === '' || strlen($indicatorId) > 100) {
            throw new InvalidArgumentException('Indicador invalido.');
        }
        $year = isset($filters['ano']) && ctype_digit((string) $filters['ano']) ? (int) $filters['ano'] : 2026;
        if ($year < 2000 || $year > 2100) throw new InvalidArgumentException('Exercicio invalido.');

        $indicator = $this->indicadores->find($indicatorId);
        if (!$indicator || empty($indicator['ativo'])) throw new OutOfBoundsException('Indicador nao encontrado.');
        $profile = Auth::normalizeProfile(isset($user['perfil']) ? $user['perfil'] : '');
        if ($profile !== 'administrador' && !AccessPolicy::scopeAllows($user, $indicator)) {
            throw new UnexpectedValueException('Indicador fora do escopo autorizado.');
        }

        $data = $this->dadosService->dados(array('indicadorId' => $indicatorId, 'ano' => $year, 'ativo' => true));
        if (count($data['indicadores']) !== 1) throw new OutOfBoundsException('Indicador nao encontrado.');
        $launches = $this->observacoes->decorate($data['lancamentos']);
        $launchIds = array_map(function ($launch) { return (string) $launch['id']; }, $launches);
        $governedIds = array();
        foreach ($data['governancaHomologacaoAtual'] as $item) {
            if (isset($item['lancamentoId'])) $governedIds[] = (string) $item['lancamentoId'];
        }
        $approvals = $this->homologacoes->latestApprovalMetadata($governedIds);
        $submissions = $this->homologacoes->latestSubmissionMetadata($launchIds);
        $evidenceByLaunch = array();
        $retificationsByLaunch = array();
        foreach ($launches as $launch) {
            $launchId = (string) $launch['id'];
            $evidenceByLaunch[$launchId] = $this->evidencias->allByLaunch($launchId);
            $retificationsByLaunch[$launchId] = $this->retificacoes->historyByLaunch($launchId);
        }
        return self::montarPayload(
            $data['indicadores'][0], $launches, self::ruleFor($data['regrasIndicadores'], $indicatorId),
            $data['governancaHomologacaoAtual'], $approvals, $submissions,
            $evidenceByLaunch, $retificationsByLaunch, $year, $user
        );
    }

    public static function montarPayload(
        array $indicator,
        array $launches,
        array $rule,
        array $governance,
        array $approvals,
        array $submissions,
        array $evidenceByLaunch,
        array $retificationsByLaunch,
        $year,
        array $user
    ) {
        $governed = array();
        foreach ($governance as $item) {
            $id = isset($item['lancamentoId']) ? (string) $item['lancamentoId'] : '';
            if ($id !== '') $governed[$id] = (int) (isset($item['versao']) ? $item['versao'] : 1);
        }
        $byMonth = array();
        foreach ($launches as $launch) {
            if ((int) $launch['ano'] === (int) $year) $byMonth[(int) $launch['mes']] = $launch;
        }

        $trajectory = array();
        for ($month = 1; $month <= 12; $month++) {
            $trajectory[] = self::positionRow(
                isset($byMonth[$month]) ? $byMonth[$month] : null,
                $month, $year, $rule, $governed, $approvals, $submissions
            );
        }
        $trajectoryByMonth = array();
        foreach ($trajectory as $row) $trajectoryByMonth[(int) $row['mes']] = $row;

        $closingMonths = self::closingMonths($rule);
        $quarterly = array();
        $observations = array();
        for ($quarter = 1; $quarter <= 4; $quarter++) {
            $closingMonth = self::closingMonthForQuarter($closingMonths, $quarter);
            $row = $trajectoryByMonth[$closingMonth];
            $launch = isset($byMonth[$closingMonth]) ? $byMonth[$closingMonth] : null;
            $source = $row['fonteDocumental'];
            if ($source === null && $launch) $source = self::sourceForLaunch($launch, $rule);
            $quarterly[] = array(
                'trimestre' => $quarter . 'TRI', 'competencia' => sprintf('%04d-%02d', $year, $closingMonth),
                'meta' => $row['meta'], 'resultado' => $row['resultado'], 'atingimento' => $row['atingimento'],
                'situacao' => $row['situacao'], 'governanca' => $row['governanca'],
                'versao' => $row['versao'], 'fonteDocumental' => $source,
            );
            $observation = $launch ? self::observationForLaunch($launch, $rule, $quarter) : null;
            if ($observation !== null) $observations[] = $observation;
        }

        $currentEvidence = array();
        $historicalEvidence = array();
        $versionHistory = array();
        foreach ($launches as $launch) {
            $launchId = (string) $launch['id'];
            foreach (isset($evidenceByLaunch[$launchId]) ? $evidenceByLaunch[$launchId] : array() as $evidence) {
                $item = self::evidenceItem($evidence, $launch);
                if ((int) $item['versao'] === (int) $launch['versaoAtual']) $currentEvidence[] = $item;
                else $historicalEvidence[] = $item;
            }
            foreach (isset($retificationsByLaunch[$launchId]) ? $retificationsByLaunch[$launchId] : array() as $retification) {
                $history = self::versionHistoryItem($retification, $launch);
                if ($history !== null) $versionHistory[$launchId . ':' . $history['versao']] = $history;
            }
        }
        usort($currentEvidence, array(__CLASS__, 'sortByCompetenceAndVersion'));
        usort($historicalEvidence, array(__CLASS__, 'sortByCompetenceAndVersion'));
        $versionHistory = array_values($versionHistory);
        usort($versionHistory, array(__CLASS__, 'sortByCompetenceAndVersion'));

        $governanceSummary = array();
        foreach ($trajectory as $row) {
            if ($row['governanca'] === 'Sem posicao oficial') continue;
            $governanceSummary[] = array(
                'competencia' => $row['competencia'], 'versao' => $row['versao'],
                'governanca' => $row['governanca'], 'submetidoEm' => $row['submetidoEm'],
                'submetidoPor' => $row['submetidoPor'], 'homologadoEm' => $row['homologadoEm'],
                'homologadoPor' => $row['homologadoPor'],
            );
        }

        return array(
            'relatorio' => 'Relatorio Detalhado por Indicador', 'somenteLeitura' => true,
            'geradoEm' => date('c'),
            'geradoPor' => array(
                'nome' => isset($user['nome']) ? (string) $user['nome'] : '',
                'matricula' => isset($user['matricula']) ? (string) $user['matricula'] : '',
            ),
            'escopo' => self::scopeDescription($user), 'ano' => (int) $year,
            'indicador' => self::indicatorIdentification($indicator, $rule),
            'trajetoria' => $trajectory, 'fechamentosTrimestrais' => $quarterly,
            'observacoesOficiais' => $observations,
            'evidencias' => array('versaoAtual' => $currentEvidence, 'versoesAnteriores' => $historicalEvidence),
            'historicoVersoes' => $versionHistory, 'governancaResumida' => $governanceSummary,
        );
    }

    private static function positionRow($launch, $month, $year, array $rule, array $governed, array $approvals, array $submissions)
    {
        $base = array(
            'mes' => (int) $month, 'competencia' => sprintf('%04d-%02d', $year, $month),
            'meta' => null, 'resultado' => null, 'atingimento' => null, 'situacao' => 'Nao apurado',
            'governanca' => 'Sem posicao oficial', 'versao' => null, 'fonteDocumental' => null,
            'submetidoEm' => null, 'submetidoPor' => null, 'homologadoEm' => null, 'homologadoPor' => null,
        );
        if (!$launch || (string) $launch['status'] !== 'Homologado') return $base;
        $launchId = (string) $launch['id'];
        $currentGoverned = isset($governed[$launchId]) && (int) $governed[$launchId] === (int) $launch['versaoAtual'];
        if (!empty($rule['exigirHomologacaoTransacionalVersaoAtual']) && !$currentGoverned) return $base;

        $presentation = self::officialPresentation($rule, $month, $year);
        $base['meta'] = self::value(isset($launch['metaReferencia']) ? $launch['metaReferencia'] : null);
        $base['resultado'] = self::value(isset($launch['resultadoOficialAnual']) && $launch['resultadoOficialAnual'] !== null && $launch['resultadoOficialAnual'] !== ''
            ? $launch['resultadoOficialAnual'] : (isset($launch['resultadoMensal']) ? $launch['resultadoMensal'] : null));
        $base['atingimento'] = self::value(isset($launch['percentualAtingido']) ? $launch['percentualAtingido'] : null);
        $base['situacao'] = trim((string) (isset($launch['situacaoCalculada']) ? $launch['situacaoCalculada'] : '')) ?: 'Nao apurado';
        if ($presentation) {
            if (array_key_exists('metaOficialReportada', $presentation) && $presentation['metaOficialReportada'] !== null) $base['meta'] = self::value($presentation['metaOficialReportada']);
            if (array_key_exists('resultadoOficialReportado', $presentation) && $presentation['resultadoOficialReportado'] !== null) $base['resultado'] = self::value($presentation['resultadoOficialReportado']);
            if (array_key_exists('percentualAtingidoOficialReportado', $presentation) && $presentation['percentualAtingidoOficialReportado'] !== null) $base['atingimento'] = self::value($presentation['percentualAtingidoOficialReportado']);
            if (!empty($presentation['situacaoOficial'])) $base['situacao'] = (string) $presentation['situacaoOficial'];
        }
        $base['governanca'] = $currentGoverned ? 'Homologado - versao atual' : 'Homologado legado - sem evento transacional';
        $base['versao'] = (int) $launch['versaoAtual'];
        $base['fonteDocumental'] = self::sourceForLaunch($launch, $rule);
        if ($base['fonteDocumental'] === null && $presentation && !empty($presentation['fonte'])) $base['fonteDocumental'] = (string) $presentation['fonte'];
        $submission = isset($submissions[$launchId]) ? $submissions[$launchId] : array();
        $approval = $currentGoverned && isset($approvals[$launchId]) ? $approvals[$launchId] : array();
        $base['submetidoEm'] = !empty($submission['data']) ? (string) $submission['data'] : null;
        $base['submetidoPor'] = !empty($submission['usuario']) ? (string) $submission['usuario'] : null;
        $base['homologadoEm'] = !empty($approval['data']) ? (string) $approval['data'] : null;
        $base['homologadoPor'] = !empty($approval['usuario']) ? (string) $approval['usuario'] : null;
        return $base;
    }

    private static function indicatorIdentification(array $indicator, array $rule)
    {
        $params = isset($rule['parametrosCalculo']) && is_array($rule['parametrosCalculo']) ? $rule['parametrosCalculo'] : array();
        return array(
            'id' => $indicator['id'], 'codigo' => (int) $indicator['numero'],
            'nome' => (string) $indicator['indicador'], 'plano' => $indicator['plano'],
            'pilar' => $indicator['pilar'], 'diretoria' => $indicator['diretoriaResponsavel'],
            'unidade' => $indicator['unidadeApuradora'],
            'descricao' => !empty($indicator['observacaoAcompanhamento']) ? (string) $indicator['observacaoAcompanhamento'] : null,
            'formula' => !empty($indicator['metrica']) ? (string) $indicator['metrica'] : null,
            'polaridade' => !empty($params['sentidoMeta']) ? (string) $params['sentidoMeta'] : null,
            'periodicidade' => !empty($indicator['periodicidade']) ? (string) $indicator['periodicidade'] : null,
            'metaAnual' => !empty($indicator['metaAnualDescricao']) ? (string) $indicator['metaAnualDescricao'] : null,
            'unidadeMedida' => !empty($indicator['unidadeMedida']) ? (string) $indicator['unidadeMedida'] : null,
            'tipoCalculo' => !empty($indicator['tipoCalculo']) ? (string) $indicator['tipoCalculo'] : null,
            'tipoConsolidacao' => !empty($indicator['tipoConsolidacao']) ? (string) $indicator['tipoConsolidacao'] : null,
        );
    }

    private static function observationForLaunch(array $launch, array $rule, $quarter)
    {
        $document = isset($launch['observacaoDocumental']) && is_array($launch['observacaoDocumental']) ? $launch['observacaoDocumental'] : array();
        $text = isset($document['observacao']) ? trim((string) $document['observacao']) : '';
        if ($text !== '') {
            return array(
                'trimestre' => $quarter . 'TRI', 'competencia' => (string) $launch['competencia'],
                'observacao' => $text,
                'fonte' => !empty($document['fonteDocumental']) ? (string) $document['fonteDocumental'] : null,
                'paginas' => !empty($document['paginasDocumento']) ? (string) $document['paginasDocumento'] : null,
                'tipo' => !empty($document['tipoObservacao']) ? (string) $document['tipoObservacao'] : null,
                'carregadoEm' => !empty($document['criadoEm']) ? (string) $document['criadoEm'] : null,
            );
        }
        $fields = isset($launch['camposEntrada']) && is_array($launch['camposEntrada']) ? $launch['camposEntrada'] : array();
        $physical = isset($launch['observacaoArea']) ? trim((string) $launch['observacaoArea']) : '';
        $legacy = isset($fields['observacaoArea']) ? trim((string) $fields['observacaoArea']) : '';
        $text = $physical !== '' ? $physical : $legacy;
        if ($text === '') return null;
        return array(
            'trimestre' => $quarter . 'TRI', 'competencia' => (string) $launch['competencia'],
            'observacao' => $text, 'fonte' => self::sourceForLaunch($launch, $rule),
            'paginas' => null, 'tipo' => $physical !== '' ? 'OBSERVACAO_AREA_LANCAMENTO' : 'OBSERVACAO_AREA_JSON_LEGADO',
            'carregadoEm' => null,
        );
    }

    private static function evidenceItem(array $evidence, array $launch)
    {
        return array(
            'id' => (string) $evidence['id'], 'competencia' => (string) $launch['competencia'],
            'versao' => (int) $evidence['versao_lancamento'],
            'nomeArquivo' => isset($evidence['nome_arquivo']) ? (string) $evidence['nome_arquivo'] : '',
            'tipoArquivo' => isset($evidence['tipo_arquivo']) ? (string) $evidence['tipo_arquivo'] : '',
            'descricao' => isset($evidence['descricao']) && trim((string) $evidence['descricao']) !== '' ? (string) $evidence['descricao'] : null,
            'dataUpload' => isset($evidence['data_upload']) ? (string) $evidence['data_upload'] : null,
            'usuario' => isset($evidence['usuario']) ? (string) $evidence['usuario'] : null,
            'podeBaixar' => true,
        );
    }

    private static function versionHistoryItem(array $retification, array $launch)
    {
        $snapshot = json_decode((string) (isset($retification['versao_anterior_json']) ? $retification['versao_anterior_json'] : ''), true);
        if (!is_array($snapshot)) return null;
        if (isset($snapshot['lancamento']) && is_array($snapshot['lancamento'])) $snapshot = $snapshot['lancamento'];
        return array(
            'competencia' => isset($snapshot['competencia']) ? (string) $snapshot['competencia'] : (string) $launch['competencia'],
            'versao' => (int) $retification['versao_anterior'],
            'status' => self::first($snapshot, array('status')),
            'meta' => self::value(self::first($snapshot, array('metaReferencia', 'meta_referencia', 'metaMensal'))),
            'resultado' => self::value(self::first($snapshot, array('resultadoOficialAnual', 'resultado_oficial', 'resultadoMensal', 'resultado_calculado'))),
            'atingimento' => self::value(self::first($snapshot, array('percentualAtingido', 'percentual_atingido'))),
            'situacao' => self::first($snapshot, array('situacaoCalculada', 'situacao')),
            'retificadoEm' => isset($retification['data_retificacao']) ? (string) $retification['data_retificacao'] : null,
            'retificadoPor' => isset($retification['usuario']) ? (string) $retification['usuario'] : null,
            'motivo' => isset($retification['justificativa']) ? (string) $retification['justificativa'] : null,
        );
    }

    private static function sourceForLaunch(array $launch, array $rule)
    {
        $document = isset($launch['observacaoDocumental']) && is_array($launch['observacaoDocumental']) ? $launch['observacaoDocumental'] : array();
        if (!empty($document['fonteDocumental'])) return (string) $document['fonteDocumental'];
        if (!empty($launch['referenciaEvidencia'])) return (string) $launch['referenciaEvidencia'];
        $fields = isset($launch['camposEntrada']) && is_array($launch['camposEntrada']) ? $launch['camposEntrada'] : array();
        foreach ($fields as $key => $value) {
            $normalized = strtolower((string) $key);
            if ((strpos($normalized, 'fonte') === 0 || strpos($normalized, 'relatorio') === 0) && is_scalar($value) && trim((string) $value) !== '') {
                return substr(trim((string) $value), 0, 500);
            }
        }
        return null;
    }

    private static function officialPresentation(array $rule, $month, $year)
    {
        if (!in_array((int) $month, self::closingMonths($rule), true)) return null;
        $params = isset($rule['parametrosCalculo']) && is_array($rule['parametrosCalculo']) ? $rule['parametrosCalculo'] : array();
        $presentations = isset($params['apresentacoesOficiaisTrimestrais']) && is_array($params['apresentacoesOficiaisTrimestrais'])
            ? $params['apresentacoesOficiaisTrimestrais'] : array();
        $quarter = (int) ceil(((int) $month) / 3);
        $key = $quarter . 'TRI/' . (int) $year;
        if (isset($presentations[$key]) && is_array($presentations[$key])) return $presentations[$key];
        $shortKey = $quarter . 'TRI';
        return isset($presentations[$shortKey]) && is_array($presentations[$shortKey]) ? $presentations[$shortKey] : null;
    }

    private static function closingMonths(array $rule)
    {
        $params = isset($rule['parametrosCalculo']) && is_array($rule['parametrosCalculo']) ? $rule['parametrosCalculo'] : array();
        $configured = isset($params['mesesFechamentoTrimestral']) && is_array($params['mesesFechamentoTrimestral'])
            ? $params['mesesFechamentoTrimestral'] : array(3, 6, 9, 12);
        $months = array();
        foreach ($configured as $month) {
            $month = (int) $month;
            if ($month >= 1 && $month <= 12 && !in_array($month, $months, true)) $months[] = $month;
        }
        sort($months);
        return $months ?: array(3, 6, 9, 12);
    }

    private static function closingMonthForQuarter(array $closingMonths, $quarter)
    {
        $start = (($quarter - 1) * 3) + 1;
        $end = $quarter * 3;
        foreach ($closingMonths as $month) if ($month >= $start && $month <= $end) return (int) $month;
        return $end;
    }

    private static function ruleFor(array $rules, $indicatorId)
    {
        foreach ($rules as $rule) if ((string) $rule['indicadorId'] === (string) $indicatorId) return $rule;
        return array();
    }

    private static function scopeDescription(array $user)
    {
        $profile = Auth::normalizeProfile(isset($user['perfil']) ? $user['perfil'] : '');
        if ($profile === 'unidade_apuradora') return 'Unidade ' . (isset($user['unidade_apuradora']) ? $user['unidade_apuradora'] : '');
        if (in_array($profile, array('homologador', 'consultor_diretoria'), true)) return 'Diretoria ' . (isset($user['diretoria_responsavel']) ? $user['diretoria_responsavel'] : '');
        return 'Corporativo - todos os indicadores';
    }

    private static function first(array $source, array $keys)
    {
        foreach ($keys as $key) if (array_key_exists($key, $source) && $source[$key] !== '') return $source[$key];
        return null;
    }

    private static function value($value)
    {
        if ($value === null || $value === '') return null;
        return is_numeric($value) ? (float) $value : $value;
    }

    private static function sortByCompetenceAndVersion($left, $right)
    {
        $competence = strcmp((string) $left['competencia'], (string) $right['competencia']);
        return $competence !== 0 ? $competence : ((int) $left['versao'] - (int) $right['versao']);
    }
}
