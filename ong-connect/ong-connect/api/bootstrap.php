<?php
declare(strict_types=1);

function database(): PDO
{
    $path = __DIR__ . '/../../config/database.php';
    if (!is_file($path)) {
        throw new RuntimeException('Configure config/database.php antes de iniciar.');
    }
    $c = require $path;
    $db = new PDO(
        "mysql:host={$c['host']};port={$c['port']};dbname={$c['database']};charset=utf8mb4",
        $c['username'], $c['password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
         PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
         PDO::ATTR_EMULATE_PREPARES => false]
    );
    $db->exec('SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED');
    return $db;
}

function respond(array $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

function fail(string $message, int $status = 422): never
{
    throw new ApiError($message, $status);
}

class ApiError extends RuntimeException {}

function textField(array $input, string $key, int $max, bool $required = true): string
{
    if (isset($input[$key]) && !is_string($input[$key])) {
        fail("Campo inválido: $key.");
    }
    $value = trim($input[$key] ?? '');
    if (($required && $value === '') || mb_strlen($value) > $max) {
        fail("Preencha corretamente o campo $key (máximo $max caracteres).");
    }
    return $value;
}

function ongFields(array $input, bool $request = false): array
{
    $out = [];
    foreach (['nome'=>150, 'cidade'=>150, 'email'=>190, 'descricao'=>10000] as $key=>$max) {
        $out[$key] = textField($input, $key, $max);
    }
    if (!filter_var($out['email'], FILTER_VALIDATE_EMAIL)) fail('Informe um e-mail válido.');
    $cnpj = preg_replace('/\D/', '', textField($input, 'cnpj', 30));
    // CNPJs fictícios: verifica formato, sem consulta oficial nem dígito verificador.
    if (strlen($cnpj) !== 14) fail('Informe um CNPJ fictício com 14 dígitos.');
    $out['cnpj'] = $cnpj;
    foreach (['responsavel'=>150, 'telefone'=>40] as $key=>$max) {
        $out[$key] = textField($input, $key, $max, $request);
    }
    if (!$request) {
        foreach (['sigla'=>20, 'categoria'=>100, 'missao'=>10000] as $key=>$max) {
            $out[$key] = textField($input, $key, $max, $key === 'categoria');
        }
        $out['cor'] = textField($input, 'cor', 7, false) ?: '#087f70';
        if (!preg_match('/^#[0-9a-f]{6}$/i', $out['cor'])) fail('Cor inválida.');
        $out['imagem'] = imageField($input);
    }
    return $out;
}

function imageField(array $input): string
{
    $image = textField($input, 'imagem', 500, false);
    if ($image !== '' && !preg_match('~^assets/images/demo/[a-z0-9-]+\.svg$~', $image)) {
        fail('Selecione uma ilustração incluída no projeto.');
    }
    return $image;
}

function insertRow(PDO $db, string $table, array $fields): int
{
    // Nomes de tabelas e campos vêm exclusivamente do código, nunca da requisição.
    $columns = implode(',', array_keys($fields));
    $marks = implode(',', array_fill(0, count($fields), '?'));
    $db->prepare("INSERT INTO $table ($columns) VALUES ($marks)")->execute(array_values($fields));
    return (int)$db->lastInsertId();
}

function updateRow(PDO $db, string $table, int $id, array $fields): void
{
    $columns = implode(',', array_map(fn($key) => "$key = ?", array_keys($fields)));
    $db->prepare("UPDATE $table SET $columns WHERE id = ?")
        ->execute([...array_values($fields), $id]);
}

function record(PDO $db, string $table, int $id): array
{
    $stmt = $db->prepare("SELECT * FROM $table WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) fail('Registro não encontrado.', 404);
    return $row;
}

function checkCnpj(PDO $db, string $cnpj, int $ongId = 0, int $requestId = 0): void
{
    $stmt = $db->prepare('SELECT id FROM ongs WHERE cnpj = ? AND id <> ?');
    $stmt->execute([$cnpj, $ongId]);
    if ($stmt->fetch()) fail('Já existe uma ONG com este CNPJ.', 409);
    $stmt = $db->prepare("SELECT id FROM solicitacoes_ongs WHERE cnpj = ? AND status = 'Pendente' AND id <> ?");
    $stmt->execute([$cnpj, $requestId]);
    if ($stmt->fetch()) fail('Já existe uma solicitação pendente com este CNPJ.', 409);
}

function publicOng(array $r): array
{
    $r['id'] = (int)$r['id'];
    $r['criadoEm'] = $r['criado_em'];
    return $r;
}

function publicProject(array $r): array
{
    $r['id'] = (int)$r['id'];
    $r['ongId'] = (int)$r['ong_id'];
    foreach (['meta','arrecadado'] as $key) $r[$key] = (float)$r[$key];
    $r['voluntarios'] = (int)$r['voluntarios'];
    $r['criadoEm'] = $r['criado_em'];
    return $r;
}
