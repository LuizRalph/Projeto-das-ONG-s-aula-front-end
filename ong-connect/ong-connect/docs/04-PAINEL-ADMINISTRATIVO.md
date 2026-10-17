# 04 — Painel administrativo

> Acesso administrativo é **demonstrativo**: as páginas podem ser acessadas diretamente e não há autenticação segura.

## Dashboard — `dashboard/index.html`
Apresenta visão consolidada dos registros e indicadores disponíveis no navegador, auxiliando a demonstração do acompanhamento administrativo.

## Gerenciar ONGs — `dashboard/ongs.html`
Três painéis expansíveis: **Solicitações de cadastro** (fechado ao abrir), **Cadastrar ONG** (fechado) e **ONGs cadastradas** (aberto). Cabeçalhos são clicáveis; a seta e o texto mostram expandir/recolher. Alertas vermelhos contam solicitações `Pendente`; alertas laranja contam `Aprovado`, `Aguardando complementação` e `Aguardando revisão`.

A análise permite aprovar ou rejeitar. Ao aprovar/continuar, o cadastro abre com informações existentes. O administrador pode solicitar complementação, salvar rascunho, editar dados, concluir e publicar. O formulário institucional está dividido em identificação, endereço, responsáveis, perfil, documentação e doações/parcerias. Documentos sensíveis não são armazenados.

O envio público e a publicação administrativa bloqueiam CNPJ associado a outro pedido ativo ou ONG publicada. Edição da própria ONG e conclusão do próprio pedido são exceções permitidas. Uma nova solicitação após rejeição mantém vínculo com a anterior.

## Gerenciar projetos — `dashboard/projetos.html`
Formulário para criar ou editar projetos associados a uma ONG e listagem dos projetos cadastrados. As alterações persistem no navegador e alimentam os catálogos públicos.

## Voluntários — `dashboard/voluntarios.html`
Mostra uma visão global, organizada em acordeões por projeto e oportunidade, com filtros por projeto, oportunidade e estado. Projetos com oportunidades sem candidaturas continuam visíveis. Aprovação e promoção da lista exigem vaga, responsável e justificativa; rejeição exige justificativa. Registrar desistência de uma pessoa aprovada exige responsável e justificativa e libera capacidade. Ao preencher a última vaga, candidaturas pendentes restantes passam para `Lista de espera`. As mudanças são registradas no histórico local e ilustrativo.

## Doações — `dashboard/doacoes.html`
Exibe histórico de contribuições **simuladas**, filtros e totais associados aos registros demonstrativos. Não representa extrato bancário nem confirmação de pagamento.

## Relatórios — `dashboard/relatorios.html`
Apresenta consolidado por ONG e oferece exportação CSV para análise externa. Valores refletem o conjunto de dados inicial e os registros locais.

## Minhas informações
Algumas páginas exibem formulário/modal de perfil administrativo, também demonstrativo, sem conta em servidor.
