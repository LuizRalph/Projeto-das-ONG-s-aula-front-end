<?php
declare(strict_types=1);
function startSession(): void {
    if(session_status()===PHP_SESSION_ACTIVE)return;
    ini_set('session.use_strict_mode','1');
    session_name('ongconnect_session');
    session_set_cookie_params(['httponly'=>true,'secure'=>!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off','samesite'=>'Lax','path'=>'/']);
    session_start();
    if(isset($_SESSION['last_seen'])&&time()-$_SESSION['last_seen']>1800){$_SESSION=[];session_regenerate_id(true);}
    $_SESSION['last_seen']=time();
    $_SESSION['csrf']??=bin2hex(random_bytes(32));
}
function currentUser(PDO $db, bool $required=true): ?array {
    $stmt=$db->prepare('SELECT id,nome,email,perfil,telefone,dados_voluntario FROM usuarios WHERE id=?');
    $stmt->execute([$_SESSION['uid']??0]); $user=$stmt->fetch()?:null;
    if(!$user&&$required)fail('Entre na sua conta para continuar.',401);
    if($user){$user['id']=(int)$user['id'];$user['dados_voluntario']=json_decode($user['dados_voluntario']??'{}',true);}
    return $user;
}
function volunteerProfile(array $input): string {
    $fields=[];
    foreach(['nascimento'=>10,'cidade'=>120,'estado'=>2,'disponibilidade'=>500,'experiencia'=>2000,'habilidades'=>2000] as $key=>$limit)$fields[$key]=textField($input,$key,$limit,false);
    if($fields['estado']!==''&&!in_array($fields['estado'],explode(' ','AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'),true))fail('Estado inválido.');
    if($fields['nascimento']!==''){$date=DateTimeImmutable::createFromFormat('!Y-m-d',$fields['nascimento']);if(!$date||$date->format('Y-m-d')!==$fields['nascimento']||$date>new DateTimeImmutable('today'))fail('Data de nascimento inválida.');}
    return json_encode($fields,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
}
function csrf(): void {
    if(!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??''))fail('Sessão de formulário inválida. Atualize a página.',403);
}
function requireAdmin(array $user): void {if($user['perfil']!=='admin')fail('Acesso restrito ao administrador.',403);}
function authorizeOng(PDO $db,array $user,int $id): void {
    if($user['perfil']==='admin')return;
    $s=$db->prepare('SELECT 1 FROM usuarios_ongs WHERE usuario_id=? AND ong_id=?');$s->execute([$user['id'],$id]);
    if($user['perfil']!=='ong'||!$s->fetchColumn())fail('Você não pode administrar esta ONG.',403);
}
function audit(PDO $db,?array $user,string $resource,int $id,string $action,string $result='Sucesso',array $details=[]): void {
    // Nunca recebe o corpo de requisição: detalhes são metadados permitidos.
    insertRow($db,'auditoria',['autor_id'=>$user['id']??null,'recurso'=>$resource,'registro_id'=>$id?:null,'acao'=>$action,
        'resultado'=>$result,'detalhes'=>$details?json_encode(array_intersect_key($details,array_flip(['httpStatus','motivo'])),JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR):null,
        'autor_nome'=>$user['nome']??null,'autor_perfil'=>$user['perfil']??null,
        'requisicao_id'=>$GLOBALS['requestId']??null]);
}
function provisionOngAccess(PDO $db,array $fields,int $ongId,array $administrator): array {
    // Executada na mesma transação da publicação. Nunca redefine senha de conta existente.
    $email=mb_strtolower($fields['email']);
    $stmt=$db->prepare('SELECT id,perfil FROM usuarios WHERE email=? FOR UPDATE');$stmt->execute([$email]);$existing=$stmt->fetch();
    $password=null;
    if($existing){
        if($existing['perfil']!=='ong')fail('Este e-mail já pertence a outro perfil. Informe um e-mail de responsável por ONG disponível para publicar.',409);
        $uid=(int)$existing['id'];
    }else{
        $password=bin2hex(random_bytes(12));
        $uid=insertRow($db,'usuarios',[
            'nome'=>$fields['responsavel']?:$fields['nome'], 'email'=>$email,
            'senha_hash'=>password_hash($password,PASSWORD_DEFAULT),'perfil'=>'ong','telefone'=>$fields['telefone']
        ]);
    }
    insertRow($db,'usuarios_ongs',['usuario_id'=>$uid,'ong_id'=>$ongId]);
    audit($db,$administrator,'vinculos',$ongId,'POST');
    return ['email'=>$email,'senhaInicial'=>$password,'contaCriada'=>$existing===false,'ongId'=>$ongId,'ongNome'=>$fields['nome']];
}
function authRoute(PDO $db,string $resource,string $method,array $input): void {
    if($resource==='sessao'&&$method==='GET') {
        $u=currentUser($db,false);$ongs=[];
        if($u){$s=$db->prepare('SELECT ong_id FROM usuarios_ongs WHERE usuario_id=?');$s->execute([$u['id']]);$ongs=array_map('intval',$s->fetchAll(PDO::FETCH_COLUMN));}
        respond(['usuario'=>$u,'csrf'=>$_SESSION['csrf'],'ongs'=>$ongs]);
    }
    if($resource==='login'&&$method==='POST') {
        csrf();$email=strtolower(textField($input,'email',190));$password=textField($input,'senha',200);
        $key=hash('sha256',($_SERVER['REMOTE_ADDR']??'local'));
        $db->beginTransaction();
        $db->prepare('INSERT IGNORE INTO login_tentativas(chave,inicio) VALUES(?,NOW())')->execute([$key]);
        $s=$db->prepare('SELECT *,inicio < NOW() - INTERVAL 15 MINUTE AS expirou FROM login_tentativas WHERE chave=? FOR UPDATE');$s->execute([$key]);$r=$s->fetch();
        if($r['expirou']){$db->prepare('UPDATE login_tentativas SET tentativas=0,inicio=NOW() WHERE chave=?')->execute([$key]);$r['tentativas']=0;}
        if((int)$r['tentativas']>=10){$db->commit();header('Retry-After: 900');fail('Muitas tentativas. Aguarde 15 minutos.',429);}
        $db->prepare('UPDATE login_tentativas SET tentativas=tentativas+1 WHERE chave=?')->execute([$key]);$db->commit();
        $s=$db->prepare('SELECT id,senha_hash FROM usuarios WHERE email=?');$s->execute([$email]);$u=$s->fetch();
        $valid=password_verify($password,$u['senha_hash']??'$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.');
        if(!$u||!$valid)fail('E-mail ou senha inválidos.',401);
        $db->prepare('DELETE FROM login_tentativas WHERE chave=?')->execute([$key]);
        session_regenerate_id(true);$_SESSION['uid']=(int)$u['id'];$_SESSION['csrf']=bin2hex(random_bytes(32));
        audit($db,currentUser($db),'login',(int)$u['id'],'POST');
        respond(['usuario'=>currentUser($db),'csrf'=>$_SESSION['csrf']]);
    }
    if($resource==='cadastro'&&$method==='POST') {
        csrf();$name=textField($input,'nome',150);$email=strtolower(textField($input,'email',190));$password=textField($input,'senha',200);
        if(!filter_var($email,FILTER_VALIDATE_EMAIL)||strlen($password)<12)fail('Informe e-mail válido e senha com ao menos 12 caracteres.');
        $profile=volunteerProfile($input);$phone=textField($input,'telefone',40,false);
        try{$newId=insertRow($db,'usuarios',['nome'=>$name,'email'=>$email,'senha_hash'=>password_hash($password,PASSWORD_DEFAULT),'perfil'=>'voluntario','telefone'=>$phone,'dados_voluntario'=>$profile]);audit($db,null,'cadastro',$newId,'POST');}
        catch(PDOException $e){if($e->getCode()!=='23000')throw $e;}
        respond(['ok'=>true,'mensagem'=>'Se os dados permitem o cadastro, sua conta está disponível. Tente entrar.']);
    }
    if($resource==='logout'&&$method==='POST') {
        csrf();audit($db,currentUser($db,false),'logout',0,'POST');
        csrf();$_SESSION=[];$p=session_get_cookie_params();setcookie(session_name(),'', ['expires'=>time()-3600,'path'=>$p['path'],'secure'=>$p['secure'],'httponly'=>true,'samesite'=>'Lax']);session_destroy();respond(['ok'=>true]);
    }
    if($resource==='perfil'&&$method==='PUT') {
        $u=currentUser($db);csrf();$fields=['nome'=>textField($input,'nome',150),'telefone'=>textField($input,'telefone',40,false)];
        if($u['perfil']==='voluntario'&&array_key_exists('cidade',$input))$fields['dados_voluntario']=volunteerProfile($input);
        updateRow($db,'usuarios',$u['id'],$fields);audit($db,$u,'perfil',(int)$u['id'],'PUT');respond(['usuario'=>currentUser($db)]);
    }
    if($resource==='vinculos'&&in_array($method,['POST','DELETE'],true)) {
        $u=currentUser($db);csrf();requireAdmin($u);$uid=(int)($input['usuarioId']??0);$oid=(int)($input['ongId']??0);
        $target=record($db,'usuarios',$uid);record($db,'ongs',$oid);
        if($target['perfil']!=='ong')fail('O usuário deve ter perfil de responsável por ONG.');
        $db->beginTransaction();
        $sql=$method==='POST'?'INSERT IGNORE INTO usuarios_ongs(usuario_id,ong_id) VALUES(?,?)':'DELETE FROM usuarios_ongs WHERE usuario_id=? AND ong_id=?';
        $db->prepare($sql)->execute([$uid,$oid]);audit($db,$u,'vinculos',$oid,$method);$db->commit();respond(['ok'=>true]);
    }
    fail('Operação não permitida.',405);
}
