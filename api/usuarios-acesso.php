<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

Auth::requireApiProfiles(['administrador']);

$db = Database::getConnection();
$method = Request::method();

function usuarios_acesso_driver(PDO $db): string
{
    return (string) $db->getAttribute(PDO::ATTR_DRIVER_NAME);
}

function usuarios_acesso_now(PDO $db): string
{
    return usuarios_acesso_driver($db) === 'sqlsrv'
        ? date('Y-m-d H:i:s')
        : date('Y-m-d H:i:s');
}

function usuarios_acesso_normalize_profile(string $profile): string
{
    return Auth::normalizeProfile($profile);
}

function usuarios_acesso_bool($value)
{
    if (is_bool($value)) {
        return $value ? 1 : 0;
    }
    if (is_numeric($value)) {
        return ((int) $value) === 1 ? 1 : 0;
    }
    return in_array(strtolower(trim((string) $value)), ['1', 'true', 'sim', 'yes', 'ativo'], true) ? 1 : 0;
}

function usuarios_acesso_table(): string
{
    return 'usuarios_acesso';
}

function usuarios_acesso_storage(PDO $db): array
{
    $driver = usuarios_acesso_driver($db);
    return [
        'driver' => $driver,
        'label' => $driver === 'sqlsrv' ? 'SQL Server' : 'SQLite local',
        'database' => $driver === 'sqlsrv' ? SQLSERVER_DATABASE : DB_PATH,
    ];
}

function usuarios_acesso_map(array $row): array
{
    return [
        'id' => (int) ($row['id'] ?? 0),
        'matricula' => (string) ($row['matricula'] ?? ''),
        'nome' => (string) ($row['nome'] ?? ''),
        'email' => (string) ($row['email'] ?? ''),
        'sgUnidade' => (string) ($row['sg_unidade'] ?? ''),
        'noUnidade' => (string) ($row['no_unidade'] ?? ''),
        'perfil' => (string) ($row['perfil'] ?? ''),
        'unidadeApuradora' => (string) ($row['unidade_apuradora'] ?? ''),
        'diretoriaResponsavel' => (string) ($row['diretoria_responsavel'] ?? ''),
        'ativo' => (bool) ($row['ativo'] ?? false),
        'createdAt' => (string) ($row['created_at'] ?? ''),
        'updatedAt' => (string) ($row['updated_at'] ?? ''),
    ];
}

function usuarios_acesso_list(PDO $db): array
{
    $stmt = $db->query(
        'SELECT id, matricula, nome, email, sg_unidade, no_unidade, perfil, unidade_apuradora, diretoria_responsavel, ativo, created_at, updated_at
         FROM ' . usuarios_acesso_table() . '
         ORDER BY ativo DESC, nome ASC, matricula ASC'
    );
    return array_map('usuarios_acesso_map', $stmt->fetchAll());
}

function usuarios_acesso_validate(array $payload): array
{
    $matricula = strtoupper(trim((string) ($payload['matricula'] ?? '')));
    $nome = trim((string) ($payload['nome'] ?? ''));
    $perfil = usuarios_acesso_normalize_profile((string) ($payload['perfil'] ?? ''));

    if ($matricula === '') {
        throw new InvalidArgumentException('Informe a matricula.');
    }
    if ($nome === '') {
        throw new InvalidArgumentException('Informe o nome.');
    }

    return [
        'matricula' => $matricula,
        'nome' => $nome,
        'email' => trim((string) ($payload['email'] ?? '')),
        'sg_unidade' => strtoupper(trim((string) ($payload['sgUnidade'] ?? $payload['sg_unidade'] ?? ''))),
        'no_unidade' => trim((string) ($payload['noUnidade'] ?? $payload['no_unidade'] ?? '')),
        'perfil' => $perfil,
        'unidade_apuradora' => strtoupper(trim((string) ($payload['unidadeApuradora'] ?? $payload['unidade_apuradora'] ?? ''))),
        'diretoria_responsavel' => strtoupper(trim((string) ($payload['diretoriaResponsavel'] ?? $payload['diretoria_responsavel'] ?? ''))),
        'ativo' => usuarios_acesso_bool($payload['ativo'] ?? true),
    ];
}

function usuarios_acesso_params(array $record): array
{
    return [
        ':matricula' => $record['matricula'],
        ':nome' => $record['nome'],
        ':email' => $record['email'],
        ':sg_unidade' => $record['sg_unidade'],
        ':no_unidade' => $record['no_unidade'],
        ':perfil' => $record['perfil'],
        ':unidade_apuradora' => $record['unidade_apuradora'],
        ':diretoria_responsavel' => $record['diretoria_responsavel'],
        ':ativo' => $record['ativo'],
    ];
}

try {
    if ($method === 'GET') {
        Response::json([
            'ok' => true,
            'storage' => usuarios_acesso_storage($db),
            'usuarios' => usuarios_acesso_list($db),
        ]);
        return;
    }

    if ($method === 'POST' || $method === 'PUT') {
        $payload = Request::json();
        $id = (int) ($payload['id'] ?? 0);
        $record = usuarios_acesso_validate($payload);
        $now = usuarios_acesso_now($db);

        if ($id > 0) {
            $stmt = $db->prepare(
                'UPDATE ' . usuarios_acesso_table() . '
                 SET matricula = :matricula,
                     nome = :nome,
                     email = :email,
                     sg_unidade = :sg_unidade,
                     no_unidade = :no_unidade,
                     perfil = :perfil,
                     unidade_apuradora = :unidade_apuradora,
                     diretoria_responsavel = :diretoria_responsavel,
                     ativo = :ativo,
                     updated_at = :updated_at
                 WHERE id = :id'
            );
            $stmt->execute(array_merge(usuarios_acesso_params($record), array(':updated_at' => $now, ':id' => $id)));
        } else {
            $stmt = $db->prepare(
                'INSERT INTO ' . usuarios_acesso_table() . '
                 (matricula, nome, email, sg_unidade, no_unidade, perfil, unidade_apuradora, diretoria_responsavel, ativo, created_at, updated_at)
                 VALUES (:matricula, :nome, :email, :sg_unidade, :no_unidade, :perfil, :unidade_apuradora, :diretoria_responsavel, :ativo, :created_at, :updated_at)'
            );
            $stmt->execute(array_merge(usuarios_acesso_params($record), array(':created_at' => $now, ':updated_at' => $now)));
        }

        Response::json([
            'ok' => true,
            'storage' => usuarios_acesso_storage($db),
            'usuarios' => usuarios_acesso_list($db),
        ]);
        return;
    }

    Response::error('Metodo nao permitido.', 405);
} catch (InvalidArgumentException $error) {
    Response::error($error->getMessage(), 400);
} catch (PDOException $error) {
    $message = $error->getMessage();
    if (str_contains($message, 'UNIQUE') || str_contains($message, 'duplicate') || str_contains($message, 'duplicada')) {
        Response::error('Ja existe um acesso cadastrado para essa matricula.', 409);
        return;
    }
    throw $error;
}
