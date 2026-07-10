<?php
declare(strict_types=1);

final class CorporateIdentity
{
    public static function load($ldapPath)
    {
        if (!is_file($ldapPath)) return null;
        $dados = array();
        require $ldapPath;
        if (!is_array($dados)) return null;
        $matricula = isset($dados['matricula']) ? strtoupper(trim((string) $dados['matricula'])) : '';
        if ($matricula === '' || !preg_match('/^[A-Z0-9._-]{2,50}$/', $matricula)) return null;
        return array(
            'matricula' => $matricula,
            'nome' => isset($dados['nome']) ? (string) $dados['nome'] : $matricula,
            'funcao' => isset($dados['funcao']) ? (string) $dados['funcao'] : '',
            'unidade' => isset($dados['unidade']) ? (string) $dados['unidade'] : '',
            'sg_unidade' => isset($dados['sg_unidade']) ? (string) $dados['sg_unidade'] : '',
            'no_unidade' => isset($dados['no_unidade']) ? (string) $dados['no_unidade'] : '',
        );
    }
}
