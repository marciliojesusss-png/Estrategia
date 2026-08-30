<?php
declare(strict_types=1);

final class PrazosApuracaoRepository
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function all(): array
    {
        $rows = $this->db->query(
            'SELECT id, competencia, data_limite_preenchimento, data_limite_homologacao, ativo, created_at, updated_at '
            . 'FROM prazos_apuracao ORDER BY competencia DESC'
        )->fetchAll();
        return array_map(array($this, 'map'), $rows);
    }

    public function find($id): ?array
    {
        $statement = $this->db->prepare(
            'SELECT id, competencia, data_limite_preenchimento, data_limite_homologacao, ativo, created_at, updated_at '
            . 'FROM prazos_apuracao WHERE id = :id'
        );
        $statement->execute(array(':id' => (int) $id));
        $row = $statement->fetch();
        return $row ? $this->map($row) : null;
    }

    public function findByCompetencia($competencia): ?array
    {
        $statement = $this->db->prepare(
            'SELECT id, competencia, data_limite_preenchimento, data_limite_homologacao, ativo, created_at, updated_at '
            . 'FROM prazos_apuracao WHERE competencia = :competencia'
        );
        $statement->execute(array(':competencia' => (string) $competencia));
        $row = $statement->fetch();
        return $row ? $this->map($row) : null;
    }

    public function create(array $data): array
    {
        $statement = $this->db->prepare(
            'INSERT INTO prazos_apuracao '
            . '(competencia, data_limite_preenchimento, data_limite_homologacao, ativo) '
            . 'VALUES (:competencia, :preenchimento, :homologacao, :ativo)'
        );
        $statement->execute($this->params($data));
        $created = $this->findByCompetencia($data['competencia']);
        if (!$created) throw new RuntimeException('Nao foi possivel recuperar o prazo criado.');
        return $created;
    }

    public function update($id, array $data): array
    {
        $statement = $this->db->prepare(
            'UPDATE prazos_apuracao SET '
            . 'competencia = :competencia, '
            . 'data_limite_preenchimento = :preenchimento, '
            . 'data_limite_homologacao = :homologacao, '
            . 'ativo = :ativo, updated_at = CURRENT_TIMESTAMP '
            . 'WHERE id = :id'
        );
        $params = $this->params($data);
        $params[':id'] = (int) $id;
        $statement->execute($params);
        return $this->find($id);
    }

    private function params(array $data): array
    {
        return array(
            ':competencia' => $data['competencia'],
            ':preenchimento' => $data['data_limite_preenchimento'],
            ':homologacao' => $data['data_limite_homologacao'],
            ':ativo' => $data['ativo'] ? 1 : 0,
        );
    }

    private function map(array $row): array
    {
        return array(
            'id' => (int) $row['id'],
            'competencia' => trim((string) $row['competencia']),
            'dataLimitePreenchimento' => $this->dateValue($row['data_limite_preenchimento']),
            'dataLimiteHomologacao' => $this->dateValue($row['data_limite_homologacao']),
            'ativo' => (bool) $row['ativo'],
            'createdAt' => $this->dateTimeValue($row['created_at']),
            'updatedAt' => $this->dateTimeValue($row['updated_at']),
        );
    }

    private function dateValue($value): ?string
    {
        if ($value instanceof DateTimeInterface) return $value->format('Y-m-d');
        if ($value === null || $value === '') return null;
        return substr((string) $value, 0, 10);
    }

    private function dateTimeValue($value): ?string
    {
        if ($value instanceof DateTimeInterface) return $value->format(DateTimeInterface::ATOM);
        return $value === null || $value === '' ? null : (string) $value;
    }
}
