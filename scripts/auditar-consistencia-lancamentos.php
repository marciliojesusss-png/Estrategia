<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/core/Database.php';
require_once __DIR__ . '/../app/repositories/LancamentosRepository.php';
require_once __DIR__ . '/../app/repositories/IndicadoresRepository.php';
require_once __DIR__ . '/../app/repositories/ConfiguracoesRepository.php';
require_once __DIR__ . '/../app/services/CalculoIndicadoresService.php';

$db = Database::getConnection();
$launchesRepository = new LancamentosRepository($db);
$indicatorsRepository = new IndicadoresRepository($db);
$configurationsRepository = new ConfiguracoesRepository($db);
$calculator = new CalculoIndicadoresService();

$indicators = array();
foreach ($indicatorsRepository->all() as $indicator) $indicators[(string) $indicator['id']] = $indicator;
$rules = array();
foreach ($configurationsRepository->get('regrasIndicadores', array()) as $rule) {
    $rules[(string) ($rule['indicadorId'] ?? '')] = $rule;
}
$launches = $launchesRepository->all();
$history = array();
foreach ($launches as $launch) {
    $key = (string) $launch['indicadorId'] . ':' . (int) $launch['ano'];
    $history[$key][] = $launch;
}

$summary = array('total'=>count($launches),'cobertos'=>0,'semCobertura'=>0,'validos'=>0,'divergentes'=>0,'erros'=>0,'porStatus'=>array());
$findings = array();
foreach ($launches as $launch) {
    $status = (string) $launch['status'];
    if (!isset($summary['porStatus'][$status])) $summary['porStatus'][$status] = array('total'=>0,'cobertos'=>0,'validos'=>0,'divergentes'=>0,'erros'=>0);
    $summary['porStatus'][$status]['total']++;
    $indicatorId = (string) $launch['indicadorId'];
    if (!isset($indicators[$indicatorId])) continue;
    $key = $indicatorId . ':' . (int) $launch['ano'];
    $validation = $calculator->validar(
        $indicators[$indicatorId],
        $rules[$indicatorId] ?? array(),
        $launch,
        $history[$key] ?? array()
    );
    if (empty($validation['cobertura'])) {
        $summary['semCobertura']++;
        continue;
    }
    $summary['cobertos']++;
    $summary['porStatus'][$status]['cobertos']++;
    if (!empty($validation['valido'])) {
        $summary['validos']++;
        $summary['porStatus'][$status]['validos']++;
        continue;
    }
    if (!empty($validation['divergencias'])) {$summary['divergentes']++;$summary['porStatus'][$status]['divergentes']++;}
    else {$summary['erros']++;$summary['porStatus'][$status]['erros']++;}
    $findings[] = array(
        'lancamentoId'=>(string)$launch['id'], 'indicadorId'=>$indicatorId,
        'competencia'=>(string)$launch['competencia'], 'status'=>(string)$launch['status'],
        'mensagem'=>$validation['mensagem'], 'divergencias'=>$validation['divergencias'],
        'projecao'=>$validation['projecao'],
    );
}

$summaryOnly = in_array('--summary', $argv, true);
echo json_encode(array('somenteLeitura'=>true,'versaoFormula'=>CalculoIndicadoresService::FORMULA_VERSION,
    'resumo'=>$summary,'achados'=>$summaryOnly ? array() : $findings), JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES), PHP_EOL;
