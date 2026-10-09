# 02 — Arquitetura e organização do código

## Visão geral
O ONG Connect é uma aplicação **frontend estática**. O navegador solicita arquivos HTML, CSS, JavaScript e JSON a um servidor HTTP local. O JavaScript lê dados iniciais e os combina com registros persistidos no `localStorage`.

```text
Navegador / Live Server
  ├─ HTML: estrutura das páginas
  ├─ CSS: apresentação responsiva
  ├─ JS: eventos, validações, modais, filtros e painéis
  ├─ JSON: dados iniciais de ONGs, projetos e oportunidades
  └─ localStorage: solicitações, cadastros, edições, doações e candidaturas locais
```

## Arquivos principais
- `index.html`: home, carrosséis, formulários e modais públicos.
- `pages/`: catálogos, transparência, complementação e páginas auxiliares.
- `dashboard/`: indicadores, ONGs, projetos, voluntários, doações e relatórios.
- `assets/css/style.css`: estilos globais e componentes visuais.
- `assets/js/app.js`: funções compartilhadas, leitura de JSON, interface pública e armazenamento.
- `assets/js/dashboard.js`: lógica administrativa, análise de solicitações e relatórios.
- `assets/js/complementar-ong.js`: formulário complementar associado ao identificador de solicitação.
- `assets/js/login-modal.js` e `account.js`: interface demonstrativa de acesso e perfil.
- `data/*.json`: conjunto de registros iniciais fictícios.

## Inicialização e dados
`loadData()` executa `fetch` para `data/ongs.json`, `data/projetos.json` e `data/oportunidades.json`. ONGs e projetos novos são acrescentados aos arrays em memória; edições são aplicadas sobre os dados-base. O `store` prefixa as chaves com `ongconnect_` e usa `JSON.stringify`/`JSON.parse`.

## Relações conceituais
Uma ONG pode ter vários projetos; cada projeto pode ter oportunidades de voluntariado e doações simuladas. Candidaturas se vinculam a oportunidades. Solicitações de cadastro de ONG possuem status próprio e podem originar uma ONG publicada.

## Por que usar Live Server?
Ao abrir HTML diretamente como `file://`, o navegador pode bloquear o `fetch` dos JSON. Um servidor HTTP local resolve esse problema e fornece uma origem consistente ao `localStorage`.

## Cuidados acadêmicos
`localStorage` é visível e modificável pelo usuário; por isso não representa um banco multiusuário. Não se deve afirmar que há login seguro, pagamento real ou auditoria financeira.
