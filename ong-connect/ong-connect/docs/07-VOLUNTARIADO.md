# 07 — Voluntariado

## Finalidade
Permitir que visitantes demonstrem interesse em oportunidades ligadas a projetos sociais e que o administrador simule a análise das candidaturas.

## Fluxo
1. Visitante localiza projeto/oportunidade e abre a inscrição.
2. Informa dados pessoais e informações sobre disponibilidade/interesse, conforme o formulário.
3. Envia a candidatura, registrada como `Pendente` se houver capacidade ou `Lista de espera` se todas as vagas estiverem ocupadas.
4. O administrador abre **Voluntários**, percorre os acordeões por projeto/oportunidade e filtra por projeto, oportunidade ou status.
5. O administrador aprova uma candidatura pendente ou promove manualmente alguém da lista quando houver vaga; também pode rejeitar com justificativa.
6. Uma desistência de pessoa aprovada é registrada com responsável e justificativa, liberando capacidade para promoção manual.
7. Cada mudança de estado fica no histórico demonstrativo.

## Regras
Somente candidaturas `Aprovado` ocupam vaga. Inscrições continuam abertas quando a oportunidade está lotada e entram em `Lista de espera`. Quando a última vaga é ocupada, candidaturas ainda `Pendente` daquela oportunidade também são encaminhadas à fila. A promoção é manual e só pode ocorrer quando há vaga.

O e-mail normalizado não pode manter duas tentativas ativas na mesma oportunidade. Em oportunidades diferentes, a pessoa pode se candidatar desde que os dias/horários não se sobreponham. O conflito é comparado no envio e novamente na aprovação, considerando `Pendente`, `Lista de espera` e `Aprovado`; `Rejeitado` e `Desistente` não reservam agenda. Os horários usam intervalos `[início, término)`, portanto turnos adjacentes são aceitos.

`Rejeitado` encerra a tentativa; nova inscrição cria outro registro relacionado à tentativa rejeitada anterior. `Desistente` mantém o histórico e libera uma vaga, sem reabrir a candidatura anterior. A agenda efetiva fica registrada como snapshot na candidatura para que futuras edições da oportunidade não alterem o horário que foi aceito.

Não há mensagens externas nem contrato formal de voluntariado. A persistência é local e não oferece concorrência multiusuário.

## Demonstração
Cadastrar uma candidatura fictícia com vaga e outra com lotação; conferir a fila no catálogo e no painel. Aprovar até lotar, rejeitar uma tentativa, registrar uma desistência e promover manualmente alguém da fila. Uma nova tentativa após rejeição deve preservar a anterior.
