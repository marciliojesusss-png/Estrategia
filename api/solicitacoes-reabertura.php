<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../app/services/LancamentoService.php';

$db = Database::getConnection();
$solicitacoes = new SolicitacoesReaberturaRepository($db);
$auditoria = new AuditoriaRepository($db);
$lancamentoService = new LancamentoService($db);

$payload = Request::method() === 'GET' ? $_GET : Request::json();
$action = (string) ($payload['action'] ?? 'listar');
$user = Auth::currentUserForFrontend();
$perfil = (string) ($user['perfilCodigo'] ?? 'usuario_companhia');
$perfilLabel = (string) ($user['perfil'] ?? $perfil);
$usuario = (string) ($user['matricula'] ?? $user['nome'] ?? 'Usuario nao informado');

function append_audit(AuditoriaRepository $auditoria, array $entry): void
{
    $auditoria->append([
        'entidade' => $entry['entidade'] ?? 'solicitacoes_reabertura',
        'registroId' => $entry['registroId'] ?? '',
        'acao' => $entry['acao'] ?? '',
        'descricao' => $entry['descricao'] ?? '',
        'valorAnterior' => $entry['valorAnterior'] ?? null,
        'valorNovo' => $entry['valorNovo'] ?? null,
        'usuario' => $entry['usuario'] ?? '',
        'perfilUsuario' => $entry['perfilUsuario'] ?? '',
    ]);
}

if ($action === 'listar') {
    Auth::requirePermission('reaberturas', 'solicitar', true);
    Response::json($solicitacoes->all(Auth::scopeFilters(api_filters($_GET))));
    return;
}

if ($action === 'criar') {
    Auth::requirePermission('reaberturas', 'solicitar', true);
    Response::error('Novas solicitacoes administrativas de reabertura nao sao aceitas. Utilize o fluxo direto de governanca.', 409);
    return;
}

if (!in_array($action, ['aprovar', 'negar'], true)) {
    Response::error('Acao invalida.', 400);
    return;
}

Auth::requirePermission('reaberturas', 'decidir', true);

if (Auth::normalizeProfile($perfil) !== 'administrador') {
    append_audit($auditoria, [
        'acao' => 'tentativa_reabertura_nao_autorizada',
        'descricao' => 'Usuario sem permissao tentou reabrir lancamento homologado.',
        'registroId' => (string) ($payload['id'] ?? ''),
        'usuario' => $usuario,
        'perfilUsuario' => $perfilLabel,
    ]);
    Response::error('A reabertura de lancamento homologado e permitida apenas ao Administrador.', 403);
    return;
}

$id = (string) ($payload['id'] ?? '');
$justificativaDecisao = trim((string) ($payload['justificativaDecisao'] ?? ''));
if ($id === '' || $justificativaDecisao === '') {
    Response::error('Informe a solicitacao e a justificativa da decisao.', 400);
    return;
}

$current = $solicitacoes->find($id);
if (!$current || $current['statusSolicitacao'] !== 'Pendente') {
    Response::error('Solicitacao pendente nao encontrada.', 404);
    return;
}

$now = date('c');
$status = $action === 'aprovar' ? 'Aprovada' : 'Negada';
$updatedRequest = array_merge($current, [
    'statusSolicitacao' => $status,
    'administradorResponsavel' => $usuario,
    'decisaoAdministrador' => $action === 'aprovar' ? 'Aprovar e reabrir' : 'Negar',
    'justificativaDecisao' => $justificativaDecisao,
    'dataDecisao' => $now,
    'updatedAt' => $now,
]);

$updatedLaunch = null;
try {
    $db->beginTransaction();
    if (!$solicitacoes->decidePending(
        $id,
        $status,
        $usuario,
        $action === 'aprovar' ? 'Aprovar e reabrir' : 'Negar',
        $justificativaDecisao,
        $now
    )) {
        $db->rollBack();
        Response::error('Solicitacao pendente ja foi processada por outra requisicao.', 409);
        return;
    }

    $updatedRequest = $solicitacoes->find($id);
    if ($action === 'aprovar') {
        $reopenActor = $user;
        $reopenActor['perfil'] = 'administrador';
        $reopenActor['matricula'] = $usuario;
        $updatedLaunch = $lancamentoService->reopen(
            $current['lancamentoId'],
            $justificativaDecisao,
            $reopenActor
        );
    }

    append_audit($auditoria, [
        'acao' => $action === 'aprovar' ? 'solicitacao_reabertura_aprovada' : 'solicitacao_reabertura_negada',
        'descricao' => $action === 'aprovar'
            ? 'Solicitacao aprovada pelo Administrador e lancamento reaberto para edicao.'
            : 'Solicitacao de reabertura negada pelo Administrador.',
        'registroId' => $id,
        'valorAnterior' => $current,
        'valorNovo' => ['solicitacao' => $updatedRequest, 'lancamento' => $updatedLaunch],
        'usuario' => $usuario,
        'perfilUsuario' => $perfilLabel,
    ]);
    $db->commit();
    Response::json(['ok' => true, 'solicitacao' => $updatedRequest, 'lancamento' => $updatedLaunch]);
} catch (DomainException $error) {
    if ($db->inTransaction()) $db->rollBack();
    Response::error($error->getMessage(), 422);
} catch (LogicException $error) {
    if ($db->inTransaction()) $db->rollBack();
    Response::error($error->getMessage(), 409);
} catch (OutOfBoundsException $error) {
    if ($db->inTransaction()) $db->rollBack();
    Response::error($error->getMessage(), 404);
} catch (UnexpectedValueException $error) {
    if ($db->inTransaction()) $db->rollBack();
    Response::error($error->getMessage(), 403);
} catch (Throwable $error) {
    if ($db->inTransaction()) $db->rollBack();
    Response::error('Nao foi possivel processar a solicitacao de reabertura.', 500);
}
