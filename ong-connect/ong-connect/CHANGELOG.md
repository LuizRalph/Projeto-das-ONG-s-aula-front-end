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
