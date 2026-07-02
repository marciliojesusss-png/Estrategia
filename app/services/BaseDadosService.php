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
            'homologacoes' => $this->homologacoes->all(),
            'solicitacoesReabertura' => $this->solicitacoesReabertura->all($filters),
            'historico' => $this->auditoria->all(),
            default => null,
        };
    }

    public function all(): array
    {
        return [
            'usuarios' => $this->collection('usuarios'),
            'planos' => $this->collection('planos'),
            'pilares' => $this->collection('pilares'),
            'unidades' => $this->collection('unidades'),
            'diretorias' => $this->collection('diretorias'),
            'indicadores' => $this->collection('indicadores'),
            'metas' => $this->collection('metas'),
            'regrasIndicadores' => $this->collection('regrasIndicadores'),
            'lancamentos' => $this->collection('lancamentos'),
            'homologacoes' => $this->collection('homologacoes'),
            'solicitacoesReabertura' => $this->collection('solicitacoesReabertura'),
            'historico' => $this->collection('historico'),
        ];
    }

    public function saveCollection(string $key, array $value): void
    {
        if ($key === 'lancamentos') {
            $this->lancamentos->replaceAll($value);
            return;
        }
        if ($key === 'historico') {
            $this->auditoria->replaceAll($value);
            return;
        }
        if ($key === 'solicitacoesReabertura') {
            $this->solicitacoesReabertura->replaceAll($value);
            return;
        }
        throw new InvalidArgumentException("Coleção {$key} não possui gravação direta nesta etapa.");
    }
}
