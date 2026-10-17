# 09 — Dados e persistência

## Dados iniciais
`data/ongs.json`, `data/projetos.json` e `data/oportunidades.json` são lidos por `fetch` e fornecem o conjunto demonstrativo inicial. Os arquivos permanecem intactos durante o uso no navegador.

## Entidades e relações
| Entidade | Finalidade | Relação principal |
|---|---|---|
| ONG | Identidade e apresentação institucional | Possui projetos |
| Projeto | Iniciativa social, meta financeira, `voluntariosNecessarios` e dias padrão `diasAtuacao` | Pertence a uma ONG; possui oportunidades |
| Oportunidade | Vagas, função, modalidade/local e agenda semanal (`diasAtuacao`, `diasEspecificos`, `horarioInicio`, `horarioFim`) | Vinculada a projeto |
| Candidatura | Interesse e análise (`Pendente`, `Lista de espera`, `Aprovado`, `Desistente`, `Rejeitado`) | Vinculada a oportunidade; nova tentativa pode apontar à tentativa rejeitada |
| Doação | Contribuição fictícia | Vinculada a projeto |
| Solicitação de ONG | Pedido inicial e estados | Pode gerar ONG cadastrada |
| Rascunho | Campos salvos parcialmente | Vinculado à solicitação |

## Armazenamento
O utilitário `store` utiliza o prefixo `ongconnect_` e serialização JSON. Chaves principais: `ongs`, `ongs_edicoes`, `projetos`, `projetos_edicoes`, `oportunidades`, `oportunidades_edicoes`, `oportunidades_removidas`, `candidaturas`, `doacoes`, `solicitacoes_ongs`, `ongs_cadastro_rascunhos`. O navegador combina registros novos e edições com os dados iniciais; oportunidades removidas sem candidaturas usam tombstones locais para não reaparecer dos dados-base.

O histórico de candidaturas registra estado anterior/novo, data, responsável e justificativa. Campos de relação usados nos fluxos são `candidaturaAnteriorId` para nova tentativa após rejeição e `solicitacaoAnteriorId` para nova solicitação de ONG após rejeição. A capacidade considera apenas candidaturas `Aprovado`; `Desistente` libera vaga e `Lista de espera` não ocupa vaga.

Cada candidatura salva um snapshot de agenda (`agendaDias`, `agendaInicio`, `agendaFim`). Uma pessoa conta uma vez na meta de pessoas únicas por projeto, mesmo que seja aprovada em oportunidades não sobrepostas do mesmo projeto; cada aprovação continua ocupando a vaga da respectiva oportunidade.

## Operações demonstrativas (CRUD)
Criar: novos cadastros/solicitações; Ler: catálogos e painéis; Atualizar: edição, análise e status; Excluir: quando houver ação de remoção no módulo correspondente. O CRUD não ocorre em banco remoto.

## Limitações
`localStorage` é isolado por origem e perfil de navegador, pode ser limpo pelo usuário e não oferece transações multiusuário. Informações sensíveis não devem ser usadas em testes.


## Dados fictícios incluídos

A demonstração inicia com **6 ONGs e 17 projetos** cadastrados nos arquivos `data/ongs.json` e `data/projetos.json`. Os registros representam organizações e iniciativas **inteiramente fictícias**; nomes, e-mails, metas, valores arrecadados e número de voluntários são exemplos didáticos.

| ONG fictícia | Projetos |
|---|---:|
| Instituto Esperança | 3 |
| Rede Mãos Solidárias | 3 |
| Verde Futuro | 3 |
| Instituto Vida em Movimento | 3 |
| Associação Patas e Afeto | 2 |
| Coletivo Cultura Viva | 3 |
| **Total** | **17** |

A arrecadação inicial de cada projeto é um valor fictício usado para demonstrar gráficos e indicadores; as contribuições simuladas feitas pelo visitante são somadas localmente. Cadastros ou edições antigos armazenados no `localStorage` podem fazer o navegador exibir quantidades ou informações diferentes das originais; para testar os dados-base, utilize uma sessão limpa ou remova os dados locais da origem do projeto.
