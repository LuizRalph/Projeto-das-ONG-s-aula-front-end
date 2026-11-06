<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
require __DIR__.'/../ong-connect/api/bootstrap.php';
require __DIR__.'/../ong-connect/api/security.php';
function check(bool $valid,string $message): void {if(!$valid)throw new RuntimeException($message);echo "PASS $message\n";}
$password=str_repeat('a',72).'X';$hash=securePasswordHash($password);
check(verifyPassword($password,$hash),'senha longa correta aceita');
check(!verifyPassword(str_repeat('a',72).'Y',$hash),'sufixos após 72 bytes são diferentes');
$spaced='  Senha com espaços 123!  ';
check(passwordField(['senha'=>$spaced],true)===$spaced,'validação preserva espaços da senha');
check(!verifyPassword(trim($spaced),securePasswordHash($spaced)),'espaços fazem parte da senha');
$legacy=password_hash('SenhaLegada123!',PASSWORD_BCRYPT);
check(verifyPassword('SenhaLegada123!',$legacy)&&passwordHashNeedsUpgrade($legacy),'bcrypt legado válido permite migração');
check(!verifyPassword($password,password_hash($password,PASSWORD_BCRYPT)),'bcrypt legado ambíguo é rejeitado');
if(!str_starts_with(getenv('DB_DATABASE')?:'','ong_connect_test_'))exit(0);
$db=database();$bucket='security-test:'.bin2hex(random_bytes(16));
rateLimit($db,[$bucket=>2],60);rateLimit($db,[$bucket=>2],60);
try{rateLimit($db,[$bucket=>2],60);throw new RuntimeException('Limite não aplicado.');}catch(ApiError $e){check($e->getCode()===429,'limite persistente retorna 429');}
$db->prepare('UPDATE security_limits SET expira_em=0 WHERE chave=?')->execute([hash('sha256',$bucket)]);
rateLimit($db,[$bucket=>2],60);check(true,'limite volta a permitir após expiração');
$db->beginTransaction();
$uid=insertRow($db,'usuarios',['nome'=>'Ativação teste','email'=>'activation-unit@example.com','senha_hash'=>'!activation-pending','perfil'=>'ong']);
$first=issueActivation($db,$uid);$second=issueActivation($db,$uid);
check($first!==$second,'reemissão gera novo convite');
$s=$db->prepare('SELECT token_hash FROM convites_ativacao WHERE usuario_id=?');$s->execute([$uid]);
check($s->fetchColumn()===hash('sha256',substr($second,strpos($second,'=')+1)),'somente hash do último convite é armazenado');
$db->rollBack();
