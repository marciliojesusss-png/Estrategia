<?php
declare(strict_types=1);
putenv('APP_ENV=local');putenv('DB_CONNECTION=sqlite');require_once __DIR__.'/../app/bootstrap.php';require_once __DIR__.'/../app/core/Router.php';
function ok_api($c,$m){if(!$c){fwrite(STDERR,'FALHA: '.$m.PHP_EOL);exit(1);}}
ob_start();Response::success(array('id'=>1),'Criado.',201);$success=json_decode(ob_get_clean(),true);ok_api($success['sucesso']===true&&$success['mensagem']==='Criado.'&&$success['dados']['id']===1,'envelope de sucesso deve ser padrao');
ob_start();Response::error('Invalido.',422,array('nome'=>'Obrigatorio.'));$error=json_decode(ob_get_clean(),true);ok_api($error['sucesso']===false&&$error['erros']['nome']==='Obrigatorio.','envelope de erro deve ser padrao');
$_GET=array('page'=>'999','perPage'=>'0');ok_api(Request::queryInt('page',1,1,100)===100&&Request::queryInt('perPage',25,1,100)===1,'inteiros de consulta devem respeitar limites');ok_api(API_MAX_PAYLOAD_BYTES===1048576,'limite padrao deve ser 1 MiB');
$routes=file_get_contents(__DIR__.'/../public/index.php');foreach(array('/api/indicadores/{id}','/api/lancamentos/{id}','/api/homologacoes/{id}','/api/dashboard/{action}','/api/administracao/{resource}')as$route)ok_api(strpos($routes,$route)!==false,'rota canonica ausente: '.$route);
foreach(glob(__DIR__.'/../public/api/*.php')as$file)ok_api(strpos(file_get_contents($file),'API_LEGACY_ALIAS')!==false,'alias legado deve sinalizar depreciacao: '.basename($file));
$docs=file_get_contents(__DIR__.'/../docs/api.md');ok_api(strpos($docs,'413')!==false&&strpos($docs,'X-CSRF-Token')!==false&&strpos($docs,'DELETE /api/indicadores/{id}')!==false,'documentacao deve cobrir limites, CSRF e DELETE logico');
echo 'Testes de contrato da API OK'.PHP_EOL;
