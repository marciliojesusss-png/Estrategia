<?php
declare(strict_types=1);

final class AdministracaoRepository
{
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function users(array $filters, $page, $perPage)
    {
        $page = max(1, (int) $page); $perPage = max(1, min(100, (int) $perPage));
        $where = array(); $params = array();
        if (!empty($filters['q'])) { $where[] = '(u.matricula LIKE :q OR u.nome LIKE :q OR u.sg_unidade LIKE :q OR u.no_unidade LIKE :q)'; $params[':q'] = '%' . $filters['q'] . '%'; }
        foreach (array('perfil', 'ativo') as $key) {
            if (!isset($filters[$key]) || $filters[$key] === '' || $filters[$key] === 'Todos') continue;
            $where[] = 'u.' . $key . '=:' . $key; $params[':' . $key] = $key === 'ativo' ? (int) $filters[$key] : $filters[$key];
        }
        $whereSql = $where ? ' WHERE ' . implode(' AND ', $where) : '';
        $count = $this->db->prepare('SELECT COUNT(*) FROM dbo.usuarios_acesso u' . $whereSql); $count->execute($params); $total = (int) $count->fetchColumn();
        $stmt = $this->db->prepare($this->userSelect() . $whereSql . ' ORDER BY u.ativo DESC,u.nome,u.matricula OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY');
        foreach ($params as $key => $value) $stmt->bindValue($key, $value);
        $stmt->bindValue(':offset', ($page - 1) * $perPage, PDO::PARAM_INT); $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT); $stmt->execute();
        return array('items' => $stmt->fetchAll(), 'pagination' => array('page' => $page, 'perPage' => $perPage, 'total' => $total, 'pages' => $total ? (int) ceil($total / $perPage) : 0));
    }

    public function findUser($id) { $stmt = $this->db->prepare($this->userSelect() . ' WHERE u.id=:id'); $stmt->execute(array(':id' => (int) $id)); $row = $stmt->fetch(); return $row ?: null; }
    public function matriculaExists($matricula, $ignore = null) { $sql = 'SELECT COUNT(*) FROM dbo.usuarios_acesso WHERE matricula=:m'; $params = array(':m' => $matricula); if ($ignore) { $sql .= ' AND id<>:id'; $params[':id'] = (int) $ignore; } $stmt = $this->db->prepare($sql); $stmt->execute($params); return (int) $stmt->fetchColumn() > 0; }
    public function activeAdmins() { return (int) $this->db->query("SELECT COUNT(*) FROM dbo.usuarios_acesso WHERE perfil='administrador' AND ativo=1")->fetchColumn(); }

    public function activeCoverageUsers()
    {
        return $this->db->query('SELECT u.id,u.matricula,u.nome,u.perfil,u.unidade_apuradora,u.diretoria_responsavel,u.grupo_preenchimento_codigo,g.nome AS grupo_preenchimento_nome,g.tipo_escopo AS grupo_tipo_escopo,g.escopo_referencia AS grupo_escopo_referencia,g.limite_vagas,u.ativo FROM dbo.usuarios_acesso u LEFT JOIN dbo.grupos_preenchimento g ON g.codigo=u.grupo_preenchimento_codigo WHERE u.ativo=1 ORDER BY u.nome,u.matricula')->fetchAll();
    }

    public function groups()
    {
        $rows = $this->db->query('SELECT g.codigo,g.nome,g.tipo_escopo,g.escopo_referencia,g.limite_vagas,g.ativo,u.unidade_codigo FROM dbo.grupos_preenchimento g LEFT JOIN dbo.grupos_preenchimento_unidades u ON u.grupo_codigo=g.codigo ORDER BY g.codigo,u.unidade_codigo')->fetchAll();
        $groups = array();
        foreach ($rows as $row) {
            $code = (string) $row['codigo'];
            if (!isset($groups[$code])) $groups[$code] = array('codigo' => $code, 'nome' => $row['nome'], 'tipoEscopo' => $row['tipo_escopo'], 'escopoReferencia' => $row['escopo_referencia'], 'limiteVagas' => (int) $row['limite_vagas'], 'ativo' => (bool) $row['ativo'], 'unidades' => array());
            if (!empty($row['unidade_codigo'])) $groups[$code]['unidades'][] = (string) $row['unidade_codigo'];
        }
        return array_values($groups);
    }

    public function findActiveGroup($code) { $stmt = $this->db->prepare('SELECT codigo,nome,tipo_escopo,escopo_referencia,limite_vagas,ativo FROM dbo.grupos_preenchimento WHERE codigo=:codigo AND ativo=1'); $stmt->execute(array(':codigo' => $code)); $row = $stmt->fetch(); return $row ?: null; }
    public function activeGroupMembers($code, $ignoreId = null) { $sql = "SELECT COUNT(*) FROM dbo.usuarios_acesso WITH (UPDLOCK,HOLDLOCK) WHERE perfil='unidade_apuradora' AND ativo=1 AND grupo_preenchimento_codigo=:codigo"; $params = array(':codigo' => $code); if ($ignoreId) { $sql .= ' AND id<>:id'; $params[':id'] = (int) $ignoreId; } $stmt = $this->db->prepare($sql); $stmt->execute($params); return (int) $stmt->fetchColumn(); }

    public function createUser(array $data)
    {
        $stmt = $this->db->prepare('INSERT INTO dbo.usuarios_acesso (matricula,nome,email,perfil,sg_unidade,no_unidade,unidade_apuradora,diretoria_responsavel,grupo_preenchimento_codigo,ativo) OUTPUT INSERTED.id VALUES (:matricula,:nome,:email,:perfil,:sg,:no,:unidade_apuradora,:diretoria_responsavel,:grupo_preenchimento_codigo,:ativo)');
        $stmt->execute($this->params($data)); $id = $stmt->fetchColumn(); $stmt->closeCursor(); return $this->findUser($id);
    }
    public function updateUser($id, array $data)
    {
        $stmt = $this->db->prepare('UPDATE dbo.usuarios_acesso SET matricula=:matricula,nome=:nome,email=:email,perfil=:perfil,sg_unidade=:sg,no_unidade=:no,unidade_apuradora=:unidade_apuradora,diretoria_responsavel=:diretoria_responsavel,grupo_preenchimento_codigo=:grupo_preenchimento_codigo,ativo=:ativo,updated_at=SYSUTCDATETIME() WHERE id=:id');
        $params = $this->params($data); $params[':id'] = (int) $id; $stmt->execute($params); return $this->findUser($id);
    }

    public function replaceAuditorGrant($userId, array $grant)
    {
        $disable = $this->db->prepare('UPDATE dbo.concessoes_acesso_auditoria SET ativo=0,updated_at=SYSUTCDATETIME() WHERE usuario_acesso_id=:id AND ativo=1'); $disable->execute(array(':id' => (int) $userId));
        if (empty($grant['ativo'])) return;
        $stmt = $this->db->prepare('INSERT INTO dbo.concessoes_acesso_auditoria (usuario_acesso_id,data_inicio,data_fim,justificativa,protocolo,aprovado_por,ativo) VALUES (:id,:inicio,:fim,:justificativa,:protocolo,:aprovado,1)');
        $stmt->execute(array(':id' => (int) $userId, ':inicio' => $grant['data_inicio'], ':fim' => $grant['data_fim'], ':justificativa' => $grant['justificativa'], ':protocolo' => $grant['protocolo'], ':aprovado' => $grant['aprovado_por']));
    }

    public function validationUsers() { return $this->db->query('SELECT id,nome,perfil,unidade,diretoria,ativo FROM dbo.usuarios_validacao ORDER BY ativo DESC,nome,id')->fetchAll(); }

    private function userSelect()
    {
        return 'SELECT u.id,u.matricula,u.nome,u.email,u.perfil,u.sg_unidade,u.no_unidade,u.unidade_apuradora,u.diretoria_responsavel,u.grupo_preenchimento_codigo,g.nome AS grupo_preenchimento_nome,g.tipo_escopo AS grupo_tipo_escopo,g.escopo_referencia AS grupo_escopo_referencia,u.ativo,ca.id AS concessao_id,ca.data_inicio AS concessao_data_inicio,ca.data_fim AS concessao_data_fim,ca.justificativa AS concessao_justificativa,ca.protocolo AS concessao_protocolo,ca.aprovado_por AS concessao_aprovado_por,ca.ativo AS concessao_ativa FROM dbo.usuarios_acesso u LEFT JOIN dbo.grupos_preenchimento g ON g.codigo=u.grupo_preenchimento_codigo OUTER APPLY (SELECT TOP (1) c.* FROM dbo.concessoes_acesso_auditoria c WHERE c.usuario_acesso_id=u.id AND c.ativo=1 ORDER BY c.id DESC) ca';
    }
    private function params(array $data)
    {
        return array(':matricula' => $data['matricula'], ':nome' => $data['nome'], ':email' => $data['email'], ':perfil' => $data['perfil'], ':sg' => $data['sg_unidade'], ':no' => $data['no_unidade'], ':unidade_apuradora' => $data['unidade_apuradora'], ':diretoria_responsavel' => $data['diretoria_responsavel'], ':grupo_preenchimento_codigo' => isset($data['grupo_preenchimento_codigo']) ? $data['grupo_preenchimento_codigo'] : null, ':ativo' => $data['ativo'] ? 1 : 0);
    }
}
