# 06 — Projetos e doações simuladas

## Projetos
O administrador cria ou edita projetos no painel. Cada projeto pertence a uma ONG e contém informações de apresentação, categoria e metas. O visitante visualiza cartões e um modal de detalhes, com ação de apoio quando disponível.

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
