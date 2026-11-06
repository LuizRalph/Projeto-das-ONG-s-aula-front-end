<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
try{
    foreach(['pdo_mysql','mbstring','fileinfo'] as $extension)if(!extension_loaded($extension))throw new RuntimeException("Extensão PHP ausente: $extension.");
    $path=__DIR__.'/../config/database.php';
    if(!is_file($path))throw new RuntimeException('Configure config/database.php para uma instância local de MariaDB.');
    putenv('DB_DATABASE=ong_connect_test_qa_preflight');
    $config=require $path;$host=$config['host']??'';$port=filter_var($config['port']??3306,FILTER_VALIDATE_INT,['options'=>['min_range'=>1,'max_range'=>65535]]);
    if(($config['database']??'')!=='ong_connect_test_qa_preflight')throw new RuntimeException('config/database.php deve respeitar DB_DATABASE para isolar os testes. Use o modelo database.example.php.');
    if(!in_array($host,['127.0.0.1','localhost','::1'],true)||!$port)throw new RuntimeException('QA permite somente MariaDB em localhost, 127.0.0.1 ou ::1 e porta válida. Não use túneis para produção.');
    // Nenhuma credencial ou nome do banco de uso diário é incluído na saída.
    echo json_encode(['host'=>$host,'port'=>$port],JSON_THROW_ON_ERROR);
}catch(Throwable $e){fwrite(STDERR,$e->getMessage().PHP_EOL);exit(1);}
