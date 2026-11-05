<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/Logger.php';

/**
 * Restringe o acesso corporativo aos empregados lotados em uma unidade ativa
 * da CAIXA Loterias, conforme a mesma fonte usada pelo Sistema-Expedientes.
 */
final class CaixaLoteriasAccessGate
{
    const SOURCE = '[BASEDB001].[dbo].[SIREDTB_Unidade_Caixa_Loterias]';

    /**
     * O parametro $required existe para permitir testes isolados. No fluxo da
     * aplicacao, a obrigatoriedade sempre vem da configuracao do ambiente.
     */
    public static function allows(array $identity, $connection = null, $required = null)
    {
        $required = $required === null ? AUTH_REQUIRE_CAIXA_LOTERIAS_UNIT : (bool) $required;
        if (!$required) {
            return true;
        }

        $unit = self::normalizeUnit(isset($identity['unidade']) ? $identity['unidade'] : null);
        if ($unit === null) {
            Logger::info('[AUTH] Acesso negado: identidade sem unidade corporativa numerica valida.');
            return false;
        }

        try {
            $database = $connection !== null ? $connection : Database::getConnection();
            $statement = $database->prepare(
                'SELECT TOP 1 1 AS permitido '
                . 'FROM ' . self::SOURCE . ' '
                . 'WHERE [NU_Unidade] = :unidade AND [IC_Ativo] = 1'
            );
            $statement->execute(array(':unidade' => (int) $unit));
            $allowed = $statement->fetchColumn() !== false;
        } catch (Throwable $error) {
            Logger::error('[AUTH] Falha ao consultar unidades ativas da CAIXA Loterias.', array(
                'tipo' => get_class($error),
            ));
            return false;
        }

        if (!$allowed) {
            Logger::info('[AUTH] Acesso negado: unidade nao pertence a lista ativa da CAIXA Loterias.', array(
                'unidade' => $unit,
            ));
        }

        return $allowed;
    }

    public static function normalizeUnit($value)
    {
        $value = trim((string) $value);
        if (!preg_match('/^\d{1,10}$/', $value)) {
            return null;
        }

        $number = (int) $value;
        return $number > 0 && $number <= 2147483647 ? (string) $number : null;
    }
}
