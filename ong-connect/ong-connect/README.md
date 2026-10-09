# ONG Connect

**Projeto acadêmico de desenvolvimento web — versão demonstrativa**

ONG Connect é um portal fictício que conecta organizações não governamentais, projetos sociais, voluntários e apoiadores. Foi desenvolvido para demonstrar conceitos de HTML5, CSS3 e JavaScript, com dados iniciais em JSON e persistência no `localStorage` do navegador.

> **Importante:** o projeto não é um serviço em produção. Doações, acesso de usuários, dados financeiros e processos administrativos são simulados. Utilize apenas dados fictícios.

## Objetivo do trabalho
Demonstrar uma aplicação web responsiva com catálogos, formulários, validação, modais, filtros, cadastros, fluxos de aprovação, armazenamento local, indicadores e relatórios. Consulte [Visão geral](docs/01-VISAO-GERAL.md).

## Como executar
1. Abra a pasta `ong-connect` no **Visual Studio Code**.
2. Utilize a extensão **Live Server** e escolha **Open with Live Server** em `index.html`.
3. Navegue pelo menu do portal. Para acessar os módulos administrativos, abra `dashboard/index.html`.
4. Utilize sempre a mesma origem/porta para conservar os registros de `localStorage`.

**Requisitos:** navegador moderno, VS Code e Live Server (ou outro servidor HTTP estático). Não é necessário PHP, banco de dados, `npm` ou instalação de bibliotecas.

**Por que não abrir com duplo clique?** A leitura dos arquivos JSON utiliza `fetch`, que pode falhar no protocolo `file://`.

## Funcionalidades demonstradas
- **Home:** carrosséis de ONGs e projetos, modais e solicitação de cadastro de ONG.
- **ONGs:** catálogo, detalhes institucionais e projetos vinculados.
- **Projetos:** catálogo, detalhes, apoio fictício e oportunidades de voluntariado.
- **Transparência:** indicadores, origem demonstrativa dos recursos, distribuição por área e informações institucionais.
- **Administração:** dashboard, análise de ONGs, cadastro e edição de projetos, voluntários, doações e relatórios CSV.
- **Cadastro institucional:** solicitação, pré-aprovação, complementação, rascunho, revisão e publicação.
- **Notificações:** contador vermelho para pedidos pendentes e laranja para pré-aprovados ainda não concluídos.

## Documentação completa
| Documento | Assunto |
|---|---|
| [01 — Visão geral do projeto](docs/01-VISAO-GERAL.md) | Funcionamento e explicações do tema |
| [02 — Arquitetura e organização do código](docs/02-ARQUITETURA.md) | Funcionamento e explicações do tema |
| [03 — Páginas públicas](docs/03-PAGINAS-PUBLICAS.md) | Funcionamento e explicações do tema |
| [04 — Painel administrativo](docs/04-PAINEL-ADMINISTRATIVO.md) | Funcionamento e explicações do tema |
| [05 — Cadastro de ONGs: fluxo completo](docs/05-CADASTRO-DE-ONGS.md) | Funcionamento e explicações do tema |
| [06 — Projetos e doações simuladas](docs/06-PROJETOS-E-DOACOES.md) | Funcionamento e explicações do tema |
| [07 — Voluntariado](docs/07-VOLUNTARIADO.md) | Funcionamento e explicações do tema |
| [08 — Transparência e indicadores](docs/08-TRANSPARENCIA.md) | Funcionamento e explicações do tema |
| [09 — Dados e persistência](docs/09-ESTRUTURA-DE-DADOS.md) | Funcionamento e explicações do tema |
| [10 — Roteiro de testes e apresentação acadêmica](docs/10-TESTES-E-DEMONSTRACAO.md) | Funcionamento e explicações do tema |
| [11 — Limitações e decisões de escopo](docs/11-LIMITACOES.md) | Funcionamento e explicações do tema |
| [12 — Possibilidades de evolução futura](docs/12-EVOLUCOES.md) | Funcionamento e explicações do tema |

### Referências técnicas complementares
- [Fluxos atuais](docs/FLUXOS_ATUAIS.md)
- [Auditoria estática e componentes legados](docs/AUDITORIA_E_LIMPEZA.md)
- [Arquitetura técnica resumida](docs/arquitetura.md)
- [Requisitos](docs/requisitos.md)
- [Casos de uso](docs/casos-de-uso.md)
- [Histórico de alterações](CHANGELOG.md)

Os documentos `docs/HISTORICO_E_REGRAS_DE_NEGOCIO.md` e `docs/PROMPT_MESTRE_CODEX.md` são referências históricas e podem mencionar versões antigas; **não substituem a documentação atual**.

## Estrutura simplificada
```text
ong-connect/
├── index.html
├── pages/              # Páginas públicas e complementação
├── dashboard/          # Painel administrativo demonstrativo
├── assets/css/         # Estilos
├── assets/js/          # Lógica do navegador
├── data/               # Dados iniciais fictícios em JSON
├── docs/               # Documentação acadêmica e técnica
├── CHANGELOG.md
└── README.md
```

## Fluxo de cadastro de ONG (resumo)
`Pendente → Aprovado → Aguardando complementação → Aguardando revisão → Cadastrada` (com possibilidade de rejeição na análise e salvamento de rascunho). A pré-aprovação **não** publica a organização. Veja [Cadastro de ONGs](docs/05-CADASTRO-DE-ONGS.md).

## Persistência e dados simulados
Os JSON oferecem registros iniciais; alterações feitas na interface são armazenadas no navegador em chaves `ongconnect_`. Não há sincronização entre computadores. Os valores de arrecadação incluem bases fictícias e contribuições simuladas, não comprovantes financeiros. Veja [Estrutura de dados](docs/09-ESTRUTURA-DE-DADOS.md) e [Limitações](docs/11-LIMITACOES.md).

## Como apresentar o projeto
Use o [roteiro de testes e demonstração](docs/10-TESTES-E-DEMONSTRACAO.md) para demonstrar páginas públicas, solicitação e aprovação de ONG, complementação, rascunho, doações fictícias, voluntariado, indicadores e relatórios.

## Estado da revisão
Documentação alinhada à versão do código disponível em **09/10/2026**. A auditoria foi estática (páginas, scripts e links); **não** substitui testes completos no navegador. Os arquivos de aplicação foram preservados nesta atualização documental.

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

## Conteúdo fictício ilustrado

A versão acadêmica inclui **6 ONGs e 17 projetos** com ilustrações vetoriais locais em `assets/images/demo/`. Os dados financeiros (metas e arrecadações iniciais) e números de voluntários são fictícios, gerados com semente fixa para manter os mesmos valores em todos os computadores. Não são valores reais. As imagens são ilustrações temáticas, não fotografias das organizações.

## Demonstração em outro computador

Os **6 cadastros de ONGs e 17 projetos**, com imagens e valores fictícios, acompanham o ZIP em `assets/js/demo-data.js` e `assets/images/demo/`. Eles aparecem em uma instalação nova sem copiar dados do navegador anterior. Alterações feitas depois pelo usuário permanecem no `localStorage` do computador de origem. Consulte `docs/DADOS_DEMONSTRACAO_PORTAVEIS.md`.
