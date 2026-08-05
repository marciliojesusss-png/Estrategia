<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/core/Database.php';

function linha($label, $ok, $detail = '')
{
    echo $label . ': ' . ($ok ? 'ok' : 'falha') . ($detail !== '' ? ' - ' . $detail : '') . PHP_EOL;
    return $ok;
}

function aviso($label, $detail = '')
{
    echo $label . ': aviso' . ($detail !== '' ? ' - ' . $detail : '') . PHP_EOL;
    return true;
}

function table_exists($db, $driver, $table)
{
    if ($driver === 'sqlsrv') {
        $stmt = $db->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = :table");
        $stmt->execute(array(':table' => $table));
        return (int) $stmt->fetchColumn() > 0;
    }

    $stmt = $db->prepare("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = :table");
    $stmt->execute(array(':table' => $table));
    return (int) $stmt->fetchColumn() > 0;
}

function object_count($db, $driver, $table)
{
    $prefix = $driver === 'sqlsrv' ? 'dbo.' : '';
    return (int) $db->query('SELECT COUNT(*) FROM ' . $prefix . $table)->fetchColumn();
}

function foreign_key_exists($db, $driver, $table, $column, $refTable, $refColumn)
{
    if ($driver === 'sqlsrv') {
        $sql = "SELECT COUNT(*)
                FROM sys.foreign_key_columns fkc
                INNER JOIN sys.tables t ON t.object_id = fkc.parent_object_id
                INNER JOIN sys.columns c ON c.object_id = t.object_id AND c.column_id = fkc.parent_column_id
                INNER JOIN sys.tables rt ON rt.object_id = fkc.referenced_object_id
                INNER JOIN sys.columns rc ON rc.object_id = rt.object_id AND rc.column_id = fkc.referenced_column_id
                WHERE t.name = :table AND c.name = :column AND rt.name = :ref_table AND rc.name = :ref_column";
        $stmt = $db->prepare($sql);
        $stmt->execute(array(':table' => $table, ':column' => $column, ':ref_table' => $refTable, ':ref_column' => $refColumn));
        return (int) $stmt->fetchColumn() > 0;
    }

    $rows = $db->query('PRAGMA foreign_key_list(' . $table . ')')->fetchAll();
    foreach ($rows as $row) {
        if ((string) $row['from'] === $column && (string) $row['table'] === $refTable && (string) $row['to'] === $refColumn) {
            return true;
        }
    }
    return false;
}

function index_exists($db, $driver, $table, $index)
{
    if ($driver === 'sqlsrv') {
        $stmt = $db->prepare("SELECT COUNT(*) FROM sys.indexes WHERE object_id = OBJECT_ID(:object) AND name = :index_name");
        $stmt->execute(array(':object' => 'dbo.' . $table, ':index_name' => $index));
        return (int) $stmt->fetchColumn() > 0;
    }

    $stmt = $db->prepare("SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND tbl_name = :table AND name = :index_name");
    $stmt->execute(array(':table' => $table, ':index_name' => $index));
    return (int) $stmt->fetchColumn() > 0;
}

function profile_exists($db, $driver, $profile)
{
    $prefix = $driver === 'sqlsrv' ? 'dbo.' : '';
    $stmt = $db->prepare('SELECT COUNT(*) FROM ' . $prefix . 'usuarios_acesso WHERE perfil = :perfil AND ativo = 1');
    $stmt->execute(array(':perfil' => $profile));
    return (int) $stmt->fetchColumn() > 0;
}

function invalid_matriculas($db, $driver)
{
    $prefix = $driver === 'sqlsrv' ? 'dbo.' : '';
    $rows = $db->query('SELECT matricula FROM ' . $prefix . 'usuarios_acesso WHERE ativo = 1')->fetchAll();
    $invalid = array();
    foreach ($rows as $row) {
        $matricula = strtoupper(trim((string) $row['matricula']));
        if (!preg_match('/^[A-Z0-9._-]{2,50}$/', $matricula)) {
            $invalid[] = $matricula;
        }
    }
    return $invalid;
}

$ok = true;

try {
    $db = Database::getConnection();
    $driver = (string) $db->getAttribute(PDO::ATTR_DRIVER_NAME);
    linha('conexao', true, 'driver=' . $driver);

    $tables = array(
        'indicadores',
        'lancamentos',
        'homologacoes',
        'solicitacoes_reabertura',
        'retificacoes',
        'evidencias',
        'auditoria',
        'configuracoes',
        'usuarios_validacao',
        'backups_importacao',
        'usuarios_acesso',
        'acessos_log',
    );
    foreach ($tables as $table) {
        $exists = table_exists($db, $driver, $table);
        $ok = linha('tabela ' . $table, $exists) && $ok;
    }

    $foreignKeys = array(
        array('lancamentos', 'indicador_id', 'indicadores', 'id'),
        array('homologacoes', 'lancamento_id', 'lancamentos', 'id'),
        array('solicitacoes_reabertura', 'lancamento_id', 'lancamentos', 'id'),
        array('retificacoes', 'lancamento_id', 'lancamentos', 'id'),
        array('evidencias', 'lancamento_id', 'lancamentos', 'id'),
    );
    foreach ($foreignKeys as $fk) {
        $exists = foreign_key_exists($db, $driver, $fk[0], $fk[1], $fk[2], $fk[3]);
        if (!$exists && $driver !== 'sqlsrv') {
            aviso('fk ' . $fk[0] . '.' . $fk[1], 'ausente no SQLite local; obrigatoria no SQL Server');
        } else {
            $ok = linha('fk ' . $fk[0] . '.' . $fk[1], $exists) && $ok;
        }
    }

    $indexes = array(
        array('lancamentos', 'idx_lancamentos_indicador_competencia'),
        array('homologacoes', 'idx_homologacoes_idempotencia'),
        array('solicitacoes_reabertura', 'idx_solicitacoes_reabertura_pendente'),
        array('retificacoes', 'idx_retificacoes_idempotencia'),
    );
    foreach ($indexes as $idx) {
        $exists = index_exists($db, $driver, $idx[0], $idx[1]);
        $ok = linha('indice ' . $idx[1], $exists) && $ok;
    }

    foreach (array('indicadores', 'lancamentos', 'usuarios_acesso', 'acessos_log') as $table) {
        linha('count ' . $table, true, (string) object_count($db, $driver, $table));
    }

    $admin = profile_exists($db, $driver, 'administrador');
    $ok = linha('administrador ativo', $admin) && $ok;

    foreach (array('administrador', 'unidade_apuradora', 'homologador', 'usuario_companhia') as $profile) {
        $exists = profile_exists($db, $driver, $profile);
        $ok = linha('perfil ' . $profile, $exists) && $ok;
    }

    $invalid = invalid_matriculas($db, $driver);
    $ok = linha('padrao de matriculas', count($invalid) === 0, count($invalid) ? implode(',', $invalid) : 'compativel') && $ok;
} catch (Exception $error) {
    $ok = false;
    linha('validacao', false, $error->getMessage());
}

exit($ok ? 0 : 1);
