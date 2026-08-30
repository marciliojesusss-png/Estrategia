<?php
declare(strict_types=1);

require_once __DIR__ . '/../repositories/PrazosApuracaoRepository.php';
require_once __DIR__ . '/../repositories/AuditoriaRepository.php';

final class PrazosApuracaoService
{
    private $db;
    private $repository;
    private $audit;

    public function __construct($db)
    {
        $this->db = $db;
        $this->repository = new PrazosApuracaoRepository($db);
        $this->audit = new AuditoriaRepository($db);
    }

    public function all(): array
    {
        return $this->repository->all();
    }

    public function find($id): array
    {
        $item = $this->repository->find($id);
        if (!$item) throw new OutOfBoundsException('Prazo de apuracao nao encontrado.');
        return $item;
    }

    public function create(array $input, array $actor): array
    {
        $data = $this->validate($input);
        if ($this->repository->findByCompetencia($data['competencia'])) {
            throw new LogicException('Ja existe um prazo para esta competencia.');
        }
        return $this->transaction(function () use ($data, $actor) {
            $created = $this->repository->create($data);
            $this->audit($created['id'], 'prazo_apuracao_criado', null, $created, $actor);
            return $created;
        });
    }

    public function update($id, array $input, array $actor): array
    {
        $before = $this->find($id);
        $data = $this->validate($input);
        $sameCompetence = $this->repository->findByCompetencia($data['competencia']);
        if ($sameCompetence && (int) $sameCompetence['id'] !== (int) $id) {
            throw new LogicException('Ja existe um prazo para esta competencia.');
        }
        return $this->transaction(function () use ($id, $data, $before, $actor) {
            $updated = $this->repository->update($id, $data);
            $this->audit($updated['id'], 'prazo_apuracao_alterado', $before, $updated, $actor);
            return $updated;
        });
    }

    private function validate(array $input): array
    {
        $competencia = trim((string) ($input['competencia'] ?? ''));
        $preenchimento = trim((string) ($input['dataLimitePreenchimento'] ?? $input['data_limite_preenchimento'] ?? ''));
        $homologacao = trim((string) ($input['dataLimiteHomologacao'] ?? $input['data_limite_homologacao'] ?? ''));
        if (!preg_match('/^(\d{4})-(\d{2})$/', $competencia, $match) || (int) $match[2] < 1 || (int) $match[2] > 12) {
            throw new DomainException('Competencia obrigatoria no formato YYYY-MM.');
        }
        if (!$this->validDate($preenchimento)) {
            throw new DomainException('Prazo para preenchimento obrigatorio no formato YYYY-MM-DD.');
        }
        if (!$this->validDate($homologacao)) {
            throw new DomainException('Prazo para homologacao obrigatorio no formato YYYY-MM-DD.');
        }
        if ($homologacao < $preenchimento) {
            throw new DomainException('O prazo de homologacao nao pode ser anterior ao prazo de preenchimento.');
        }
        return array(
            'competencia' => $competencia,
            'data_limite_preenchimento' => $preenchimento,
            'data_limite_homologacao' => $homologacao,
            'ativo' => !array_key_exists('ativo', $input) || filter_var($input['ativo'], FILTER_VALIDATE_BOOLEAN),
        );
    }

    private function validDate($value): bool
    {
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', (string) $value);
        $errors = DateTimeImmutable::getLastErrors();
        return $date !== false
            && ($errors === false || ($errors['warning_count'] === 0 && $errors['error_count'] === 0))
            && $date->format('Y-m-d') === $value;
    }

    private function transaction(callable $callback)
    {
        $this->db->beginTransaction();
        try {
            $result = $callback();
            $this->db->commit();
            return $result;
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    private function audit($id, $action, $before, $after, array $actor): void
    {
        $this->audit->append(array(
            'entidade' => 'prazos_apuracao',
            'registroId' => (string) $id,
            'acao' => $action,
            'valorAnterior' => $before,
            'valorNovo' => $after,
            'usuario' => $actor['matricula'] ?? null,
            'perfilUsuario' => $actor['perfil'] ?? null,
        ));
    }
}

