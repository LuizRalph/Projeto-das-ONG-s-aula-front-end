<?php
declare(strict_types=1);
// Chamado dentro da transação e do lock de escrita institucional.
function controlCnpj(PDO $db, string $cnpj): array {
    $db->prepare('INSERT IGNORE INTO controle_cnpj(cnpj) VALUES(?)')->execute([$cnpj]);
    $s=$db->prepare('SELECT * FROM controle_cnpj WHERE cnpj=? FOR UPDATE');$s->execute([$cnpj]);
    return $s->fetch();
}
function requestHistory(PDO $db,array $request,string $next,string $reason,?array $user): void {
    insertRow($db,'historico_solicitacoes',[
        'solicitacao_id'=>$request['id'],'solicitacao_original_id'=>$request['id'],
        'controle_cnpj_id'=>$request['controle_cnpj_id'],'autor_id'=>$user['id']??null,
        'status_anterior'=>$request['status']??null,'status_novo'=>$next,'justificativa'=>$reason,
        'rejeicao_unica'=>$next==='Rejeitado'?$request['id']:null
    ]);
    if($next==='Rejeitado') {
        $s=$db->prepare('SELECT COUNT(*) FROM historico_solicitacoes WHERE controle_cnpj_id=? AND rejeicao_unica IS NOT NULL');$s->execute([$request['controle_cnpj_id']]);
        if((int)$s->fetchColumn()>=3)$db->prepare("UPDATE controle_cnpj SET bloqueado_em=COALESCE(bloqueado_em,NOW()),motivo_bloqueio='Limite de três rejeições atingido.' WHERE id=?")->execute([$request['controle_cnpj_id']]);
    }
}
