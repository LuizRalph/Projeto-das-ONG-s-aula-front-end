<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
require __DIR__.'/../ong-connect/api/bootstrap.php';
$db=database();
foreach($db->query("SELECT id,JSON_TYPE(JSON_EXTRACT(dados,'$.diasAtuacao')) tipo FROM oportunidades") as $row){
    if($row['tipo']!=='ARRAY')throw new RuntimeException('Agenda inválida na oportunidade '.$row['id'].': '.$row['tipo']);
}
echo "Agendas com dias em arrays válidos.\n";
