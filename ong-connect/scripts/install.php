<?php
declare(strict_types=1);
// Apenas CLI. Nunca publique este arquivo dentro da raiz pública.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../ong-connect/api/bootstrap.php';
require __DIR__ . '/migrate.php';
try {
    $db = database();
    $imported=false;
    $schema = file_get_contents(__DIR__ . '/../database/schema.sql');
    foreach (explode(';', $schema) as $sql) {
        if (trim($sql) !== '') $db->exec($sql);
    }
    $db->beginTransaction();
    $lock = $db->query('SELECT seeded FROM mvp_lock WHERE id = 1 FOR UPDATE')->fetch();
    // Só importa em um banco vazio. Reexecutar não restaura registros excluídos.
    if (!(int)$lock['seeded'] && (int)$db->query('SELECT COUNT(*) FROM ongs')->fetchColumn() === 0
        && (int)$db->query('SELECT COUNT(*) FROM projetos')->fetchColumn() === 0
        && (int)$db->query('SELECT COUNT(*) FROM solicitacoes_ongs')->fetchColumn() === 0) {
        $load = fn($name) => json_decode(file_get_contents(__DIR__."/../ong-connect/data/$name.json"),true,512,JSON_THROW_ON_ERROR);
        foreach ($load('ongs') as $r) {
            insertRow($db,'ongs',[
                'id'=>$r['id'],'nome'=>$r['nome'],'sigla'=>$r['sigla'],'cnpj'=>null,
                'categoria'=>$r['categoria'],'cidade'=>$r['cidade'],'email'=>$r['email'],
                'descricao'=>$r['descricao'],'missao'=>$r['missao'] ?? '',
                'cor'=>$r['cor'] ?? '#087f70','imagem'=>$r['imagem'] ?? ''
            ]);
        }
        foreach ($load('projetos') as $r) {
            insertRow($db,'projetos',[
                'id'=>$r['id'],'ong_id'=>$r['ongId'],'titulo'=>$r['titulo'],
                'categoria'=>$r['categoria'],'descricao'=>$r['descricao'],'meta'=>$r['meta'],
                'arrecadado'=>$r['arrecadado'],'voluntarios'=>$r['voluntarios'],
                'status'=>$r['status'],'emoji'=>$r['emoji'] ?? '🤝','imagem'=>$r['imagem'] ?? ''
            ]);
        }
        foreach ($load('oportunidades') as $r) insertRow($db,'oportunidades',[
            'id'=>$r['id'],'projeto_id'=>$r['projetoId'],'dados'=>json_encode($r,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)
        ]);
        $imported=true;
        echo "Exemplos importados.\n";
    } else echo "Banco existente preservado; carga inicial ignorada.\n";
    $db->exec('UPDATE mvp_lock SET seeded = 1 WHERE id = 1');
    $db->commit();
    migrate($db);
    if($imported){
        $db->beginTransaction();
        foreach($load('projetos') as $project){$details=[];foreach(['objetivo','publico_alvo','atividades','orientacoes_voluntariado','uso_recursos'] as $key)if(isset($project[$key]))$details[$key]=$project[$key];if($details)updateRow($db,'projetos',(int)$project['id'],$details);}
        $db->commit();
    }
    echo "Instalação concluída.\n";
} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    fwrite(STDERR, "Instalação falhou: {$e->getMessage()}\n");
    exit(1);
}
