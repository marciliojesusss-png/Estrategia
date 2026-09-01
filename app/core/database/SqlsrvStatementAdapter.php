<?php
declare(strict_types=1);

final class SqlsrvStatementAdapter
{
    private $connection;
    private $sql;
    private $placeholderOrder = array();
    private $boundValues = array();
    private $statement = null;
    private $params = array();
    private $rowsAffected = 0;
    private $options = array();

    public function __construct(SqlsrvConnectionAdapter $connection, $sql, array $options = array())
    {
        $this->connection = $connection;
        $parsed = self::replaceNamedPlaceholders((string) $sql);
        $this->sql = $parsed['sql'];
        $this->placeholderOrder = $parsed['order'];
        $this->options = $options;
    }

    public function execute($params = null)
    {
        if (is_array($params)) {
            foreach ($params as $key => $value) {
                $this->boundValues[self::normalizeParam($key)] = $value;
            }
        }

        $this->params = $this->orderedParams();
        $refs = array();
        foreach ($this->params as $key => &$value) {
            $refs[$key] = &$value;
        }

        $options = $this->options;
        // Cursor client-buffered é útil para leitura, mas interfere em
        // sqlsrv_rows_affected() quando aplicado a comandos de gravação.
        if (!$options && preg_match('/^\s*SELECT\b/i', $this->sql) && defined('SQLSRV_CURSOR_CLIENT_BUFFERED')) {
            $options = array('Scrollable' => constant('SQLSRV_CURSOR_CLIENT_BUFFERED'));
        }

        if (!function_exists('sqlsrv_prepare')) {
            throw new RuntimeException('SQLSRV_INDISPONIVEL: extensao sqlsrv nao esta instalada no PHP.');
        }

        $this->statement = $options
            ? sqlsrv_prepare($this->connection->nativeConnection(), $this->sql, $refs, $options)
            : sqlsrv_prepare($this->connection->nativeConnection(), $this->sql, $refs);

        if ($this->statement === false) {
            throw new RuntimeException('SQLSRV_PREPARE_FALHOU: ' . SqlsrvConnectionAdapter::lastError());
        }
        if (!sqlsrv_execute($this->statement)) {
            throw new RuntimeException('SQLSRV_EXECUTE_FALHOU: ' . SqlsrvConnectionAdapter::lastError());
        }

        $affected = function_exists('sqlsrv_rows_affected') ? sqlsrv_rows_affected($this->statement) : false;
        $this->rowsAffected = is_int($affected) && $affected > 0 ? $affected : 0;

        return true;
    }

    public function bindValue($param, $value, $type = null)
    {
        $this->boundValues[self::normalizeParam($param)] = $value;
        return true;
    }

    public function fetch($mode = null)
    {
        $this->ensureExecuted();
        $fetchMode = defined('SQLSRV_FETCH_ASSOC') ? constant('SQLSRV_FETCH_ASSOC') : 2;
        $row = sqlsrv_fetch_array($this->statement, $fetchMode);
        return is_array($row) ? self::normalizeRow($row) : false;
    }

    public function fetchAll($mode = null)
    {
        $rows = array();
        while (($row = $this->fetch($mode)) !== false) {
            $rows[] = $row;
        }
        return $rows;
    }

    public function fetchColumn($column = 0)
    {
        $this->ensureExecuted();
        $fetchMode = defined('SQLSRV_FETCH_BOTH') ? constant('SQLSRV_FETCH_BOTH') : 3;
        $row = sqlsrv_fetch_array($this->statement, $fetchMode);
        if (!is_array($row) || !array_key_exists($column, $row)) {
            return false;
        }
        return self::normalizeValue($row[$column]);
    }

    public function rowCount()
    {
        return $this->rowsAffected;
    }

    public function closeCursor()
    {
        if ($this->statement !== null && function_exists('sqlsrv_free_stmt')) {
            sqlsrv_free_stmt($this->statement);
        }
        $this->statement = null;
        return true;
    }

    private function ensureExecuted()
    {
        if ($this->statement === null) {
            $this->execute();
        }
    }

    private function orderedParams()
    {
        if (!$this->placeholderOrder) {
            return array_values($this->boundValues);
        }

        $params = array();
        foreach ($this->placeholderOrder as $name) {
            $key = self::normalizeParam($name);
            $params[] = array_key_exists($key, $this->boundValues) ? $this->boundValues[$key] : null;
        }
        return $params;
    }

    private static function replaceNamedPlaceholders($sql)
    {
        $length = strlen($sql);
        $result = '';
        $order = array();
        $quote = null;

        for ($index = 0; $index < $length; $index++) {
            $char = $sql[$index];
            if ($quote !== null) {
                $result .= $char;
                if ($char === $quote) {
                    if ($index + 1 < $length && $sql[$index + 1] === $quote) {
                        $result .= $sql[++$index];
                    } else {
                        $quote = null;
                    }
                }
                continue;
            }

            if ($char === "'" || $char === '"') {
                $quote = $char;
                $result .= $char;
                continue;
            }

            if ($char === ':' && $index + 1 < $length && preg_match('/[A-Za-z_]/', $sql[$index + 1])) {
                $name = ':';
                $index++;
                while ($index < $length && preg_match('/[A-Za-z0-9_]/', $sql[$index])) {
                    $name .= $sql[$index];
                    $index++;
                }
                $index--;
                $order[] = $name;
                $result .= '?';
                continue;
            }

            $result .= $char;
        }

        return array('sql' => $result, 'order' => $order);
    }

    private static function normalizeParam($param)
    {
        if (is_int($param)) {
            return (string) $param;
        }
        $param = (string) $param;
        return $param !== '' && $param[0] === ':' ? $param : ':' . $param;
    }

    private static function normalizeRow(array $row)
    {
        foreach ($row as $key => $value) {
            $row[$key] = self::normalizeValue($value);
        }
        return $row;
    }

    private static function normalizeValue($value)
    {
        return $value instanceof DateTimeInterface ? $value->format('c') : $value;
    }
}
