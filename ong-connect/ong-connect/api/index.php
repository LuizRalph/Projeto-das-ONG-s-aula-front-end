<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/opportunities.php';
require __DIR__ . '/security.php';
require __DIR__ . '/participation.php';
require __DIR__ . '/cnpj.php';
require __DIR__ . '/public-transfers.php';
require __DIR__ . '/segments.php';
require __DIR__ . '/reports.php';
$requestId=bin2hex(random_bytes(16));
header('X-Request-Id: '.$requestId);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

try {
    $db = database();
    startSession();
    $method = $_SERVER['REQUEST_METHOD'];
    $resource = $_GET['resource'] ?? 'catalogo';
    if($resource==='auditoria') {
        $auditUser=currentUser($db);requireAdmin($auditUser);
        if($method!=='GET')fail('Método não permitido.',405);
        [$page,$limit,$offset]=pageSpec();$where=[];$args=[];
        foreach(['autorId'=>'autor_id','recurso'=>'recurso','resultado'=>'resultado'] as $key=>$column)if(isset($_GET[$key])){$where[]="$column=?";$args[]=$_GET[$key];}
        $clause=$where?' WHERE '.implode(' AND ',$where):'';
        $period=reportPeriod();$dates=periodClause('criado_em',$period,$args);
        $clause=($clause?:' WHERE 1=1').$dates;
        if(isset($_GET['registroId'])&&$_GET['registroId']!==''){$clause.=' AND registro_id=?';$args[]=$_GET['registroId'];}
        $count=$db->prepare('SELECT COUNT(*) FROM auditoria'.$clause);$count->execute($args);
        $rows=$db->prepare("SELECT * FROM auditoria$clause ORDER BY id DESC LIMIT $limit OFFSET $offset");$rows->execute($args);
        $entries=$rows->fetchAll();
        $targets=['projetos'=>['projetos','titulo'],'ongs'=>['ongs','nome'],'segmentos'=>['segmentos','nome'],'repasses_publicos'=>['repasses_publicos','instrumento']];
        foreach($targets as $resourceName=>[$table,$column]){
            $ids=array_values(array_unique(array_column(array_filter($entries,fn($r)=>$r['recurso']===$resourceName),'registro_id')));
            if(!$ids)continue;$marks=implode(',',array_fill(0,count($ids),'?'));
            $names=array_column(sqlRows($db,"SELECT id,$column nome FROM $table WHERE id IN ($marks)",$ids),'nome','id');
            foreach($entries as &$entry)if($entry['recurso']===$resourceName)$entry['alvo_nome']=$names[(int)$entry['registro_id']]??null;unset($entry);
        }
        respond(['auditoria'=>$entries,'pagination'=>['page'=>$page,'limit'=>$limit,'total'=>(int)$count->fetchColumn()]]);
    }
    $id = filter_var($_GET['id'] ?? 0, FILTER_VALIDATE_INT, ['options'=>['min_range'=>0]]);
    if ($id === false) fail('Identificador inválido.');
    if($resource==='documentos_repasses_publicos')publicDocumentsRoute($db,$method,$id);
    $input=[];
    if($method!=='GET') {
        if((int)($_SERVER['CONTENT_LENGTH']??0)>65536)fail('Requisição muito grande.',413);
        $raw=file_get_contents('php://input',false,null,0,65537);
        if(strlen($raw)>65536)fail('Requisição muito grande.',413);
        $input=$raw===''?[]:json_decode($raw,true,512,JSON_THROW_ON_ERROR);
        if(!is_array($input)||($input!==[]&&array_is_list($input)))fail('Envie um objeto JSON.');
    }
    if(in_array($resource,['repasses_publicos','total_repasses_publicos','contexto_repasses_publicos'],true))publicTransfersRoute($db,$resource,$method,$input,(int)$id);
    if($resource==='relatorios')reportsRoute($db,$method);
    if($resource==='segmentos')segmentsRoute($db,$method,$input,(int)$id);
    if(in_array($resource,['sessao','login','cadastro','logout','perfil','vinculos'],true))authRoute($db,$resource,$method,$input);
    if(in_array($resource,['candidaturas','doacoes'],true)) {
        session_write_close();
        participationRoute($db,$resource,$method,$input,$id);
    }
    $user=currentUser($db,false);
    if($resource==='solicitacoes'&&$method==='GET'){if(!$user)fail('Entre na sua conta.',401);requireAdmin($user);}
    if($method!=='GET'&&!($resource==='solicitacoes'&&$method==='POST')){
        if(!$user)fail('Entre na sua conta.',401);csrf();
        if(in_array($resource,['publicar','rejeitar','ongs'],true)){
            if($resource==='ongs'&&$method==='PUT')authorizeOng($db,$user,$id);else requireAdmin($user);
        }elseif($resource==='projetos'){
            $ongId=$method==='POST'?(int)($input['ongId']??0):(int)record($db,'projetos',$id)['ong_id'];
            authorizeOng($db,$user,$ongId);
            if(isset($input['ongId']))authorizeOng($db,$user,(int)$input['ongId']);
        }elseif($resource==='oportunidades'){
            $pid=$method==='POST'?(int)($input['projetoId']??0):(int)record($db,'oportunidades',$id)['projeto_id'];
            authorizeOng($db,$user,(int)record($db,'projetos',$pid)['ong_id']);
        }
    }
    session_write_close();
    if ($method === 'GET') {
        if ($resource === 'catalogo') {
            $ongs = array_map('publicOng', $db->query('SELECT id,nome,sigla,cnpj,categoria,cidade,email,telefone,descricao,missao,cor,imagem,criado_em FROM ongs ORDER BY id')->fetchAll());
            $projects = array_map('publicProject', $db->query("SELECT p.id,p.ong_id,p.segmento_id,p.titulo,p.categoria,p.descricao,p.objetivo,p.publico_alvo,p.atividades,p.orientacoes_voluntariado,p.uso_recursos,p.meta,p.status,p.emoji,p.imagem,p.criado_em,COALESCE((SELECT SUM(d.valor) FROM doacoes d WHERE d.projeto_id=p.id AND d.status='Simulada'),0) arrecadado,(SELECT COUNT(*) FROM candidaturas c JOIN oportunidades o ON o.id=c.oportunidade_id WHERE o.projeto_id=p.id AND c.status='Aprovado') voluntarios FROM projetos p ORDER BY p.id")->fetchAll());
            $opportunities = array_map(function ($r) {
                $out = json_decode($r['dados'], true, 512, JSON_THROW_ON_ERROR);
                $out['id'] = (int)$r['id'];
                $out['projetoId'] = (int)$r['projeto_id'];
                $out['aprovados']=(int)$r['aprovados'];$out['espera']=(int)$r['espera'];
                return $out;
            }, $db->query("SELECT o.id,o.projeto_id,o.dados,(SELECT COUNT(*) FROM candidaturas c WHERE c.oportunidade_id=o.id AND c.status='Aprovado') aprovados,(SELECT COUNT(*) FROM candidaturas c WHERE c.oportunidade_id=o.id AND c.status='Lista de espera') espera FROM oportunidades o ORDER BY o.id")->fetchAll());
            $segments=sqlRows($db,'SELECT id,nome,ativo FROM segmentos ORDER BY nome');
            foreach($projects as &$project)$project['segmentoId']=(int)$project['segmento_id'];unset($project);
            respond(['ongs'=>$ongs, 'projetos'=>$projects, 'oportunidades'=>$opportunities,'segmentos'=>$segments]);
        }
        if ($resource === 'solicitacoes') {
            [$page,$limit,$offset]=pageSpec();
            $rows = $db->query("SELECT * FROM solicitacoes_ongs ORDER BY id DESC LIMIT $limit OFFSET $offset")->fetchAll();
            $histories=[];
            if($rows){$ids=array_column($rows,'id');$marks=implode(',',array_fill(0,count($ids),'?'));foreach(sqlRows($db,"SELECT * FROM historico_solicitacoes WHERE solicitacao_id IN ($marks) ORDER BY id",$ids) as $h)$histories[$h['solicitacao_id']][]=$h;}
            foreach ($rows as &$r) {
                $r['id'] = (int)$r['id'];
                $r['historico'] = $histories[$r['id']]??[];
                $control=$db->prepare('SELECT bloqueado_em,(SELECT COUNT(*) FROM historico_solicitacoes h WHERE h.controle_cnpj_id=c.id AND h.rejeicao_unica IS NOT NULL) rejeicoes FROM controle_cnpj c WHERE c.id=?');$control->execute([$r['controle_cnpj_id']]);$summary=$control->fetch();
                $r['rejeicoes']=(int)($summary['rejeicoes']??0);$r['cnpjBloqueado']=!empty($summary['bloqueado_em']);
            }
            unset($r);
            respond(['solicitacoes'=>$rows,'pagination'=>['page'=>$page,'limit'=>$limit,'total'=>(int)$db->query('SELECT COUNT(*) FROM solicitacoes_ongs')->fetchColumn()]]);
        }
        fail('Recurso não encontrado.', 404);
    }
    if (!in_array($method, ['POST','PUT','DELETE'], true)) fail('Método não permitido.', 405);
    if (!in_array($resource, ['solicitacoes','publicar','rejeitar','ongs','projetos','oportunidades'], true)) fail('Recurso não encontrado.',404);
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 65536) fail('Requisição muito grande.',413);
    $raw = file_get_contents('php://input');
    if (strlen($raw) > 65536) fail('Requisição muito grande.',413);
    $input = $raw === '' ? [] : json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($input) || ($input !== [] && array_is_list($input))) fail('Envie um objeto JSON.');

    // Serializa as escritas pequenas do MVP: evita duplicação de CNPJ entre requisições simultâneas.
    $db->beginTransaction();
    $db->query('SELECT id FROM mvp_lock WHERE id = 1 FOR UPDATE')->fetch();
    $created = false;
    if ($resource === 'solicitacoes' && $method === 'POST' && !$id) {
        $fields = ongFields($input, true);
        if (($input['consentimento'] ?? false) !== true) fail('Confirme o uso de dados fictícios.');
        $control=controlCnpj($db,$fields['cnpj']);
        if($control['bloqueado_em'])fail('Este CNPJ está bloqueado após três rejeições de cadastro.',409);
        $fields['controle_cnpj_id']=$control['id'];
        checkCnpj($db, $fields['cnpj']);
        $stmt = $db->prepare("SELECT id FROM solicitacoes_ongs WHERE cnpj = ? AND status = 'Rejeitado' ORDER BY id DESC LIMIT 1");
        $stmt->execute([$fields['cnpj']]);
        $previous = $stmt->fetchColumn();
        $fields['solicitacao_anterior_id'] = $previous ?: null;
        $id = insertRow($db, 'solicitacoes_ongs', $fields);
        requestHistory($db,['id'=>$id,'controle_cnpj_id'=>$control['id']],'Pendente','Solicitação recebida.',$user);
        $created = true;
    } elseif (in_array($resource, ['publicar','rejeitar'], true) && $method === 'POST' && $id) {
        $request = record($db, 'solicitacoes_ongs', $id);
        controlCnpj($db,$request['cnpj']);
        if ($request['status'] !== 'Pendente') fail('Esta solicitação já foi analisada.',409);
        if ($resource === 'rejeitar') {
            $reason = textField($input, 'motivo', 2000);
            updateRow($db, 'solicitacoes_ongs', $id, ['status'=>'Rejeitado','motivo'=>$reason]);
            $next = 'Rejeitado';
        } else {
            $fields = ongFields($input);
            if ($fields['cnpj'] !== $request['cnpj']) fail('O CNPJ deve corresponder à solicitação.');
            checkCnpj($db, $fields['cnpj'], 0, $id);
            $ongId = insertRow($db, 'ongs', $fields);
            $ongAccess = provisionOngAccess($db,$fields,$ongId,$user);
            updateRow($db, 'solicitacoes_ongs', $id, ['status'=>'Cadastrada','ong_id'=>$ongId]);
            $next = 'Cadastrada';
            $reason = 'Cadastro revisado e publicado no painel de demonstração.';
        }
        requestHistory($db,$request,$next,$reason,$user);
    } elseif ($resource === 'ongs' && in_array($method, ['POST','PUT','DELETE'], true)) {
        if ($method !== 'POST') record($db, 'ongs', $id);
        if ($method === 'DELETE') {
            $stmt = $db->prepare('SELECT id FROM projetos WHERE ong_id = ? LIMIT 1');
            $stmt->execute([$id]);
            if ($stmt->fetch()) fail('Exclua os projetos vinculados antes de excluir a ONG.',409);
            $db->prepare('DELETE FROM ongs WHERE id = ?')->execute([$id]);
        } else {
            if ($method === 'POST' && $id) fail('Não informe ID ao cadastrar.');
            $fields = ongFields($input);
            checkCnpj($db, $fields['cnpj'], $method === 'PUT' ? $id : 0);
            if ($method === 'PUT') updateRow($db, 'ongs', $id, $fields);
            else { $id = insertRow($db, 'ongs', $fields); $created = true; }
        }
    } elseif ($resource === 'oportunidades' && in_array($method,['POST','PUT'],true)) {
        $previous=null;
        if ($method === 'PUT') {
            $row=record($db,'oportunidades',$id);
            $previous=json_decode($row['dados'],true,512,JSON_THROW_ON_ERROR);
        } elseif ($id) fail('Não informe ID ao cadastrar vagas.');
        $projectId=filter_var($input['projetoId'] ?? null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
        if (!$projectId) fail('Selecione um projeto.');
        $project=record($db,'projetos',$projectId);
        if (isset($row) && (int)$row['projeto_id'] !== $projectId) fail('A vaga pertence a outro projeto.',409);
        $opportunity=opportunityFields($input,$previous);
        if($method==='PUT') {
            $db->prepare('SELECT id FROM oportunidades WHERE id=? FOR UPDATE')->execute([$id]);
            if($opportunity['vagas']<activeCount($db,$id))fail('Capacidade inferior à ocupação atual.',409);
            $changed=false;foreach(['diasAtuacao','horarioInicio','horarioFim'] as $key)if(($opportunity[$key]??null)!==($previous[$key]??null))$changed=true;
            if($changed&&sqlRows($db,'SELECT id FROM candidaturas WHERE oportunidade_id=? AND ativa=1 LIMIT 1',[$id]))fail('Não altere a agenda enquanto houver candidaturas ativas.',409);
        }
        $fields=['projeto_id'=>$projectId,'dados'=>json_encode($opportunity,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)];
        if ($method === 'PUT') updateRow($db,'oportunidades',$id,$fields);
        else {$id=insertRow($db,'oportunidades',$fields);$created=true;}
    } elseif ($resource === 'projetos' && in_array($method, ['POST','PUT','DELETE'], true)) {
        $previousProject=$method !== 'POST' ? record($db, 'projetos', $id) : null;
        if ($method === 'DELETE') {
            if (hasProjectOpportunities($db,$id)) fail('Este projeto possui vagas vinculadas. Para preservar as inscrições, edite a situação para Pausado ou Concluído.',409);
            $db->prepare('DELETE FROM projetos WHERE id = ?')->execute([$id]);
        } else {
            if ($method === 'POST' && $id) fail('Não informe ID ao cadastrar.');
            $ongId = filter_var($input['ongId'] ?? null, FILTER_VALIDATE_INT, ['options'=>['min_range'=>1]]);
            if (!$ongId) fail('Selecione uma ONG.');
            record($db, 'ongs', $ongId);
            if ($previousProject && (int)$previousProject['ong_id'] !== $ongId && hasProjectOpportunities($db,$id)) fail('A ONG não pode ser alterada enquanto houver vagas vinculadas ao projeto.',409);
            $fields = ['ong_id'=>$ongId]+projectSegment($db,$input,$previousProject);
            foreach (['titulo'=>150,'descricao'=>10000] as $key=>$max) $fields[$key] = textField($input,$key,$max);
            if (mb_strlen($fields['titulo']) < 3 || mb_strlen($fields['descricao']) < 10) fail('Título deve ter ao menos 3 caracteres e descrição ao menos 10.');
            foreach(['objetivo','publico_alvo','atividades','orientacoes_voluntariado','uso_recursos'] as $detail) {
                if($method==='POST'||array_key_exists($detail,$input)) {
                    $fields[$detail]=textField($input,$detail,3000);
                    if(mb_strlen($fields[$detail])<10)fail('Informe ao menos 10 caracteres em '.$detail.'.');
                }
            }
            foreach (['meta'] as $key) {
                $value = $input[$key] ?? ($previousProject[$key] ?? 0);
                if (!is_numeric($value) || !is_finite((float)$value) || $value < 0 || $value > 9999999999.99) fail("Valor inválido: $key.");
                $fields[$key] = round((float)$value,2);
            }
            $vol = filter_var($input['voluntarios'] ?? ($previousProject['voluntarios'] ?? 0), FILTER_VALIDATE_INT, ['options'=>['min_range'=>0,'max_range'=>100000]]);
            if ($vol === false) fail('Quantidade de voluntários inválida.');
            // Totais históricos permanecem preservados; a API publica métricas derivadas.
            $fields['status'] = textField($input,'status',30);
            if (!in_array($fields['status'],['Ativo','Concluído','Pausado'],true)) fail('Status inválido.');
            $fields['emoji'] = textField($input,'emoji',20,false) ?: '🤝';
            $fields['imagem'] = imageField($input);
            if ($method === 'PUT') updateRow($db,'projetos',$id,$fields);
            else { $id = insertRow($db,'projetos',$fields); $created = true; }
        }
    } else fail('Operação não permitida.',405);
    audit($db,$user,$resource,$id,$method);
    $db->commit();
    respond(['ok'=>true,'id'=>$id,...(isset($ongAccess)?['acesso'=>$ongAccess]:[])], $created ? 201 : 200);
} catch (ApiError $e) {
    if(isset($db)&&$db->inTransaction())$db->rollBack();
    if(isset($db)&&($_SERVER['REQUEST_METHOD']??'GET')!=='GET') {
        try {audit($db,currentUser($db,false),substr((string)($resource??'api'),0,50),0,substr((string)($_SERVER['REQUEST_METHOD']??''),0,30),'Falha',['httpStatus'=>$e->getCode()]);}catch(Throwable $auditError){error_log('Falha ao registrar auditoria '.$requestId);}
    }
    respond(['error'=>$e->getMessage()],$e->getCode());
} catch (JsonException $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    respond(['error'=>'JSON inválido.'],400);
} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    $correlation=bin2hex(random_bytes(8));
    error_log('ONG Connect '.$correlation.' '.get_class($e).' code='.$e->getCode());
    if($e instanceof PDOException&&$e->getCode()==='23000')respond(['error'=>'Operação em conflito com registros existentes.','requestId'=>$correlation],409);
    $unavailable=$e instanceof PDOException&&(str_starts_with((string)$e->getCode(),'08')||in_array((int)($e->errorInfo[1]??0),[1040,1049,2002,2003,2006,2013],true));
    $deadlock=$e instanceof PDOException&&in_array((int)($e->errorInfo[1]??0),[1205,1213],true);
    respond(['error'=>$deadlock?'Operação concorrente. Tente novamente.':($unavailable?'Serviço indisponível.':'Não foi possível concluir a operação.'),'requestId'=>$correlation],$deadlock?409:($unavailable?503:500));
}
