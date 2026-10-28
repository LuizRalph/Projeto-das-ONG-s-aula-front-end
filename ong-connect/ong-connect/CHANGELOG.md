# Changelog — ONG Connect

## 2026-10-26 — Consolidação documental e estudo acadêmico (local)

- README, requisitos, casos de uso, operação e capítulos atuais revisados para autenticação real e persistência compartilhada.
- DER atualizado com as 18 tabelas e distinção entre validações do banco, da API e dados JSON.
- Relatório acadêmico, referências primárias, matriz de conformidade e roteiro de apresentação adicionados.
- Experimento reproduzível compara associação relacional e array JSON com 2.000 oportunidades por abordagem; resultados brutos registrados, sem alterar tabelas permanentes.
- Tema proposto: modelagem híbrida relacional/documental com JSON. Aceitação como tecnologia emergente depende do professor; identificação dos integrantes e envio permanecem sob responsabilidade do grupo.
- Links locais e UTF-8 verificados. Documentação histórica explicitamente identificada; originais revisados preservados em `.runtime/docs-before-academic-20261026/`.
- Esta revisão não publicou alterações no servidor nem enviou e-mail.

## 2026-10-24 — Publicação de repasses públicos e exemplos financeiros

- Migração 005, administração de repasses, documentos privados, prestação de contas, CSV e total geral público sincronizados após backup.
- Publicados 11 exemplos: privados válidos R$ 6.000 e públicos válidos R$ 30.000; cancelados excluídos dos indicadores. Importação repetida em cópia do banco não duplicou registros.
- Preservadas as duas contas e os 18 projetos do servidor. Diretório privado de documentos preparado fora da raiz pública.
- Backup: `/root/ongconnect-sync-20261024-233921/`.


## 2026-10-24 — Demonstração de recursos públicos e privados (local)

- Carga explícita de seis apoios privados válidos (R$ 6.000) e três repasses públicos válidos (R$ 30.000), com exemplos cancelados separados dos totais.
- Banco local principal atualizado após backup, com auditoria. APIs conferidas: total público R$ 30.000 e soma privada R$ 6.000. Reexecução da carga não duplicou registros.
- Script `scripts/seed-funding-demo.php`; servidor não alterado.

## 2026-10-24 — Repasses públicos (somente local)

- Tabelas próprias de recebimentos e documentos, sem misturar recursos com `doacoes`. Nenhuma previsão de receita ou parcela futura.
- Área Repasses públicos para administrador geral e responsáveis das ONGs vinculadas: cadastro, edição, cancelamento justificado, documentos, situação da prestação de contas e relatório CSV.
- Endpoint público disponibiliza apenas o total geral recebido; cancelados não compõem o montante. Removidos filtro por ONG e seção pública de detalhes de parcerias.
- PDF/JPG/PNG até 2 MB, verificação do tipo real e hash, arquivos fora da raiz pública e acesso autorizado pela API. Remoção lógica, com manutenção privada do arquivo.
- Reenvio idempotente e auditoria de cadastro, edição, cancelamento, envio, download e remoção de documentos.
- 36 verificações de integração aprovadas; fluxo completo testado no Chrome em banco exclusivo, incluindo exportação CSV, documentos, cancelamento e ausência de detalhes privados na Transparência.
- Migração aplicada somente no banco local, após backup. Os testes não criaram recebimentos no banco principal.

## 2026-10-24 — Publicação autorizada dos ajustes locais

- Sincronizados layout dos cartões, resumos, modal Saiba mais, navegação ao projeto, cadastro detalhado e correções dos botões Cancelar.
- Migração 004 aplicada e textos dos 17 exemplos publicados, com preservação integral do projeto adicional do servidor. Backup privado em `/root/ongconnect-sync-20261024-224349/`.
- 118 arquivos conferidos por integridade e conteúdo editorial validado pela API. Entradas anteriores marcadas como locais descrevem o estado antes desta publicação.


## 2026-10-24 — Conteúdo completo dos 17 projetos (somente local)

- Atualizados os 17 projetos locais com resumos próprios, descrições detalhadas, objetivos, público beneficiado, atividades, orientações de voluntariado e uso demonstrativo dos recursos.
- O primeiro parágrafo da descrição é o resumo editorial, com até 140 caracteres e 18 palavras. Cartões usam esse resumo; o modal mantém o texto integral.
- `data/projetos.json` preserva o conteúdo para novas instalações. O instalador preenche os detalhes apenas na carga inicial e mantém cadastros existentes.
- `scripts/update-project-descriptions.php` aplica a carga explicitamente no ambiente local da porta 3308, em transação, com validação de IDs/títulos e auditoria. Reexecutar com o mesmo conteúdo não altera registros.
- Backup anterior em `.runtime/local-modelagem/antes-textos-projetos-20261024-223753.sql`. Comparação com cópia desse backup confirmou preservação dos campos não editoriais. Os 31 testes de integração passaram.
- Nenhum texto desta etapa foi publicado no servidor.

## 2026-10-24 — Resumos e alinhamento dos projetos (somente local)

- Cartões exibem resumo de até 140 caracteres; a descrição salva permanece integral.
- No desktop, título, nome da ONG, resumo e disponibilidade possuem espaço reservado para alinhar indicadores e ações entre os cartões. No celular, a altura continua adaptável.
- A ação Saiba mais abre o modal existente com a descrição completa e os detalhes do cadastro.
- Verificação no Chrome com textos curtos e longos: botões da primeira linha alinhados e descrição completa disponível no modal, sem alterações no banco.

## 2026-10-24 — Cartões de projetos no celular (somente local)

- Capa compacta com recorte superior, sem repetir o título ilustrado, cabeçalho menor e margens internas de 16 px no mobile.
- Nome da ONG próximo do título, descrição limitada visualmente a três linhas e resumo compacto das oportunidades. Texto completo permanece nos detalhes.
- Valor arrecadado, barra de progresso e meta agrupados. Participações aprovadas consultadas nos detalhes, sem ocupar o rodapé do cartão.
- Ações Conhecer projeto e Apoiar projeto, empilhadas com largura total e altura mínima de 44 px no celular.
- Verificação no Chrome em 320, 390, 600 e 1366 px: sem rolagem horizontal; botões de detalhes e apoio funcionais. Prévia local: `.runtime/projetos-mobile-390.png`.
- Ajuste local, sem publicação no servidor e sem alteração de dados.

## 2026-10-24 — Cancelamento dos modais (somente local)

- Restaurados os botões Cancelar da candidatura, escolha da doação e perfil. Associados os eventos que estavam ausentes.
- Adicionado Cancelar à etapa de dados da doação, preservando o botão Voltar para retornar à escolha do valor.
- Cancelamento limpa os campos temporários e o estado de alterações pendentes, sem gravar na API. Fechamento por X, Escape e fundo implementado nos modais públicos; perfil também fecha por Escape e fundo.
- Candidatura e doação em envio não são apresentadas como canceladas: o fechamento informa que é necessário aguardar a conclusão.
- Validados no Chrome 38 cenários de cancelamento/fechamento em quatro páginas públicas e seis telas administrativas, sem requisições de escrita nem exceções JavaScript. As cinco verificações visuais de modelagem também passaram.
- Teste: após gerar um banco exclusivo com `scripts/test-shared.cjs`, defina seu nome em `DB_DATABASE`, defina `MODAL_CANCEL_TESTS=1` e execute `node scripts/test-modelagem-browser.cjs`. Não executar contra o banco principal.
- Esta correção ainda não foi sincronizada com o servidor.

Este arquivo registra evolução, não uma lista cumulativa de funcionalidades vigentes. Entradas antigas podem ter sido substituídas; consulte o README para o estado atual. Datas não representam necessariamente commits Git.

## 2026-10-21 — Consolidação da documentação e estado atual

- Revisados os 26 documentos Markdown, com índice, arquitetura híbrida, requisitos, fluxos, modelagem/diagrama e operação PHP/MariaDB.
- Distinguidas persistência compartilhada, simulações locais e preferências da aba.
- Documentados projetos/vagas em modais, exclusões protegidas e diferença entre API e cascata SQL.
- Documentados contadores de ONGs/voluntários/doações, listas recolhidas e ordem dos indicadores.
- Registrados perfil nas seis telas, padronização das setas, remoção dos atalhos de retorno, aviso no rodapé e ajuda dos títulos por interrogação.
- Registrada a posição de Atualizar dados no cabeçalho de ONGs/Projetos e a remoção de seus textos introdutórios fixos.
- Documentadas a carga adicional para 17 projetos, 34 candidaturas, 34 doações e quatro pedidos de ONGs, com importação local única e convivência com cenários anteriores.
- Marcados os documentos de planejamento, regras antigas e auditoria estática como históricos.
- Estado dos testes descrito com pendências conhecidas: mock de cliente e expectativas fixas após nova carga. Esta revisão documental não constitui nova homologação integral.
- Atualização restrita à documentação; sem migração do banco, alteração de regras ou sincronização com GitHub.

## Registros anteriores preservados

## 2026-10-21 — Cenários de teste do voluntariado
- Carga opcional e idempotente de candidaturas fictícias para testar última vaga e oportunidade lotada.
- Resumo de ocupação, fila e capacidade; recriação restrita aos exemplos, com confirmação.
- Testes no navegador confirmando aprovação, encaminhamento à fila, desistência, promoção manual e nova inscrição lotada.
- Preservação dos grupos abertos após decisões e remoção do aviso de edição pendente após inscrição salva.

## 2026-10-21 — Melhorias de navegação
- Buscas e filtros preservados por página na aba, sem alterar o armazenamento dos cadastros.
- Abas com contadores para solicitações, notificações no menu e estado dos acordeões preservado.
- Aviso antes de abandonar edições não salvas e ações de formulário com nomes específicos.
- Atalho para cadastrar projetos da ONG selecionada e menu recolhível no celular.
- Estrutura dos formulários, CSS e aviso superior presentes no HTML inicial; atualizações preservam o conteúdo e a edição.
- Auditoria de navegação com confirmação de descarte, filtros persistidos, abas, notificações e menu móvel.

## 2026-10-21 — Varredura do frontend após integração
- Diagnóstico de acesso pelo Live Server e link para a página equivalente no servidor PHP.
- Estados de carregamento e erro na home, transparência, catálogos e painéis.
- Remoção de carregamentos duplicados e de dependência desnecessária da API em páginas estáticas.
- Validação do catálogo antes de atualizar a interface e bloqueio de gravação no painel sem dados carregados.
- Auditoria de 15 páginas no Chrome, modais, telas de celular e falhas simuladas da API.
- Tarefa do VS Code para iniciar o ambiente PHP/MariaDB.

## 2026-10-20 — MVP PHP e MariaDB
- API JSON para solicitações, rejeição, publicação e CRUD de ONGs e projetos.
- Persistência compartilhada e catálogo remoto, sem mesclar cadastros antigos do navegador.
- Painel público simplificado, sem solicitação de credenciais, com histórico de análise.
- Esquema SQL, carga inicial, instalador CLI, documentação de publicação e testes HTTP.
- Doações e candidaturas continuam demonstrativas e locais.

## 2026-10-09 — Carrosséis na página inicial
- ONGs antes dos projetos, com até seis registros por seção e navegação horizontal independente.
- Cartões de projetos na página inicial sem barra de progresso, arrecadação e botão Apoiar.
- Botão Conhecer projeto mantém o modal e suas opções de voluntariado e apoio.
- Páginas completas de ONGs e Projetos permanecem inalteradas.

# CHANGELOG — ONG Connect

## 2026-10-08 — Consolidação histórica

Documentação consolidada das entregas iterativas: portal multi-ONG; dashboard; formulários de candidatura em modal; cadastro/edição de ONGs e projetos; vínculo projeto–ONG; aprovação/rejeição com justificativa e histórico; controle automático de vagas; rejeição definitiva; identidade visual com imagem; doações simuladas com ONG responsável e filtros; indicadores financeiros compactos com valor completo no hover/foco.

**Estado:** versão acadêmica com JSON + localStorage. Sem autenticação ou pagamentos reais. Testes de regressão ainda devem ser executados em navegador.

**Nota:** este changelog registra decisões e funcionalidades do código verificado, não commits Git nem datas individuais de cada implementação.


- Substituídos botões de valores de doação por listbox (select) com valores predefinidos e Outro valor.
- Criado modal de dados de cobrança demonstrativos; registro da doação somente após confirmação; sem armazenamento de dados pessoais do formulário.


### 2026-10-09 — Cartões públicos das ONGs
- Imagens de cadastro restritas ao cabeçalho (180 px), sem sobreposição com o texto.
- Descrição limitada a três linhas, texto integral no atributo title.
- Rodapé e botão Ver projetos alinhados; fallback para iniciais quando não houver imagem.
- Preservados os demais módulos e o menu lateral fixo.

### 2026-10-09 — Dimensões obrigatórias de imagens das ONGs
- Novas imagens devem medir exatamente 1200 × 600 pixels (2:1).
- Arquivos com dimensões diferentes são recusados com indicação das medidas detectadas.
- Mantidos formatos JPG, PNG e WebP e limite de 1 MB.
- Validação de upload assíncrona; bloqueio de salvamento durante análise ou após seleção inválida.
- Imagens previamente cadastradas são preservadas, inclusive ao editar outros campos da ONG.

- Cartões públicos das ONGs: botão Conhecer ONG e modal acessível com abas Sobre, Projetos e Contato; preservado Ver projetos.

- 2026-10-09: Navegação administrativa simplificada; marca retorna ao dashboard; Visualizar site abre nova aba; menu de perfil com hierarquia, edição local de nome/e-mail/telefone/foto e saída demonstrativa.


### Correção de navegação administrativa — 09/10/2026
- Corrigido o destaque do menu lateral em todas as seis páginas administrativas.
- Apenas a página atual recebe a classe `active` e `aria-current="page"`.
- Sem alterações no armazenamento ou nas regras de negócio.

- Padronizacao visual dos seletores de arquivos (foto de perfil e capa da ONG), incluindo estados hover e foco, sem alterar validacoes ou logica de upload.

- Doações integradas aos cartões de projetos: modal em duas etapas, sem página Campanhas no menu público.

- Corrigido modal Apoiar: primeiro selecionar valor, depois preencher dados de pagamento; botão Voltar preservado.

- Carrosséis da página inicial: barra de rolagem oculta e setas transparentes sobrepostas às laterais dos cartões, preenchimento verde ao passar o mouse e ocultação nas extremidades.

- 2026-10-09: Setas dos carrosséis com ícones SVG robustos, transparência verde no hover e transição suave de 250 ms, preservando o conteúdo ao fundo.

## 2026-10-09 — Filtro por ONG e projetos recentes
- Links Ver projetos de cada ONG direcionam à página de projetos com filtro por ONG pré-selecionado, alterável pelo visitante.
- Página inicial exibe os seis projetos cadastrados mais recentemente, por data de criação (sem priorização manual). Projetos legados sem data mantêm a ordem histórica de cadastro.
- Novos projetos recebem `criadoEm` na criação; editar não modifica esse campo.

## 2026-10-09 — Auditoria e documentação
- Revisão estática de páginas, scripts, links e rotas legadas.
- README e documentos operacionais alinhados à versão atual.
- Inventário de itens legados em `docs/AUDITORIA_E_LIMPEZA.md`.
- Sem exclusões de código/arquivos para preservar compatibilidade.

## 2026-10-09 — Documentação acadêmica completa
- README reescrito com instruções de apresentação e índice de documentação.
- Criados 12 capítulos didáticos para páginas, fluxos, dados, testes e escopo.
- Arquivos de aplicação preservados, sem alterações de comportamento.

## 2026-10-09 — Ampliação dos dados demonstrativos
- Dados iniciais ampliados para 6 ONGs fictícias e 17 projetos fictícios, com vínculos válidos.
- README e documentação de dados atualizados.

## 2026-10-09 — Ilustrações e valores de demonstração
- Adicionadas 23 imagens SVG locais: 6 ONGs e 17 projetos.
- Metas, arrecadações iniciais e voluntários fictícios atualizados com números reproduzíveis.
- Cards públicos exibem imagens locais, inclusive sem internet.

## 2026-10-09 — Dados demonstrativos portáteis
- Dados iniciais incorporados em `assets/js/demo-data.js` para uso em outro computador.
- Imagens locais predefinidas para 6 ONGs e 17 projetos preservadas.
- Documentado o limite de portabilidade do localStorage.
