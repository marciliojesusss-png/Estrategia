<?php
declare(strict_types=1);

require_once __DIR__ . '/EvidenciaStorage.php';
require_once __DIR__ . '/LancamentoStateMachine.php';
require_once __DIR__ . '/../repositories/EvidenciasRepository.php';
require_once __DIR__ . '/../repositories/LancamentosRepository.php';
require_once __DIR__ . '/../repositories/AuditoriaRepository.php';
require_once __DIR__ . '/../repositories/ConfiguracoesRepository.php';
require_once __DIR__ . '/../repositories/HomologacoesRepository.php';
require_once __DIR__ . '/GovernancaHomologacao.php';

final class EvidenciaService
{
    private $db;
    private $files;
    private $repo;
    private $launches;
    private $audit;
    private $config;
    private $homologacoes;

    public function __construct($db, EvidenciaStorage $files = null)
    {
        $this->db = $db;
        $this->files = $files ?: new EvidenciaStorage();
        $this->repo = new EvidenciasRepository($db);
        $this->launches = new LancamentosRepository($db);
        $this->audit = new AuditoriaRepository($db);
        $this->config = new ConfiguracoesRepository($db);
        $this->homologacoes = new HomologacoesRepository($db);
    }

    public function listForLaunch($launchId, array $user)
    {
        $launch = $this->authorizedLaunch($launchId, $user);
        return array_map(array($this, 'publicEvidence'), $this->repo->byLaunch($launch['id']));
    }

    public function listHistoryForLaunch($launchId, array $user)
    {
        $launch = $this->authorizedLaunch($launchId, $user);
        return array_map(array($this, 'publicEvidence'), $this->repo->historicalByLaunch($launch['id']));
    }

    public function attach($launchId, array $file, $description, array $user)
    {
        $launch = $this->authorizedLaunch($launchId, $user, true);
        $validation = $this->files->validate($file);
        if (!$validation['valid']) {
            throw new DomainException(implode(' ', $validation['errors']));
        }

        $stored = $this->files->store($file, $validation);
        try {
            $this->db->beginTransaction();
            $launch = $this->lockedEditableLaunch($launchId, $user);
            $version = max(1, (int) $launch['versaoAtual']);
            $evidence = $this->repo->create(array(
                'lancamento_id'=>(string)$launchId,
                'versao_lancamento'=>$version,
                'nome_arquivo'=>$validation['original'],
                'tipo_arquivo'=>$validation['mime'],
                'caminho_arquivo'=>$stored['path'],
                'descricao'=>trim((string)$description),
                'usuario'=>$user['matricula'],
            ));
            // Compatibilidade: evidencia_id aponta para o último anexo, mas a lista usa evidencias.lancamento_id.
            if (!$this->launches->setEvidence($launchId, $evidence['id'], $version)) {
                throw new LogicException('O lancamento mudou de versao durante o upload. Tente novamente.');
            }
            $this->audit->append(array(
                'entidade'=>'evidencias',
                'registroId'=>$evidence['id'],
                'acao'=>'evidencia_anexada',
                'valorNovo'=>$evidence,
                'usuario'=>$user['matricula'],
                'perfilUsuario'=>$user['perfil'],
            ));
            $this->db->commit();
            return $this->publicEvidence($evidence);
        } catch (Exception $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            $this->files->remove($stored['path']);
            throw $error;
        }
    }

    public function remove($id, array $user)
    {
        $evidence = $this->repo->find($id);
        if (!$evidence) throw new OutOfBoundsException('Evidência não encontrada.');
        $launch = $this->authorizedLaunch($evidence['lancamento_id'], $user, true);
        if ((int)$evidence['versao_lancamento'] !== (int)$launch['versaoAtual']) {
            throw new LogicException('Evidencia historica nao pode ser removida.');
        }

        $this->db->beginTransaction();
        try {
            $launch = $this->lockedEditableLaunch($evidence['lancamento_id'], $user);
            $evidence = $this->repo->find($id);
            if (!$evidence) throw new OutOfBoundsException('Evidencia nao encontrada.');
            if ((int)$evidence['versao_lancamento'] !== (int)$launch['versaoAtual']) {
                throw new LogicException('Evidencia historica nao pode ser removida.');
            }
            $this->repo->delete($id);
            $remaining = $this->repo->byLaunch($launch['id']);
            $latest = $remaining ? end($remaining) : null;
            $this->launches->setEvidence($launch['id'], $latest ? $latest['id'] : null, $launch['versaoAtual']);
            $this->audit->append(array(
                'entidade'=>'evidencias',
                'registroId'=>$id,
                'acao'=>'evidencia_removida',
                'valorAnterior'=>$evidence,
                'usuario'=>$user['matricula'],
                'perfilUsuario'=>$user['perfil'],
            ));
            $this->db->commit();
        } catch (Exception $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }

        if (!$this->files->remove($evidence['caminho_arquivo'])) {
            Logger::error('Arquivo de evidência pendente de limpeza.', array('id'=>$id));
        }
        return true;
    }

    public function download($id, array $user)
    {
        $evidence = $this->repo->find($id);
        if (!$evidence || !is_file($evidence['caminho_arquivo'])) {
            throw new OutOfBoundsException('Evidência não encontrada.');
        }
        $this->authorizedLaunch($evidence['lancamento_id'], $user);
        return $evidence;
    }

    private function authorizedLaunch($launchId, array $user, $requireEditable = false)
    {
        $launch = $this->launches->find($launchId);
        if (!$launch) throw new OutOfBoundsException('Lançamento não encontrado.');
        if ($user['perfil'] !== 'administrador' && !AccessPolicy::scopeAllows($user, $launch)) {
            throw new UnexpectedValueException('Registro fora do escopo.');
        }
        if ($requireEditable && !in_array($user['perfil'], array('administrador','unidade_apuradora'), true)) {
            throw new UnexpectedValueException('Perfil sem permissão para alterar evidências.');
        }
        if ($requireEditable && !LancamentoStateMachine::editable($launch['status'])) {
            throw new LogicException('Evidências só podem ser alteradas em lançamento editável.');
        }
        if ($requireEditable) {
            GovernancaHomologacao::assertLaunchMutable(
                $launch,
                $this->config->get(GovernancaHomologacao::CLOSURES_KEY, array()),
                $this->homologacoes->exceptionalReopenCycleActive($launch['id'])
            );
        }
        return $launch;
    }

    private function lockedEditableLaunch($launchId, array $user)
    {
        $launch = $this->launches->findForUpdate($launchId);
        if (!$launch) throw new OutOfBoundsException('Lancamento nao encontrado.');
        if ($user['perfil'] !== 'administrador' && !AccessPolicy::scopeAllows($user, $launch)) {
            throw new UnexpectedValueException('Registro fora do escopo.');
        }
        if (!in_array($user['perfil'], array('administrador','unidade_apuradora'), true)) {
            throw new UnexpectedValueException('Perfil sem permissao para alterar evidencias.');
        }
        if (!LancamentoStateMachine::editable($launch['status'])) {
            throw new LogicException('Evidencias so podem ser alteradas em lancamento editavel.');
        }
        GovernancaHomologacao::assertLaunchMutable(
            $launch,
            $this->config->get(GovernancaHomologacao::CLOSURES_KEY, array()),
            $this->homologacoes->exceptionalReopenCycleActive($launch['id'])
        );
        return $launch;
    }

    private function publicEvidence(array $evidence)
    {
        return array(
            'id'=>$evidence['id'],
            'lancamentoId'=>$evidence['lancamento_id'],
            'versaoLancamento'=>(int)$evidence['versao_lancamento'],
            'nomeArquivo'=>$evidence['nome_arquivo'],
            'tipoArquivo'=>$evidence['tipo_arquivo'],
            'descricao'=>$evidence['descricao'],
            'dataUpload'=>$evidence['data_upload'],
            'usuario'=>$evidence['usuario'],
        );
    }
}
