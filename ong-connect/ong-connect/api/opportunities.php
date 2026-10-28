<?php
declare(strict_types=1);

function opportunityFields(array $input, ?array $previous = null): array
{
    $out = [];
    foreach (['titulo'=>150, 'modalidade'=>20] as $key=>$max) $out[$key] = textField($input,$key,$max);
    if (mb_strlen($out['titulo']) < 3) fail('Informe uma função com ao menos 3 caracteres.');
    if (!in_array($out['modalidade'],['Presencial','Híbrido','Remoto'],true)) fail('Modalidade inválida.');
    $out['local'] = textField($input,'local',150,$out['modalidade'] !== 'Remoto') ?: 'Online';
    $out['descricao'] = textField($input,'descricao',4000,false);
    $quantity = filter_var($input['vagas'] ?? null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1,'max_range'=>10000]]);
    if ($quantity === false) fail('Informe de 1 a 10000 vagas, em número inteiro.');
    $out['vagas'] = $quantity;
    $days = $input['diasAtuacao'] ?? null;
    $allowed = ['SEG','TER','QUA','QUI','SEX','SAB','DOM'];
    if (!is_array($days) || !array_is_list($days) || count($days)<1 || count($days)>7) fail('Selecione ao menos um dia de atuação.');
    foreach ($days as $day) if (!is_string($day) || !in_array($day,$allowed,true)) fail('Dia de atuação inválido.');
    if (count(array_unique($days)) !== count($days)) fail('Não repita dias de atuação.');
    $out['diasAtuacao'] = array_values(array_filter($allowed,fn($day)=>in_array($day,$days,true)));
    $out['diasEspecificos'] = $out['diasAtuacao'];
    $out['horarioInicio'] = textField($input,'horarioInicio',5,false);
    $out['horarioFim'] = textField($input,'horarioFim',5,false);
    $legacySchedule = $previous !== null && empty($previous['horarioInicio']) && empty($previous['horarioFim']);
    if (!($legacySchedule && $out['horarioInicio']==='' && $out['horarioFim']==='')) {
        foreach (['horarioInicio','horarioFim'] as $key) if (!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/',$out[$key])) fail('Informe horários válidos de início e término.');
        if ($out['horarioInicio'] >= $out['horarioFim']) fail('O término deve ser posterior ao início, no mesmo dia.');
    }
    if (!is_bool($input['ativa'] ?? null)) fail('Informe se as inscrições estão abertas.');
    $out['ativa'] = $input['ativa'];
    $labels=['SEG'=>'Segunda','TER'=>'Terça','QUA'=>'Quarta','QUI'=>'Quinta','SEX'=>'Sexta','SAB'=>'Sábado','DOM'=>'Domingo'];
    $out['periodo'] = implode(', ',array_map(fn($day)=>$labels[$day],$out['diasAtuacao']));
    return $out;
}

function hasProjectOpportunities(PDO $db, int $projectId): bool
{
    $stmt=$db->prepare('SELECT id FROM oportunidades WHERE projeto_id = ? LIMIT 1');
    $stmt->execute([$projectId]);
    return $stmt->fetchColumn() !== false;
}
