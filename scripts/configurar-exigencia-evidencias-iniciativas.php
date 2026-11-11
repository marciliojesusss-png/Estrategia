<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/core/Database.php';
require_once __DIR__ . '/../app/repositories/IniciativasRepository.php';
require_once __DIR__ . '/../app/repositories/AuditoriaRepository.php';
require_once __DIR__ . '/../app/services/GovernancaHomologacao.php';

const INITIATIVE_EVIDENCE_ACTOR = 'C118119';

set_exception_handler(static function (Throwable $error): void {
    fwrite(STDERR, get_class($error) . ': ' . $error->getMessage() . PHP_EOL);
    exit(1);
});

function evidenceArgumentValue(array $arguments, string $name, ?string $default = null): ?string
{
    $prefix = '--' . $name . '=';
    foreach ($arguments as $argument) {
        if (strpos($argument, $prefix) === 0) return substr($argument, strlen($prefix));
    }
    return $default;
}

function evidenceMasterUpdateData(array $master, bool $required): array
{
    return array(
        'plano' => $master['plano'],
        'pilar' => $master['pilar'],
        'titulo_executivo' => $master['tituloExecutivo'],
        'descricao_oficial' => $master['descricaoOficial'],
        'objetivo' => $master['objetivo'],
        'unidade_responsavel' => $master['unidadeResponsavel'],
        'diretoria_responsavel' => $master['diretoriaResponsavel'],
        'previsao_conclusao' => $master['previsaoConclusao'],
        'exige_evidencia' => $required,
    );
}

if (function_exists('sqlsrv_configure')) {
    sqlsrv_configure('WarningsReturnAsErrors', 0);
}

$mode = strtolower((string) evidenceArgumentValue($argv, 'mode', 'disable'));
if (!in_array($mode, array('disable', 'enable'), true)) {
    throw new InvalidArgumentException('Use --mode=disable ou --mode=enable.');
}
$required = $mode === 'enable';
$apply = in_array('--apply', $argv, true);
$expectedConfirmation = $required
    ? 'REATIVAR-EVIDENCIAS-INICIATIVAS'
    : 'DESATIVAR-EVIDENCIAS-INICIATIVAS';

$db = Database::getConnection();
$userStatement = $db->prepare(
    'SELECT TOP 1 matricula,perfil,ativo FROM dbo.usuarios_acesso WHERE UPPER(matricula)=UPPER(:matricula)'
);
$userStatement->execute(array(':matricula' => INITIATIVE_EVIDENCE_ACTOR));
$actor = $userStatement->fetch();
if (!$actor || empty($actor['ativo'])
    || GovernancaHomologacao::normalizeProfile($actor['perfil'] ?? '') !== 'administrador') {
    throw new RuntimeException('C118119 precisa estar ativo com perfil administrador.');
}

$targetStatement = $db->query(
    'SELECT id,codigo FROM dbo.iniciativas_estrategicas WHERE ativo=1 AND exige_evidencia='
    . ($required ? '0' : '1') . ' ORDER BY codigo'
);
$targets = $targetStatement->fetchAll();
$summary = array(
    'modo' => $apply ? 'apply' : 'dry-run',
    'operacao' => $required ? 'reativar' : 'desativar',
    'administrador' => INITIATIVE_EVIDENCE_ACTOR,
    'iniciativasAfetadas' => count($targets),
    'codigos' => array_map(static function (array $row): string {
        return (string) $row['codigo'];
    }, $targets),
    'exigenciaAposOperacao' => $required,
);

if ($apply) {
    if (evidenceArgumentValue($argv, 'confirm') !== $expectedConfirmation) {
        throw new RuntimeException('Confirmacao invalida; nenhuma alteracao foi aplicada.');
    }
    if (!$targets) {
        throw new RuntimeException('Nenhuma iniciativa ativa precisa ser alterada.');
    }

    $initiatives = new IniciativasRepository($db);
    $audits = new AuditoriaRepository($db);
    $db->beginTransaction();
    try {
        foreach ($targets as $target) {
            $before = $initiatives->findForUpdate($target['id']);
            if (!$before || (bool) $before['exigeEvidencia'] === $required) {
                throw new RuntimeException('O cadastro mudou durante a operacao: ' . (string) $target['codigo']);
            }
            $after = $initiatives->update(
                $before['id'],
                evidenceMasterUpdateData($before, $required)
            );
            $audits->append(array(
                'entidade' => 'iniciativas_estrategicas',
                'registroId' => $before['id'],
                'acao' => $required
                    ? 'exigencia_evidencia_iniciativa_reativada'
                    : 'exigencia_evidencia_iniciativa_desativada',
                'descricao' => $required
                    ? 'Exigencia de evidencia reativada administrativamente.'
                    : 'Exigencia de evidencia desativada temporariamente por decisao administrativa.',
                'valorAnterior' => $before,
                'valorNovo' => $after,
                'usuario' => INITIATIVE_EVIDENCE_ACTOR,
                'perfilUsuario' => 'Administrador',
            ));
        }

        $remaining = (int) $db->query(
            'SELECT COUNT(*) FROM dbo.iniciativas_estrategicas WHERE ativo=1 AND exige_evidencia='
            . ($required ? '0' : '1')
        )->fetchColumn();
        if ($remaining !== 0) {
            throw new RuntimeException('Verificacao final divergente; operacao revertida.');
        }
        $db->commit();
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
    $summary['alteracoesAplicadas'] = count($targets);
}

echo json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), PHP_EOL;
