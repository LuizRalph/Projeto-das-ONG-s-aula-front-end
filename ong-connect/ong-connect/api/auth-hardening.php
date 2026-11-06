<?php
declare(strict_types=1);

function passwordField(array $input, bool $new = false): string {
    $password=$input['senha']??null;
    if(!is_string($password)||$password===''||strlen($password)>1024||str_contains($password,"\0")||($new&&mb_strlen($password)<12))fail('Informe uma senha de 12 a 200 caracteres para novos acessos, com até 1024 bytes.');
    if(mb_strlen($password)>200)fail('A senha deve ter no máximo 200 caracteres.');
    return $password;
}
function securePasswordHash(string $password): string {
    if(defined('PASSWORD_ARGON2ID'))return password_hash($password,PASSWORD_ARGON2ID);
    // Versão explícita: bcrypt recebe 64 bytes ASCII e nunca trunca a senha original.
    return '{SHA384}'.password_hash(base64_encode(hash('sha384',$password,true)),PASSWORD_BCRYPT);
}
function verifyPassword(string $password,string $hash): bool {
    if(str_starts_with($hash,'{SHA384}'))return password_verify(base64_encode(hash('sha384',$password,true)),substr($hash,8));
    // Hashes legados bcrypt não distinguem sufixos além de 72 bytes. Não os migre com uma senha ambígua.
    if(str_starts_with($hash,'$2')&&strlen($password)>72)return false;
    return password_verify($password,$hash);
}
function passwordHashNeedsUpgrade(string $hash): bool {
    if(defined('PASSWORD_ARGON2ID'))return password_needs_rehash($hash,PASSWORD_ARGON2ID);
    return !str_starts_with($hash,'{SHA384}')||password_needs_rehash(substr($hash,8),PASSWORD_BCRYPT);
}
function clientAddress(): string {return $_SERVER['REMOTE_ADDR']??'local';}
function rateLimit(PDO $db,array $buckets,int $seconds): void {
    // Todos os limites são consumidos atomicamente antes de verificar senha ou gravar cadastro.
    $now=time();$retry=0;$db->beginTransaction();
    try {
        $keys=[];foreach($buckets as $bucket=>$maximum)$keys[hash('sha256',$bucket)]=$maximum;ksort($keys);
        foreach($keys as $key=>$maximum){
            // UPSERT adquire bloqueio exclusivo; INSERT IGNORE seguido de FOR UPDATE pode causar deadlock na promoção de bloqueios simultâneos.
            $db->prepare('INSERT INTO security_limits(chave,tentativas,expira_em) VALUES(?,0,?) ON DUPLICATE KEY UPDATE chave=VALUES(chave)')->execute([$key,$now+$seconds]);
            $s=$db->prepare('SELECT tentativas,expira_em FROM security_limits WHERE chave=? FOR UPDATE');$s->execute([$key]);$row=$s->fetch();
            if((int)$row['expira_em']<=$now){$row=['tentativas'=>0,'expira_em'=>$now+$seconds];$db->prepare('UPDATE security_limits SET tentativas=0,expira_em=? WHERE chave=?')->execute([$row['expira_em'],$key]);}
            if((int)$row['tentativas']>=$maximum)$retry=max($retry,(int)$row['expira_em']-$now);
        }
        if(!$retry)foreach($keys as $key=>$maximum)$db->prepare('UPDATE security_limits SET tentativas=tentativas+1 WHERE chave=?')->execute([$key]);
        $db->commit();
    }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
    if($retry){if(PHP_SAPI!=='cli')header('Retry-After: '.$retry);fail('Muitas tentativas. Aguarde antes de tentar novamente.',429);}
}
function issueActivation(PDO $db,int $uid): string {
    $token=bin2hex(random_bytes(32));
    $db->prepare('INSERT INTO convites_ativacao(usuario_id,token_hash,expira_em) VALUES(?,?,DATE_ADD(NOW(),INTERVAL 24 HOUR)) ON DUPLICATE KEY UPDATE token_hash=VALUES(token_hash),expira_em=VALUES(expira_em),usado_em=NULL')->execute([$uid,hash('sha256',$token)]);
    return 'pages/ativar-conta.html#token='.$token;
}
function activationRoute(PDO $db,string $method,array $input): void {
    if($method!=='POST')fail('Método não permitido.',405);
    csrf();rateLimit($db,['activation:'.clientAddress()=>20],900);
    $token=$input['token']??'';
    if(!is_string($token)||!preg_match('/^[a-f0-9]{64}$/D',$token))fail('Convite inválido ou expirado.',400);
    $password=passwordField($input,true);
    $s=$db->prepare('SELECT usuario_id FROM convites_ativacao WHERE token_hash=?');$s->execute([hash('sha256',$token)]);$uid=$s->fetchColumn();
    if(!$uid)fail('Convite inválido ou expirado.',400);
    $hash=securePasswordHash($password);
    $db->beginTransaction();
    // Mesma ordem da reemissão: usuário primeiro, convite depois.
    $db->prepare('SELECT id FROM usuarios WHERE id=? FOR UPDATE')->execute([$uid]);
    $s=$db->prepare('SELECT usuario_id FROM convites_ativacao WHERE usuario_id=? AND token_hash=? AND usado_em IS NULL AND expira_em>NOW() FOR UPDATE');$s->execute([$uid,hash('sha256',$token)]);
    if(!$s->fetchColumn())fail('Convite inválido ou expirado.',400);
    $s=$db->prepare("UPDATE usuarios SET senha_hash=? WHERE id=? AND senha_hash='!activation-pending'");$s->execute([$hash,$uid]);
    if($s->rowCount()!==1)fail('Convite inválido ou expirado.',400);
    $db->prepare('UPDATE convites_ativacao SET usado_em=NOW() WHERE usuario_id=?')->execute([$uid]);
    audit($db,null,'ativacao',(int)$uid,'POST');$db->commit();respond(['ok'=>true]);
}
