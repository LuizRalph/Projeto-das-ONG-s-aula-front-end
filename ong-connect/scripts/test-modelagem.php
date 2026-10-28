<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'||!preg_match('/^ong_connect_test_[a-z0-9_]+$/',getenv('DB_DATABASE')?:''))exit(1);
require __DIR__.'/../ong-connect/api/bootstrap.php';
require __DIR__.'/migrate.php';
$db=database();
function verifyModel(bool $ok,string $message): void {if(!$ok)throw new RuntimeException($message);echo "PASS $message\n";}
// Banco exclusivo vazio: reproduz o esquema anterior à migração 003.
foreach(['database/schema.sql','database/migrations/001_shared.sql'] as $file)
    foreach(explode(';',file_get_contents(__DIR__.'/../'.$file)) as $sql)if(trim($sql)!=='')$db->exec($sql);
for($i=0;$i<5;$i++) {
    $id=insertRow($db,'solicitacoes_ongs',['nome'=>'Legado fictício','cnpj'=>'12345678000195','cidade'=>'Teste','responsavel'=>'Teste','email'=>'legado@example.com','telefone'=>'','descricao'=>'Teste','status'=>'Rejeitado']);
    insertRow($db,'historico_solicitacoes',['solicitacao_id'=>$id,'status_anterior'=>'Pendente','status_novo'=>'Rejeitado','justificativa'=>'Legado']);
    if($i===0)insertRow($db,'historico_solicitacoes',['solicitacao_id'=>$id,'status_anterior'=>'Pendente','status_novo'=>'Rejeitado','justificativa'=>'Evento legado duplicado']);
}
migrate($db);
verifyModel((int)$db->query('SELECT COUNT(*) FROM historico_solicitacoes')->fetchColumn()===6,'migração preserva todos os eventos legados');
verifyModel((int)$db->query('SELECT COUNT(*) FROM historico_solicitacoes WHERE rejeicao_unica IS NOT NULL')->fetchColumn()===5,'evento repetido não duplica contagem de rejeições');
verifyModel((bool)$db->query('SELECT bloqueado_em FROM controle_cnpj')->fetchColumn(),'CNPJ com cinco rejeições anteriores é bloqueado');
$db->exec('DELETE FROM solicitacoes_ongs');
verifyModel((int)$db->query('SELECT COUNT(*) FROM historico_solicitacoes WHERE solicitacao_id IS NULL')->fetchColumn()===6,'exclusão preserva histórico e identidade original');
$db->exec("DELETE FROM schema_migrations WHERE versao='003_cnpj_audit.sql'");migrate($db);
verifyModel((int)$db->query('SELECT COUNT(*) FROM historico_solicitacoes WHERE rejeicao_unica IS NOT NULL')->fetchColumn()===5,'migração pode ser repetida após exclusão sem perder histórico');
