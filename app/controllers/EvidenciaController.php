<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/EvidenciaService.php';

final class EvidenciaController
{
    private $service;

    public function __construct()
    {
        $this->service = new EvidenciaService(Database::getConnection());
    }

    public function listApi($launchId)
    {
        try {
            $user = Auth::requirePermission('lancamentos', 'visualizar', true);
            Response::success($this->service->listForLaunch($launchId, $user));
        } catch (OutOfBoundsException $error) {
            Response::error($error->getMessage(), 404);
        } catch (UnexpectedValueException $error) {
            Response::error($error->getMessage(), 403);
        }
    }

    public function uploadApi($launchId)
    {
        try {
            $user = Auth::requirePermission('lancamentos', 'gerenciar', true);
            Auth::requireCsrf();
            if (!isset($_FILES['evidencia'])) throw new DomainException('Selecione um arquivo.');
            $evidence = $this->service->attach($launchId, $_FILES['evidencia'], $_POST['descricao'] ?? '', $user);
            Response::success($evidence, 'Evidência anexada com sucesso.', 201);
        } catch (DomainException $error) {
            Response::error($error->getMessage(), 422);
        } catch (LogicException $error) {
            Response::error($error->getMessage(), 409);
        } catch (OutOfBoundsException $error) {
            Response::error($error->getMessage(), 404);
        } catch (UnexpectedValueException $error) {
            Response::error($error->getMessage(), 403);
        }
    }

    public function removeApi($id)
    {
        try {
            $user = Auth::requirePermission('lancamentos', 'gerenciar', true);
            Auth::requireCsrf();
            $this->service->remove($id, $user);
            Response::success(array('id'=>$id), 'Evidência removida com sucesso.');
        } catch (LogicException $error) {
            Response::error($error->getMessage(), 409);
        } catch (OutOfBoundsException $error) {
            Response::error($error->getMessage(), 404);
        } catch (UnexpectedValueException $error) {
            Response::error($error->getMessage(), 403);
        }
    }

    public function upload($id)
    {
        $user = Auth::requirePermission('lancamentos', 'gerenciar');
        Auth::requireCsrf();
        try {
            if (!isset($_FILES['evidencia'])) throw new DomainException('Selecione um arquivo.');
            $this->service->attach($id, $_FILES['evidencia'], $_POST['descricao'] ?? '', $user);
            $_SESSION['_flash'] = 'Evidência anexada com sucesso.';
        } catch (Exception $error) {
            $_SESSION['_flash'] = $error->getMessage();
        }
        Response::redirect('/lancamentos/' . $id);
    }

    public function download($id)
    {
        $user = Auth::requirePagePermission('lancamentos', 'visualizar');
        try {
            $evidence = $this->service->download($id, $user);
            header('Content-Type: ' . $evidence['tipo_arquivo']);
            header('Content-Disposition: attachment; filename="' . str_replace('"', '', basename($evidence['nome_arquivo'])) . '"');
            header('X-Content-Type-Options: nosniff');
            readfile($evidence['caminho_arquivo']);
        } catch (Exception $error) {
            ErrorHandler::renderError($error instanceof UnexpectedValueException ? 403 : 404);
        }
    }

    public function remove($id)
    {
        $user = Auth::requirePermission('lancamentos', 'gerenciar');
        Auth::requireCsrf();
        try {
            $repository = new EvidenciasRepository(Database::getConnection());
            $evidence = $repository->find($id);
            $this->service->remove($id, $user);
            $_SESSION['_flash'] = 'Evidência removida com sucesso.';
            Response::redirect('/lancamentos/' . $evidence['lancamento_id']);
        } catch (Exception $error) {
            ErrorHandler::renderError($error instanceof UnexpectedValueException ? 403 : 404);
        }
    }
}
