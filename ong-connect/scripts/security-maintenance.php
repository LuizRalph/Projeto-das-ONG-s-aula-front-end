<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/../ong-connect/api/bootstrap.php';
try{
    $db=database();
    $s=$db->prepare('DELETE FROM security_limits WHERE expira_em<? LIMIT 10000');$s->execute([time()]);
    echo 'Limites expirados removidos: '.$s->rowCount().PHP_EOL;
    $count=$db->exec('DELETE FROM convites_ativacao WHERE expira_em<DATE_SUB(NOW(),INTERVAL 7 DAY) LIMIT 10000');
    echo 'Convites antigos removidos: '.$count.PHP_EOL;
}catch(Throwable $e){fwrite(STDERR,"Falha na manutenção de segurança.\n");exit(1);}
