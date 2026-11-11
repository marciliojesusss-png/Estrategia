<?php
declare(strict_types=1);

require_once __DIR__ . '/../repositories/IniciativasAcompanhamentosRepository.php';

final class IniciativaRelatorioService
{
    private $records;

    public function __construct($db)
    {
        $this->records = new IniciativasAcompanhamentosRepository($db);
    }

    public function gerar(array $filters, array $user): array
    {
        $normalized = $this->normalizeFilters($filters);
        $rows = $this->records->reportAll($normalized, $user);
        $available = $this->records->listAll(array(), $user);
        $initiativeIds = array_values(array_unique(array_map(static function (array $row): string {
            return (string) $row['iniciativaId'];
        }, $rows)));

        return array(
            'contexto' => array(
                'geradoEm' => date(DATE_ATOM),
                'geradoPor' => (string) ($user['matricula'] ?? ''),
                'escopo' => $this->scopeLabel($user),
                'filtros' => $normalized,
            ),
            'resumo' => array(
                'acompanhamentos' => count($rows),
                'iniciativas' => count($initiativeIds),
                'homologados' => count(array_filter($rows, static function (array $row): bool {
                    return $row['statusFluxo'] === 'HOMOLOGADO';
                })),
                'pendentes' => count(array_filter($rows, static function (array $row): bool {
                    return $row['statusFluxo'] !== 'HOMOLOGADO';
                })),
            ),
            'opcoes' => array(
                'anos' => $this->uniqueSorted($available, 'ano', true),
                'pilares' => $this->uniqueSorted($available, 'pilarSnapshot'),
                'unidades' => $this->uniqueSorted($available, 'unidadeSnapshot'),
                'diretorias' => $this->uniqueSorted($available, 'diretoriaSnapshot'),
            ),
            'linhas' => $rows,
        );
    }

    private function normalizeFilters(array $filters): array
    {
        $result = array();
        $year = trim((string) ($filters['ano'] ?? ''));
        if ($year !== '') {
            if (!preg_match('/^[0-9]{4}$/', $year) || (int) $year < 1900 || (int) $year > 9999) {
                throw new InvalidArgumentException('Ano inválido para o relatório de iniciativas.');
            }
            $result['ano'] = (int) $year;
        }

        $quarter = trim((string) ($filters['trimestre'] ?? ''));
        if ($quarter !== '') {
            if (!in_array($quarter, array('1TRI', '2TRI', '3TRI', '4TRI'), true)) {
                throw new InvalidArgumentException('Trimestre inválido para o relatório de iniciativas.');
            }
            $result['trimestre'] = $quarter;
        }

        $initiativeStatus = trim((string) ($filters['statusIniciativa'] ?? ''));
        if ($initiativeStatus !== '') {
            $allowed = array('NAO_INICIADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'SUSPENSA', 'CANCELADA');
            if (!in_array($initiativeStatus, $allowed, true)) {
                throw new InvalidArgumentException('Status da iniciativa inválido.');
            }
            $result['statusIniciativa'] = $initiativeStatus;
        }

        $workflowStatus = trim((string) ($filters['statusFluxo'] ?? ''));
        if ($workflowStatus !== '') {
            $allowed = array('NAO_INICIADO', 'EM_PREENCHIMENTO', 'ENVIADO_HOMOLOGACAO', 'DEVOLVIDO_AJUSTE', 'HOMOLOGADO', 'REABERTO');
            if (!in_array($workflowStatus, $allowed, true)) {
                throw new InvalidArgumentException('Status do acompanhamento inválido.');
            }
            $result['statusFluxo'] = $workflowStatus;
        }

        foreach (array('pilar', 'unidade', 'diretoria') as $key) {
            $value = trim((string) ($filters[$key] ?? ''));
            if (mb_strlen($value, 'UTF-8') > 255) {
                throw new InvalidArgumentException('Filtro textual acima do limite permitido.');
            }
            if ($value !== '') $result[$key] = $value;
        }
        return $result;
    }

    private function uniqueSorted(array $rows, string $key, bool $numeric = false): array
    {
        $values = array();
        foreach ($rows as $row) {
            $value = $row[$key] ?? null;
            if ($value !== null && trim((string) $value) !== '') $values[] = $numeric ? (int) $value : (string) $value;
        }
        $values = array_values(array_unique($values, SORT_REGULAR));
        $numeric ? rsort($values, SORT_NUMERIC) : sort($values, SORT_NATURAL | SORT_FLAG_CASE);
        return $values;
    }

    private function scopeLabel(array $user): string
    {
        $profile = (string) ($user['perfil'] ?? '');
        if ($profile === 'administrador') return 'Escopo geral';
        if ($profile === 'unidade_apuradora') {
            return 'Unidade: ' . (string) ($user['unidade_apuradora'] ?? '');
        }
        return 'Diretoria: ' . (string) ($user['diretoria_responsavel'] ?? '');
    }
}
