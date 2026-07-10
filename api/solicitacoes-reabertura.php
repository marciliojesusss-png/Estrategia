<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$db = Database::getConnection();
$solicitacoes = new SolicitacoesReaberturaRepository($db);
$lancamentos = new LancamentosRepository($db);
$auditoria = new AuditoriaRepository($db);

$payload = Request::method() === 'GET' ? $_GET : Request::json();
$action = (string) ($payload['action'] ?? 'listar');
$user = Auth::currentUserForFrontend();
$perfil = (string) ($user['perfilCodigo'] ?? 'usuario_companhia');
$perfilLabel = (string) ($user['perfil'] ?? $perfil);
$usuario = (string) ($user['matricula'] ?? $user['nome'] ?? 'Usuario nao informado');

function append_audit(AuditoriaRepository $auditoria, array $entry): void
{
    $items = $auditoria->all();
    $items[] = [
        'id' => $entry['id'] ?? uniqid('audit-', true),
        'entidade' => $entry['entidade'] ?? 'solicitacoes_reabertura',
        'registroId' => $entry['registroId'] ?? '',
        'acao' => $entry['acao'] ?? '',
        'descricao' => $entry['descricao'] ?? '',
        'valorAnterior' => $entry['valorAnterior'] ?? null,
        'valorNovo' => $entry['valorNovo'] ?? null,
        'usuario' => $entry['usuario'] ?? '',
        'perfilUsuario' => $entry['perfilUsuario'] ?? '',
        'dataHora' => $entry['dataHora'] ?? date('c'),
    ];
    $auditoria->replaceAll($items);
}

function save_solicitacoes(SolicitacoesReaberturaRepository $repository, array $items): void
{
    $repository->replaceAll($items);
}

function save_lancamentos(LancamentosRepository $repository, array $items): void
{
    $repository->replaceAll($items);
}

function launch_in_user_scope(LancamentosRepository $repository, string $lancamentoId): bool
{
    foreach ($repository->all(Auth::scopeFilters()) as $lancamento) {
        if ((string) ($lancamento['id'] ?? '') === $lancamentoId) {
            return true;
        }
    }
    return false;
}

if ($action === 'listar') {
    Auth::requirePermission('reaberturas', 'solicitar', true);
    Response::json($solicitacoes->all(Auth::scopeFilters(api_filters($_GET))));
    return;
}

if ($action === 'criar') {
    Auth::requirePermission('reaberturas', 'solicitar', true);

    $lancamentoId = (string) ($payload['lancamentoId'] ?? '');
    $justificativa = trim((string) ($payload['justificativa'] ?? ''));
    if ($lancamentoId === '' || $justificativa === '') {
        Response::error('Informe o lancamento e a justificativa da solicitacao.', 400);
        return;
    }
    if (Auth::normalizeProfile($perfil) !== 'administrador' && !launch_in_user_scope($lancamentos, $lancamentoId)) {
        Response::error('Lancamento fora do escopo do usuario autenticado.', 403);
        return;
    }

    $items = $solicitacoes->all();
    foreach ($items as $item) {
        if ((string) $item['lancamentoId'] === $lancamentoId && $item['statusSolicitacao'] === 'Pendente') {
            Response::error('Ja existe uma solicitacao de reabertura pendente para este lancamento.', 409);
            return;
        }
    }

    $now = date('c');
    $request = [
        'id' => uniqid('sol-reab-', true),
        'lancamentoId' => $lancamentoId,
        'indicadorId' => $payload['indicadorId'] ?? '',
        'competencia' => $payload['competencia'] ?? '',
        'solicitanteUsuario' => $usuario,
        'solicitantePerfil' => $perfilLabel,
        'solicitanteUnidade' => $user['unidadeApuradora'] ?? $user['diretoriaResponsavel'] ?? '',
        'tipoAjuste' => $payload['tipoAjuste'] ?? '',
        'justificativa' => $justificativa,
        'observacaoComplementar' => $payload['observacaoComplementar'] ?? '',
        'statusSolicitacao' => 'Pendente',
        'administradorResponsavel' => '',
        'decisaoAdministrador' => '',
        'justificativaDecisao' => '',
        'dataSolicitacao' => $now,
        'dataDecisao' => '',
        'createdAt' => $now,
        'updatedAt' => $now,
    ];

    $items[] = $request;
    save_solicitacoes($solicitacoes, $items);
    append_audit($auditoria, [
        'acao' => 'solicitacao_reabertura_criada',
        'descricao' => 'Solicitacao de reabertura criada pelo homologador.',
        'registroId' => $request['id'],
        'valorNovo' => $request,
        'usuario' => $usuario,
        'perfilUsuario' => $perfilLabel,
    ]);
    Response::json(['ok' => true, 'solicitacao' => $request], 201);
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

$items = $solicitacoes->all();
$current = null;
foreach ($items as $item) {
    if ((string) $item['id'] === $id) {
        $current = $item;
        break;
    }
}
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
$items = array_map(static function (array $item) use ($id, $updatedRequest) { return (string) $item['id'] === $id ? $updatedRequest : $item; }, $items);
save_solicitacoes($solicitacoes, $items);

$updatedLaunch = null;
if ($action === 'aprovar') {
    $launches = $lancamentos->all();
    $launches = array_map(static function (array $item) use ($current, $usuario, $now, &$updatedLaunch): array {
        if ((string) $item['id'] !== (string) $current['lancamentoId']) {
            return $item;
        }
        $updatedLaunch = array_merge($item, [
            'status' => 'Reaberto',
            'homologadoPor' => '',
            'dataHomologacao' => '',
            'reabertoPor' => $usuario,
            'dataReabertura' => $now,
        ]);
        return $updatedLaunch;
    }, $launches);
    save_lancamentos($lancamentos, $launches);
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

Response::json(['ok' => true, 'solicitacao' => $updatedRequest, 'lancamento' => $updatedLaunch]);
