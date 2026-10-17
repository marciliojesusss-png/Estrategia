<?php
declare(strict_types=1);

putenv('APP_ENV=local');
putenv('DB_CONNECTION=sqlsrv');
require_once __DIR__.'/../app/bootstrap.php';
require_once __DIR__.'/../app/core/Database.php';
require_once __DIR__.'/../app/repositories/IniciativasRepository.php';
require_once __DIR__.'/../app/repositories/IniciativasAcompanhamentosRepository.php';

function initiative_db_ok($condition,$message){if(!$condition)throw new RuntimeException('FALHA: '.$message);}
$db=Database::getConnection();$beforeMaster=(int)$db->query('SELECT COUNT(*) FROM dbo.iniciativas_estrategicas')->fetchColumn();$beforeTracking=(int)$db->query('SELECT COUNT(*) FROM dbo.iniciativas_acompanhamentos')->fetchColumn();$db->beginTransaction();
try{
    $masters=new IniciativasRepository($db);$records=new IniciativasAcompanhamentosRepository($db);$year=2096;$expected=array('1TRI'=>4,'2TRI'=>3,'3TRI'=>2,'4TRI'=>1);$sequence=1;
    foreach($expected as$start=>$count){$code=$masters->nextCodeForYearForUpdate($year);initiative_db_ok($code===sprintf('INI-%04d-%03d',$year,$sequence),'código sequencial e bloqueado deve avançar por ano');$master=$masters->create(array('codigo'=>$code,'plano'=>'Plano Teste','pilar'=>'Pilar Teste','titulo_executivo'=>'Título Teste','descricao_oficial'=>'Descrição Teste','objetivo'=>'Objetivo Teste','unidade_responsavel'=>'UNIDADE_TESTE','diretoria_responsavel'=>'DIRETORIA_TESTE','ano_inicio'=>$year,'trimestre_inicio'=>$start,'previsao_conclusao'=>null,'exige_evidencia'=>false,'ativo'=>true,'created_by'=>'TESTE'));$quarters=array('1TRI','2TRI','3TRI','4TRI');$offset=array_search($start,$quarters,true);for($index=$offset;$index<count($quarters);$index++)$records->createFromMaster($master,$year,$quarters[$index],'TESTE');$created=$records->byInitiative($master['id']);initiative_db_ok(count($created)===$count,$start.' deve gerar '.$count.' acompanhamento(s)');initiative_db_ok($created[0]['planoSnapshot']==='Plano Teste'&&$created[0]['unidadeSnapshot']==='UNIDADE_TESTE','snapshot deve vir do cadastro persistido');$sequence++;}
    initiative_db_ok((int)$db->query('SELECT COUNT(*) FROM dbo.iniciativas_estrategicas')->fetchColumn()===$beforeMaster+4,'quatro mestres artificiais devem existir dentro da transação');
    initiative_db_ok((int)$db->query('SELECT COUNT(*) FROM dbo.iniciativas_acompanhamentos')->fetchColumn()===$beforeTracking+10,'dez acompanhamentos trimestrais devem existir dentro da transação');
    $db->rollBack();
}catch(Throwable$error){if($db->inTransaction())$db->rollBack();fwrite(STDERR,$error->getMessage().PHP_EOL);exit(1);}
initiative_db_ok((int)$db->query('SELECT COUNT(*) FROM dbo.iniciativas_estrategicas')->fetchColumn()===$beforeMaster,'rollback deve remover mestres artificiais');initiative_db_ok((int)$db->query('SELECT COUNT(*) FROM dbo.iniciativas_acompanhamentos')->fetchColumn()===$beforeTracking,'rollback deve remover acompanhamentos artificiais');
echo 'Código, geração trimestral, snapshots e rollback das iniciativas OK'.PHP_EOL;
