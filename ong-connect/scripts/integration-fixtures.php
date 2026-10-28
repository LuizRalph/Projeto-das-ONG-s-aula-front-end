<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'||!str_starts_with(getenv('DB_DATABASE')?:'','ong_connect_test_'))exit(1);
require __DIR__.'/../ong-connect/api/bootstrap.php';
$db=database();
if(($argv[1]??'')==='snapshot'){
    echo json_encode($db->query('SELECT id,nome,cnpj FROM ongs ORDER BY id')->fetchAll())."\n";
    echo json_encode($db->query('SELECT id,ong_id,titulo,meta,arrecadado,voluntarios FROM projetos ORDER BY id')->fetchAll())."\n";
    exit;
}
foreach(['admin','ong','voluntario'] as $role){$id=insertRow($db,'usuarios',['nome'=>'Pessoa Fictícia '.$role,'email'=>$role.'@example.com','senha_hash'=>password_hash('SenhaFicticia123!',PASSWORD_DEFAULT),'perfil'=>$role]);if($role==='ong')insertRow($db,'usuarios_ongs',['usuario_id'=>$id,'ong_id'=>1]);}
$opp=['titulo'=>'Vaga de teste','modalidade'=>'Remoto','local'=>'Online','vagas'=>1,'diasAtuacao'=>['SEG'],'diasEspecificos'=>['SEG'],'horarioInicio'=>'09:00','horarioFim'=>'10:00','ativa'=>true];
updateRow($db,'oportunidades',1,['dados'=>json_encode($opp)]);
updateRow($db,'oportunidades',2,['dados'=>json_encode($opp)]);
$db->exec('UPDATE projetos SET status="Ativo" WHERE id IN(1,2)');
echo "Fixtures fictícias criadas.\n";
