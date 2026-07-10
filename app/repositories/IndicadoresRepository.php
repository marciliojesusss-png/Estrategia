<?php
declare(strict_types=1);

final class IndicadoresRepository
{
    private $db;
    public function __construct(PDO $db) { $this->db = $db; }

    public function all(array $filters = []): array
    {
        $sql = 'SELECT * FROM indicadores WHERE 1=1';
        $params = [];
        foreach ([
            'plano' => 'plano',
            'pilar' => 'pilar',
            'unidade_apuradora' => 'unidade_apuradora',
            'diretoria_responsavel' => 'diretoria_responsavel',
        ] as $queryKey => $column) {
            if (($filters[$queryKey] ?? '') !== '' && ($filters[$queryKey] ?? '') !== 'Todos') {
                $sql .= " AND {$column} = :{$queryKey}";
                $params[":{$queryKey}"] = $filters[$queryKey];
            }
        }
        if (isset($filters['ativo']) && $filters['ativo'] !== '') {
            $sql .= ' AND ativo = :ativo';
            $params[':ativo'] = (int) $filters['ativo'];
        }
        $sql .= ' ORDER BY plano, numero';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'map'], $stmt->fetchAll());
    }

    public function find($id)
    {
        $stmt = $this->db->prepare('SELECT * FROM indicadores WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ? $this->map($row) : null;
    }

    private function map(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'numero' => (int) ($row['numero'] ?? $row['id']),
            'indicador' => $row['nome'],
            'nome' => $row['nome'],
            'plano' => $row['plano'],
            'pilar' => $row['pilar'],
            'unidadeApuradora' => $row['unidade_apuradora'],
            'diretoriaResponsavel' => $row['diretoria_responsavel'],
            'periodicidade' => $row['periodicidade'],
            'unidadeMedida' => $row['unidade_medida'],
            'tipoCalculo' => $row['tipo_calculo'],
            'tipoConsolidacao' => $row['tipo_consolidacao'],
            'metaAnualDescricao' => $row['meta_anual'],
            'metrica' => $row['formula_referencia'],
            'observacaoAcompanhamento' => $row['observacao_acompanhamento'],
            'ativo' => (bool) ($row['ativo'] ?? 1),
        ];
    }
}
