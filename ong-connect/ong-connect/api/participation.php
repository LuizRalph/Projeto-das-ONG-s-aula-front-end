<?php
declare(strict_types=1);
function sqlRows(PDO $db,string $sql,array $args=[]): array {$s=$db->prepare($sql);$s->execute($args);return $s->fetchAll();}
function opportunity(PDO $db,int $id): array {
    $rows=sqlRows($db,'SELECT o.*,p.ong_id,p.status AS projeto_status FROM oportunidades o JOIN projetos p ON p.id=o.projeto_id WHERE o.id=?',[$id]);
    if(!$rows)fail('Oportunidade não encontrada.',404);
    $r=$rows[0];$r['agenda']=json_decode($r['dados'],true,512,JSON_THROW_ON_ERROR);return $r;
}
function activeCount(PDO $db,int $id): int {return (int)sqlRows($db,"SELECT COUNT(*) AS n FROM candidaturas WHERE oportunidade_id=? AND status='Aprovado'",[$id])[0]['n'];}
function checkSchedule(PDO $db,int $uid,array $agenda,int $exclude=0): void {
    $days=$agenda['diasAtuacao']??$agenda['diasEspecificos']??[];
    foreach(sqlRows($db,"SELECT c.id,o.dados FROM candidaturas c JOIN oportunidades o ON o.id=c.oportunidade_id WHERE c.usuario_id=? AND c.ativa=1 AND c.id<>?",[$uid,$exclude]) as $r){
        $other=json_decode($r['dados'],true,512,JSON_THROW_ON_ERROR);
        if(array_intersect($days,$other['diasAtuacao']??$other['diasEspecificos']??[]) &&
           (($agenda['horarioInicio']??'')?:'00:00')<(($other['horarioFim']??'')?:'23:59') &&
           (($other['horarioInicio']??'')?:'00:00')<(($agenda['horarioFim']??'')?:'23:59'))fail('Já existe candidatura ativa com conflito de agenda.',409);
    }
}
function history(PDO $db,int $id,array $user,?string $old,string $new,string $reason): void {
    insertRow($db,'historico_candidaturas',['candidatura_id'=>$id,'autor_id'=>$user['id'],'status_anterior'=>$old,'status_novo'=>$new,'justificativa'=>$reason]);
}
function pageSpec(): array {
    $page=filter_var($_GET['page']??1,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
    $limit=filter_var($_GET['limit']??100,FILTER_VALIDATE_INT,['options'=>['min_range'=>1,'max_range'=>100]]);
    if(!$page||!$limit)fail('Paginação inválida.');return [$page,$limit,($page-1)*$limit];
}
function participationRoute(PDO $db,string $resource,string $method,array $input,int $id): void {
    $user=currentUser($db);[$page,$limit,$offset]=pageSpec();
    if($method==='GET') {
        $table=$resource==='candidaturas'?'candidaturas':'doacoes';
        $join=$table==='candidaturas'?'JOIN oportunidades o ON o.id=r.oportunidade_id JOIN projetos p ON p.id=o.projeto_id':'JOIN projetos p ON p.id=r.projeto_id';
        $where=[];$args=[];
        if($user['perfil']==='voluntario'){$where[]='r.usuario_id=?';$args[]=$user['id'];}
        elseif($user['perfil']==='ong'){$where[]='EXISTS(SELECT 1 FROM usuarios_ongs v WHERE v.ong_id=p.ong_id AND v.usuario_id=?)';$args[]=$user['id'];}
        foreach(['ongId'=>'p.ong_id','projetoId'=>'p.id','status'=>'r.status'] as $key=>$col)if(isset($_GET[$key])){$where[]="$col=?";$args[]=$_GET[$key];}
        if($table==='candidaturas'&&isset($_GET['oportunidadeId'])){$where[]='r.oportunidade_id=?';$args[]=$_GET['oportunidadeId'];}
        $clause=$where?' WHERE '.implode(' AND ',$where):'';
        $total=(int)sqlRows($db,"SELECT COUNT(*) n FROM $table r $join $clause",$args)[0]['n'];
        $rows=sqlRows($db,"SELECT r.*,u.nome,u.email FROM $table r $join JOIN usuarios u ON u.id=r.usuario_id $clause ORDER BY r.criado_em,r.id LIMIT $limit OFFSET $offset",$args);
        $histories=[];
        if($table==='candidaturas'&&$rows){$ids=array_column($rows,'id');$marks=implode(',',array_fill(0,count($ids),'?'));
            foreach(sqlRows($db,"SELECT h.*,u.nome responsavel FROM historico_candidaturas h JOIN usuarios u ON u.id=h.autor_id WHERE h.candidatura_id IN ($marks) ORDER BY h.id",$ids) as $h){$h['status']=$h['status_novo'];$h['statusAnterior']=$h['status_anterior'];$h['data']=$h['criado_em'];$histories[$h['candidatura_id']][]=$h;}}
        foreach($rows as &$r){$r['id']=(int)$r['id'];$r['data']=$r['criado_em'];
            if($table==='candidaturas'){$details=json_decode($r['dados'],true,512,JSON_THROW_ON_ERROR);unset($r['dados']);$r=array_merge($details,$r);$r['oportunidadeId']=(int)$r['oportunidade_id'];$r['historico']=$histories[$r['id']]??[];}
            else{$r['projetoId']=(int)$r['projeto_id'];$r['valor']=(float)$r['valor'];$r['simulada']=true;unset($r['chave']);}}
        unset($r);respond([$resource=>$rows,'pagination'=>['page'=>$page,'limit'=>$limit,'total'=>$total]]);
    }
    csrf();
    if($resource==='doacoes') {
        if($method==='POST') {
            $projectId=filter_var($input['projetoId']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
            if(!$projectId)fail('Projeto inválido.');$project=record($db,'projetos',$projectId);
            if($project['status']!=='Ativo')fail('Projeto indisponível para contribuições.',409);
            $value=(string)($input['valor']??'');
            if(!preg_match('/^\d{1,10}(\.\d{1,2})?$/',$value)||(float)$value<=0)fail('Valor inválido.');
            $key=textField($input,'chave',80);
            $db->beginTransaction();
            $db->prepare('SELECT id FROM usuarios WHERE id=? FOR UPDATE')->execute([$user['id']]);
            $previous=sqlRows($db,'SELECT * FROM doacoes WHERE usuario_id=? AND chave=?',[$user['id'],$key]);
            if($previous){$r=$previous[0];if((int)$r['projeto_id']!==$projectId||$r['valor']!==number_format((float)$value,2,'.',''))fail('Chave já utilizada com outros dados.',409);$db->commit();respond(['ok'=>true,'id'=>(int)$r['id'],'simulada'=>true]);}
            $id=insertRow($db,'doacoes',['projeto_id'=>$projectId,'usuario_id'=>$user['id'],'valor'=>$value,'chave'=>$key]);
            audit($db,$user,'doacoes',$id,'POST');$db->commit();respond(['ok'=>true,'id'=>$id,'simulada'=>true],201);
        }
        if($method==='PUT'&&$id){$db->beginTransaction();$db->prepare('SELECT id FROM doacoes WHERE id=? FOR UPDATE')->execute([$id]);$r=record($db,'doacoes',$id);
            if($user['perfil']!=='admin'&&(int)$r['usuario_id']!==$user['id'])fail('Acesso não permitido.',403);
            if(($input['status']??'')!=='Cancelada')fail('Somente cancelamento é permitido.');
            updateRow($db,'doacoes',$id,['status'=>'Cancelada']);audit($db,$user,'doacoes',$id,'PUT');$db->commit();respond(['ok'=>true,'id'=>$id]);}
        fail('Operação não permitida.',405);
    }
    if(!in_array($method,['POST','PUT'],true))fail('Operação não permitida.',405);
    $existing=$method==='PUT'?record($db,'candidaturas',$id):null;
    $uid=$existing?(int)$existing['usuario_id']:$user['id'];
    $oid=$existing?(int)$existing['oportunidade_id']:(int)($input['oportunidadeId']??0);
    $db->beginTransaction();
    // Ordem de bloqueio: usuário, oportunidade, candidatura. Consultas usam READ COMMITTED.
    $db->prepare('SELECT id FROM usuarios WHERE id=? FOR UPDATE')->execute([$uid]);
    $db->prepare('SELECT id FROM oportunidades WHERE id=? FOR UPDATE')->execute([$oid]);
    $opp=opportunity($db,$oid);$agenda=$opp['agenda'];
    if($method==='POST') {
        if($user['perfil']!=='voluntario')fail('Use uma conta de voluntário para candidatar-se.',403);
        if($opp['projeto_status']!=='Ativo'||!($agenda['ativa']??true))fail('Inscrições encerradas.',409);
        if(sqlRows($db,'SELECT id FROM candidaturas WHERE usuario_id=? AND oportunidade_id=? AND ativa=1',[$uid,$oid]))fail('Já existe candidatura ativa.',409);
        checkSchedule($db,$uid,$agenda);
        if(($input['consentimento']??false)!==true)fail('Confirme o consentimento.');
        $details=[];foreach(['telefone'=>40,'cidade'=>150,'estado'=>2,'motivacao'=>2000,'habilidades'=>2000,'experiencia'=>2000,'disponibilidade'=>1000,'nascimento'=>10] as $k=>$max)$details[$k]=textField($input,$k,$max,false);
        if($details['nascimento']!==''){
            $birth=DateTimeImmutable::createFromFormat('!Y-m-d',$details['nascimento']);
            if(!$birth||$birth->format('Y-m-d')!==$details['nascimento']||$birth>new DateTimeImmutable('today'))fail('Data de nascimento inválida.');
        }
        $details['agendaDias']=$agenda['diasAtuacao']??$agenda['diasEspecificos']??[];$details['agendaInicio']=$agenda['horarioInicio']??'';$details['agendaFim']=$agenda['horarioFim']??'';
        $status=activeCount($db,$oid)>=(int)$agenda['vagas']?'Lista de espera':'Pendente';
        $id=insertRow($db,'candidaturas',['usuario_id'=>$uid,'oportunidade_id'=>$oid,'status'=>$status,'dados'=>json_encode($details,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
        history($db,$id,$user,null,$status,'Inscrição recebida.');
    }else{
        $old=record($db,'candidaturas',$id);$status=textField($input,'status',30);$reason=textField($input,'justificativa',2000,false);
        if($status==='Cancelado') {if($uid!==$user['id'])authorizeOng($db,$user,(int)$opp['ong_id']);}
        else authorizeOng($db,$user,(int)$opp['ong_id']);
        if($old['status']===$status){$db->commit();respond(['ok'=>true,'id'=>$id]);}
        $transitions=['Pendente'=>['Aprovado','Rejeitado','Lista de espera','Cancelado'],'Lista de espera'=>['Aprovado','Rejeitado','Cancelado'],'Aprovado'=>['Cancelado'],'Rejeitado'=>[],'Cancelado'=>[]];
        if(!in_array($status,$transitions[$old['status']],true))fail('Transição de status inválida.',409);
        if($status==='Rejeitado'&&$reason==='')fail('Informe a justificativa.');
        if($status==='Aprovado'){
            if($opp['projeto_status']!=='Ativo'||!($agenda['ativa']??true))fail('Oportunidade indisponível.',409);
            if(activeCount($db,$oid)>=(int)$agenda['vagas'])fail('Não há vagas disponíveis.',409);
            checkSchedule($db,$uid,$agenda,$id);
            $first=sqlRows($db,"SELECT id FROM candidaturas WHERE oportunidade_id=? AND status='Lista de espera' ORDER BY criado_em,id LIMIT 1",[$oid]);
            if($first&&(int)$first[0]['id']!==$id)fail('Analise primeiro a candidatura mais antiga da fila.',409);
        }
        updateRow($db,'candidaturas',$id,['status'=>$status]);history($db,$id,$user,$old['status'],$status,$reason?:'Alteração de situação.');
        if($status==='Aprovado'&&activeCount($db,$oid)>=(int)$agenda['vagas']){
            foreach(sqlRows($db,"SELECT id FROM candidaturas WHERE oportunidade_id=? AND status='Pendente' ORDER BY id",[$oid]) as $pending){updateRow($db,'candidaturas',(int)$pending['id'],['status'=>'Lista de espera']);history($db,(int)$pending['id'],$user,'Pendente','Lista de espera','Capacidade preenchida.');}
        }
    }
    audit($db,$user,'candidaturas',$id,$method);$db->commit();respond(['ok'=>true,'id'=>$id],$method==='POST'?201:200);
}
