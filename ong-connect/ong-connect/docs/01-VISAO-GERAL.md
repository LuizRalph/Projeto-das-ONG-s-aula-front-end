# 01 — Visão geral do projeto

## Tema e problema
ONG Connect é uma aplicação web acadêmica que simula a aproximação entre organizações não governamentais (ONGs), projetos sociais, voluntários e apoiadores. Em vez de dispersar as informações em diferentes canais, o protótipo oferece uma interface única para descobrir causas, registrar interesse em voluntariado e simular contribuições.

## Objetivo geral
Demonstrar o desenvolvimento de um portal responsivo com páginas públicas, formulários, persistência local, gerenciamento administrativo e visualização de indicadores.

## Objetivos específicos
- Apresentar ONGs e projetos em catálogos e cartões interativos.
- Permitir solicitação inicial de cadastro de organizações e sua análise administrativa.
- Demonstrar pré-aprovação, complementação, rascunho e publicação de cadastro.
- Simular inscrições em oportunidades e contribuições financeiras.
- Exibir indicadores agregados de transparência e relatórios.
- Aplicar HTML semântico, CSS responsivo e JavaScript para manipulação do DOM.

## Público-alvo simulado
Visitantes, apoiadores, voluntários, representantes de ONGs e administradores da plataforma. Esses perfis são **papéis conceituais**: o protótipo não oferece autorização real por usuário.

## Escopo
O projeto funciona em navegador com servidor estático local (Live Server). Dados iniciais vêm de JSON; novos registros ficam no `localStorage`. Não há cobrança, autenticação efetiva, envio de e-mails nem integração governamental. Essas limitações são intencionais e adequadas ao escopo de demonstração acadêmica.

## Tecnologias e conceitos exercitados
HTML5, CSS3, JavaScript, eventos, validação de formulários, `fetch`, JSON, `localStorage`, renderização dinâmica, filtros, componentes modais, indicadores e exportação CSV.

## Critérios de avaliação sugeridos
Navegação, consistência visual, validação de campos, integridade dos fluxos, persistência após atualizar a página, legibilidade do código e clareza da apresentação. Consulte `10-TESTES-E-DEMONSTRACAO.md`.
