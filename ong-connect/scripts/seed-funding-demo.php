<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
require __DIR__.'/../ong-connect/api/bootstrap.php';
require __DIR__.'/../ong-connect/api/security.php';
$config=require __DIR__.'/../config/database.php';
if(!in_array($config['host'],['127.0.0.1','localhost','::1'],true)||(string)$config['port']!=='3308')throw new RuntimeException('Carga demonstrativa exclusiva do banco local na porta 3308.');
$db=database();$requestId=bin2hex(random_bytes(16));$db->beginTransaction();
try{
 $db->query('SELECT id FROM mvp_lock WHERE id=1 FOR UPDATE')->fetch();
 $user=$db->query("SELECT id,nome,perfil FROM usuarios WHERE perfil='admin' ORDER BY id LIMIT 1")->fetch();
 if(!$user)throw new RuntimeException('Administrador necessário para identificar a carga demonstrativa.');
 $projects=$db->query("SELECT MIN(p.id) id,p.ong_id FROM projetos p JOIN ongs o ON o.id=p.ong_id WHERE p.status='Ativo' GROUP BY p.ong_id ORDER BY p.ong_id LIMIT 6")->fetchAll();
 if(count($projects)!==6)throw new RuntimeException('São necessários seis projetos ativos de ONGs distintas.');
 $created=0;
 foreach($projects as $i=>$project){
  $key='demo-origens-v1-privado-'.($i+1);
  $s=$db->prepare('SELECT id FROM doacoes WHERE usuario_id=? AND chave=?');$s->execute([$user['id'],$key]);
  if(!$s->fetchColumn()){$id=insertRow($db,'doacoes',['projeto_id'=>$project['id'],'usuario_id'=>$user['id'],'valor'=>'1000.00','chave'=>$key]);audit($db,$user,'doacoes',$id,'CARGA_DEMO','Sucesso',['motivo'=>'Apoio privado fictício para demonstrar a separação de origens.']);$created++;}
 }
 $key='demo-origens-v1-privado-cancelado';$s=$db->prepare('SELECT id FROM doacoes WHERE usuario_id=? AND chave=?');$s->execute([$user['id'],$key]);
 if(!$s->fetchColumn()){$id=insertRow($db,'doacoes',['projeto_id'=>$projects[0]['id'],'usuario_id'=>$user['id'],'valor'=>'500.00','status'=>'Cancelada','chave'=>$key]);audit($db,$user,'doacoes',$id,'CARGA_DEMO','Sucesso',['motivo'=>'Apoio fictício cancelado; não integra o total privado.']);$created++;}
 for($i=0;$i<4;$i++){
  $cancelled=$i===3;$project=$projects[$cancelled?0:$i];$key='demo-origens-v1-publico-'.($cancelled?'cancelado':$i+1);
  $s=$db->prepare('SELECT id FROM repasses_publicos WHERE registrado_por=? AND chave=?');$s->execute([$user['id'],$key]);if($s->fetchColumn())continue;
  $fields=['ong_id'=>(int)$project['ong_id'],'projeto_id'=>(int)$project['id'],'orgao_origem'=>'Órgão público fictício '.($i+1),
   'instrumento'=>'Instrumento demonstrativo DEMO-'.($i+1).'/2026','finalidade'=>'Atividades educativas e comunitárias fictícias; nenhum repasse real.',
   'valor_recebido'=>$cancelled?'5000.00':'10000.00','recebido_em'=>'2026-10-24','prestacao_situacao'=>'Pendente',
   'observacoes'=>'Exemplo acadêmico de origem pública. Documentação pendente; não representa recebimento real.'];
  $extra=['registrado_por'=>$user['id'],'chave'=>$key,'hash_cadastro'=>hash('sha256',json_encode($fields,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR))];
  if($cancelled)$extra+=['status'=>'Cancelado','motivo_cancelamento'=>'Exemplo demonstrativo cancelado para validar a exclusão do total.','cancelado_em'=>'2026-10-24 12:00:00'];
  $id=insertRow($db,'repasses_publicos',$fields+$extra);audit($db,$user,'repasses_publicos',$id,'CARGA_DEMO','Sucesso',['motivo'=>'Repasse público fictício'.($cancelled?' cancelado; excluído do total.':'; sem transferência bancária.')]);$created++;
 }
 $db->commit();echo "$created registros demonstrativos inseridos.\n";
 echo 'Privado válido: '.$db->query("SELECT COALESCE(SUM(valor),0) FROM doacoes WHERE status='Simulada'")->fetchColumn()."\n";
 echo 'Público válido: '.$db->query("SELECT COALESCE(SUM(valor_recebido),0) FROM repasses_publicos WHERE status='Recebido'")->fetchColumn()."\n";
}catch(Throwable $e){if($db->inTransaction())$db->rollBack();fwrite(STDERR,$e->getMessage()."\n");exit(1);}
