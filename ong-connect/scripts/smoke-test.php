<?php
declare(strict_types=1);
// Integração HTTP real. Use apenas com um banco de demonstração/teste.
if (PHP_SAPI !== 'cli') exit;
$base = rtrim($argv[1] ?? 'http://127.0.0.1:8080', '/');
function callApi(string $resource, string $method = 'GET', ?array $data = null, ?int $id = null, int $expected = 200): array
{
    global $base;
    $url = $base . '/api/index.php?' . http_build_query(['resource'=>$resource]+($id ? ['id'=>$id]:[]));
    $context = stream_context_create(['http'=>[
        'method'=>$method,'header'=>"Content-Type: application/json\r\nAccept: application/json\r\n",
        'content'=>$data === null ? '' : json_encode($data,JSON_THROW_ON_ERROR),
        'ignore_errors'=>true,'timeout'=>10
    ]]);
    $raw = file_get_contents($url,false,$context);
    $headers = $http_response_header ?? [];
    preg_match('/\s(\d{3})\s/', $headers[0] ?? '', $match);
    $status = (int)($match[1] ?? 0);
    if ($status !== $expected) throw new RuntimeException("$method $resource: esperado $expected, recebido $status: $raw");
    return json_decode($raw,true,512,JSON_THROW_ON_ERROR);
}
function ensure(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException($message);
}
try {
    $cnpj = '99'.str_pad((string)random_int(0,999999999999),12,'0',STR_PAD_LEFT);
    $request = ['nome'=>'ONG Teste HTTP','cnpj'=>$cnpj,'cidade'=>'Cidade fictícia',
        'responsavel'=>'Pessoa fictícia','email'=>'teste@example.com','telefone'=>'11999999999',
        'descricao'=>'Registro fictício de teste de integração.','consentimento'=>true];
    callApi('solicitacoes','POST',[],null,422);
    $id = callApi('solicitacoes','POST',$request,null,201)['id'];
    callApi('solicitacoes','POST',$request,null,409);
    callApi('rejeitar','POST',['motivo'=>''], $id,422);
    callApi('rejeitar','POST',['motivo'=>'Teste de rejeição e nova tentativa.'],$id);
    $nextId = callApi('solicitacoes','POST',$request,null,201)['id'];
    $ong = $request+['categoria'=>'Educação','sigla'=>'TH','missao'=>'Ensinar','cor'=>'#087f70','imagem'=>''];
    callApi('publicar','POST',$ong,$nextId);
    callApi('publicar','POST',$ong,$nextId,409);
    callApi('solicitacoes','POST',$request,null,409);
    $catalog = callApi('catalogo');
    $found = array_values(array_filter($catalog['ongs'],fn($r)=>$r['cnpj']===$cnpj));
    ensure(count($found)===1,'ONG publicada não encontrada no catálogo compartilhado.');
    $ongId = $found[0]['id'];
    $ong['nome']='ONG Teste HTTP editada';
    callApi('ongs','PUT',$ong,$ongId);
    $project = ['ongId'=>$ongId,'titulo'=>'Projeto de teste','categoria'=>'Educação',
        'descricao'=>'Projeto fictício','meta'=>1000,'arrecadado'=>0,'voluntarios'=>0,'status'=>'Ativo','imagem'=>''];
    $projectId = callApi('projetos','POST',$project,null,201)['id'];
    callApi('ongs','DELETE',null,$ongId,409);
    callApi('projetos','PUT',array_replace($project,['meta'=>-1]),$projectId,422);
    $project['titulo']='Projeto editado';
    callApi('projetos','PUT',$project,$projectId);
    $catalog = callApi('catalogo');
    ensure(count(array_filter($catalog['projetos'],fn($r)=>$r['id']===$projectId && $r['titulo']==='Projeto editado'))===1,'Edição do projeto não persistiu.');
    $rows = callApi('solicitacoes')['solicitacoes'];
    $published = array_values(array_filter($rows,fn($r)=>$r['id']===$nextId))[0];
    ensure((int)$published['solicitacao_anterior_id']===$id,'Nova tentativa perdeu a relação com a rejeitada.');
    ensure(count($published['historico'])===2,'Histórico de publicação incompleto.');
    callApi('projetos','DELETE',null,$projectId);
    callApi('ongs','DELETE',null,$ongId);
    $catalog = callApi('catalogo');
    ensure(count(array_filter($catalog['ongs'],fn($r)=>$r['id']===$ongId))===0,'Exclusão não persistiu.');
    echo "OK: validação, duplicidade, rejeição, nova tentativa, publicação, histórico, CRUD e bloqueio de exclusão.\n";
    echo "Solicitações fictícias $id e $nextId preservadas como histórico do teste.\n";
} catch (Throwable $e) {
    fwrite(STDERR,"FALHA: {$e->getMessage()}\n");exit(1);
}
