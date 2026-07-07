<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../repositories/ConfiguracoesRepository.php';
require_once __DIR__ . '/../repositories/IndicadoresRepository.php';
require_once __DIR__ . '/../repositories/LancamentosRepository.php';
require_once __DIR__ . '/../repositories/HomologacoesRepository.php';
require_once __DIR__ . '/../repositories/AuditoriaRepository.php';
require_once __DIR__ . '/../repositories/UsuariosRepository.php';
require_once __DIR__ . '/../repositories/SolicitacoesReaberturaRepository.php';

final class BaseDadosService
{
    private PDO $db;
    private ConfiguracoesRepository $configuracoes;
    private IndicadoresRepository $indicadores;
    private LancamentosRepository $lancamentos;
    private HomologacoesRepository $homologacoes;
    private AuditoriaRepository $auditoria;
    private UsuariosRepository $usuarios;
    private SolicitacoesReaberturaRepository $solicitacoesReabertura;

    public function __construct()
    {
        $this->db = Database::getConnection();
        $this->configuracoes = new ConfiguracoesRepository($this->db);
        $this->indicadores = new IndicadoresRepository($this->db);
        $this->lancamentos = new LancamentosRepository($this->db);
        $this->homologacoes = new HomologacoesRepository($this->db);
        $this->auditoria = new AuditoriaRepository($this->db);
        $this->usuarios = new UsuariosRepository($this->db);
        $this->solicitacoesReabertura = new SolicitacoesReaberturaRepository($this->db);
    }

    public function collection(string $key, array $filters = []): mixed
    {
        return match ($key) {
            'usuarios' => $this->usuarios->all(),
            'planos' => $this->configuracoes->get('planos', []),
            'pilares' => $this->configuracoes->get('pilares', []),
            'unidades' => $this->configuracoes->get('unidades', []),
            'diretorias' => $this->configuracoes->get('diretorias', []),
            'metas' => $this->configuracoes->get('metas', []),
            'regrasIndicadores' => $this->configuracoes->get('regrasIndicadores', []),
            'indicadores' => $this->indicadores->all($filters),
            'lancamentos' => $this->lancamentos->all($filters),
            'homologacoes' => $this->homologacoes->all($filters),
            'solicitacoesReabertura' => $this->solicitacoesReabertura->all($filters),
            'historico' => $this->auditoria->all(),
            default => null,
        };
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
            'lancamentos' => $this->collection('lancamentos', $filters),
            'homologacoes' => $this->collection('homologacoes', $filters),
            'solicitacoesReabertura' => $this->collection('solicitacoesReabertura', $filters),
            'historico' => $this->collection('historico'),
        ];
    }

    public function saveCollection(string $key, array $value, array $user = []): void
    {
        if ($key === 'lancamentos') {
            $this->lancamentos->replaceAll($this->sanitizeLancamentosForUser($value, $user));
            return;
        }
        if ($key === 'homologacoes') {
            if (!$this->canWriteWorkflow($user)) {
                throw new InvalidArgumentException('Perfil nao autorizado para gravar homologacoes.');
            }
            $this->homologacoes->replaceAll($this->filterWorkflowItemsForUser($value, $user));
            return;
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

        $unitStatuses = [
            'Nao iniciado',
            'NÃ£o iniciado',
            'Não iniciado',
            'Rascunho',
            'Em preenchimento',
            'Enviado para homologaÃ§Ã£o',
            'Enviado para homologacao',
            'Enviado para homologação',
            'Devolvido para ajuste',
            'Reaberto',
            'Retificado',
        ];

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
        return array_values(array_filter($items, static function (mixed $item) use ($allowedIndicatorIds): bool {
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
        if ($profile === 'homologador' && (string) ($user['diretoria_responsavel'] ?? '') !== '') {
            return ['diretoria_responsavel' => (string) $user['diretoria_responsavel']];
        }
        if ($profile === 'administrador') {
            return [];
        }
        throw new InvalidArgumentException('Perfil nao autorizado para gravacao.');
    }

    private function canWriteWorkflow(array $user): bool
    {
        return in_array((string) ($user['perfil'] ?? ''), ['administrador', 'homologador'], true);
    }
}
