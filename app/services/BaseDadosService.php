<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../repositories/ConfiguracoesRepository.php';
require_once __DIR__ . '/../repositories/IndicadoresRepository.php';
require_once __DIR__ . '/../repositories/LancamentosRepository.php';
require_once __DIR__ . '/../repositories/EvidenciasRepository.php';
require_once __DIR__ . '/../repositories/HomologacoesRepository.php';
require_once __DIR__ . '/../repositories/AuditoriaRepository.php';
require_once __DIR__ . '/../repositories/UsuariosRepository.php';
require_once __DIR__ . '/../repositories/SolicitacoesReaberturaRepository.php';
require_once __DIR__ . '/LancamentoStateMachine.php';
require_once __DIR__ . '/CompetenciaPeriodicidade.php';
require_once __DIR__ . '/GovernancaHomologacao.php';

final class BaseDadosService
{
    private $db;
    private $configuracoes;
    private $indicadores;
    private $lancamentos;
    private $evidencias;
    private $homologacoes;
    private $auditoria;
    private $usuarios;
    private $solicitacoesReabertura;

    public function __construct()
    {
        $this->db = Database::getConnection();
        $this->configuracoes = new ConfiguracoesRepository($this->db);
        $this->indicadores = new IndicadoresRepository($this->db);
        $this->lancamentos = new LancamentosRepository($this->db);
        $this->evidencias = new EvidenciasRepository($this->db);
        $this->homologacoes = new HomologacoesRepository($this->db);
        $this->auditoria = new AuditoriaRepository($this->db);
        $this->usuarios = new UsuariosRepository($this->db);
        $this->solicitacoesReabertura = new SolicitacoesReaberturaRepository($this->db);
    }

    public function collection($key, array $filters = array())
    {
        if ($key === 'usuarios') return $this->usuarios->all();
        if (in_array($key, array('planos', 'pilares', 'unidades', 'diretorias', 'metas', 'regrasIndicadores', GovernancaHomologacao::CLOSURES_KEY), true)) return $this->configuracoes->get($key, array());
        if ($key === 'indicadores') return $this->indicadores->all($filters);
        if ($key === 'lancamentos') return $this->lancamentos->all($filters);
        if ($key === 'homologacoes') return $this->homologacoes->all($filters);
        if ($key === 'solicitacoesReabertura') return $this->solicitacoesReabertura->all($filters);
        if ($key === 'historico') return $this->auditoria->all();
        return null;
    }

    public function all(array $filters = []): array
    {
        return [
            'usuarios' => $this->collection('usuarios'),
            'planos' => $this->collection('planos'),
            'pilares' => $this->collection('pilares'),
            'unidades' => $this->collection('unidades'),
            'diretorias' => $this->collection('diretorias'),
            'indicadores' => $this->collection('indicadores', $filters),
            'metas' => $this->collection('metas'),
            'regrasIndicadores' => $this->collection('regrasIndicadores'),
            'fechamentosConselhoAdministracao' => $this->collection(GovernancaHomologacao::CLOSURES_KEY),
            'lancamentos' => $this->collection('lancamentos', $filters),
            'homologacoes' => $this->collection('homologacoes', $filters),
            'solicitacoesReabertura' => $this->collection('solicitacoesReabertura', $filters),
            'historico' => $this->collection('historico'),
        ];
    }

    public function saveCollection(string $key, array $value, array $user = []): void
    {
        if ($key === 'lancamentos') {
            $sanitized = $this->sanitizeLancamentosForUser($value, $user);
            $this->assertBulkLaunchGovernance($sanitized, $user);
            $referenceChanges = $this->evidenceReferenceChanges($sanitized);
            $this->validateRequiredEvidenceTransitions($sanitized);
            $this->lancamentos->replaceAll($sanitized);
            foreach ($referenceChanges as $change) {
                $this->auditoria->append(array(
                    'entidade'=>'lancamentos',
                    'registroId'=>$change['id'],
                    'acao'=>'referencia_evidencia_atualizada',
                    'descricao'=>'Referência documental do lançamento atualizada.',
                    'valorAnterior'=>array('referenciaEvidencia'=>$change['before']),
                    'valorNovo'=>array('referenciaEvidencia'=>$change['after']),
                    'usuario'=>$user['matricula'] ?? null,
                    'perfilUsuario'=>$user['perfil'] ?? null,
                ));
            }
            return;
        }
        if ($key === 'homologacoes') {
            throw new InvalidArgumentException('Homologacoes devem ser gravadas exclusivamente pelo fluxo oficial de decisao.');
        }
        if ($key === 'historico') {
            $this->auditoria->replaceAll($value);
            return;
        }
        if ($key === 'solicitacoesReabertura') {
            if (!$this->canWriteWorkflow($user)) {
                throw new InvalidArgumentException('Perfil nao autorizado para gravar solicitacoes de reabertura.');
            }
            $this->solicitacoesReabertura->replaceAll($this->filterWorkflowItemsForUser($value, $user));
            return;
        }
        throw new InvalidArgumentException("Colecao {$key} nao possui gravacao direta nesta etapa.");
    }

    private function sanitizeLancamentosForUser(array $items, array $user): array
    {
        $profile = (string) ($user['perfil'] ?? '');
        if ($profile === 'administrador') {
            return $items;
        }

        $allowedIndicatorIds = $this->allowedIndicatorIds($user);
        $existingById = [];
        foreach ($this->lancamentos->all($this->filtersForUser($user)) as $existing) {
            $existingById[(string) $existing['id']] = $existing;
        }

        $unitStatuses = array(
            'Não iniciado',
            'Nao iniciado',
            'Rascunho',
            'Em preenchimento',
            'Enviado para homologação',
            'Enviado para homologacao',
            'Devolvido para ajuste',
            'Reaberto',
            'Retificado',
        );

        $sanitized = [];
        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }

            $indicatorId = (string) ($item['indicadorId'] ?? $item['indicador_id'] ?? '');
            if ($indicatorId === '' || !isset($allowedIndicatorIds[$indicatorId])) {
                throw new InvalidArgumentException('Lancamento fora do escopo do usuario autenticado.');
            }

            $id = (string) ($item['id'] ?? '');
            $existing = $id !== '' ? ($existingById[$id] ?? null) : null;
            $status = (string) ($item['status'] ?? '');

            if ($profile === 'unidade_apuradora') {
                if ($existing && (string) ($existing['status'] ?? '') === 'Homologado') {
                    if ($status === 'Homologado') {
                        $sanitized[] = $existing;
                        continue;
                    }
                    throw new InvalidArgumentException('Lancamento homologado nao pode ser alterado pela unidade apuradora.');
                }
                if ($status !== '' && !in_array($status, $unitStatuses, true)) {
                    throw new InvalidArgumentException('Status nao autorizado para unidade apuradora.');
                }
            }

            $sanitized[] = $item;
        }

        return $sanitized;
    }

    private function filterWorkflowItemsForUser(array $items, array $user): array
    {
        if (($user['perfil'] ?? '') === 'administrador') {
            return $items;
        }

        $allowedIndicatorIds = $this->allowedIndicatorIds($user);
        return array_values(array_filter($items, static function ($item) use ($allowedIndicatorIds) {
            if (!is_array($item)) {
                return false;
            }
            $indicatorId = (string) ($item['indicadorId'] ?? $item['indicador_id'] ?? '');
            return $indicatorId !== '' && isset($allowedIndicatorIds[$indicatorId]);
        }));
    }

    private function allowedIndicatorIds(array $user): array
    {
        $ids = [];
        foreach ($this->indicadores->all($this->filtersForUser($user)) as $indicator) {
            $ids[(string) $indicator['id']] = true;
        }
        return $ids;
    }

    private function filtersForUser(array $user): array
    {
        $profile = (string) ($user['perfil'] ?? '');
        if ($profile === 'unidade_apuradora' && (string) ($user['unidade_apuradora'] ?? '') !== '') {
            return ['unidade_apuradora' => (string) $user['unidade_apuradora']];
        }
        if (in_array($profile, array('homologador', 'consultor_diretoria'), true) && (string) ($user['diretoria_responsavel'] ?? '') !== '') {
            return ['diretoria_responsavel' => (string) $user['diretoria_responsavel']];
        }
        if ($profile === 'administrador') {
            return [];
        }
        throw new InvalidArgumentException('Perfil nao autorizado para gravacao.');
    }

    private function canWriteWorkflow(array $user): bool
    {
        return in_array((string) ($user['perfil'] ?? ''), ['administrador', 'homologador', 'consultor_diretoria'], true);
    }

    public function saveLaunchAction(array $items, $launchId, $action, array $user): array
    {
        if (!in_array($action, array('draft', 'send'), true)) {
            throw new InvalidArgumentException('Acao de lancamento invalida.');
        }
        $launchId = trim((string) $launchId);
        $matricula = trim((string) ($user['matricula'] ?? ''));
        if ($launchId === '' || $matricula === '') {
            throw new InvalidArgumentException('Lancamento ou matricula nao identificado.');
        }

        $this->db->beginTransaction();
        try {
            $before = $this->lancamentos->findForUpdate($launchId);
            if (!$before) {
                throw new LogicException('Lancamento inexistente ou indisponivel para edicao.');
            }
            $this->assertLegacyLaunchAllowed($before);
            if (!LancamentoStateMachine::editable($before['status'])) {
                throw new LogicException('Lancamento inexistente ou indisponivel para edicao.');
            }
            if (!AccessPolicy::scopeAllows($user, $before)) {
                throw new InvalidArgumentException('Lancamento fora do escopo do usuario autenticado.');
            }
            $this->assertLaunchMutable($before);

            $targetIndex = null;
            foreach ($items as $index => $item) {
                if (is_array($item) && (string) ($item['id'] ?? '') === $launchId) {
                    if ($targetIndex !== null) throw new InvalidArgumentException('Lancamento duplicado na requisicao.');
                    $targetIndex = $index;
                }
            }
            if ($targetIndex === null) throw new InvalidArgumentException('Lancamento alterado nao enviado.');

            $target = $items[$targetIndex];
            if ((string) ($target['indicadorId'] ?? $target['indicador_id'] ?? '') !== (string) $before['indicadorId']
                || (string) ($target['competencia'] ?? '') !== (string) $before['competencia']) {
                throw new InvalidArgumentException('Indicador ou competencia nao corresponde ao lancamento.');
            }

            $status = $action === 'send' ? 'Enviado para homologação' : 'Em preenchimento';
            $target['status'] = $status;
            $target['usuarioResponsavel'] = $matricula;
            $target['createdAt'] = $before['createdAt'];
            unset($target['updatedAt']);
            $items[$targetIndex] = $target;
            $items = $this->sanitizeLancamentosForUser($items, $user);

            $this->lancamentos->replaceAll($items);
            $after = $this->lancamentos->find($launchId);
            if ($action === 'send') {
                $this->homologacoes->recordSubmission($launchId, $before['status'], $status, $user);
            }
            $this->auditoria->append(array(
                'entidade' => 'lancamentos', 'registroId' => $launchId,
                'acao' => $action === 'send' ? 'envio_para_homologacao' : 'salvar_rascunho_lancamento',
                'descricao' => $action === 'send' ? 'Lancamento enviado para homologacao.' : 'Preenchimento salvo.',
                'valorAnterior' => $before, 'valorNovo' => $after,
                'usuario' => $matricula, 'perfilUsuario' => $user['perfil'],
            ));
            $this->db->commit();
            return $after;
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    private function evidenceReferenceChanges(array $items): array
    {
        $changes = array();
        foreach ($items as $item) {
            $id = (string)($item['id'] ?? '');
            if ($id === '') continue;
            $existing = $this->lancamentos->find($id);
            if (!$existing) continue;
            $before = trim((string)($existing['referenciaEvidencia'] ?? ''));
            $after = trim((string)($item['referenciaEvidencia'] ?? $item['referencia_evidencia'] ?? ''));
            if ($before !== $after) $changes[] = array('id'=>$id,'before'=>$before,'after'=>$after);
        }
        return $changes;
    }

    private function assertLaunchMutable(array $launch)
    {
        return GovernancaHomologacao::assertLaunchMutable(
            $launch,
            $this->configuracoes->get(GovernancaHomologacao::CLOSURES_KEY, array()),
            $this->homologacoes->exceptionalReopenCycleActive($launch['id'])
        );
    }

    private function assertBulkLaunchGovernance(array $items, array $user)
    {
        foreach ($items as $item) {
            if (!is_array($item) || empty($item['id'])) continue;
            $existing = $this->lancamentos->find($item['id']);
            if (!$existing) continue;
            if ($this->launchProductionChanged($existing, $item)) {
                $this->assertLegacyLaunchAllowed($existing);
                $this->assertLaunchMutable($existing);
            }
        }
    }

    private function assertLegacyLaunchAllowed(array $launch): void
    {
        $status = LancamentoStateMachine::normalize($launch['status'] ?? '');
        $transactionalStatuses = array(
            LancamentoStateMachine::REOPENED,
            LancamentoStateMachine::RECTIFIED,
            LancamentoStateMachine::HOMOLOGATED,
        );
        $pendingReopenCycle = $status === LancamentoStateMachine::IN_PROGRESS
            && (int)($launch['versaoAtual'] ?? 1) > 1
            && $this->homologacoes->reopenCycleActive($launch['id']);
        if (in_array($status, $transactionalStatuses, true) || $pendingReopenCycle) {
            throw new InvalidArgumentException(
                'Lancamento em ciclo transacional deve ser alterado exclusivamente por PATCH /api/lancamentos/{id}.'
            );
        }
    }

    private function launchProductionChanged(array $existing, array $candidate)
    {
        $fields = array(
            'camposEntrada', 'resultadoMensal', 'resultadoOficialAnual', 'metaReferencia',
            'percentualAtingido', 'situacaoCalculada', 'status', 'observacaoArea',
            'referenciaEvidencia', 'usuarioResponsavel',
        );
        $before = array();
        $after = array();
        foreach ($fields as $field) {
            $before[$field] = isset($existing[$field]) ? $existing[$field] : null;
            $after[$field] = isset($candidate[$field]) ? $candidate[$field] : null;
        }
        $before['status'] = LancamentoStateMachine::normalize($before['status']);
        $after['status'] = LancamentoStateMachine::normalize($after['status']);
        return json_encode($before) !== json_encode($after);
    }

    private function validateRequiredEvidenceTransitions(array $items): void
    {
        $required = array();
        $indicators = array();
        foreach ($this->indicadores->all() as $indicator) {
            $indicators[(string)($indicator['id'] ?? '')] = $indicator;
        }
        foreach ($this->configuracoes->get('regrasIndicadores', array()) as $rule) {
            if (!empty($rule['exigeEvidencia'])) $required[(string)($rule['indicadorId'] ?? '')] = true;
        }
        foreach ($items as $item) {
            $id = (string)($item['id'] ?? '');
            $indicatorId = (string)($item['indicadorId'] ?? $item['indicador_id'] ?? '');
            $newStatus = LancamentoStateMachine::normalize((string)($item['status'] ?? ''));
            if ($id === '' || $newStatus !== LancamentoStateMachine::SUBMITTED) continue;
            $existing = $this->lancamentos->find($id);
            if ($existing && LancamentoStateMachine::normalize($existing['status']) === LancamentoStateMachine::SUBMITTED) continue;
            if (!isset($indicators[$indicatorId])) {
                throw new InvalidArgumentException('Indicador do lançamento não foi encontrado.');
            }
            if (!CompetenciaPeriodicidade::isExpected($indicators[$indicatorId], $item)) {
                throw new InvalidArgumentException('A competência informada não pertence ao ciclo oficial do indicador.');
            }
            if (empty($required[$indicatorId])) continue;
            if (!$this->evidencias->hasCurrent($id)) {
                throw new InvalidArgumentException('Anexe pelo menos um arquivo da versao atual antes de enviar para homologacao.');
            }
        }
    }
}
