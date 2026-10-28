<?php
declare(strict_types=1);
// Experimento acadêmico: somente tabelas TEMPORARY, restritas a esta conexão.
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
date_default_timezone_set('America/Sao_Paulo');
require __DIR__.'/../ong-connect/api/bootstrap.php';
try{
 $db=database();$db->exec('CREATE TEMPORARY TABLE academic_rel (id INT PRIMARY KEY,titulo VARCHAR(100),vagas INT NOT NULL) ENGINE=InnoDB');
 $db->exec('CREATE TEMPORARY TABLE academic_dias (oportunidade_id INT NOT NULL,dia CHAR(3) NOT NULL,PRIMARY KEY(oportunidade_id,dia),INDEX por_dia(dia,oportunidade_id)) ENGINE=InnoDB');
 $db->exec('CREATE TEMPORARY TABLE academic_json (id INT PRIMARY KEY,dados LONGTEXT NOT NULL CHECK(JSON_VALID(dados))) ENGINE=InnoDB');
 $rel=$db->prepare('INSERT INTO academic_rel VALUES(?,?,?)');$day=$db->prepare('INSERT INTO academic_dias VALUES(?,?)');$json=$db->prepare('INSERT INTO academic_json VALUES(?,?)');
 $db->beginTransaction();
 for($i=1;$i<=2000;$i++){$days=$i%2?['SEG','QUA']:['TER','QUI'];$title='Oportunidade fictícia '.$i;$rel->execute([$i,$title,5]);foreach($days as $d)$day->execute([$i,$d]);$json->execute([$i,json_encode(['titulo'=>$title,'vagas'=>5,'diasAtuacao'=>$days],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);}
 $db->commit();
 $queries=['relacional'=>"SELECT COUNT(*) FROM academic_rel o JOIN academic_dias d ON d.oportunidade_id=o.id WHERE d.dia='SEG'",'json'=>"SELECT COUNT(*) FROM academic_json WHERE JSON_CONTAINS(dados,'\"SEG\"','$.diasAtuacao')"];
 $results=[];
 foreach($queries as $name=>$sql){$count=(int)$db->query($sql)->fetchColumn();$times=[];for($i=0;$i<20;$i++){$start=hrtime(true);$actual=(int)$db->query($sql)->fetchColumn();$times[]=(hrtime(true)-$start)/1e6;if($actual!==1000)throw new RuntimeException('Resultado divergente.');}sort($times);$results[$name]=['encontrados'=>$count,'repeticoes'=>20,'min_ms'=>round($times[0],3),'mediana_ms'=>round(($times[9]+$times[10])/2,3),'p95_ms'=>round($times[18],3),'explain'=>$db->query('EXPLAIN '.$sql)->fetchAll()];}
 $invalidRejected=false;try{$json->execute([2001,'{invalido']);}catch(PDOException $e){if($e->getCode()!=='23000')throw $e;$invalidRejected=true;}
 $db->exec("UPDATE academic_json SET dados=JSON_SET(dados,'$.acessibilidade','Rampa') WHERE id=1");
 $jsonExtension=$db->query("SELECT JSON_VALUE(dados,'$.acessibilidade') FROM academic_json WHERE id=1")->fetchColumn();
 $db->exec('ALTER TABLE academic_rel ADD COLUMN acessibilidade VARCHAR(100) NULL');$db->exec("UPDATE academic_rel SET acessibilidade='Rampa' WHERE id=1");
 $result=['executado_em'=>date(DATE_ATOM),'mariadb'=>$db->query('SELECT VERSION()')->fetchColumn(),'php'=>PHP_VERSION,'registros_por_abordagem'=>2000,'dias_normalizados'=>4000,'tipo'=>'microexperimento local em tabelas temporárias, consultas aquecidas','consultas'=>$queries,'resultados'=>$results,'json_invalido_rejeitado'=>$invalidRejected,'extensao_json_sem_alter_table'=>$jsonExtension==='Rampa','extensao_relacional_com_alter_table'=>true,'limites'=>'Não mede produção, rede, concorrência, escrita, armazenamento ou JSON com coluna gerada indexada. Não generalizar desempenho.' ];
 if(!$invalidRejected||$jsonExtension!=='Rampa')throw new RuntimeException('Verificação do experimento falhou.');
 echo json_encode($result,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR).PHP_EOL;
}catch(Throwable $e){if(isset($db)&&$db->inTransaction())$db->rollBack();fwrite(STDERR,$e->getMessage().PHP_EOL);exit(1);}
