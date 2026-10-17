# 06 — Projetos e doações simuladas

## Projetos
O administrador cria ou edita projetos no painel. Cada projeto pertence a uma ONG e contém informações de apresentação, categoria, meta financeira e `voluntariosNecessarios`, que é a meta de pessoas únicas do projeto. O campo legado `voluntarios` continua sendo uma métrica demonstrativa e não representa vagas.

Um projeto pode ter nenhuma ou várias oportunidades de voluntariado. Cada oportunidade pertence a um `projetoId` e define função, vagas, modalidade, local, dias de atuação e horário inicial/final. Dias específicos podem substituir os dias padrão do projeto. As vagas são controladas por oportunidade, independentemente da meta de pessoas do projeto.

O mesmo e-mail pode manter candidaturas ativas em mais de um projeto quando as agendas recorrentes não se sobrepõem. O conflito é verificado no envio e novamente na aprovação. Intervalos são tratados como `[início, término)`, então um turno que termina às 12:00 não conflita com outro que começa às 12:00. Rejeitadas e desistentes não reservam agenda. Para oportunidades antigas sem horários, a checagem usa o dia legado e considera o dia inteiro ocupado até a agenda ser revisada.

## Fluxo de contribuição
1. Visitante escolhe um projeto e clica em **Apoiar projeto**.
2. Seleciona valor sugerido (R$ 5, 10, 25, 50 ou 100) ou informa outro valor.
3. Preenche os dados exigidos na etapa seguinte.
4. Confirma a operação demonstrativa.
5. O sistema grava um registro local com status `Simulada` e apresenta confirmação.

Não existe transferência financeira, PIX, cartão processado ou recibo fiscal.

## Cálculo exibido
O total de arrecadação de um projeto considera o **valor-base fictício** de `data/projetos.json` mais as contribuições locais registradas como `Simulada`. Assim, o valor-base não é sobrescrito e pode permanecer após limpar dados locais.

## Acompanhamento
O painel Doações lista os registros e permite filtros. O painel Relatórios consolida os dados para consulta e CSV. A página Transparência agrega valores demonstrativos por causa; não representa despesas comprovadas.

## Demonstração em aula
Abra um projeto, registre contribuição fictícia, confira a confirmação, recarregue a página e observe a persistência no mesmo navegador. Em seguida, confira o registro no painel Doações e o indicador público correspondente.
