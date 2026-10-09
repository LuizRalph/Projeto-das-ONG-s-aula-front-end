# 10 — Roteiro de testes e apresentação acadêmica

## Preparação
Abra a pasta raiz pelo Live Server; use dados fictícios. Evite limpar o armazenamento antes de concluir os cenários. Para repetir do zero, limpe apenas as chaves `ongconnect_` do navegador, ciente de que os cadastros locais serão perdidos.

## Cenários sugeridos
| ID | Procedimento | Resultado esperado |
|---|---|---|
| T01 | Abrir home, ONGs, Projetos e Transparência | Navegação e dados-base visíveis |
| T02 | Percorrer carrosséis e abrir modal | Cartão correto e modal funcional |
| T03 | Enviar solicitação incompleta | Validação informa erro; sem salvar |
| T04 | Enviar solicitação fictícia válida | Confirmação; registro `Pendente` |
| T05 | Abrir Gerenciar ONGs | Solicitações e Cadastro recolhidos; ONGs cadastradas expandida |
| T06 | Conferir pedido | Contador vermelho atualizado |
| T07 | Aprovar pedido | Contador laranja; cadastro pré-preenchido |
| T08 | Solicitar complementação e abrir link no mesmo navegador | Formulário complementar acessível |
| T09 | Enviar complementação | Status `Aguardando revisão` |
| T10 | Salvar rascunho e recarregar | Informações recuperáveis |
| T11 | Concluir cadastro | ONG publicada; status `Cadastrada` |
| T12 | Criar ou editar projeto | Atualização no painel e catálogo |
| T13 | Registrar doação fictícia | Confirmação, modal encerrado e histórico local |
| T14 | Inscrever voluntário fictício | Candidatura registrada e consultável |
| T15 | Aprovar/rejeitar candidatura | Estado e histórico atualizados |
| T16 | Abrir Doações e Relatórios | Filtros e exportação CSV funcionais |
| T17 | Abrir Transparência | Indicadores e áreas coerentes com dados demonstrativos |
| T18 | Recarregar páginas | Persistência local preservada |
| T19 | Abrir em outro navegador | Registros locais não são compartilhados |
| T20 | Testar largura móvel | Layout legível e controles acessíveis |

## Sequência para apresentação (10–15 minutos)
1. Explicar objetivo e arquitetura (2 min).
2. Navegar por ONGs, projetos e modais (2 min).
3. Enviar e analisar solicitação de ONG (3 min).
4. Mostrar complementação, rascunho e publicação (3 min).
5. Demonstrar doação/voluntariado e indicadores (3 min).
6. Encerrar com limitações acadêmicas e possíveis evoluções (2 min).

## Critérios de aceite
A aplicação deve abrir sem links locais quebrados, exibir mensagens claras, preservar registros no mesmo navegador e diferenciar dados fictícios de operações reais. Estes são **testes manuais propostos**; sua presença neste documento não significa que todos já foram executados.
