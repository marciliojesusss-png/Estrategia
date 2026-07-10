<?php
declare(strict_types=1);

require_once __DIR__ . '/../repositories/IndicadoresRepository.php';
require_once __DIR__ . '/../repositories/AuditoriaRepository.php';
require_once __DIR__ . '/../validators/IndicadorValidator.php';

final class IndicadorService
{
    private $db; private $repository; private $audit; private $validator;
    public function __construct(PDO $db)
    {
        $this->db = $db; $this->repository = new IndicadoresRepository($db);
        $this->audit = new AuditoriaRepository($db); $this->validator = new IndicadorValidator();
    }
    public function listItems(array $filters, $page, $perPage) { return $this->repository->paginate($filters, $page, $perPage); }
    public function find($id) { return $this->repository->find($id); }

    public function create(array $input, array $user)
    {
        $checked = $this->validator->validate($input);
        if (!$checked['valid']) throw new DomainException(json_encode($checked['errors']));
        if ($this->repository->numberExists($checked['data']['numero'])) throw new LogicException('Ja existe indicador com esse numero.');
        return $this->transaction(function () use ($checked, $user) {
            $created = $this->repository->create($checked['data']);
            $this->audit('indicador_criado', $created, null, $created, $user);
            return $created;
        });
    }

    public function update($id, array $input, array $user)
    {
        $before = $this->repository->find($id);
        if (!$before) throw new OutOfBoundsException('Indicador nao encontrado.');
        $checked = $this->validator->validate($input);
        if (!$checked['valid']) throw new DomainException(json_encode($checked['errors']));
        if ($this->repository->numberExists($checked['data']['numero'], $id)) throw new LogicException('Ja existe indicador com esse numero.');
        return $this->transaction(function () use ($id, $checked, $before, $user) {
            $updated = $this->repository->update($id, $checked['data']);
            $this->audit('indicador_alterado', $id, $before, $updated, $user);
            return $updated;
        });
    }

    public function setActive($id, $active, array $user)
    {
        $before = $this->repository->find($id);
        if (!$before) throw new OutOfBoundsException('Indicador nao encontrado.');
        return $this->transaction(function () use ($id, $active, $before, $user) {
            $updated = $this->repository->setActive($id, $active);
            $this->audit($active ? 'indicador_ativado' : 'indicador_inativado', $id, $before, $updated, $user);
            return $updated;
        });
    }

    public function deactivateInsteadOfDelete($id, array $user)
    {
        return $this->setActive($id, false, $user);
    }

    private function audit($action, $id, $before, $after, array $user)
    {
        $recordId = is_array($id) ? $id['id'] : $id;
        $this->audit->append(array('registroId' => $recordId, 'acao' => $action, 'descricao' => 'Operacao realizada no modulo de indicadores.', 'valorAnterior' => $before, 'valorNovo' => $after, 'usuario' => isset($user['matricula']) ? $user['matricula'] : '', 'perfilUsuario' => isset($user['perfil']) ? $user['perfil'] : ''));
    }

    private function transaction($callback)
    {
        $this->db->beginTransaction();
        try { $result = call_user_func($callback); $this->db->commit(); return $result; }
        catch (Exception $error) { if ($this->db->inTransaction()) $this->db->rollBack(); throw $error; }
    }
}
