<?php
declare(strict_types=1);

final class SituacaoService
{
    public static function normalizar($situacao)
    {
        if ($situacao === null) {
            return null;
        }
        $valor = strtolower(trim($situacao));
        $valor = str_replace('í', 'i', $valor);
        if ($valor === 'critico' || $valor === 'nao atingido') {
            return 'Abaixo da meta';
        }
        if ($valor === 'atingida') {
            return 'Atingido';
        }
        return $situacao;
    }
}
