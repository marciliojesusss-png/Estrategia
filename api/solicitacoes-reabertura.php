<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$db = Database::getConnection();
$solicitacoes = new SolicitacoesReaberturaRepository($db);
$lancamentos = new LancamentosRepository($db);
$auditoria = new AuditoriaRepository($db);

$payload = Request::method() === 'GET' ? $_GET : Request::json();
$action = (string) ($payload['action'] ?? 'listar');
$user = is_array($payload['user'] ?? null) ? $payload['user'] : [];
$perfil = (string) ($user['perfil'] ?? $payload['perfil'] ?? '');
$usuario = (string) ($user['email'] ?? $user['nome'] ?? $payload['usuario'] ?? 'Usuário não informado');

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

if ($action === 'listar') {
    Response::json($solicitacoes->all(api_filters($_GET)));
    return;
}

if ($action === 'criar') {
    if (!in_array($perfil, ['Administrador', 'Diretoria Homologadora'], true)) {
        Response::error('Perfil não autorizado a solicitar reabertura.', 403);
        return;
    }

    $lancamentoId = (string) ($payload['lancamentoId'] ?? '');
    $justificativa = trim((string) ($payload['justificativa'] ?? ''));
    if ($lancamentoId === '' || $justificativa === '') {
        Response::error('Informe o lançamento e a justificativa da solicitação.', 400);
        return;
    }

    $items = $solicitacoes->all();
    foreach ($items as $item) {
        if ((string) $item['lancamentoId'] === $lancamentoId && $item['statusSolicitacao'] === 'Pendente') {
            Response::error('Já existe uma solicitação de reabertura pendente para este lançamento.', 409);
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
        'solicitantePerfil' => $perfil,
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
        'descricao' => 'Solicitação de reabertura criada pelo Diretor/Homologador.',
        'registroId' => $request['id'],
        'valorNovo' => $request,
        'usuario' => $usuario,
        'perfilUsuario' => $perfil,
    ]);
    Response::json(['ok' => true, 'solicitacao' => $request], 201);
    return;
}

if (!in_array($action, ['aprovar', 'negar'], true)) {
    Response::error('Ação inválida.', 400);
    return;
}

if ($perfil !== 'Administrador') {
    append_audit($auditoria, [
        'acao' => 'tentativa_reabertura_nao_autorizada',
        'descricao' => 'Usuário sem permissão tentou reabrir lançamento homologado.',
        'registroId' => (string) ($payload['id'] ?? ''),
        'usuario' => $usuario,
        'perfilUsuario' => $perfil,
    ]);
    Response::error('A reabertura de lançamento homologado é permitida apenas ao Administrador.', 403);
    return;
}

$id = (string) ($payload['id'] ?? '');
$justificativaDecisao = trim((string) ($payload['justificativaDecisao'] ?? ''));
if ($id === '' || $justificativaDecisao === '') {
    Response::error('Informe a solicitação e a justificativa da decisão.', 400);
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
    Response::error('Solicitação pendente não encontrada.', 404);
    return;
}

$now = date('c');
$status = $action === 'aprovar' ? 'Aprovada' : 'Negada';
$updatedRequest = [
    ...$current,
    'statusSolicitacao' => $status,
    'administradorResponsavel' => $usuario,
    'decisaoAdministrador' => $action === 'aprovar' ? 'Aprovar e reabrir' : 'Negar',
    'justificativaDecisao' => $justificativaDecisao,
    'dataDecisao' => $now,
    'updatedAt' => $now,
];
$items = array_map(static fn(array $item): array => (string) $item['id'] === $id ? $updatedRequest : $item, $items);
save_solicitacoes($solicitacoes, $items);

$updatedLaunch = null;
if ($action === 'aprovar') {
    $launches = $lancamentos->all();
    $launches = array_map(static function (array $item) use ($current, $usuario, $now, &$updatedLaunch): array {
        if ((string) $item['id'] !== (string) $current['lancamentoId']) {
            return $item;
        }
        $updatedLaunch = [
            ...$item,
            'status' => 'Reaberto',
            'homologadoPor' => '',
            'dataHomologacao' => '',
            'reabertoPor' => $usuario,
            'dataReabertura' => $now,
        ];
        return $updatedLaunch;
    }, $launches);
    save_lancamentos($lancamentos, $launches);
}

append_audit($auditoria, [
    'acao' => $action === 'aprovar' ? 'solicitacao_reabertura_aprovada' : 'solicitacao_reabertura_negada',
    'descricao' => $action === 'aprovar'
        ? 'Solicitação aprovada pelo Administrador e lançamento reaberto para edição.'
        : 'Solicitação de reabertura negada pelo Administrador.',
    'registroId' => $id,
    'valorAnterior' => $current,
    'valorNovo' => ['solicitacao' => $updatedRequest, 'lancamento' => $updatedLaunch],
    'usuario' => $usuario,
    'perfilUsuario' => $perfil,
]);

Response::json(['ok' => true, 'solicitacao' => $updatedRequest, 'lancamento' => $updatedLaunch]);
