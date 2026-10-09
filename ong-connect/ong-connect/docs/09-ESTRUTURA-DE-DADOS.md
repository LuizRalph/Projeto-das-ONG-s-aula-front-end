# 09 — Dados e persistência

## Dados iniciais
`data/ongs.json`, `data/projetos.json` e `data/oportunidades.json` são lidos por `fetch` e fornecem o conjunto demonstrativo inicial. Os arquivos permanecem intactos durante o uso no navegador.

## Entidades e relações
| Entidade | Finalidade | Relação principal |
|---|---|---|
| ONG | Identidade e apresentação institucional | Possui projetos |
| Projeto | Iniciativa social e meta | Pertence a uma ONG |
| Oportunidade | Vaga de voluntariado | Vinculada a projeto |
| Candidatura | Interesse e análise | Vinculada a oportunidade |
| Doação | Contribuição fictícia | Vinculada a projeto |
| Solicitação de ONG | Pedido inicial e estados | Pode gerar ONG cadastrada |
| Rascunho | Campos salvos parcialmente | Vinculado à solicitação |

## Armazenamento
O utilitário `store` utiliza o prefixo `ongconnect_` e serialização JSON. Chaves principais: `ongs`, `ongs_edicoes`, `projetos`, `projetos_edicoes`, `candidaturas`, `doacoes`, `solicitacoes_ongs`, `ongs_cadastro_rascunhos`. O navegador combina registros novos e edições com os dados iniciais.

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
