<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__.'/../ong-connect/api/bootstrap.php';
function migrate(PDO $db): void {
    $locked = (int)$db->query("SELECT GET_LOCK('ongconnect_migrations', 30)")->fetchColumn();
    if (!$locked) throw new RuntimeException('Outra migração está em execução.');
    try {
        $db->exec('CREATE TABLE IF NOT EXISTS schema_migrations (versao VARCHAR(100) PRIMARY KEY, aplicado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
        foreach (glob(__DIR__.'/../database/migrations/*.sql') as $file) {
            $version = basename($file);
            $stmt=$db->prepare('SELECT 1 FROM schema_migrations WHERE versao=?'); $stmt->execute([$version]);
            if ($stmt->fetchColumn()) continue;
            foreach (explode(';',file_get_contents($file)) as $sql) if(trim($sql)!=='') $db->exec($sql);
            $db->prepare('INSERT INTO schema_migrations(versao) VALUES(?)')->execute([$version]);
            echo "Aplicada: $version\n";
        }
    } finally { $db->query("SELECT RELEASE_LOCK('ongconnect_migrations')"); }
}
if (realpath($_SERVER['SCRIPT_FILENAME'])===__FILE__) {
    try { migrate(database()); echo "Migrações concluídas.\n"; }
    catch(Throwable $e) { fwrite(STDERR,"Falha na migração: ".$e->getMessage()."\n"); exit(1); }
}
