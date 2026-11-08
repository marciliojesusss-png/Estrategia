<?php
declare(strict_types=1);

require_once __DIR__ . '/SituacaoService.php';
require_once __DIR__ . '/OfertasPersonalizadasCalculator.php';
require_once __DIR__ . '/RazaoCanaisDigitaisCalculator.php';
require_once __DIR__ . '/RazaoPixCalculator.php';

/** Motor deterministico usado como barreira antes da homologacao. */
final class CalculoIndicadoresService
{
    public const FORMULA_VERSION = '2026.11.08.1';

    public function normalizarSituacao($situacao)
    {
        return SituacaoService::normalizar($situacao);
    }

    public function validar(array $indicador, array $regra, array $lancamento, array $historico): array
    {
        try {
            $projecao = $this->projetar($indicador, $regra, $lancamento, $historico);
        } catch (Throwable $error) {
            return array(
                'valido' => false, 'cobertura' => true,
                'versaoFormula' => self::FORMULA_VERSION,
                'mensagem' => $error->getMessage(),
                'divergencias' => array(), 'projecao' => null,
            );
        }
        if ($projecao === null) {
            return array(
                'valido' => true, 'cobertura' => false,
                'versaoFormula' => self::FORMULA_VERSION,
                'mensagem' => 'Indicador ainda sem calculador PHP equivalente; a posicao persistida sera congelada no snapshot.',
                'divergencias' => array(), 'projecao' => $this->persistido($lancamento),
            );
        }
        $persistido = $this->persistido($lancamento);
        $divergencias = array();
        foreach (array(
            'meta_oficial' => 'meta',
            'resultado_calculado' => 'resultado calculado',
            'resultado_oficial' => 'resultado oficial',
            'percentual_atingido' => 'atingimento',
        ) as $campo => $rotulo) {
            if (!$this->mesmoNumero($persistido[$campo], $projecao[$campo], (int) ($indicador['id'] ?? 0))) {
                $divergencias[] = array(
                    'campo' => $campo, 'rotulo' => $rotulo,
                    'persistido' => $persistido[$campo], 'recalculado' => $projecao[$campo],
                );
            }
        }
        if ($this->normalizarSituacao($persistido['situacao']) !== $this->normalizarSituacao($projecao['situacao'])) {
            $divergencias[] = array(
                'campo' => 'situacao', 'rotulo' => 'situacao',
                'persistido' => $persistido['situacao'], 'recalculado' => $projecao['situacao'],
            );
        }
        return array(
            'valido' => !$divergencias, 'cobertura' => true,
            'versaoFormula' => self::FORMULA_VERSION,
            'mensagem' => $divergencias
                ? 'Os valores persistidos divergem do calculo oficial. Salve novamente o lancamento antes de homologar.'
                : 'Valores conferidos pelo calculador oficial do backend.',
            'divergencias' => $divergencias, 'projecao' => $projecao,
        );
    }

    public function calcular(array $indicador, array $regra, array $lancamento, array $historico): ?array
    {
        return $this->projetar($indicador, $regra, $lancamento, $historico);
    }

    public function snapshot(array $validacao, array $lancamento, array $usuario): array
    {
        $projecao = $validacao['projecao'];
        return array(
            'lancamentoId' => (string) $lancamento['id'],
            'versaoLancamento' => max(1, (int) ($lancamento['versaoAtual'] ?? 1)),
            'indicadorId' => (string) $lancamento['indicadorId'],
            'competencia' => (string) $lancamento['competencia'],
            'metaOficial' => $projecao['meta_oficial'],
            'resultadoCalculado' => $projecao['resultado_calculado'],
            'resultadoOficial' => $projecao['resultado_oficial'],
            'percentualAtingido' => $projecao['percentual_atingido'],
            'situacao' => $projecao['situacao'],
            'origemResultado' => $projecao['origem_resultado'],
            'versaoFormula' => self::FORMULA_VERSION,
            'detalhes' => array(
                'coberturaCalculador' => (bool) $validacao['cobertura'],
                'divergenciasConferidas' => $validacao['divergencias'],
            ),
            'homologadoPor' => (string) $usuario['matricula'],
            'homologadoEm' => date('c'),
        );
    }

    private function projetar(array $indicador, array $regra, array $atual, array $historico): ?array
    {
        $id = (int) ($indicador['id'] ?? 0);
        $tipo = (string) ($regra['tipoCalculo'] ?? $indicador['tipoCalculo'] ?? '');
        $parametros = isset($regra['parametrosCalculo']) && is_array($regra['parametrosCalculo'])
            ? $regra['parametrosCalculo'] : array();
        $meta = $this->metaCompetencia($regra, $atual);
        $derivado = null;
        if ($id === 1) {
            $derivado = OfertasPersonalizadasCalculator::calculate($atual, $meta ?? 0.10);
        } elseif ($tipo === 'razao_canais_digitais') {
            $derivado = RazaoCanaisDigitaisCalculator::calculate($atual, $historico, $meta);
        } elseif ($tipo === 'razao_pix') {
            $derivado = RazaoPixCalculator::calculate($atual, $parametros, $meta);
        } elseif ($tipo === 'melhorias_acumuladas') {
            $derivado = $this->melhorias($regra, $atual, $historico);
        } elseif ($tipo === 'indice_inverso' && $id === 6) {
            $derivado = $this->ieo($atual);
        } elseif ($tipo === 'lucro_recorrente_mensal') {
            $derivado = $this->lucroRecorrente($regra, $atual, $historico);
        } elseif ($tipo === 'marco_projeto_percentual' && $id === 11) {
            $derivado = $this->marcoProjeto($regra, $atual);
        } elseif ($tipo === 'iniciativas_apoiadas') {
            $derivado = $this->iniciativas($regra, $atual, $historico);
        } elseif ($tipo === 'valor_financeiro_acumulado' && $id === 17) {
            $derivado = $this->valorFinanceiro($regra, $atual);
        } elseif ($tipo === 'execucao_acoes_propostas') {
            $derivado = $this->acoesPropostas($regra, $atual, $historico);
        }
        if ($derivado === null && in_array($tipo, array('razao_canais_digitais','razao_pix'), true)) {
            throw new DomainException('Componentes obrigatorios ausentes para o calculo oficial.');
        }
        if ($derivado === null) return null;
        if (!array_key_exists('meta_oficial', $derivado) && array_key_exists('meta_referencia', $derivado)) {
            $derivado['meta_oficial'] = $derivado['meta_referencia'];
        }
        if ($id === 1 && !in_array((int) $atual['mes'], $parametros['mesesFechamentoTrimestral'] ?? array(3,6,9,12), true)
            && $derivado['resultado_calculado'] !== null) {
            $derivado['situacao'] = 'Em acompanhamento';
        }
        $derivado['origem_resultado'] = 'calculado_backend';
        return $derivado;
    }

    private function melhorias(array $regra, array $atual, array $historico): array
    {
        $params = $regra['parametrosCalculo'] ?? array();
        $total = $this->numero($params['totalMelhoriasPlano2026'] ?? null);
        if (!$total) throw new DomainException('Base total de melhorias nao configurada.');
        $curva = $params['curvaTrimestralAcumulada'][$this->trimestre($atual)] ?? array();
        $metaQuantidade = $this->numero($curva['metaQuantidadeAcumulada'] ?? null);
        $meta = $metaQuantidade === null
            ? $this->numero($curva['metaPercentual'] ?? null)
            : $metaQuantidade / $total;
        if (!in_array((int) $atual['mes'], array(3, 6, 9, 12), true)) {
            return $this->resultado(null, null, $meta, null, 'Em acompanhamento');
        }
        $acumulado = 0.0;
        foreach ($this->ateCompetencia($atual, $historico) as $item) {
            if (!in_array((int) $item['mes'], array(3, 6, 9, 12), true)) continue;
            $inputs = $this->inputs($item);
            $valor = $this->numero($inputs[$params['campoValor'] ?? 'melhoriasImplementadasMes'] ?? null);
            if ($valor === null) $valor = $this->numero($inputs[$params['campoValorLegado'] ?? 'melhoriasEntreguesMes'] ?? null);
            if ($valor !== null) $acumulado += $valor;
            elseif (($posicao = $this->numero($inputs['melhoriasImplementadasAcumuladas'] ?? null)) !== null) $acumulado = $posicao;
        }
        $resultado = $acumulado / $total;
        $percentual = $metaQuantidade && $metaQuantidade > 0 ? $acumulado / $metaQuantidade : null;
        return $this->resultado($resultado, $resultado, $meta, $percentual,
            $percentual !== null && $percentual >= 1 ? 'Atingido' : 'Abaixo da meta');
    }

    private function ieo(array $atual): array
    {
        $inputs = $this->inputs($atual);
        $key = sprintf('%04d-%02d', (int) $atual['ano'], (int) $atual['mes']);
        $metas = array(
            '2026-01'=>0.1449, '2026-02'=>0.1445, '2026-03'=>0.1441,
            '2026-04'=>0.1436, '2026-05'=>0.1432, '2026-06'=>0.1428,
            '2026-07'=>0.1423833333333333, '2026-08'=>0.2988, '2026-09'=>0.2923,
            '2026-10'=>0.2913, '2026-11'=>0.2929, '2026-12'=>0.2664,
        );
        $meta = $metas[$key] ?? null;
        $resultado = null;
        if ((int) $atual['ano'] === 2026 && (int) $atual['mes'] >= 8) {
            $dga = $this->numero($inputs['despesasGeraisAdministrativasMes'] ?? null);
            $dsp = $this->numero($inputs['despesasServicosPagamentosMes'] ?? null);
            $odo = $this->numero($inputs['outrasDespesasOperacionaisMes'] ?? null);
            $ro = $this->numero($inputs['receitasOperacionaisMes'] ?? null);
            $dt = $this->numero($inputs['despesasTributosMes'] ?? null);
            if ($dga !== null && $dsp !== null && $odo !== null && $ro !== null && $dt !== null && $ro > $dt) {
                $resultado = ($dga + $dsp + $odo) / ($ro - $dt);
            }
        } else {
            $dp = $this->numero($inputs['despesaPessoalMes'] ?? null);
            $da = $this->numero($inputs['despesasAdministrativasMes'] ?? null);
            $rl = $this->numero($inputs['receitasLiquidasMes'] ?? null);
            if ($dp !== null && $da !== null && $rl > 0) $resultado = ($dp + $da) / $rl;
        }
        $calculado = $resultado === null ? null : round($resultado, 4);
        $informado = $this->percentual($inputs['ieoApuradoInformado'] ?? null);
        $informado = $informado === null ? null : round($informado, 4);
        if ($calculado !== null && $informado !== null && $calculado !== $informado) {
            throw new DomainException('IEO informado diverge do IEO calculado pelos componentes.');
        }
        $resultado = $calculado ?? $informado;
        if ($resultado === null || !$meta) throw new DomainException('Componentes ou meta do IEO incompletos para a competencia.');
        $percentual = 1 - (($resultado - $meta) / (1 - $meta));
        return $this->resultado($resultado, $resultado, $meta, $percentual,
            $resultado <= $meta ? 'Atingido' : 'Abaixo da meta');
    }

    private function lucroRecorrente(array $regra, array $atual, array $historico): array
    {
        $inputs = $this->inputs($atual);
        $resultado = $this->numero($inputs['lucroLiquidoRecorrenteCompetencia'] ?? null);
        if ($resultado === null) {
            $acumulado = $this->numero($inputs['lucroLiquidoRecorrenteAcumulado'] ?? null);
            if ($acumulado !== null && (int) $atual['mes'] === 1) $resultado = round($acumulado, 2);
            elseif ($acumulado !== null) {
                foreach ($historico as $item) {
                    if ((int) $item['ano'] !== (int) $atual['ano'] || (int) $item['mes'] !== (int) $atual['mes'] - 1) continue;
                    $anterior = $this->numero($this->inputs($item)['lucroLiquidoRecorrenteAcumulado'] ?? null);
                    if ($anterior !== null) $resultado = (round($acumulado * 100) - round($anterior * 100)) / 100;
                }
            }
        }
        $meta = $this->metaCompetencia($regra, $atual, 'metasMensaisPorCompetencia');
        if ($resultado === null || !$meta) throw new DomainException('Lucro recorrente mensal ou meta da competencia ausente.');
        $percentual = $resultado / $meta;
        return $this->resultado($resultado, $resultado, $meta, $percentual,
            $percentual >= 1 ? 'Atingido' : 'Abaixo da meta');
    }

    private function marcoProjeto(array $regra, array $atual): array
    {
        $params = $regra['parametrosCalculo'] ?? array();
        if (!in_array((int) $atual['mes'], $params['mesesFechamentoTrimestral'] ?? array(3,6,9,12), true)) {
            return $this->resultado(null, null, null, null, 'Em acompanhamento');
        }
        $curva = $params['curvaTrimestralPercentual'][$this->trimestre($atual)] ?? array();
        $meta = $this->numero($curva['metaPercentual'] ?? null);
        $inputs = $this->inputs($atual);
        $resultado = $this->percentual($inputs[$params['campoPercentual'] ?? 'percentualRealizadoTIC'] ?? null);
        if ($resultado === null) {
            foreach ($params['marcosCapacidadeTIC'] ?? array() as $marco) {
                if (($marco['label'] ?? '') === ($inputs[$params['campoStatus'] ?? 'marcoAlcancadoTIC'] ?? '')) {
                    $resultado = $this->numero($marco['percentual'] ?? null);
                }
            }
        }
        if ($resultado === null || !$meta) throw new DomainException('Marco, percentual ou meta trimestral do indicador 11 ausente.');
        $percentual = $resultado / $meta;
        return $this->resultado($resultado, $resultado, $meta, $percentual,
            $percentual >= 1 ? 'Atingido' : 'Abaixo da meta');
    }

    private function iniciativas(array $regra, array $atual, array $historico): array
    {
        $params = $regra['parametrosCalculo'] ?? array();
        $unicas = array();
        foreach ($this->ateCompetencia($atual, $historico) as $item) {
            $inputs = $this->inputs($item);
            if (($inputs[$params['campoStatus'] ?? 'statusIniciativaSocioambiental'] ?? '') !== ($params['statusQueConta'] ?? 'Apoiada/realizada')) continue;
            $chave = trim((string) ($inputs[$params['campoId'] ?? 'idIniciativaSocioambiental']
                ?? $inputs[$params['campoNome'] ?? 'nomeIniciativaSocioambiental'] ?? ''));
            if ($chave !== '') $unicas[$this->normalizarChave($chave)] = true;
        }
        $resultado = count($unicas);
        $curva = $params['curvaTrimestralAcumulada'][$this->trimestre($atual)] ?? array();
        $meta = $this->numero($curva['metaQuantidadeAcumulada'] ?? null);
        $percentual = $meta && $meta > 0 ? $resultado / $meta : null;
        $intermediario = !in_array((int) $atual['mes'], $params['mesesFechamentoTrimestral'] ?? array(3,6,9,12), true);
        if ($meta === 0.0) {
            $possuiAndamento = false;
            foreach ($this->ateCompetencia($atual, $historico) as $item) {
                $status = $this->inputs($item)[$params['campoStatus'] ?? 'statusIniciativaSocioambiental'] ?? '';
                if (in_array($status, array('Em prospecção','Em estruturação','Em rito de governança'), true)) $possuiAndamento = true;
            }
            $situacao = $possuiAndamento ? 'Em prospecção/estruturação' : 'Sem meta no periodo';
        } else {
            $situacao = $intermediario ? 'Em acompanhamento'
                : ($percentual === null ? 'Sem meta no periodo' : ($percentual >= 1 ? 'Atingido' : 'Abaixo da meta'));
        }
        return $this->resultado($resultado, $resultado, $meta, $percentual, $situacao);
    }

    private function valorFinanceiro(array $regra, array $atual): array
    {
        $params = $regra['parametrosCalculo'] ?? array();
        $resultado = $this->numero($this->inputs($atual)[$params['valorAcumuladoCampo'] ?? 'repasseSocialAcumuladoCompetencia'] ?? null);
        $meta = $this->metaCompetencia($regra, $atual);
        if ($resultado === null || !$meta) throw new DomainException('Valor acumulado ou meta da competencia ausente.');
        $percentual = $resultado / $meta;
        return $this->resultado($resultado, $resultado, $meta, $percentual,
            $percentual >= 1 ? 'Atingido' : 'Abaixo da meta');
    }

    private function acoesPropostas(array $regra, array $atual, array $historico): array
    {
        $params = $regra['parametrosCalculo'] ?? array();
        $total = $this->numero($params['totalAcoesPropostas'] ?? null);
        if (!$total) throw new DomainException('Total de acoes propostas nao configurado.');
        $unicas = array();
        foreach ($this->ateCompetencia($atual, $historico) as $item) {
            $inputs = $this->inputs($item);
            if (($inputs[$params['campoStatus'] ?? 'statusAcaoVisibilidade'] ?? '') !== ($params['statusQueConta'] ?? 'Publicada/realizada')) continue;
            $acao = trim((string) ($inputs[$params['campoAcao'] ?? 'acaoPropostaVisibilidade'] ?? ''));
            if ($acao !== '') $unicas[$this->normalizarChave($acao)] = true;
        }
        $quantidade = count($unicas);
        $resultado = $quantidade / $total;
        $curva = $params['curvaTrimestralAcumulada'][$this->trimestre($atual)] ?? array();
        $metaQuantidade = $this->numero($curva['metaAcoesRealizadasAcumuladas'] ?? null);
        $meta = $metaQuantidade === null ? $this->numero($curva['metaPercentual'] ?? null) : $metaQuantidade / $total;
        $percentual = $metaQuantidade && $metaQuantidade > 0 ? $quantidade / $metaQuantidade : null;
        if ($metaQuantidade === 0.0) {
            $possuiAndamento = false;
            foreach ($this->ateCompetencia($atual, $historico) as $item) {
                $status = $this->inputs($item)[$params['campoStatus'] ?? 'statusAcaoVisibilidade'] ?? '';
                if (in_array($status, array('Em planejamento','Em elaboração','Em homologação'), true)) $possuiAndamento = true;
            }
            $situacao = $possuiAndamento ? 'Em elaboração/homologação' : 'Sem meta no periodo';
        } else {
            $situacao = ((int) $atual['mes']) % 3 !== 0 ? 'Em acompanhamento'
                : ($percentual === null ? 'Sem meta no periodo' : ($percentual >= 1 ? 'Atingido' : 'Abaixo da meta'));
        }
        return $this->resultado($resultado, $resultado, $meta, $percentual, $situacao);
    }

    private function resultado($calculado, $oficial, $meta, $percentual, $situacao): array
    {
        return array(
            'resultado_calculado'=>$calculado, 'resultado_oficial'=>$oficial,
            'meta_oficial'=>$meta, 'percentual_atingido'=>$percentual, 'situacao'=>$situacao,
        );
    }

    private function persistido(array $lancamento): array
    {
        return array(
            'resultado_calculado'=>$this->numero($lancamento['resultadoMensal'] ?? $lancamento['resultado_calculado'] ?? null),
            'resultado_oficial'=>$this->numero($lancamento['resultadoOficialAnual'] ?? $lancamento['resultado_oficial'] ?? null),
            'meta_oficial'=>$this->numero($lancamento['metaReferencia'] ?? $lancamento['meta_referencia'] ?? null),
            'percentual_atingido'=>$this->numero($lancamento['percentualAtingido'] ?? $lancamento['percentual_atingido'] ?? null),
            'situacao'=>$lancamento['situacaoCalculada'] ?? $lancamento['situacao'] ?? null,
            'origem_resultado'=>'persistido_validado',
        );
    }

    private function metaCompetencia(array $regra, array $lancamento, $nomeCurva = null)
    {
        $params = $regra['parametrosCalculo'] ?? array();
        $key = sprintf('%04d-%02d', (int) $lancamento['ano'], (int) $lancamento['mes']);
        $curvas = $nomeCurva ? array($nomeCurva) : array(
            'metasPorCompetencia','metasMensaisPorCompetencia',
            'metasOperacionaisPorCompetencia','metasAcumuladasPorCompetencia',
        );
        foreach ($curvas as $nome) {
            if (array_key_exists($key, $params[$nome] ?? array()) && is_numeric($params[$nome][$key])) {
                return (float) $params[$nome][$key];
            }
        }
        return $this->numero($lancamento['metaReferencia'] ?? $lancamento['metaMensal'] ?? $regra['metaAnualValor'] ?? null);
    }

    private function ateCompetencia(array $atual, array $historico): array
    {
        $itens = array();
        foreach ($historico as $item) {
            if ((int) ($item['ano'] ?? 0) === (int) $atual['ano'] && (int) ($item['mes'] ?? 0) <= (int) $atual['mes']) {
                $itens[(int) $item['mes']] = $item;
            }
        }
        $itens[(int) $atual['mes']] = $atual;
        ksort($itens);
        return array_values($itens);
    }

    private function inputs(array $lancamento): array
    {
        if (isset($lancamento['camposEntrada']) && is_array($lancamento['camposEntrada'])) return $lancamento['camposEntrada'];
        if (isset($lancamento['dados_entrada']) && is_array($lancamento['dados_entrada'])) return $lancamento['dados_entrada'];
        return array();
    }

    private function trimestre(array $lancamento): string
    {
        return (string) ($lancamento['trimestre']
            ?? ((int) ceil(((int) $lancamento['mes']) / 3) . 'TRI/' . (int) $lancamento['ano']));
    }

    private function numero($valor)
    {
        if ($valor === null || $valor === '' || !is_numeric($valor)) return null;
        $numero = (float) $valor;
        return is_finite($numero) ? $numero : null;
    }

    private function percentual($valor)
    {
        $numero = $this->numero($valor);
        return $numero === null ? null : (abs($numero) > 1 ? $numero / 100 : $numero);
    }

    private function mesmoNumero($a, $b, $indicadorId): bool
    {
        if ($a === null || $b === null) return $a === $b;
        $tolerancia = in_array($indicadorId, array(7, 17), true) ? 0.004999999 : 0.000005;
        return abs((float) $a - (float) $b) <= $tolerancia;
    }

    private function normalizarChave($valor): string
    {
        $valor = trim((string) $valor);
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $valor);
        $valor = strtolower($ascii === false ? $valor : $ascii);
        return trim((string) preg_replace('/[^a-z0-9]+/', ' ', $valor));
    }
}
