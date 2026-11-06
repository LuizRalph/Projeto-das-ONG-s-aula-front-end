<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'||!preg_match('/^ong_connect_test_[a-z0-9_]+$/',getenv('DB_DATABASE')?:''))exit(1);
require __DIR__.'/../ong-connect/api/bootstrap.php';
$db=database();$email=$argv[2]??'';
if(($argv[1]??'')==='expire-invite'){
    $db->prepare('UPDATE convites_ativacao c JOIN usuarios u ON u.id=c.usuario_id SET c.expira_em=DATE_SUB(NOW(),INTERVAL 1 SECOND) WHERE u.email=?')->execute([$email]);
}elseif(($argv[1]??'')==='hash-version'){
    $s=$db->prepare('SELECT senha_hash FROM usuarios WHERE email=?');$s->execute([$email]);$hash=$s->fetchColumn();
    echo is_string($hash)&&(str_starts_with($hash,'$argon2id$')||str_starts_with($hash,'{SHA384}'))?'upgraded':'legacy';
}else exit(1);
