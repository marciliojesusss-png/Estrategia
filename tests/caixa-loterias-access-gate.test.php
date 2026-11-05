<?php
declare(strict_types=1);

putenv('APP_ENV=local');
putenv('DB_CONNECTION=sqlsrv');
require_once __DIR__ . '/../app/auth/CaixaLoteriasAccessGate.php';

function assert_loterias_gate($condition, $message)
{
    if (!$condition) {
        fwrite(STDERR, 'FALHA: ' . $message . PHP_EOL);
        exit(1);
    }
}

final class LoteriasGateFakeStatement
{
    public $params = array();
    private $result;

    public function __construct($result)
    {
        $this->result = $result;
    }

    public function execute($params = null)
    {
        $this->params = is_array($params) ? $params : array();
        return true;
    }

    public function fetchColumn($column = 0)
    {
        return $this->result;
    }
}

final class LoteriasGateFakeConnection
{
    public $preparedSql = null;
    public $statement;
    private $error;

    public function __construct($result = 1, $error = null)
    {
        $this->statement = new LoteriasGateFakeStatement($result);
        $this->error = $error;
    }

    public function prepare($sql)
    {
        if ($this->error instanceof Throwable) {
            throw $this->error;
        }
        $this->preparedSql = $sql;
        return $this->statement;
    }
}

$active = new LoteriasGateFakeConnection(1);
assert_loterias_gate(
    CaixaLoteriasAccessGate::allows(array('unidade' => '08019'), $active, true),
    'unidade ativa deve ser autorizada'
);
assert_loterias_gate(
    isset($active->statement->params[':unidade']) && $active->statement->params[':unidade'] === 8019,
    'unidade deve ser enviada como parametro numerico, sem concatenacao SQL'
);
assert_loterias_gate(
    strpos((string) $active->preparedSql, '[BASEDB001].[dbo].[SIREDTB_Unidade_Caixa_Loterias]') !== false,
    'consulta deve usar a mesma lista corporativa do Sistema-Expedientes'
);

$inactive = new LoteriasGateFakeConnection(false);
assert_loterias_gate(
    !CaixaLoteriasAccessGate::allows(array('unidade' => '9999'), $inactive, true),
    'unidade ausente ou inativa deve ser negada'
);

$invalid = new LoteriasGateFakeConnection(1);
assert_loterias_gate(
    !CaixaLoteriasAccessGate::allows(array('unidade' => '8019 OR 1=1'), $invalid, true),
    'unidade nao numerica deve ser rejeitada antes da consulta'
);
assert_loterias_gate($invalid->preparedSql === null, 'unidade invalida nao deve chegar ao SQL Server');

$unavailable = new LoteriasGateFakeConnection(1, new RuntimeException('falha simulada'));
assert_loterias_gate(
    !CaixaLoteriasAccessGate::allows(array('unidade' => '8019'), $unavailable, true),
    'falha na fonte corporativa deve negar acesso de forma segura'
);

$disabled = new LoteriasGateFakeConnection(false);
assert_loterias_gate(
    CaixaLoteriasAccessGate::allows(array('unidade' => ''), $disabled, false),
    'barreira desabilitada em desenvolvimento nao deve consultar a fonte corporativa'
);
assert_loterias_gate($disabled->preparedSql === null, 'barreira desabilitada nao deve consultar o banco');

echo 'Testes da restricao por unidade CAIXA Loterias OK' . PHP_EOL;
