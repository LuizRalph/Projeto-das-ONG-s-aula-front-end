# 03 — Páginas públicas

## Página inicial — `index.html`
Apresenta a proposta do ONG Connect, organizações participantes, projetos em destaque e chamada para voluntariado e cadastro de ONG. Os carrosséis mostram cartões com botões de navegação; os cartões de ONG e projeto abrem detalhes em modais. A área “Cadastrar minha ONG” abre formulário de solicitação prévia. Formulários são validados antes do registro local.

## Catálogo de ONGs — `pages/ongs.html`
Lista organizações cadastradas, com apresentação, filtros/navegação e consulta de detalhes. O modal de ONG organiza informações institucionais e acesso aos projetos associados. O visitante pode navegar para o catálogo de projetos filtrado por organização.

## Catálogo de projetos — `pages/projetos.html`
Apresenta iniciativas, filtros e acesso ao modal de cada projeto. O modal contém descrição e ações de apoio ou participação. Apoiar abre fluxo de contribuição **simulada**; participar abre formulário de voluntariado quando houver oportunidade.

## Transparência — `pages/transparencia.html`
Exibe quatro indicadores, origem de recursos, distribuição por área de atuação, parcerias com poder público e blocos explicativos. Valores-base são fictícios; doações locais também são simulações. A ausência de registros de parcerias públicas não significa que houve verificação externa: simplesmente não existe módulo de lançamento de repasses nesta versão.

## Complementação de ONG — `pages/complementar-ong.html`
Recebe o parâmetro `pedido` na URL e procura a solicitação no `localStorage`. Só apresenta formulário quando a solicitação está em `Aguardando complementação`. Após salvar, muda o status para `Aguardando revisão`. É um fluxo demonstrativo: não permite complementação em outro navegador/dispositivo.

## Páginas auxiliares e compatibilidade
- `pages/login.html`: interface demonstrativa de acesso; não autentica em servidor.
- `pages/contato.html`: formulário auxiliar, sem envio real de mensagens.
- `pages/campanhas.html`: redirecionamento legado para Projetos.
- `pages/voluntariado.html`: redirecionamento legado para Projetos.

## Modais e confirmações
A aplicação utiliza modais para detalhamento, inscrição, apoio e solicitação. Após operações válidas, apresenta mensagens de confirmação; campos inválidos impedem o envio e devem ser corrigidos. O roteiro de testes cobre fechamento automático, mensagens e preservação dos dados.
