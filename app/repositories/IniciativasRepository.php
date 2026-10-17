<?php
declare(strict_types=1);

final class IniciativasRepository
{
    private $db;

    public function __construct($db) { $this->db = $db; }

    public function find($id)
    {
        $stmt = $this->db->prepare('SELECT * FROM dbo.iniciativas_estrategicas WHERE id=:id');
        $stmt->execute(array(':id' => (string) $id));
        $row = $stmt->fetch();
        return $row ? $this->map($row) : null;
    }

    public function findForUpdate($id)
    {
        $stmt = $this->db->prepare('SELECT * FROM dbo.iniciativas_estrategicas WITH (UPDLOCK,HOLDLOCK) WHERE id=:id');
        $stmt->execute(array(':id' => (string) $id));
        $row = $stmt->fetch();
        return $row ? $this->map($row) : null;
    }

    public function nextCodeForYearForUpdate($year)
    {
        $prefix = sprintf('INI-%04d-', (int) $year);
        $stmt = $this->db->prepare(
            'SELECT TOP 1 codigo FROM dbo.iniciativas_estrategicas WITH (UPDLOCK,HOLDLOCK) '
            . 'WHERE codigo LIKE :prefix ORDER BY TRY_CONVERT(INT,SUBSTRING(codigo,10,20)) DESC'
        );
        $stmt->execute(array(':prefix' => $prefix . '%'));
        $current = $stmt->fetchColumn();
        $sequence = 1;
        if (is_string($current) && preg_match('/^INI-[0-9]{4}-([0-9]+)$/', $current, $match)) {
            $sequence = ((int) $match[1]) + 1;
        }
        return $prefix . str_pad((string) $sequence, 3, '0', STR_PAD_LEFT);
    }

    public function create(array $data)
    {
        $id = uniqid('iniciativa-', true);
        $stmt = $this->db->prepare(
            'INSERT INTO dbo.iniciativas_estrategicas '
            . '(id,codigo,plano,pilar,titulo_executivo,descricao_oficial,objetivo,unidade_responsavel,diretoria_responsavel,ano_inicio,trimestre_inicio,previsao_conclusao,exige_evidencia,ativo,created_by) '
            . 'VALUES (:id,:codigo,:plano,:pilar,:titulo,:descricao,:objetivo,:unidade,:diretoria,:ano,:trimestre,:previsao,:evidencia,:ativo,:usuario)'
        );
        $stmt->execute(array(
            ':id' => $id, ':codigo' => $data['codigo'], ':plano' => $data['plano'], ':pilar' => $data['pilar'],
            ':titulo' => $data['titulo_executivo'], ':descricao' => $data['descricao_oficial'], ':objetivo' => $data['objetivo'],
            ':unidade' => $data['unidade_responsavel'], ':diretoria' => $data['diretoria_responsavel'],
            ':ano' => $data['ano_inicio'], ':trimestre' => $data['trimestre_inicio'], ':previsao' => $data['previsao_conclusao'],
            ':evidencia' => $data['exige_evidencia'] ? 1 : 0, ':ativo' => $data['ativo'] ? 1 : 0, ':usuario' => $data['created_by'],
        ));
        return $this->find($id);
    }

    public function update($id, array $data)
    {
        $stmt = $this->db->prepare(
            'UPDATE dbo.iniciativas_estrategicas SET plano=:plano,pilar=:pilar,titulo_executivo=:titulo,'
            . 'descricao_oficial=:descricao,objetivo=:objetivo,unidade_responsavel=:unidade,diretoria_responsavel=:diretoria,'
            . 'previsao_conclusao=:previsao,exige_evidencia=:evidencia,updated_at=SYSUTCDATETIME() WHERE id=:id'
        );
        $stmt->execute(array(
            ':plano' => $data['plano'], ':pilar' => $data['pilar'], ':titulo' => $data['titulo_executivo'],
            ':descricao' => $data['descricao_oficial'], ':objetivo' => $data['objetivo'], ':unidade' => $data['unidade_responsavel'],
            ':diretoria' => $data['diretoria_responsavel'], ':previsao' => $data['previsao_conclusao'],
            ':evidencia' => $data['exige_evidencia'] ? 1 : 0, ':id' => (string) $id,
        ));
        return $this->find($id);
    }

    public function setActive($id, $active)
    {
        $stmt = $this->db->prepare('UPDATE dbo.iniciativas_estrategicas SET ativo=:ativo,updated_at=SYSUTCDATETIME() WHERE id=:id');
        $stmt->execute(array(':ativo' => $active ? 1 : 0, ':id' => (string) $id));
        return $this->find($id);
    }

    public function activeForGenerationForUpdate()
    {
        $stmt = $this->db->query('SELECT * FROM dbo.iniciativas_estrategicas WITH (UPDLOCK,HOLDLOCK) WHERE ativo=1 ORDER BY codigo');
        return array_map(array($this, 'map'), $stmt->fetchAll());
    }

    public function map(array $row)
    {
        return array(
            'id' => (string) $row['id'], 'codigo' => (string) $row['codigo'], 'plano' => (string) $row['plano'],
            'pilar' => (string) $row['pilar'], 'tituloExecutivo' => (string) $row['titulo_executivo'],
            'descricaoOficial' => (string) $row['descricao_oficial'], 'objetivo' => (string) $row['objetivo'],
            'unidadeResponsavel' => (string) $row['unidade_responsavel'], 'diretoriaResponsavel' => (string) $row['diretoria_responsavel'],
            'anoInicio' => (int) $row['ano_inicio'], 'trimestreInicio' => (string) $row['trimestre_inicio'],
            'previsaoConclusao' => $row['previsao_conclusao'] === null ? null : substr((string) $row['previsao_conclusao'],0,10), 'exigeEvidencia' => (bool) $row['exige_evidencia'],
            'ativo' => (bool) $row['ativo'], 'createdBy' => $row['created_by'], 'createdAt' => $row['created_at'], 'updatedAt' => $row['updated_at'],
        );
    }
}
