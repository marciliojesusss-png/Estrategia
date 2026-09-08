<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/core/Database.php';

function linha($label, $ok, $detail = '')
{
    echo $label . ': ' . ($ok ? 'ok' : 'falha') . ($detail !== '' ? ' - ' . $detail : '') . PHP_EOL;
    return $ok;
}

function table_exists($db, $table)
{
    $stmt = $db->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = :table");
    $stmt->execute(array(':table' => $table));
    return (int) $stmt->fetchColumn() > 0;
}

function object_count($db, $table)
{
    return (int) $db->query('SELECT COUNT(*) FROM dbo.' . $table)->fetchColumn();
}

function foreign_key_exists($db, $table, $column, $refTable, $refColumn)
{
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

function index_exists($db, $table, $index)
{
    $stmt = $db->prepare("SELECT COUNT(*) FROM sys.indexes WHERE object_id = OBJECT_ID(:object) AND name = :index_name");
    $stmt->execute(array(':object' => 'dbo.' . $table, ':index_name' => $index));
    return (int) $stmt->fetchColumn() > 0;
}

function profile_exists($db, $profile)
{
    $stmt = $db->prepare('SELECT COUNT(*) FROM dbo.usuarios_acesso WHERE perfil = :perfil AND ativo = 1');
    $stmt->execute(array(':perfil' => $profile));
    return (int) $stmt->fetchColumn() > 0;
}

$ok = true;
try {
    $db = Database::getConnection();
    $driver = (string) $db->getAttribute(PDO::ATTR_DRIVER_NAME);
    $ok = linha('conexao SQL Server', $driver === 'sqlsrv', 'driver=' . $driver) && $ok;

    $tables = array(
        'indicadores', 'lancamentos', 'homologacoes', 'solicitacoes_reabertura',
        'retificacoes', 'evidencias', 'auditoria', 'configuracoes',
        'usuarios_validacao', 'backups_importacao', 'usuarios_acesso',
        'acessos_log', 'prazos_apuracao',
    );
    foreach ($tables as $table) {
        $ok = linha('tabela ' . $table, table_exists($db, $table)) && $ok;
    }

    $foreignKeys = array(
        array('lancamentos', 'indicador_id', 'indicadores', 'id'),
        array('homologacoes', 'lancamento_id', 'lancamentos', 'id'),
        array('solicitacoes_reabertura', 'lancamento_id', 'lancamentos', 'id'),
        array('retificacoes', 'lancamento_id', 'lancamentos', 'id'),
        array('evidencias', 'lancamento_id', 'lancamentos', 'id'),
    );
    foreach ($foreignKeys as $fk) {
        $ok = linha('fk ' . $fk[0] . '.' . $fk[1], foreign_key_exists($db, $fk[0], $fk[1], $fk[2], $fk[3])) && $ok;
    }

    $indexes = array(
        array('lancamentos', 'idx_lancamentos_indicador_competencia'),
        array('homologacoes', 'idx_homologacoes_idempotencia'),
        array('solicitacoes_reabertura', 'idx_solicitacoes_reabertura_pendente'),
        array('retificacoes', 'idx_retificacoes_idempotencia'),
    );
    foreach ($indexes as $idx) {
        $ok = linha('indice ' . $idx[1], index_exists($db, $idx[0], $idx[1])) && $ok;
    }

    foreach (array('indicadores', 'lancamentos', 'usuarios_acesso', 'acessos_log') as $table) {
        linha('count ' . $table, true, (string) object_count($db, $table));
    }
    $ok = linha('administrador ativo', profile_exists($db, 'administrador')) && $ok;
} catch (Exception $error) {
    $ok = false;
    linha('validacao', false, $error->getMessage());
}

exit($ok ? 0 : 1);
