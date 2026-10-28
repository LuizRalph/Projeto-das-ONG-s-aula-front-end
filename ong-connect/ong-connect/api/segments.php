<?php
declare(strict_types=1);
function segmentsRoute(PDO $db,string $method,array $input,int $id): void {
    $user=currentUser($db);requireAdmin($user);
    if($method==='GET')respond(['segmentos'=>sqlRows($db,'SELECT id,nome,ativo FROM segmentos ORDER BY nome')]);
    csrf();
    if(!in_array($method,['POST','PUT'],true))fail('Método não permitido.',405);
    $name=preg_replace('/\s+/u',' ',textField($input,'nome',100));
    if(mb_strlen($name)<2)fail('Informe um nome com ao menos dois caracteres.');
    $active=$input['ativo']??true;
    if(!is_bool($active))fail('Situação inválida.');
    $db->beginTransaction();
    $db->query('SELECT id FROM mvp_lock WHERE id=1 FOR UPDATE')->fetch();
    $duplicate=sqlRows($db,'SELECT id FROM segmentos WHERE nome=? AND id<>?',[$name,$id]);
    if($duplicate)fail('Já existe um segmento com esse nome.',409);
    if($method==='POST'){$id=insertRow($db,'segmentos',['nome'=>$name,'ativo'=>(int)$active]);}
    else {
        record($db,'segmentos',$id);
        updateRow($db,'segmentos',$id,['nome'=>$name,'ativo'=>(int)$active]);
        $db->prepare('UPDATE projetos SET categoria=? WHERE segmento_id=?')->execute([$name,$id]);
    }
    audit($db,$user,'segmentos',$id,$method);$db->commit();
    respond(['ok'=>true,'id'=>$id],$method==='POST'?201:200);
}
function projectSegment(PDO $db,array $input,?array $previous): array {
    $sid=filter_var($input['segmentoId']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
    // Compatibilidade com clientes antigos: somente nomes já cadastrados são aceitos.
    if(!$sid&&isset($input['categoria'])){
        $rows=sqlRows($db,'SELECT id FROM segmentos WHERE nome=?',[trim((string)$input['categoria'])]);$sid=$rows?(int)$rows[0]['id']:0;
    }
    if(!$sid)fail('Selecione um segmento cadastrado.');
    $segment=record($db,'segmentos',$sid);
    if(!(int)$segment['ativo']&&(!$previous||(int)$previous['segmento_id']!==$sid))fail('Este segmento está desativado. Selecione um segmento ativo.');
    return ['segmento_id'=>$sid,'categoria'=>$segment['nome']];
}
