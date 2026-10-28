<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth/Auth.php';
require_once __DIR__ . '/../repositories/RelatorioGovernancaRepository.php';

final class RelatorioGovernancaService
{
    const PAGE_SIZE = 50;

    private $repository;

    public function __construct($db)
    {
        $this->repository = new RelatorioGovernancaRepository($db);
    }

    public static function usuarioAutorizado(array $user)
    {
        $active = Auth::normalizeProfile(isset($user['perfil']) ? $user['perfil'] : '');
        $original = Auth::normalizeProfile(isset($user['perfil_original']) ? $user['perfil_original'] : $active);
        return $active === 'administrador' && $original === 'administrador';
    }

    public static function normalizarFiltros(array $input)
    {
        $known = array('ano', 'indicador', 'competencia', 'trimestre', 'unidade', 'diretoria', 'evento', 'usuario', 'status', 'versao', 'pagina', 'ordem', 'inicial');
        foreach ($input as $key => $value) {
            if (!in_array((string) $key, $known, true)) throw new InvalidArgumentException('Parametro de filtro desconhecido: ' . $key . '.');
        }
        $year = isset($input['ano']) && ctype_digit((string) $input['ano']) ? (int) $input['ano'] : 2026;
        if ($year < 2000 || $year > 2100) throw new InvalidArgumentException('Exercicio invalido.');
        $competence = self::clean($input, 'competencia', 7);
        if ($competence !== '' && !preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $competence)) throw new InvalidArgumentException('Competencia invalida.');
        $quarter = self::clean($input, 'trimestre', 1);
        if ($quarter !== '' && !in_array($quarter, array('1', '2', '3', '4'), true)) throw new InvalidArgumentException('Trimestre invalido.');
        $version = self::clean($input, 'versao', 10);
        if ($version !== '' && (!ctype_digit($version) || (int) $version < 1)) throw new InvalidArgumentException('Versao invalida.');
        $order = strtolower(self::clean($input, 'ordem', 4));
        if ($order === '') $order = 'asc';
        if (!in_array($order, array('asc', 'desc'), true)) throw new InvalidArgumentException('Ordenacao invalida.');
        $page = isset($input['pagina']) && ctype_digit((string) $input['pagina']) ? max(1, (int) $input['pagina']) : 1;
        $event = self::clean($input, 'evento', 50);
        if ($event !== '' && !in_array($event, self::eventTypes(), true)) throw new InvalidArgumentException('Tipo de evento invalido.');
        return array(
            'ano' => $year, 'indicador' => self::clean($input, 'indicador', 100),
            'competencia' => $competence, 'trimestre' => $quarter,
            'unidade' => self::clean($input, 'unidade', 255), 'diretoria' => self::clean($input, 'diretoria', 255),
            'evento' => $event, 'usuario' => self::clean($input, 'usuario', 255),
            'status' => self::clean($input, 'status', 100), 'versao' => $version,
            'pagina' => $page, 'ordem' => $order,
            'inicial' => isset($input['inicial']) && filter_var($input['inicial'], FILTER_VALIDATE_BOOLEAN),
        );
    }

    public function gerar(array $input, array $user)
    {
        if (!self::usuarioAutorizado($user)) throw new UnexpectedValueException('Relatorio de Governanca/Auditoria restrito ao Administrador em visao Administrador.');
        $filters = self::normalizarFiltros($input);
        $options = $this->optionsPayload($this->repository->options());
        if ($filters['inicial']) return $this->emptyPayload($filters, $user, $options, false);
        if (!self::hasNarrowingFilter($filters)) {
            throw new InvalidArgumentException('Informe indicador, competencia, trimestre, tipo de evento, usuario ou versao para consultar a governanca.');
        }

        $rawAudits = $this->repository->auditEvents($filters);
        $rawHomologations = $this->repository->homologationEvents($filters);
        $rawRetifications = $this->repository->retificationEvents($filters);
        $rawReopenings = $this->repository->reopeningEvents($filters);
        $rawEvidence = $this->repository->evidenceEvents($filters);
        $rawDocuments = $this->repository->documentaryEvents($filters);
        $positions = $this->repository->currentPositions($filters);

        $events = self::normalizeEvents($rawAudits, $rawHomologations, $rawRetifications, $rawReopenings, $rawEvidence, $rawDocuments);
        $events = self::filterNormalizedEvents($events, $filters);
        self::sortEvents($events, $filters['ordem']);
        $total = count($events);
        $pages = $total === 0 ? 0 : (int) ceil($total / self::PAGE_SIZE);
        if ($pages > 0 && $filters['pagina'] > $pages) $filters['pagina'] = $pages;
        $offset = ($filters['pagina'] - 1) * self::PAGE_SIZE;
        $pageEvents = array_slice($events, $offset, self::PAGE_SIZE);

        $relevantLaunches = array();
        foreach ($events as $event) $relevantLaunches[(string) $event['lancamentoId']] = true;
        if ($filters['evento'] !== '' || $filters['usuario'] !== '' || $filters['versao'] !== '' || $filters['status'] !== '') {
            $positions = array_values(array_filter($positions, function ($row) use ($relevantLaunches, $filters) {
                if (!isset($relevantLaunches[(string) $row['id']])) return false;
                return $filters['status'] === '' || self::same($row['status'], $filters['status']);
            }));
        }

        $restrictToEvents = $filters['evento'] !== '' || $filters['usuario'] !== '' || $filters['versao'] !== '' || $filters['status'] !== '';
        $evidence = self::evidencePayload($rawEvidence, $relevantLaunches, $filters, $restrictToEvents);
        $documents = self::documentPayload($rawDocuments, $relevantLaunches, $filters, $restrictToEvents);
        $users = array();
        foreach ($events as $event) if ($event['usuarioMatricula'] !== null) $users[] = $event['usuarioMatricula'];
        foreach ($positions as $position) {
            if (!empty($position['usuario_responsavel'])) $users[] = $position['usuario_responsavel'];
            if (!empty($position['homologador'])) $users[] = $position['homologador'];
        }
        foreach ($evidence as $item) if ($item['usuarioMatricula'] !== null) $users[] = $item['usuarioMatricula'];
        $names = $this->repository->userNames($users);
        $pageEvents = self::applyUserNames($pageEvents, $names);
        $positions = self::positionPayload($positions, $names);
        $evidence = self::applyUserNames($evidence, $names);

        return array(
            'relatorio' => 'Relatorio de Governanca e Auditoria', 'somenteLeitura' => true,
            'consultaExecutada' => true, 'geradoEm' => date('c'),
            'geradoPor' => array('nome' => isset($user['nome']) ? $user['nome'] : '', 'matricula' => isset($user['matricula']) ? $user['matricula'] : ''),
            'escopo' => 'Administrador - visao corporativa', 'filtros' => $filters, 'opcoes' => $options,
            'posicoesAtuais' => $positions, 'eventos' => $pageEvents,
            'paginacao' => array('pagina' => $filters['pagina'], 'porPagina' => self::PAGE_SIZE, 'total' => $total, 'paginas' => $pages),
            'evidencias' => $evidence, 'observacoesDocumentais' => $documents,
            'limiteFonteAtingido' => self::sourceLimitReached(array($rawAudits, $rawHomologations, $rawRetifications, $rawReopenings, $rawEvidence, $rawDocuments)),
        );
    }

    public static function normalizeEvents(array $audits, array $homologations, array $retifications, array $reopenings, array $evidence, array $documents)
    {
        $auditEvents = array();
        $auditIndex = array();
        foreach ($audits as $row) {
            $event = self::auditEvent($row);
            $index = count($auditEvents);
            $auditEvents[] = $event;
            $auditIndex[self::signature($event)][] = $index;
        }
        $matched = array();
        $events = array();
        foreach ($homologations as $row) {
            $type = self::homologationType(isset($row['acao']) ? $row['acao'] : '');
            $audit = self::matchingAudit($auditEvents, $auditIndex, $matched, $row['lancamento_id'], $type, $row['data_acao']);
            $event = self::baseEvent($row, $type, $row['data_acao'], 'homologacoes');
            $event['versao'] = $audit ? $audit['versao'] : null;
            $event['statusAnterior'] = self::nullable($row['status_anterior']);
            $event['statusNovo'] = self::nullable($row['status_novo']);
            $event['descricao'] = self::homologationDescription($type);
            $event['justificativa'] = self::nullable($row['justificativa']);
            $event['alteracoes'] = $audit ? $audit['alteracoes'] : array();
            $events[] = $event;
        }
        foreach ($retifications as $row) {
            $audit = self::matchingAudit($auditEvents, $auditIndex, $matched, $row['lancamento_id'], 'alteracao', $row['data_retificacao']);
            $event = self::baseEvent($row, 'retificacao', $row['data_retificacao'], 'retificacoes');
            $event['versao'] = isset($row['versao_nova']) ? (int) $row['versao_nova'] : null;
            $event['versaoAnterior'] = isset($row['versao_anterior']) ? (int) $row['versao_anterior'] : null;
            $event['versaoNova'] = isset($row['versao_nova']) ? (int) $row['versao_nova'] : null;
            $event['statusAnterior'] = $audit ? $audit['statusAnterior'] : null;
            $event['statusNovo'] = $audit ? $audit['statusNovo'] : null;
            $event['descricao'] = 'Retificacao funcional do lancamento.';
            $event['justificativa'] = self::nullable($row['justificativa']);
            $event['alteracoes'] = self::friendlyChanges($row['versao_anterior_json'], $row['versao_nova_json']);
            $events[] = $event;
        }
        foreach ($reopenings as $row) {
            $request = self::baseEvent($row, 'solicitacao_reabertura', $row['data_solicitacao'], 'solicitacoes_reabertura');
            $request['usuarioMatricula'] = self::nullable($row['solicitante_usuario']);
            $request['perfil'] = self::nullable($row['solicitante_perfil']);
            $request['descricao'] = self::nullable($row['tipo_ajuste']);
            $request['justificativa'] = self::nullable($row['justificativa']);
            $request['statusNovo'] = self::nullable($row['status_solicitacao']);
            $events[] = $request;
            if (!empty($row['data_decisao'])) {
                $decision = self::baseEvent($row, 'decisao_reabertura', $row['data_decisao'], 'solicitacoes_reabertura');
                $decision['usuarioMatricula'] = self::nullable($row['administrador_responsavel']);
                $decision['descricao'] = self::nullable($row['decisao_administrador']);
                $decision['justificativa'] = self::nullable($row['justificativa_decisao']);
                $decision['statusNovo'] = self::nullable($row['status_solicitacao']);
                $events[] = $decision;
            }
        }
        foreach ($evidence as $row) {
            $audit = self::matchingAudit($auditEvents, $auditIndex, $matched, $row['lancamento_id'], 'evidencia_anexada', $row['data_upload']);
            $event = self::baseEvent($row, 'evidencia_anexada', $row['data_upload'], 'evidencias');
            $event['versao'] = (int) $row['versao_lancamento'];
            $event['descricao'] = 'Evidencia anexada: ' . (string) $row['nome_arquivo'];
            $event['justificativa'] = self::nullable($row['descricao']);
            $event['alteracoes'] = $audit ? $audit['alteracoes'] : array();
            $events[] = $event;
        }
        foreach ($documents as $row) {
            $event = self::baseEvent($row, 'observacao_documental', self::dateValue($row['criado_em']), 'lancamentos_observacoes_documentais');
            $event['versao'] = (int) $row['versao_lancamento'];
            $event['usuarioMatricula'] = null;
            $event['perfil'] = null;
            $event['descricao'] = 'Observacao documental carregada: ' . (string) $row['fonte_documental'];
            $event['justificativa'] = null;
            $event['origemEvento'] = self::documentOrigin($row['origem_registro']);
            $events[] = $event;
        }
        foreach ($auditEvents as $index => $event) {
            if (isset($matched[$index])) continue;
            if ($event['tipo'] === 'homologacao') {
                $event['tipo'] = 'homologacao_legada';
                $event['tipoRotulo'] = self::eventLabel('homologacao_legada');
                $event['descricao'] = 'Homologacao legada registrada apenas na auditoria.';
            }
            $events[] = $event;
        }
        return $events;
    }

    private static function auditEvent(array $row)
    {
        $type = self::auditType(isset($row['acao']) ? $row['acao'] : '');
        $event = self::baseEvent($row, $type, $row['data_acao'], 'auditoria');
        $before = self::decodeSnapshot(isset($row['dados_anteriores_json']) ? $row['dados_anteriores_json'] : null);
        $after = self::decodeSnapshot(isset($row['dados_novos_json']) ? $row['dados_novos_json'] : null);
        $event['versao'] = self::intValue(self::firstValue($after, array('versaoAtual', 'versao_atual')));
        if ($event['versao'] === null) $event['versao'] = self::intValue(self::firstValue($before, array('versaoAtual', 'versao_atual')));
        $event['statusAnterior'] = self::nullable(self::firstValue($before, array('status')));
        $event['statusNovo'] = self::nullable(self::firstValue($after, array('status')));
        $event['descricao'] = self::nullable($row['descricao']);
        $event['alteracoes'] = self::friendlyChangesFromArrays($before, $after);
        return $event;
    }

    private static function baseEvent(array $row, $type, $date, $technicalOrigin)
    {
        $user = isset($row['usuario']) ? self::nullable($row['usuario']) : null;
        return array(
            'dataHora' => self::dateValue($date), 'indicadorId' => (string) $row['indicador_id'],
            'codigoIndicador' => (int) $row['numero'], 'indicador' => (string) $row['indicador_nome'],
            'competencia' => (string) $row['competencia'], 'lancamentoId' => (string) $row['lancamento_id'],
            'versao' => null, 'tipo' => $type, 'tipoRotulo' => self::eventLabel($type),
            'usuarioMatricula' => $user, 'usuario' => $user ?: 'Não identificado',
            'perfil' => isset($row['perfil_usuario']) ? self::nullable($row['perfil_usuario']) : null,
            'statusAnterior' => null, 'statusNovo' => null, 'descricao' => null, 'justificativa' => null,
            'origemEvento' => self::actorOrigin($user), 'origemTecnica' => $technicalOrigin,
            'alteracoes' => array(), 'versaoAnterior' => null, 'versaoNova' => null,
        );
    }

    private static function matchingAudit(array $audits, array $index, array &$matched, $launchId, $type, $date)
    {
        $signature = (string) $launchId . '|' . $type . '|' . self::dateValue($date);
        if (empty($index[$signature])) return null;
        foreach ($index[$signature] as $auditIndex) {
            if (isset($matched[$auditIndex])) continue;
            $matched[$auditIndex] = true;
            return $audits[$auditIndex];
        }
        return null;
    }

    private static function signature(array $event)
    {
        return (string) $event['lancamentoId'] . '|' . $event['tipo'] . '|' . self::dateValue($event['dataHora']);
    }

    private static function filterNormalizedEvents(array $events, array $filters)
    {
        return array_values(array_filter($events, function ($event) use ($filters) {
            if ($filters['evento'] !== '' && $event['tipo'] !== $filters['evento']) return false;
            if ($filters['usuario'] !== '' && stripos((string) $event['usuarioMatricula'], $filters['usuario']) === false) return false;
            if ($filters['status'] !== '' && !self::same($event['statusAnterior'], $filters['status']) && !self::same($event['statusNovo'], $filters['status'])) return false;
            if ($filters['versao'] !== '' && (int) $event['versao'] !== (int) $filters['versao']
                && (int) $event['versaoAnterior'] !== (int) $filters['versao'] && (int) $event['versaoNova'] !== (int) $filters['versao']) return false;
            return true;
        }));
    }

    private static function sortEvents(array &$events, $order)
    {
        usort($events, function ($left, $right) use ($order) {
            $leftTime = strtotime((string) $left['dataHora']);
            $rightTime = strtotime((string) $right['dataHora']);
            if ($leftTime === $rightTime) return strcmp($left['tipo'], $right['tipo']) * ($order === 'desc' ? -1 : 1);
            return ($leftTime < $rightTime ? -1 : 1) * ($order === 'desc' ? -1 : 1);
        });
    }

    private static function positionPayload(array $positions, array $names)
    {
        $result = array();
        foreach ($positions as $row) {
            $transactional = (int) $row['homologacao_transacional'] === 1;
            $governance = (string) $row['status'];
            if ($governance === 'Homologado') $governance = $transactional ? 'Homologação transacional' : 'Homologação legada - sem evento transacional';
            $responsible = self::displayUser(self::nullable($row['usuario_responsavel']), $names);
            $homologator = self::nullable($row['homologador']) !== null ? self::displayUser(self::nullable($row['homologador']), $names) : null;
            $result[] = array(
                'lancamentoId' => (string) $row['id'], 'indicadorId' => (string) $row['indicador_id'],
                'codigoIndicador' => (int) $row['numero'], 'indicador' => (string) $row['indicador_nome'],
                'competencia' => (string) $row['competencia'], 'unidade' => $row['unidade_apuradora'],
                'diretoria' => $row['diretoria_responsavel'], 'unidadeMedida' => $row['unidade_medida'],
                'versao' => (int) $row['versao_atual'], 'status' => (string) $row['status'],
                'meta' => self::value($row['meta_referencia']),
                'resultado' => self::value($row['resultado_oficial'] !== null && $row['resultado_oficial'] !== '' ? $row['resultado_oficial'] : $row['resultado_calculado']),
                'atingimento' => self::value($row['percentual_atingido']), 'situacao' => self::nullable($row['situacao']),
                'responsavel' => $responsible, 'governanca' => $governance,
                'ultimaHomologacaoEm' => self::nullable($row['data_homologacao']),
                'ultimaHomologacaoPor' => $homologator,
                'ultimaHomologacaoVigente' => $transactional,
            );
        }
        return $result;
    }

    private static function evidencePayload(array $rows, array $relevantLaunches, array $filters, $restrictToEvents)
    {
        $result = array();
        foreach ($rows as $row) {
            if ($restrictToEvents && !isset($relevantLaunches[(string) $row['lancamento_id']])) continue;
            if ($filters['versao'] !== '' && (int) $row['versao_lancamento'] !== (int) $filters['versao']) continue;
            if ($filters['usuario'] !== '' && stripos((string) $row['usuario'], $filters['usuario']) === false) continue;
            $result[] = array(
                'id' => (string) $row['id'], 'lancamentoId' => (string) $row['lancamento_id'],
                'competencia' => (string) $row['competencia'], 'versao' => (int) $row['versao_lancamento'],
                'nomeArquivo' => (string) $row['nome_arquivo'], 'tipoArquivo' => self::nullable($row['tipo_arquivo']),
                'descricao' => self::nullable($row['descricao']), 'dataUpload' => self::dateValue($row['data_upload']),
                'usuarioMatricula' => self::nullable($row['usuario']), 'usuario' => self::nullable($row['usuario']) ?: 'Não identificado',
                'status' => (int) $row['versao_vigente'] === 1 ? 'Versao atual' : 'Historica', 'podeBaixar' => true,
            );
        }
        return $result;
    }

    private static function documentPayload(array $rows, array $relevantLaunches, array $filters, $restrictToEvents)
    {
        $result = array();
        foreach ($rows as $row) {
            if ($restrictToEvents && !isset($relevantLaunches[(string) $row['lancamento_id']])) continue;
            if ($filters['versao'] !== '' && (int) $row['versao_lancamento'] !== (int) $filters['versao']) continue;
            $result[] = array(
                'lancamentoId' => (string) $row['lancamento_id'], 'competencia' => (string) $row['competencia'],
                'trimestre' => ((int) ceil(((int) substr($row['competencia'], 5, 2)) / 3)) . 'TRI',
                'versao' => (int) $row['versao_lancamento'], 'tipo' => (string) $row['tipo_observacao'],
                'observacao' => (string) $row['observacao'], 'fonte' => (string) $row['fonte_documental'],
                'paginas' => (string) $row['paginas_documento'], 'carregadoEm' => self::dateValue($row['criado_em']),
                'origem' => self::documentOrigin($row['origem_registro']), 'vigente' => (int) $row['vigente'] === 1,
            );
        }
        return $result;
    }

    private static function applyUserNames(array $items, array $names)
    {
        foreach ($items as &$item) $item['usuario'] = self::displayUser($item['usuarioMatricula'], $names);
        unset($item);
        return $items;
    }

    private static function displayUser($registration, array $names)
    {
        if ($registration === null || trim((string) $registration) === '') return 'Não identificado';
        $registration = (string) $registration;
        return !empty($names[$registration]) ? $names[$registration] . ' (' . $registration . ')' : $registration;
    }

    private function optionsPayload(array $raw)
    {
        $units = array(); $boards = array(); $years = array(); $statuses = array(); $indicators = array();
        foreach ($raw['indicadores'] as $row) {
            $indicators[] = array('id' => (string) $row['id'], 'codigo' => (int) $row['numero'], 'nome' => (string) $row['nome']);
            if (trim((string) $row['unidade_apuradora']) !== '') $units[] = (string) $row['unidade_apuradora'];
            if (trim((string) $row['diretoria_responsavel']) !== '') $boards[] = (string) $row['diretoria_responsavel'];
        }
        foreach ($raw['lancamentos'] as $row) {
            $years[] = (int) $row['ano'];
            if (trim((string) $row['status']) !== '') $statuses[] = (string) $row['status'];
        }
        return array(
            'anos' => self::uniqueSorted($years), 'indicadores' => $indicators,
            'unidades' => self::uniqueSorted($units), 'diretorias' => self::uniqueSorted($boards),
            'eventos' => array_map(function ($type) { return array('valor' => $type, 'rotulo' => self::eventLabel($type)); }, self::eventTypes()),
            'status' => self::uniqueSorted($statuses),
        );
    }

    private function emptyPayload(array $filters, array $user, array $options, $executed)
    {
        return array(
            'relatorio' => 'Relatorio de Governanca e Auditoria', 'somenteLeitura' => true,
            'consultaExecutada' => $executed, 'geradoEm' => date('c'),
            'geradoPor' => array('nome' => isset($user['nome']) ? $user['nome'] : '', 'matricula' => isset($user['matricula']) ? $user['matricula'] : ''),
            'escopo' => 'Administrador - visao corporativa', 'filtros' => $filters, 'opcoes' => $options,
            'posicoesAtuais' => array(), 'eventos' => array(),
            'paginacao' => array('pagina' => 1, 'porPagina' => self::PAGE_SIZE, 'total' => 0, 'paginas' => 0),
            'evidencias' => array(), 'observacoesDocumentais' => array(), 'limiteFonteAtingido' => false,
        );
    }

    private static function friendlyChanges($beforeJson, $afterJson)
    {
        return self::friendlyChangesFromArrays(self::decodeSnapshot($beforeJson), self::decodeSnapshot($afterJson));
    }

    private static function friendlyChangesFromArrays(array $before, array $after)
    {
        $fields = array(
            'status' => array('Status', array('status')),
            'version' => array('Versao', array('versaoAtual', 'versao_atual')),
            'meta' => array('Meta', array('metaReferencia', 'meta_referencia', 'metaMensal')),
            'result' => array('Resultado', array('resultadoOficialAnual', 'resultado_oficial', 'resultadoMensal', 'resultado_calculado')),
            'attainment' => array('Atingimento', array('percentualAtingido', 'percentual_atingido')),
            'situation' => array('Situacao', array('situacaoCalculada', 'situacao')),
            'observation' => array('Observacao', array('observacaoArea', 'observacao_unidade')),
            'evidence' => array('Evidencia', array('evidenciaId', 'evidencia_id')),
            'responsible' => array('Responsavel', array('usuarioResponsavel', 'usuario_responsavel')),
        );
        $changes = array();
        foreach ($fields as $definition) {
            $old = self::firstValue($before, $definition[1]);
            $new = self::firstValue($after, $definition[1]);
            if ((string) $old === (string) $new) continue;
            $changes[] = array('campo' => $definition[0], 'antes' => self::publicValue($old), 'depois' => self::publicValue($new));
        }
        return $changes;
    }

    private static function decodeSnapshot($json)
    {
        $decoded = json_decode((string) $json, true);
        if (!is_array($decoded)) return array();
        if (isset($decoded['lancamento']) && is_array($decoded['lancamento'])) return $decoded['lancamento'];
        return $decoded;
    }

    private static function auditType($action)
    {
        $action = self::normalize((string) $action);
        if (strpos($action, 'salvar_rascunho') !== false) return 'salvamento';
        if (strpos($action, 'preench') !== false) return 'preenchimento';
        if (strpos($action, 'submet') !== false || strpos($action, 'envio_para_homolog') !== false) return 'submissao';
        if (strpos($action, 'homologacao') !== false) return 'homologacao';
        if (strpos($action, 'devol') !== false) return 'devolucao';
        if (strpos($action, 'reabert') !== false) return 'reabertura';
        if (strpos($action, 'evidencia_anex') !== false) return 'evidencia_anexada';
        if (strpos($action, 'evidencia_remov') !== false || strpos($action, 'evidencia_substit') !== false) return 'evidencia_removida';
        return 'alteracao';
    }

    private static function homologationType($action)
    {
        $action = self::normalize((string) $action);
        if (strpos($action, 'submissao') !== false) return 'submissao';
        if (strpos($action, 'homologacao') !== false) return 'homologacao';
        if (strpos($action, 'devol') !== false) return 'devolucao';
        if (strpos($action, 'reabert') !== false) return 'reabertura';
        return 'alteracao';
    }

    private static function eventTypes()
    {
        return array('preenchimento', 'salvamento', 'submissao', 'devolucao', 'homologacao', 'homologacao_legada', 'reabertura', 'solicitacao_reabertura', 'decisao_reabertura', 'retificacao', 'evidencia_anexada', 'evidencia_removida', 'observacao_documental', 'alteracao');
    }

    private static function eventLabel($type)
    {
        $labels = array(
            'preenchimento' => 'Preenchimento', 'salvamento' => 'Salvamento', 'submissao' => 'Submissão',
            'devolucao' => 'Devolução', 'homologacao' => 'Homologação transacional',
            'homologacao_legada' => 'Homologação legada', 'reabertura' => 'Reabertura',
            'solicitacao_reabertura' => 'Solicitação de reabertura', 'decisao_reabertura' => 'Decisão de reabertura',
            'retificacao' => 'Retificação', 'evidencia_anexada' => 'Evidência anexada',
            'evidencia_removida' => 'Evidência removida/substituída', 'observacao_documental' => 'Observação documental',
            'alteracao' => 'Alteração relevante',
        );
        return isset($labels[$type]) ? $labels[$type] : $type;
    }

    private static function homologationDescription($type)
    {
        $descriptions = array('submissao' => 'Lancamento submetido para homologacao.', 'homologacao' => 'Decisao de homologacao registrada.', 'devolucao' => 'Lancamento devolvido para ajuste.', 'reabertura' => 'Lancamento reaberto.');
        return isset($descriptions[$type]) ? $descriptions[$type] : 'Evento de governanca registrado.';
    }

    private static function actorOrigin($user)
    {
        if ($user === null || trim((string) $user) === '') return 'Sistema';
        $normalized = self::normalize($user);
        if (strpos($normalized, 'migration') !== false || strpos($normalized, 'migracao') !== false || strpos($normalized, 'script') !== false) return 'Migration/script';
        return 'Usuario';
    }

    private static function documentOrigin($origin)
    {
        $normalized = self::normalize($origin);
        return strpos($normalized, '.sql') !== false || strpos($normalized, 'migration') !== false || strpos($normalized, 'migracao') !== false ? 'Migration/script' : 'Documento';
    }

    private static function hasNarrowingFilter(array $filters)
    {
        foreach (array('indicador', 'competencia', 'trimestre', 'evento', 'usuario', 'versao') as $key) if ($filters[$key] !== '') return true;
        return false;
    }

    private static function sourceLimitReached(array $sources)
    {
        foreach ($sources as $source) if (count($source) >= RelatorioGovernancaRepository::SOURCE_LIMIT) return true;
        return false;
    }

    private static function clean(array $input, $key, $limit)
    {
        if (!isset($input[$key])) return '';
        return substr(trim((string) $input[$key]), 0, $limit);
    }

    private static function firstValue(array $source, array $keys)
    {
        foreach ($keys as $key) if (array_key_exists($key, $source)) return $source[$key];
        return null;
    }

    private static function publicValue($value)
    {
        if ($value === null || $value === '') return null;
        if (is_scalar($value)) return substr((string) $value, 0, 1000);
        return '[valor estruturado]';
    }

    private static function intValue($value)
    {
        return $value !== null && $value !== '' && is_numeric($value) ? (int) $value : null;
    }

    private static function value($value)
    {
        if ($value === null || $value === '') return null;
        return is_numeric($value) ? (float) $value : $value;
    }

    private static function nullable($value)
    {
        return $value === null || trim((string) $value) === '' ? null : substr((string) $value, 0, 4000);
    }

    private static function dateValue($value)
    {
        if ($value instanceof DateTimeInterface) return $value->format(DateTime::ATOM);
        return $value === null ? null : (string) $value;
    }

    private static function same($left, $right)
    {
        return self::normalize($left) === self::normalize($right);
    }

    private static function normalize($value)
    {
        $value = trim((string) $value);
        $converted = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        return strtolower($converted === false ? $value : $converted);
    }

    private static function uniqueSorted(array $items)
    {
        $items = array_values(array_unique($items, SORT_REGULAR));
        sort($items);
        return $items;
    }
}
