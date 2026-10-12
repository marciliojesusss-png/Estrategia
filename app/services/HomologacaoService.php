<?php
declare(strict_types=1);

require_once __DIR__.'/../repositories/HomologacoesRepository.php';
require_once __DIR__.'/../repositories/LancamentosRepository.php';
require_once __DIR__.'/../repositories/IndicadoresRepository.php';
require_once __DIR__.'/../repositories/EvidenciasRepository.php';
require_once __DIR__.'/../repositories/AuditoriaRepository.php';
require_once __DIR__.'/LancamentoStateMachine.php';
require_once __DIR__.'/CompetenciaPeriodicidade.php';
require_once __DIR__.'/GovernancaHomologacao.php';

final class HomologacaoService
{
    private $db;
    private $repo;
    private $launches;
    private $indicators;
    private $evidence;
    private $audit;

    public function __construct($db)
    {
        $this->db=$db;
        $this->repo=new HomologacoesRepository($db);
        $this->launches=new LancamentosRepository($db);
        $this->indicators=new IndicadoresRepository($db);
        $this->evidence=new EvidenciasRepository($db);
        $this->audit=new AuditoriaRepository($db);
    }

    public function queue(array $filters,$page,$perPage)
    {
        $all=array();$cursor=1;
        do{$batch=$this->repo->queue($filters,$cursor,100);$all=array_merge($all,$batch['items']);$cursor++;}while($cursor<=($batch['pagination']['pages'] ?? 0));
        $indicators=array();
        foreach($this->indicators->all() as $indicator)$indicators[(string)($indicator['id'] ?? '')]=$indicator;
        $filtered=array_values(array_filter($all,function($launch)use($indicators){
            $indicator=$indicators[(string)($launch['indicadorId'] ?? $launch['indicador_id'] ?? '')] ?? null;
            return $indicator && CompetenciaPeriodicidade::isExpected($indicator,$launch);
        }));
        $page=max(1,(int)$page);$perPage=max(1,min(100,(int)$perPage));$total=count($filtered);
        return array('items'=>array_slice($filtered,($page-1)*$perPage,$perPage),'pagination'=>array('page'=>$page,'perPage'=>$perPage,'total'=>$total,'pages'=>$total?(int)ceil($total/$perPage):0));
    }
    public function history(array $filters,$page,$perPage){return $this->repo->history($filters,$page,$perPage);}

    public function detail($id,array $user)
    {
        $launch=$this->launches->find($id);
        if(!$launch) throw new OutOfBoundsException('Lancamento nao encontrado.');
        if($user['perfil']!=='administrador'&&!AccessPolicy::scopeAllows($user,$launch)) throw new UnexpectedValueException('Registro fora do escopo.');
        $evidences=array_map(function($evidence){
            return array(
                'id'=>$evidence['id'],
                'lancamento_id'=>$evidence['lancamento_id'],
                'nome_arquivo'=>$evidence['nome_arquivo'],
                'tipo_arquivo'=>$evidence['tipo_arquivo'],
                'descricao'=>$evidence['descricao'],
                'data_upload'=>$evidence['data_upload'],
                'usuario'=>$evidence['usuario'],
            );
        },$this->evidence->byLaunch($id));
        return array(
            'lancamento'=>$launch,
            'evidencias'=>$evidences,
            'historico'=>$this->repo->history(array('indicadorId'=>$launch['indicadorId']),1,100)['items'],
        );
    }

    public function approve($id,array $user,$observation='')
    {
        return $this->decide($id,'Homologado','homologacao_lancamento',trim((string)$observation),$user);
    }

    public function reject($id,$reason,array $user)
    {
        $reason=trim((string)$reason);
        if($reason==='') throw new DomainException('Justificativa obrigatoria para rejeicao.');
        if(strlen($reason)<5) throw new DomainException('Justificativa deve possuir ao menos 5 caracteres.');
        return $this->decide($id,LancamentoStateMachine::RETURNED,'devolucao_lancamento',$reason,$user);
    }

    private function decide($id,$after,$action,$reason,array $user)
    {
        if(!in_array($user['perfil'],array('administrador','homologador','consultor_diretoria'),true)) throw new UnexpectedValueException('Perfil sem permissao para decidir.');
        $this->db->beginTransaction();
        try {
            $before=$this->launches->findForUpdate($id);
            if(!$before) throw new OutOfBoundsException('Lancamento nao encontrado.');
            if($user['perfil']!=='administrador'&&!AccessPolicy::scopeAllows($user,$before)) throw new UnexpectedValueException('Registro fora do escopo.');
            $indicator=$this->indicators->find(isset($before['indicadorId'])?$before['indicadorId']:'');
            if(!$indicator) throw new OutOfBoundsException('Indicador nao encontrado.');
            CompetenciaPeriodicidade::assertExpected($indicator,$before);
            $expected=LancamentoStateMachine::SUBMITTED;
            if(LancamentoStateMachine::normalize($before['status'])!==$expected) throw new LogicException('Homologacao ja processada ou indisponivel.');
            GovernancaHomologacao::assertIndependentReviewer(
                $before,
                $this->repo->latestSubmissionUser($id),
                $user,
                $this->repo->productionParticipantUsers($id, GovernancaHomologacao::productionActions())
            );
            // A condição otimista usa o texto exatamente lido do banco. O valor
            // normalizado serve apenas para validar a transição de estado.
            if(!$this->launches->updateStatus($id,$before['status'],$after)) throw new LogicException('Homologacao processada por outra requisicao.');
            $decisionUser=$user;
            $decisionUser['perfil']=GovernancaHomologacao::profileLabel($user['perfil']);
            $this->repo->recordDecision($id,$action,$expected,$after,$reason,$decisionUser);
            $updated=$this->launches->find($id);
            $updated['observacaoDiretoria']=$reason;
            $this->audit->append(array(
                'entidade'=>'homologacoes',
                'registroId'=>$id,
                'acao'=>$action,
                'descricao'=>'Decisao de homologacao.',
                'valorAnterior'=>$before,
                'valorNovo'=>array('lancamento'=>$updated,'observacaoDiretoria'=>$reason),
                'usuario'=>$user['matricula'],
                'perfilUsuario'=>GovernancaHomologacao::profileLabel($user['perfil']),
            ));
            $this->db->commit();
            return $updated;
        } catch(Throwable $error) {
            if($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }
}
