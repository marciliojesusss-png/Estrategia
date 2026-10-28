<?php
declare(strict_types=1);

require_once __DIR__ . '/ResumoExecutivoDadosService.php';
require_once __DIR__ . '/../auth/Auth.php';
require_once __DIR__ . '/../repositories/HomologacoesRepository.php';
require_once __DIR__ . '/../repositories/LancamentosObservacoesDocumentaisRepository.php';

final class RelatorioConsolidadoService
{
    private $dadosService;
    private $homologacoes;
    private $observacoesDocumentais;

    public function __construct($db)
    {
        $this->dadosService = new ResumoExecutivoDadosService($db);
        $this->homologacoes = new HomologacoesRepository($db);
        $this->observacoesDocumentais = new LancamentosObservacoesDocumentaisRepository($db);
    }

    public function gerar(array $requestedFilters, array $user)
    {
        $filters = self::normalizarFiltros($requestedFilters);
        $scopeFilters = self::filtrosEscopo($user, $filters);
        $data = $this->dadosService->dados(array_merge(array('ativo' => true), $scopeFilters));
        $data['lancamentos'] = $this->observacoesDocumentais->decorate($data['lancamentos']);

        $governedIds = array();
        foreach ($data['governancaHomologacaoAtual'] as $item) {
            if (isset($item['lancamentoId'])) $governedIds[] = (string) $item['lancamentoId'];
        }
        $approvalMetadata = $this->homologacoes->latestApprovalMetadata($governedIds);
        return self::montarPayload($data, $filters, $user, $approvalMetadata, $scopeFilters);
    }

    public static function normalizarFiltros(array $source)
    {
        $position = isset($source['posicao']) ? strtolower(trim((string) $source['posicao'])) : 'ultima';
        if (!in_array($position, array('ultima', 'competencia', 'trimestre'), true)) $position = 'ultima';
        $year = isset($source['ano']) && ctype_digit((string) $source['ano']) ? (int) $source['ano'] : 2026;
        $competence = isset($source['competencia']) && preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', (string) $source['competencia'])
            ? (string) $source['competencia'] : '';
        $quarter = isset($source['trimestre']) && preg_match('/^[1-4]$/', (string) $source['trimestre'])
            ? (int) $source['trimestre'] : 0;
        if ($position === 'competencia' && $competence === '') {
            throw new InvalidArgumentException('Competencia obrigatoria para a posicao selecionada.');
        }
        if ($position === 'trimestre' && $quarter === 0) {
            throw new InvalidArgumentException('Trimestre obrigatorio para a posicao selecionada.');
        }
        return array(
            'ano' => $year,
            'posicao' => $position,
            'competencia' => $competence,
            'trimestre' => $quarter,
            'plano' => self::cleanFilter($source, 'plano'),
            'indicador' => self::cleanFilter($source, 'indicador'),
            'diretoria' => self::cleanFilter($source, 'diretoria'),
            'unidade' => self::cleanFilter($source, 'unidade'),
            'situacao' => self::cleanFilter($source, 'situacao'),
        );
    }

    public static function filtrosEscopo(array $user, array $requestedFilters = array())
    {
        $profile = Auth::normalizeProfile(isset($user['perfil']) ? $user['perfil'] : '');
        if ($profile === 'administrador') return array();
        if ($profile === 'unidade_apuradora') {
            $unit = trim((string) (isset($user['unidade_apuradora']) ? $user['unidade_apuradora'] : ''));
            if ($unit === '') throw new DomainException('Unidade apuradora sem escopo configurado.');
            return array('unidade_apuradora' => $unit);
        }
        if (in_array($profile, array('homologador', 'consultor_diretoria'), true)) {
            $board = trim((string) (isset($user['diretoria_responsavel']) ? $user['diretoria_responsavel'] : ''));
            if ($board === '') throw new DomainException('Diretoria sem escopo configurado.');
            return array('diretoria_responsavel' => $board);
        }
        throw new DomainException('Perfil sem acesso ao relatorio consolidado.');
    }

    public static function montarPayload(array $data, array $filters, array $user, array $approvalMetadata = array(), array $scopeFilters = array())
    {
        $indicators = isset($data['indicadores']) && is_array($data['indicadores']) ? $data['indicadores'] : array();
        $launches = isset($data['lancamentos']) && is_array($data['lancamentos']) ? $data['lancamentos'] : array();
        $rules = self::indexBy(isset($data['regrasIndicadores']) ? $data['regrasIndicadores'] : array(), 'indicadorId');
        $governance = array();
        foreach (isset($data['governancaHomologacaoAtual']) ? $data['governancaHomologacaoAtual'] : array() as $item) {
            $launchId = (string) (isset($item['lancamentoId']) ? $item['lancamentoId'] : '');
            if ($launchId !== '') $governance[$launchId] = (int) (isset($item['versao']) ? $item['versao'] : 1);
        }

        $filteredIndicators = array_values(array_filter($indicators, function ($indicator) use ($filters) {
            if ($filters['plano'] !== '' && (string) $indicator['plano'] !== $filters['plano']) return false;
            if ($filters['indicador'] !== '' && (string) $indicator['id'] !== $filters['indicador']) return false;
            if ($filters['diretoria'] !== '' && self::normalizeScope($indicator['diretoriaResponsavel']) !== self::normalizeScope($filters['diretoria'])) return false;
            if ($filters['unidade'] !== '' && self::normalizeScope($indicator['unidadeApuradora']) !== self::normalizeScope($filters['unidade'])) return false;
            return true;
        }));

        $rows = array();
        foreach ($filteredIndicators as $indicator) {
            $indicatorId = (string) $indicator['id'];
            $rule = isset($rules[$indicatorId]) ? $rules[$indicatorId] : array();
            $candidates = array_values(array_filter($launches, function ($launch) use ($indicatorId, $filters, $rule, $governance) {
                if ((string) $launch['indicadorId'] !== $indicatorId || (int) $launch['ano'] !== (int) $filters['ano']) return false;
                if ((string) $launch['status'] !== 'Homologado') return false;
                $currentGoverned = isset($governance[(string) $launch['id']])
                    && (int) $governance[(string) $launch['id']] === (int) $launch['versaoAtual'];
                if (!empty($rule['exigirHomologacaoTransacionalVersaoAtual']) && !$currentGoverned) return false;
                if ($filters['posicao'] === 'competencia' && $filters['competencia'] !== '' && (string) $launch['competencia'] !== $filters['competencia']) return false;
                if ($filters['posicao'] === 'trimestre' && $filters['trimestre'] > 0 && (int) ceil(((int) $launch['mes']) / 3) !== (int) $filters['trimestre']) return false;
                return true;
            }));
            usort($candidates, function ($left, $right) {
                $leftKey = sprintf('%04d%02d%06d', (int) $left['ano'], (int) $left['mes'], (int) $left['versaoAtual']);
                $rightKey = sprintf('%04d%02d%06d', (int) $right['ano'], (int) $right['mes'], (int) $right['versaoAtual']);
                return strcmp($leftKey, $rightKey);
            });
            $official = $candidates ? $candidates[count($candidates) - 1] : null;
            $row = self::reportRow($indicator, $official, $governance, $approvalMetadata);
            if ($filters['situacao'] !== '' && (string) $row['situacao'] !== $filters['situacao']) continue;
            $rows[] = $row;
        }
        usort($rows, function ($left, $right) { return (int) $left['codigo'] - (int) $right['codigo']; });

        return array(
            'relatorio' => 'Relatorio Consolidado de Indicadores - Posicao Oficial',
            'somenteLeitura' => true,
            'geradoEm' => date('c'),
            'geradoPor' => array(
                'nome' => isset($user['nome']) ? (string) $user['nome'] : '',
                'matricula' => isset($user['matricula']) ? (string) $user['matricula'] : '',
            ),
            'escopo' => self::scopeDescription($user, $scopeFilters),
            'filtros' => $filters,
            'opcoes' => self::filterOptions($indicators, $launches),
            'linhas' => $rows,
            'total' => count($rows),
        );
    }

    private static function reportRow(array $indicator, $launch, array $governance, array $approvalMetadata)
    {
        $base = array(
            'codigo' => isset($indicator['numero']) ? (int) $indicator['numero'] : (int) $indicator['id'],
            'indicadorId' => $indicator['id'],
            'indicador' => isset($indicator['indicador']) ? (string) $indicator['indicador'] : (string) $indicator['nome'],
            'plano' => isset($indicator['plano']) ? $indicator['plano'] : null,
            'diretoria' => isset($indicator['diretoriaResponsavel']) ? $indicator['diretoriaResponsavel'] : null,
            'unidade' => isset($indicator['unidadeApuradora']) ? $indicator['unidadeApuradora'] : null,
            'unidadeMedida' => isset($indicator['unidadeMedida']) ? $indicator['unidadeMedida'] : null,
            'tipoCalculo' => isset($indicator['tipoCalculo']) ? $indicator['tipoCalculo'] : null,
            'competencia' => null, 'metaOficial' => null, 'resultadoOficial' => null,
            'atingimento' => null, 'situacao' => 'Nao apurado',
            'governanca' => 'Sem posicao oficial', 'versao' => null,
            'dataHomologacao' => null, 'homologador' => null,
            'fonteDocumental' => null, 'observacaoOficialDisponivel' => false,
            'lancamentoId' => null,
        );
        if (!$launch) return $base;

        $launchId = (string) $launch['id'];
        $currentGoverned = isset($governance[$launchId]) && (int) $governance[$launchId] === (int) $launch['versaoAtual'];
        $metadata = $currentGoverned && isset($approvalMetadata[$launchId]) ? $approvalMetadata[$launchId] : array();
        $document = isset($launch['observacaoDocumental']) && is_array($launch['observacaoDocumental'])
            ? $launch['observacaoDocumental'] : array();
        $inputs = isset($launch['camposEntrada']) && is_array($launch['camposEntrada']) ? $launch['camposEntrada'] : array();
        $source = isset($document['fonteDocumental']) ? trim((string) $document['fonteDocumental']) : '';
        if ($source === '' && isset($inputs['fonteDocumental'])) $source = trim((string) $inputs['fonteDocumental']);

        $base['competencia'] = (string) $launch['competencia'];
        $base['metaOficial'] = self::value(isset($launch['metaReferencia']) ? $launch['metaReferencia'] : null);
        $base['resultadoOficial'] = self::value(isset($launch['resultadoOficialAnual']) && $launch['resultadoOficialAnual'] !== null && $launch['resultadoOficialAnual'] !== ''
            ? $launch['resultadoOficialAnual'] : (isset($launch['resultadoMensal']) ? $launch['resultadoMensal'] : null));
        $base['atingimento'] = self::value(isset($launch['percentualAtingido']) ? $launch['percentualAtingido'] : null);
        $base['situacao'] = trim((string) (isset($launch['situacaoCalculada']) ? $launch['situacaoCalculada'] : '')) ?: 'Nao apurado';
        $base['governanca'] = $currentGoverned ? 'Homologado - versao atual' : 'Homologado legado - sem evento transacional';
        $base['versao'] = (int) $launch['versaoAtual'];
        $base['dataHomologacao'] = isset($metadata['data']) && trim((string) $metadata['data']) !== '' ? (string) $metadata['data'] : null;
        $base['homologador'] = isset($metadata['usuario']) && trim((string) $metadata['usuario']) !== '' ? (string) $metadata['usuario'] : null;
        $base['fonteDocumental'] = $source !== '' ? $source : null;
        $base['observacaoOficialDisponivel'] = !empty($document);
        $base['lancamentoId'] = $launch['id'];
        return $base;
    }

    private static function filterOptions(array $indicators, array $launches)
    {
        $years = array(); $plans = array(); $boards = array(); $units = array(); $situations = array();
        foreach ($launches as $launch) {
            if (isset($launch['ano'])) $years[] = (int) $launch['ano'];
            if (!empty($launch['situacaoCalculada'])) $situations[] = (string) $launch['situacaoCalculada'];
        }
        foreach ($indicators as $indicator) {
            if (!empty($indicator['plano'])) $plans[] = (string) $indicator['plano'];
            if (!empty($indicator['diretoriaResponsavel'])) $boards[] = (string) $indicator['diretoriaResponsavel'];
            if (!empty($indicator['unidadeApuradora'])) $units[] = (string) $indicator['unidadeApuradora'];
        }
        $indicatorOptions = array_map(function ($indicator) {
            return array('id' => $indicator['id'], 'codigo' => (int) $indicator['numero'], 'nome' => (string) $indicator['indicador']);
        }, $indicators);
        usort($indicatorOptions, function ($left, $right) { return $left['codigo'] - $right['codigo']; });
        return array(
            'anos' => self::uniqueSorted($years), 'planos' => self::uniqueSorted($plans),
            'diretorias' => self::uniqueSorted($boards), 'unidades' => self::uniqueSorted($units),
            'situacoes' => self::uniqueSorted(array_merge($situations, array('Nao apurado'))),
            'indicadores' => $indicatorOptions,
        );
    }

    private static function scopeDescription(array $user, array $scopeFilters)
    {
        if (isset($scopeFilters['unidade_apuradora'])) return 'Unidade ' . $scopeFilters['unidade_apuradora'];
        if (isset($scopeFilters['diretoria_responsavel'])) return 'Diretoria ' . $scopeFilters['diretoria_responsavel'];
        return 'Corporativo - todos os indicadores';
    }

    private static function indexBy($items, $key)
    {
        $result = array();
        foreach (is_array($items) ? $items : array() as $item) {
            if (is_array($item) && isset($item[$key])) $result[(string) $item[$key]] = $item;
        }
        return $result;
    }

    private static function cleanFilter(array $source, $key)
    {
        if (!isset($source[$key])) return '';
        $value = trim((string) $source[$key]);
        return $value === 'Todos' || $value === 'Todas' ? '' : substr($value, 0, 255);
    }

    private static function normalizeScope($value)
    {
        $value = trim((string) $value);
        $converted = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        return strtoupper($converted === false ? $value : $converted);
    }

    private static function value($value)
    {
        if ($value === null || $value === '') return null;
        return is_numeric($value) ? (float) $value : $value;
    }

    private static function uniqueSorted(array $items)
    {
        $items = array_values(array_unique($items, SORT_REGULAR));
        sort($items);
        return $items;
    }
}
