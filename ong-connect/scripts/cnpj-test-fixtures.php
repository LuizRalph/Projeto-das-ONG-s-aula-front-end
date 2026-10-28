<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'||!preg_match('/^ong_connect_test_[a-z0-9_]+$/',getenv('DB_DATABASE')?:''))exit(1);
require __DIR__.'/../ong-connect/api/bootstrap.php';
$db=database();
if(($argv[1]??'')==='delete') {
    $db->prepare('DELETE FROM solicitacoes_ongs WHERE id=?')->execute([(int)$argv[2]]);
    echo "Solicitação de teste excluída.\n";
} elseif(($argv[1]??'')==='reset-login') {
    $db->exec('DELETE FROM login_tentativas');
} elseif(($argv[1]??'')==='history') {
    $s=$db->prepare('SELECT COUNT(*) FROM historico_solicitacoes WHERE solicitacao_original_id=? AND solicitacao_id IS NULL AND rejeicao_unica IS NOT NULL');$s->execute([(int)$argv[2]]);echo $s->fetchColumn();
}
