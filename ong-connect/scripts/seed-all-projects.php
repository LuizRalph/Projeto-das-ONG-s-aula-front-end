<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') exit;
require __DIR__.'/../ong-connect/api/bootstrap.php';
require __DIR__.'/../ong-connect/api/opportunities.php';
require __DIR__.'/../ong-connect/api/cnpj.php';
$db=database();$db->beginTransaction();
try {
    $db->query('SELECT id FROM mvp_lock WHERE id=1 FOR UPDATE')->fetch();
    $projects=$db->query('SELECT id,titulo FROM projetos ORDER BY id')->fetchAll();
    $fixture=['dataset'=>'projetos-outubro-2026-v1','candidaturas'=>[],'doacoes'=>[]];
    $now=date('c');$created=0;$requests=0;
    foreach($projects as $project){
        $id=(int)$project['id'];
        $stmt=$db->prepare('SELECT * FROM oportunidades WHERE projeto_id=? ORDER BY id LIMIT 1');$stmt->execute([$id]);$op=$stmt->fetch();
        if(!$op){
            $fields=opportunityFields(['titulo'=>'Apoio ao projeto','modalidade'=>'Presencial','local'=>'Centro comunitário fictício','descricao'=>'Atividades fictícias de apoio ao projeto.','vagas'=>6,'diasAtuacao'=>['SAB'],'horarioInicio'=>'09:00','horarioFim'=>'12:00','ativa'=>true]);
            $opId=insertRow($db,'oportunidades',['projeto_id'=>$id,'dados'=>json_encode($fields,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);$created++;
        }else $opId=(int)$op['id'];
        foreach([1,2] as $ordinal){
            $fixture['candidaturas'][]=['id'=>"demo-projeto-$id-candidato-$ordinal",'demoDataset'=>$fixture['dataset'],'oportunidadeId'=>$opId,'nome'=>($ordinal===1?'Ana':'Bruno')." Exemplo — Projeto $id",'email'=>"projeto$id.candidato$ordinal@example.com",'telefone'=>'11999990000','nascimento'=>'2000-01-15','cidade'=>'Cidade fictícia','estado'=>'SP','disponibilidade'=>'Conforme agenda da oportunidade','experiencia'=>'Exemplo acadêmico','habilidades'=>'Organização e apoio comunitário','motivacao'=>'Participar das atividades fictícias deste projeto.','consentimento'=>true,'data'=>$now,'status'=>'Pendente'];
            $fixture['doacoes'][]=['id'=>"demo-projeto-$id-doacao-$ordinal",'demoDataset'=>$fixture['dataset'],'projetoId'=>$id,'valor'=>$ordinal===1?50:100,'data'=>$now,'status'=>'Simulada'];
        }
    }
    foreach(['Rede Abraço Solidário','Instituto Caminhos do Amanhã','Associação Sementes do Bairro','ONG Patas e Afeto'] as $i=>$name){
        $cnpj='99999000000'.str_pad((string)($i+101),3,'0',STR_PAD_LEFT);
        $stmt=$db->prepare('SELECT id FROM solicitacoes_ongs WHERE cnpj=? UNION ALL SELECT id FROM ongs WHERE cnpj=?');$stmt->execute([$cnpj,$cnpj]);if($stmt->fetch())continue;
        $control=controlCnpj($db,$cnpj);
        if($control['bloqueado_em'])continue;
        $id=insertRow($db,'solicitacoes_ongs',['controle_cnpj_id'=>$control['id'],'nome'=>$name.' (fictícia)','cnpj'=>$cnpj,'cidade'=>'Cidade fictícia','responsavel'=>'Responsável fictício '.($i+1),'email'=>'ong.exemplo'.($i+1).'@example.com','telefone'=>'11999990000','descricao'=>'Solicitação fictícia para testar revisão, aprovação e rejeição de cadastros.','status'=>'Pendente']);
        requestHistory($db,['id'=>$id,'controle_cnpj_id'=>$control['id']],'Pendente','Solicitação fictícia inserida para demonstração.',null);$requests++;
    }
    $json=json_encode($fixture,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
    $file=__DIR__.'/../ong-connect/data/demo-registrations.json';
    if(file_put_contents($file,$json)===false)throw new RuntimeException('Falha ao preparar exemplos locais.');
    $db->commit();
    echo json_encode(['projetos'=>count($projects),'novas_oportunidades'=>$created,'novas_solicitacoes'=>$requests,'candidaturas'=>count($fixture['candidaturas']),'doacoes'=>count($fixture['doacoes'])],JSON_UNESCAPED_UNICODE).PHP_EOL;
}catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
