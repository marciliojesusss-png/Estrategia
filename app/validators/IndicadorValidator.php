<?php
declare(strict_types=1);

final class IndicadorValidator
{
    public function validate(array $input)
    {
        $data = array(
            'numero' => isset($input['numero']) ? (int) $input['numero'] : 0,
            'nome' => $this->text($input, array('nome', 'indicador')),
            'plano' => $this->text($input, array('plano')),
            'pilar' => $this->text($input, array('pilar')),
            'unidade_apuradora' => $this->text($input, array('unidade_apuradora', 'unidadeApuradora')),
            'diretoria_responsavel' => $this->text($input, array('diretoria_responsavel', 'diretoriaResponsavel')),
            'periodicidade' => $this->text($input, array('periodicidade')),
            'unidade_medida' => $this->text($input, array('unidade_medida', 'unidadeMedida')),
            'tipo_calculo' => $this->text($input, array('tipo_calculo', 'tipoCalculo')),
            'tipo_consolidacao' => $this->text($input, array('tipo_consolidacao', 'tipoConsolidacao')),
            'meta_anual' => $this->text($input, array('meta_anual', 'metaAnualDescricao')),
            'formula_referencia' => $this->text($input, array('formula_referencia', 'metrica')),
            'observacao_acompanhamento' => $this->text($input, array('observacao_acompanhamento', 'observacaoAcompanhamento')),
            'ativo' => !isset($input['ativo']) || filter_var($input['ativo'], FILTER_VALIDATE_BOOLEAN),
        );
        $errors = array();
        if ($data['numero'] < 1) $errors['numero'] = 'Informe um numero inteiro maior que zero.';
        if ($data['nome'] === '') $errors['nome'] = 'Informe o nome do indicador.';
        elseif ($this->length($data['nome']) > 255) $errors['nome'] = 'O nome deve possuir no maximo 255 caracteres.';
        if ($data['plano'] === '') $errors['plano'] = 'Informe o plano.';
        if ($data['pilar'] === '') $errors['pilar'] = 'Informe o pilar.';
        foreach (array('plano', 'pilar', 'unidade_apuradora', 'diretoria_responsavel') as $field) {
            if ($this->length($data[$field]) > 255) $errors[$field] = 'O campo deve possuir no maximo 255 caracteres.';
        }
        foreach (array('periodicidade', 'unidade_medida', 'tipo_calculo', 'tipo_consolidacao') as $field) {
            if ($this->length($data[$field]) > 100) $errors[$field] = 'O campo deve possuir no maximo 100 caracteres.';
        }
        return array('valid' => !$errors, 'data' => $data, 'errors' => $errors);
    }

    private function text(array $input, array $keys)
    {
        foreach ($keys as $key) if (isset($input[$key]) && is_scalar($input[$key])) return trim((string) $input[$key]);
        return '';
    }

    private function length($value)
    {
        return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
    }
}
