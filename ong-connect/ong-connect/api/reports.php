<?php
declare(strict_types=1);
// Datas inclusivas. Os limites por timestamp usam fim exclusivo para incluir o dia inteiro.
function reportPeriod(): array {
    $start=$_GET['inicio']??'';$end=$_GET['fim']??'';
    foreach([$start,$end] as $value){
        if(!is_string($value))fail('Período inválido.');
        if($value!==''){$date=DateTimeImmutable::createFromFormat('!Y-m-d',$value);if(!$date||$date->format('Y-m-d')!==$value)fail('Informe datas válidas.');}
    }
    if($start!==''&&$end!==''&&$start>$end)fail('A data inicial deve ser anterior ou igual à final.');
    return [$start,$end];
}
function periodClause(string $column,array $period,array &$args): string {
    [$start,$end]=$period;$where='';
    if($start!==''){$where.=" AND $column>=?";$args[]=$start;}
    if($end!==''){$where.=" AND $column<DATE_ADD(?,INTERVAL 1 DAY)";$args[]=$end;}
    return $where;
}
function reportsRoute(PDO $db,string $method): void {
    $user=financeUser($db);if($method!=='GET')fail('Relatórios são somente para consulta.',405);
    $type=$_GET['tipo']??'financeiro';if(!in_array($type,['financeiro','projetos','voluntariado'],true))fail('Tipo de relatório inválido.');
    $period=reportPeriod();$args=[];$where='1=1';
    if($user['perfil']!=='admin'){$where='EXISTS(SELECT 1 FROM usuarios_ongs v WHERE v.usuario_id=? AND v.ong_id=o.id)';$args[]=$user['id'];}
    if(isset($_GET['ongId'])&&$_GET['ongId']!==''){
        $id=filter_var($_GET['ongId'],FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);if(!$id)fail('ONG inválida.');
        authorizeOng($db,$user,$id);$where.=' AND o.id=?';$args[]=$id;
    }
    $ongs=sqlRows($db,"SELECT o.id,o.nome FROM ongs o WHERE $where ORDER BY o.nome",$args);
    $rows=[];
    foreach($ongs as $ong){
        $id=(int)$ong['id'];
        if($type==='financeiro'){
            $a=[$id];$dates=periodClause('d.criado_em',$period,$a);
            $private=sqlRows($db,"SELECT COALESCE(SUM(CASE WHEN d.status='Simulada' THEN d.valor ELSE 0 END),0) recebido,COALESCE(SUM(CASE WHEN d.status='Cancelada' THEN d.valor ELSE 0 END),0) cancelado FROM doacoes d JOIN projetos p ON p.id=d.projeto_id WHERE p.ong_id=?$dates",$a)[0];
            $a=[$id];$dates=periodClause('r.recebido_em',$period,$a);
            $public=sqlRows($db,"SELECT COALESCE(SUM(CASE WHEN status='Recebido' THEN valor_recebido ELSE 0 END),0) recebido,COALESCE(SUM(CASE WHEN status='Cancelado' THEN valor_recebido ELSE 0 END),0) cancelado FROM repasses_publicos r WHERE r.ong_id=?$dates",$a)[0];
            $rows[]=['ongId'=>$id,'ong'=>$ong['nome'],'privado'=>$private['recebido'],'publico'=>$public['recebido'],'total'=>number_format((float)$private['recebido']+(float)$public['recebido'],2,'.',''),'privado_cancelado'=>$private['cancelado'],'publico_cancelado'=>$public['cancelado']];
        }elseif($type==='projetos'){
            $a=[$id];$dates=periodClause('p.criado_em',$period,$a);
            $counts=sqlRows($db,"SELECT COUNT(*) total,COALESCE(SUM(status='Ativo'),0) ativos,COALESCE(SUM(status='Pausado'),0) pausados,COALESCE(SUM(status='Concluído'),0) concluidos FROM projetos p WHERE p.ong_id=?$dates",$a)[0];
            $rows[]=['ongId'=>$id,'ong'=>$ong['nome']]+$counts;
        }else{
            $a=[$id];$dates=periodClause('c.criado_em',$period,$a);
            $counts=sqlRows($db,"SELECT COUNT(*) total,COALESCE(SUM(c.status='Pendente'),0) pendentes,COALESCE(SUM(c.status='Lista de espera'),0) espera,COALESCE(SUM(c.status='Aprovado'),0) aprovados,COALESCE(SUM(c.status='Rejeitado'),0) rejeitados,COALESCE(SUM(c.status='Cancelado'),0) cancelados FROM candidaturas c JOIN oportunidades v ON v.id=c.oportunidade_id JOIN projetos p ON p.id=v.projeto_id WHERE p.ong_id=?$dates",$a)[0];
            $rows[]=['ongId'=>$id,'ong'=>$ong['nome']]+$counts;
        }
    }
    respond(['tipo'=>$type,'inicio'=>$period[0],'fim'=>$period[1],'linhas'=>$rows,'simulado'=>true]);
}
