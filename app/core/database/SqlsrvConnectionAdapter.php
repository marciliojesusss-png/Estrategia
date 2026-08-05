<?php
declare(strict_types=1);

require_once __DIR__ . '/SqlsrvStatementAdapter.php';

final class SqlsrvConnectionAdapter
{
    private $connection;
    private $inTransaction = false;

    public function __construct($connection)
    {
        $this->connection = $connection;
    }

    public function nativeConnection()
    {
        return $this->connection;
    }

    public function prepare($sql, array $options = array())
    {
        return new SqlsrvStatementAdapter($this, (string) $sql, $options);
    }

    public function query($sql)
    {
        $statement = new SqlsrvStatementAdapter($this, (string) $sql);
        $statement->execute();
        return $statement;
    }

    public function exec($sql)
    {
        $statement = $this->query($sql);
        return $statement->rowCount();
    }

    public function beginTransaction()
    {
        if ($this->inTransaction) {
            return false;
        }
        if (!function_exists('sqlsrv_begin_transaction') || !sqlsrv_begin_transaction($this->connection)) {
            throw new RuntimeException('SQLSRV_TRANSACAO_INICIAR_FALHOU: ' . self::lastError());
        }
        $this->inTransaction = true;
        return true;
    }

    public function commit()
    {
        if (!$this->inTransaction) {
            return false;
        }
        if (!function_exists('sqlsrv_commit') || !sqlsrv_commit($this->connection)) {
            throw new RuntimeException('SQLSRV_TRANSACAO_COMMIT_FALHOU: ' . self::lastError());
        }
        $this->inTransaction = false;
        return true;
    }

    public function rollBack()
    {
        if (!$this->inTransaction) {
            return false;
        }
        if (!function_exists('sqlsrv_rollback') || !sqlsrv_rollback($this->connection)) {
            throw new RuntimeException('SQLSRV_TRANSACAO_ROLLBACK_FALHOU: ' . self::lastError());
        }
        $this->inTransaction = false;
        return true;
    }

    public function inTransaction()
    {
        return $this->inTransaction;
    }

    public function getAttribute($attribute)
    {
        if ((int) $attribute === PDO::ATTR_DRIVER_NAME) {
            return 'sqlsrv';
        }
        return null;
    }

    public function lastInsertId($name = null)
    {
        return (string) $this->query('SELECT SCOPE_IDENTITY()')->fetchColumn();
    }

    public static function lastError()
    {
        if (!function_exists('sqlsrv_errors')) {
            return 'extensao sqlsrv indisponivel';
        }

        $flag = defined('SQLSRV_ERR_ERRORS') ? constant('SQLSRV_ERR_ERRORS') : null;
        $errors = $flag === null ? sqlsrv_errors() : sqlsrv_errors($flag);
        if (!is_array($errors) || !$errors) {
            return 'erro sqlsrv nao informado';
        }

        $messages = array();
        foreach ($errors as $error) {
            $code = isset($error['code']) ? (string) $error['code'] : '';
            $message = isset($error['message']) ? (string) $error['message'] : 'erro sqlsrv';
            $messages[] = trim($code . ' ' . preg_replace('/\s+/', ' ', $message));
        }
        return implode(' | ', $messages);
    }
}
