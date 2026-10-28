<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/../ong-connect/api/bootstrap.php';
// Senha via ambiente para não aparecer nos argumentos do processo.
try {
    [$script,$email,$name,$role]=array_pad($argv,4,'');
    $password=getenv('ONG_INITIAL_PASSWORD')?:'';
    if(!filter_var($email,FILTER_VALIDATE_EMAIL)||!$name||!in_array($role,['admin','ong','voluntario'],true)||strlen($password)<12)
        throw new RuntimeException('Uso: php scripts/create-user.php email nome admin|ong|voluntario [ongId]. Defina ONG_INITIAL_PASSWORD com ao menos 12 caracteres.');
    $db=database(); $db->beginTransaction();
    $id=insertRow($db,'usuarios',['nome'=>$name,'email'=>strtolower($email),'senha_hash'=>password_hash($password,PASSWORD_DEFAULT),'perfil'=>$role]);
    if($role==='ong') { $ong=(int)($argv[4]??0);record($db,'ongs',$ong);insertRow($db,'usuarios_ongs',['usuario_id'=>$id,'ong_id'=>$ong]); }
    $db->commit(); echo "Usuário criado: $id\n";
}catch(Throwable $e){if(isset($db)&&$db->inTransaction())$db->rollBack();fwrite(STDERR,$e->getMessage()."\n");exit(1);}
