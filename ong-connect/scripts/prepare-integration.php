<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
require __DIR__.'/../ong-connect/api/bootstrap.php';
$name=getenv('DB_DATABASE')?:'';
if(!preg_match('/^ong_connect_test_[a-z0-9_]+$/',$name))throw new RuntimeException('Banco de testes obrigatório.');
$c=require __DIR__.'/../config/database.php';
$db=new PDO("mysql:host={$c['host']};port={$c['port']};charset=utf8mb4",$c['username'],$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$db->exec("CREATE DATABASE `$name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
echo "Banco exclusivo criado: $name\n";
