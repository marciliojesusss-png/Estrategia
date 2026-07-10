<?php
declare(strict_types=1);

final class IndicadoresRepository
{
    private $db;
    private $driver;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->driver = (string) $db->getAttribute(PDO::ATTR_DRIVER_NAME);
    }

    public function all(array $filters = array())
    {
        $items = array(); $page = 1;
        do {
            $result = $this->paginate($filters, $page, 100);
            $items = array_merge($items, $result['items']); $page++;
        } while ($page <= $result['pagination']['pages']);
        return $items;
    }

    public function paginate(array $filters, $page, $perPage)
    {
        $page = max(1, (int) $page);
        $perPage = max(1, min(100, (int) $perPage));
        list($where, $params) = $this->buildWhere($filters);
        $count = $this->db->prepare('SELECT COUNT(*) FROM indicadores' . $where);
        $count->execute($params);
        $total = (int) $count->fetchColumn();
        $offset = ($page - 1) * $perPage;
        $sql = 'SELECT * FROM indicadores' . $where . ' ORDER BY numero ASC, id ASC';
        $sql .= $this->driver === 'sqlsrv'
            ? ' OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY'
            : ' LIMIT :limit OFFSET :offset';
        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) $stmt->bindValue($key, $value);
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return array(
            'items' => array_map(array($this, 'map'), $stmt->fetchAll()),
            'pagination' => array(
                'page' => $page, 'perPage' => $perPage, 'total' => $total,
                'pages' => $total === 0 ? 0 : (int) ceil($total / $perPage),
            ),
        );
    }

    public function find($id)
    {
        $stmt = $this->db->prepare('SELECT * FROM indicadores WHERE id = :id');
        $stmt->execute(array(':id' => (string) $id));
        $row = $stmt->fetch();
        return $row ? $this->map($row) : null;
    }

    public function numberExists($number, $ignoreId = null)
    {
        $sql = 'SELECT COUNT(*) FROM indicadores WHERE numero = :numero';
        $params = array(':numero' => (int) $number);
        if ($ignoreId !== null && $ignoreId !== '') {
            $sql .= ' AND id <> :id';
            $params[':id'] = (string) $ignoreId;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return (int) $stmt->fetchColumn() > 0;
    }

    public function hasLaunches($id)
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM lancamentos WHERE indicador_id = :id');
        $stmt->execute(array(':id' => (string) $id));
        return (int) $stmt->fetchColumn() > 0;
    }

    public function create(array $data)
    {
        $id = $this->nextId();
        $now = date('c');
        $stmt = $this->db->prepare(
            'INSERT INTO indicadores (id, numero, nome, plano, pilar, unidade_apuradora, diretoria_responsavel, periodicidade, unidade_medida, tipo_calculo, tipo_consolidacao, meta_anual, formula_referencia, observacao_acompanhamento, ativo, created_at, updated_at) '
            . 'VALUES (:id, :numero, :nome, :plano, :pilar, :unidade_apuradora, :diretoria_responsavel, :periodicidade, :unidade_medida, :tipo_calculo, :tipo_consolidacao, :meta_anual, :formula_referencia, :observacao_acompanhamento, :ativo, :created_at, :updated_at)'
        );
        $params = $this->writeParams($data);
        $params[':id'] = $id;
        $params[':created_at'] = $now;
        $params[':updated_at'] = $now;
        $stmt->execute($params);
        return $this->find($id);
    }

    public function update($id, array $data)
    {
        $stmt = $this->db->prepare(
            'UPDATE indicadores SET numero=:numero, nome=:nome, plano=:plano, pilar=:pilar, unidade_apuradora=:unidade_apuradora, diretoria_responsavel=:diretoria_responsavel, periodicidade=:periodicidade, unidade_medida=:unidade_medida, tipo_calculo=:tipo_calculo, tipo_consolidacao=:tipo_consolidacao, meta_anual=:meta_anual, formula_referencia=:formula_referencia, observacao_acompanhamento=:observacao_acompanhamento, ativo=:ativo, updated_at=:updated_at WHERE id=:id'
        );
        $params = $this->writeParams($data);
        $params[':id'] = (string) $id;
        $params[':updated_at'] = date('c');
        $stmt->execute($params);
        return $this->find($id);
    }

    public function setActive($id, $active)
    {
        $stmt = $this->db->prepare('UPDATE indicadores SET ativo = :ativo, updated_at = :updated_at WHERE id = :id');
        $stmt->execute(array(':ativo' => $active ? 1 : 0, ':updated_at' => date('c'), ':id' => (string) $id));
        return $stmt->rowCount() > 0 ? $this->find($id) : null;
    }

    private function buildWhere(array $filters)
    {
        $conditions = array();
        $params = array();
        $allowed = array('plano', 'pilar', 'unidade_apuradora', 'diretoria_responsavel');
        foreach ($allowed as $column) {
            $value = isset($filters[$column]) ? trim((string) $filters[$column]) : '';
            if ($value !== '' && $value !== 'Todos') {
                $conditions[] = $column . ' = :' . $column;
                $params[':' . $column] = $value;
            }
        }
        if (isset($filters['ativo']) && $filters['ativo'] !== '' && $filters['ativo'] !== 'Todos') {
            $conditions[] = 'ativo = :ativo';
            $params[':ativo'] = filter_var($filters['ativo'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        }
        $search = isset($filters['q']) ? trim((string) $filters['q']) : '';
        if ($search !== '') {
            $conditions[] = '(nome LIKE :q OR plano LIKE :q OR pilar LIKE :q OR unidade_apuradora LIKE :q OR diretoria_responsavel LIKE :q)';
            $params[':q'] = '%' . $search . '%';
        }
        return array($conditions ? ' WHERE ' . implode(' AND ', $conditions) : '', $params);
    }

    private function writeParams(array $data)
    {
        $fields = array('numero', 'nome', 'plano', 'pilar', 'unidade_apuradora', 'diretoria_responsavel', 'periodicidade', 'unidade_medida', 'tipo_calculo', 'tipo_consolidacao', 'meta_anual', 'formula_referencia', 'observacao_acompanhamento');
        $params = array();
        foreach ($fields as $field) $params[':' . $field] = isset($data[$field]) ? $data[$field] : null;
        $params[':ativo'] = !empty($data['ativo']) ? 1 : 0;
        return $params;
    }

    private function nextId()
    {
        $sql = $this->driver === 'sqlsrv'
            ? 'SELECT COALESCE(MAX(TRY_CONVERT(INT, id)), 0) + 1 FROM indicadores'
            : 'SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) + 1 FROM indicadores';
        return (string) ((int) $this->db->query($sql)->fetchColumn());
    }

    private function map(array $row)
    {
        $id = (string) $row['id'];
        return array(
            'id' => ctype_digit($id) ? (int) $id : $id,
            'numero' => (int) (isset($row['numero']) ? $row['numero'] : $row['id']),
            'indicador' => $row['nome'], 'nome' => $row['nome'], 'plano' => $row['plano'], 'pilar' => $row['pilar'],
            'unidadeApuradora' => $row['unidade_apuradora'], 'diretoriaResponsavel' => $row['diretoria_responsavel'],
            'periodicidade' => $row['periodicidade'], 'unidadeMedida' => $row['unidade_medida'],
            'tipoCalculo' => $row['tipo_calculo'], 'tipoConsolidacao' => $row['tipo_consolidacao'],
            'metaAnualDescricao' => $row['meta_anual'], 'metrica' => $row['formula_referencia'],
            'observacaoAcompanhamento' => $row['observacao_acompanhamento'], 'ativo' => (bool) $row['ativo'],
            'createdAt' => isset($row['created_at']) ? $row['created_at'] : null,
            'updatedAt' => isset($row['updated_at']) ? $row['updated_at'] : null,
        );
    }
}
