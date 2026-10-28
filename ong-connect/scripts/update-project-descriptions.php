<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
require __DIR__.'/../ong-connect/api/bootstrap.php';
require __DIR__.'/../ong-connect/api/security.php';
$config=require __DIR__.'/../config/database.php';
if(!in_array($config['host'],['127.0.0.1','localhost','::1'],true)||(string)$config['port']!=='3308')throw new RuntimeException('Esta carga editorial é exclusiva do ambiente local na porta 3308.');
$requestId=bin2hex(random_bytes(16));
$rows=json_decode(file_get_contents(__DIR__.'/../ong-connect/data/projetos.json'),true,512,JSON_THROW_ON_ERROR);
$db=database();$db->beginTransaction();
try {
    $db->query('SELECT id FROM mvp_lock WHERE id=1 FOR UPDATE')->fetch();
    $existing=$db->query('SELECT id,titulo FROM projetos ORDER BY id FOR UPDATE')->fetchAll();
    $expected=[];foreach($rows as $row)$expected[(int)$row['id']]=$row['titulo'];
    if(count($existing)!==count($rows))throw new RuntimeException('Quantidade de projetos diferente da carga editorial. Revise o catálogo.');
    $changes=0;
    foreach($existing as $project) {
        if(($expected[(int)$project['id']]??null)!==$project['titulo'])throw new RuntimeException('Título ou ID diferente do catálogo revisado.');
    }
    foreach($rows as $row){
        $fields=[];foreach(['descricao','objetivo','publico_alvo','atividades','orientacoes_voluntariado','uso_recursos'] as $key)$fields[$key]=textField($row,$key,$key==='descricao'?10000:3000);
        $old=record($db,'projetos',(int)$row['id']);$changed=false;foreach($fields as $key=>$value)if($old[$key]!==$value)$changed=true;
        if(!$changed)continue;
        updateRow($db,'projetos',(int)$row['id'],$fields);
        audit($db,null,'projetos',(int)$row['id'],'ATUALIZAR_TEXTOS','Sucesso',['motivo'=>'Atualização editorial local de dados fictícios.']);$changes++;
    }
    $db->commit();echo "$changes projetos atualizados; demais campos preservados.\n";
}catch(Throwable $e){if($db->inTransaction())$db->rollBack();fwrite(STDERR,$e->getMessage()."\n");exit(1);}
