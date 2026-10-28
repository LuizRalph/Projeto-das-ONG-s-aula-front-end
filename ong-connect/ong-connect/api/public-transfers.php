<?php
declare(strict_types=1);

function financeUser(PDO $db): array {
    $user=currentUser($db);
    if(!in_array($user['perfil'],['admin','ong'],true))fail('Área exclusiva da administração.',403);
    return $user;
}
function financeScope(array $user,string $alias='r'): array {
    if($user['perfil']==='admin')return ['1=1',[]];
    return ["EXISTS(SELECT 1 FROM usuarios_ongs v WHERE v.usuario_id=? AND v.ong_id=$alias.ong_id)",[$user['id']]];
}
function publicTransfer(PDO $db,array $user,int $id,bool $lock=false): array {
    $s=$db->prepare('SELECT * FROM repasses_publicos WHERE id=?'.($lock?' FOR UPDATE':''));$s->execute([$id]);$row=$s->fetch();
    if(!$row)fail('Repasse não encontrado.',404);
    authorizeOng($db,$user,(int)$row['ong_id']);return $row;
}
function publicTransferFields(PDO $db,array $user,array $input,?array $old=null): array {
    $merged=$old?array_merge($old,$input):$input;
    $ong=filter_var($merged['ong_id']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
    if(!$ong)fail('Selecione a ONG.');authorizeOng($db,$user,$ong);record($db,'ongs',$ong);
    if($old&&$ong!==(int)$old['ong_id'])fail('A ONG de um repasse não pode ser alterada.',409);
    $project=$merged['projeto_id']??null;
    if($project===null||$project==='')$project=null;
    else{$project=filter_var($project,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);if(!$project)fail('Projeto inválido.');if((int)record($db,'projetos',$project)['ong_id']!==$ong)fail('O projeto deve pertencer à ONG selecionada.');}
    $value=$merged['valor_recebido']??null;
    if(!is_string($value)&&!is_int($value))fail('Informe o valor decimal como texto.');
    if(!preg_match('/^\d{1,10}(\.\d{1,2})?$/',(string)$value)||(float)$value<=0)fail('Informe um valor recebido válido e positivo.');
    $amount=number_format((float)$value,2,'.','');
    $date=textField($merged,'recebido_em',10);$zone=new DateTimeZone('America/Sao_Paulo');$parsed=DateTimeImmutable::createFromFormat('!Y-m-d',$date,$zone);
    if(!$parsed||$parsed->format('Y-m-d')!==$date||$date>(new DateTimeImmutable('today',$zone))->format('Y-m-d'))fail('Informe uma data válida de recebimento, sem datas futuras.');
    $state=$merged['prestacao_situacao']??'Pendente';
    if(!in_array($state,['Pendente','Em_preparacao','Enviada','Conferida_internamente'],true))fail('Situação de prestação de contas inválida.');
    return ['ong_id'=>$ong,'projeto_id'=>$project,'orgao_origem'=>textField($merged,'orgao_origem',190),
        'instrumento'=>textField($merged,'instrumento',190),'finalidade'=>textField($merged,'finalidade',2000),
        'valor_recebido'=>$amount,'recebido_em'=>$date,'prestacao_situacao'=>$state,
        'observacoes'=>textField($merged,'observacoes',3000,false)];
}
function publicTransfersRoute(PDO $db,string $resource,string $method,array $input,int $id): void {
    if($resource==='total_repasses_publicos'){
        if($method!=='GET')fail('Método não permitido.',405);
        if(isset($_GET['ongId'])||isset($_GET['projetoId'])||isset($_GET['ong_id'])||isset($_GET['projeto_id']))fail('O total público é geral e não aceita filtros.');
        $total=$db->query("SELECT COALESCE(SUM(valor_recebido),0.00) FROM repasses_publicos WHERE status='Recebido'")->fetchColumn();
        respond(['totalRecebido'=>(string)$total,'simulado'=>true]);
    }
    $user=financeUser($db);
    if($resource==='contexto_repasses_publicos'){
        if($method!=='GET')fail('Método não permitido.',405);
        [$where,$args]=financeScope($user,'p');
        $ongs=$user['perfil']==='admin'?$db->query('SELECT id,nome FROM ongs ORDER BY nome')->fetchAll():sqlRows($db,'SELECT o.id,o.nome FROM ongs o JOIN usuarios_ongs v ON v.ong_id=o.id WHERE v.usuario_id=? ORDER BY o.nome',[$user['id']]);
        respond(['ongs'=>$ongs,'projetos'=>sqlRows($db,"SELECT p.id,p.ong_id,p.titulo FROM projetos p WHERE $where ORDER BY p.titulo",$args)]);
    }
    if($method==='GET'){
        if($id){$row=publicTransfer($db,$user,$id);unset($row['hash_cadastro'],$row['chave']);
            $row['documentos']=sqlRows($db,'SELECT id,tipo,nome_original,mime,tamanho,criado_em FROM documentos_repasses_publicos WHERE repasse_id=? AND excluido_em IS NULL ORDER BY id DESC',[$id]);respond(['repasse'=>$row]);}
        if(!isset($_GET['limit']))$_GET['limit']=20;
        [$page,$limit,$offset]=pageSpec();[$where,$args]=financeScope($user);
        if(($_GET['ongId']??'')!==''){$ongId=filter_var($_GET['ongId'],FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);if(!$ongId)fail('ONG inválida.');authorizeOng($db,$user,$ongId);$where.=' AND r.ong_id=?';$args[]=$ongId;}
        $where.=periodClause('r.recebido_em',reportPeriod(),$args);
        foreach(['status'=>['Recebido','Cancelado'],'prestacao'=>['Pendente','Em_preparacao','Enviada','Conferida_internamente']] as $filter=>$valid){
            if(($_GET[$filter]??'')!==''){if(!in_array($_GET[$filter],$valid,true))fail('Filtro inválido.');$column=$filter==='status'?'status':'prestacao_situacao';$where.=" AND r.$column=?";$args[]=$_GET[$filter];}
        }
        if(($_GET['pendencia']??'')==='documentos')$where.=' AND NOT EXISTS(SELECT 1 FROM documentos_repasses_publicos d WHERE d.repasse_id=r.id AND d.excluido_em IS NULL)';
        $count=sqlRows($db,"SELECT COUNT(*) n FROM repasses_publicos r WHERE $where",$args)[0]['n'];
        $summary=sqlRows($db,"SELECT COALESCE(SUM(CASE WHEN r.status='Recebido' THEN r.valor_recebido ELSE 0 END),0) recebido,COALESCE(SUM(r.status='Recebido' AND r.prestacao_situacao IN ('Pendente','Em_preparacao')),0) prestacoes_pendentes,COALESCE(SUM(r.status='Recebido' AND NOT EXISTS(SELECT 1 FROM documentos_repasses_publicos d WHERE d.repasse_id=r.id AND d.excluido_em IS NULL)),0) sem_documentos FROM repasses_publicos r WHERE $where",$args)[0];
        $rows=sqlRows($db,"SELECT r.id,r.ong_id,r.projeto_id,o.nome ong,p.titulo projeto,r.orgao_origem,r.instrumento,r.valor_recebido,r.recebido_em,r.status,r.prestacao_situacao,(SELECT COUNT(*) FROM documentos_repasses_publicos d WHERE d.repasse_id=r.id AND d.excluido_em IS NULL) documentos FROM repasses_publicos r JOIN ongs o ON o.id=r.ong_id LEFT JOIN projetos p ON p.id=r.projeto_id WHERE $where ORDER BY r.id DESC LIMIT $limit OFFSET $offset",$args);
        respond(['repasses'=>$rows,'resumo'=>$summary,'pagination'=>['page'=>$page,'limit'=>$limit,'total'=>(int)$count]]);
    }
    if(!in_array($method,['POST','PUT'],true))fail('Método não permitido.',405);csrf();
    $db->beginTransaction();
    if($method==='POST'){
        if($id)fail('Não informe ID ao cadastrar.');
        if(($input['simulado']??false)!==true)fail('Confirme que este é um registro demonstrativo.');
        $db->prepare('SELECT id FROM usuarios WHERE id=? FOR UPDATE')->execute([$user['id']]);
        $fields=publicTransferFields($db,$user,$input);$key=textField($input,'chave',80);$hash=hash('sha256',json_encode($fields,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));
        $previous=sqlRows($db,'SELECT id,hash_cadastro FROM repasses_publicos WHERE registrado_por=? AND chave=?',[$user['id'],$key]);
        if($previous){if(!hash_equals($previous[0]['hash_cadastro'],$hash))fail('Chave já utilizada com outros dados.',409);$db->commit();respond(['ok'=>true,'id'=>(int)$previous[0]['id'],'simulado'=>true]);}
        $id=insertRow($db,'repasses_publicos',$fields+['registrado_por'=>$user['id'],'chave'=>$key,'hash_cadastro'=>$hash]);
        audit($db,$user,'repasses_publicos',$id,'POST');$db->commit();respond(['ok'=>true,'id'=>$id,'simulado'=>true],201);
    }
    $row=publicTransfer($db,$user,$id,true);
    if(($input['acao']??'')==='cancelar'){
        $reason=textField($input,'justificativa',2000);if(mb_strlen($reason)<10)fail('Informe uma justificativa de ao menos 10 caracteres.');
        if($row['status']!=='Cancelado'){
            $db->prepare("UPDATE repasses_publicos SET status='Cancelado',motivo_cancelamento=?,cancelado_em=NOW() WHERE id=?")->execute([$reason,$id]);audit($db,$user,'repasses_publicos',$id,'CANCELAR','Sucesso',['motivo'=>$reason]);
        }
    }else{
        if($row['status']==='Cancelado')fail('Repasse cancelado não pode ser editado.',409);
        $fields=publicTransferFields($db,$user,$input,$row);$changed=[];foreach($fields as $key=>$value)if((string)$row[$key]!== (string)$value)$changed[]=$key;
        updateRow($db,'repasses_publicos',$id,$fields);audit($db,$user,'repasses_publicos',$id,'PUT','Sucesso',['motivo'=>'Campos alterados: '.implode(', ',$changed)]);
    }
    $db->commit();respond(['ok'=>true,'id'=>$id,'simulado'=>true]);
}
function publicDocumentDirectory(): string {
    $config=require __DIR__.'/../../config/database.php';$name=$config['database'];
    if(!preg_match('/^[a-zA-Z0-9_]+$/',$name))throw new RuntimeException('Nome de banco inválido para o armazenamento.');
    return __DIR__.'/../../storage/repasses-publicos/'.$name;
}
function publicDocumentsRoute(PDO $db,string $method,int $id): void {
    $user=financeUser($db);
    if($method==='GET'){
        $doc=record($db,'documentos_repasses_publicos',$id);publicTransfer($db,$user,(int)$doc['repasse_id']);
        if($doc['excluido_em'])fail('Documento removido.',404);
        $path=publicDocumentDirectory().'/'.$doc['arquivo'];
        if(!is_file($path))fail('Documento não está disponível.',404);
        if(!hash_equals($doc['sha256'],hash_file('sha256',$path)))throw new RuntimeException('Integridade do documento comprometida.');
        audit($db,$user,'documentos_repasses_publicos',$id,'DOWNLOAD');session_write_close();
        header('Content-Type: '.$doc['mime']);header('Content-Length: '.filesize($path));
        header("Content-Disposition: attachment; filename=\"documento-$id\"; filename*=UTF-8''".rawurlencode($doc['nome_original']));
        header('X-Content-Type-Options: nosniff');header("Content-Security-Policy: sandbox; default-src 'none'");readfile($path);exit;
    }
    if(!in_array($method,['POST','DELETE'],true))fail('Método não permitido.',405);csrf();
    $db->beginTransaction();
    if($method==='DELETE'){
        $doc=record($db,'documentos_repasses_publicos',$id);publicTransfer($db,$user,(int)$doc['repasse_id'],true);
        if(!$doc['excluido_em']){$db->prepare('UPDATE documentos_repasses_publicos SET excluido_em=NOW() WHERE id=?')->execute([$id]);audit($db,$user,'documentos_repasses_publicos',$id,'DELETE');}
        $db->commit();respond(['ok'=>true]);
    }
    if($id)fail('Não informe ID ao enviar documento.');
    if((int)($_SERVER['CONTENT_LENGTH']??0)>2200000)fail('O envio deve ter até 2 MB.',413);
    $rid=filter_var($_POST['repasse_id']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);if(!$rid)fail('Informe o repasse.');
    $row=publicTransfer($db,$user,$rid,true);if($row['status']==='Cancelado')fail('Não envie documentos a um repasse cancelado.',409);
    $type=textField($_POST,'tipo',30);if(!in_array($type,['Instrumento','Plano_trabalho','Comprovante','Prestacao_contas','Outro'],true))fail('Tipo de documento inválido.');
    $file=$_FILES['arquivo']??null;
    if(!$file||!is_int($file['error']??null)||$file['error']!==UPLOAD_ERR_OK)fail('Selecione um arquivo válido de até 2 MB.');
    if(!is_uploaded_file($file['tmp_name'])||$file['size']<=0||$file['size']>2097152)fail('O arquivo deve ter até 2 MB.',413);
    $mime=(new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);$types=['application/pdf'=>'pdf','image/jpeg'=>'jpg','image/png'=>'png'];
    if(!isset($types[$mime]))fail('Envie somente PDF, JPG ou PNG.');
    $hash=hash_file('sha256',$file['tmp_name']);
    if(sqlRows($db,'SELECT id FROM documentos_repasses_publicos WHERE repasse_id=? AND sha256=? AND excluido_em IS NULL',[$rid,$hash]))fail('Este documento já está vinculado ao repasse.',409);
    $name=preg_replace('/[\x00-\x1F\x7F]/u','',basename(str_replace('\\','/',$file['name'])));$name=mb_substr($name,0,180);if(!$name)$name='documento.'.$types[$mime];
    $directory=publicDocumentDirectory();if(!is_dir($directory)&&!mkdir($directory,0750,true)&&!is_dir($directory))throw new RuntimeException('Não foi possível preparar armazenamento privado.');
    $stored=bin2hex(random_bytes(32)).'.'.$types[$mime];$path=$directory.'/'.$stored;
    if(!move_uploaded_file($file['tmp_name'],$path))throw new RuntimeException('Falha ao armazenar documento.');
    chmod($path,0640);
    try{$docId=insertRow($db,'documentos_repasses_publicos',['repasse_id'=>$rid,'tipo'=>$type,'nome_original'=>$name,'arquivo'=>$stored,'mime'=>$mime,'tamanho'=>$file['size'],'sha256'=>$hash,'enviado_por'=>$user['id']]);
        audit($db,$user,'documentos_repasses_publicos',$docId,'POST');$db->commit();
    }catch(Throwable $e){if(is_file($path))unlink($path);throw $e;}
    respond(['ok'=>true,'id'=>$docId],201);
}
