# 11 — Limitações e decisões de escopo

O ONG Connect é um **protótipo acadêmico** e não foi projetado para uso com dados reais. As limitações a seguir descrevem o alcance da demonstração, não defeitos a serem necessariamente corrigidos nesta entrega.

- **Persistência local:** `localStorage` não sincroniza usuários nem computadores.
- **Login demonstrativo:** não existe autenticação segura ou autorização por ONG.
- **Doações:** não são pagamentos reais; não há gateway ou comprovante financeiro.
- **Parcerias públicas:** não há integração com bases oficiais ou lançamento de repasses.
- **Cadastro:** CNPJ e CEP não são consultados em serviços oficiais; links de complementação não são convites seguros.
- **Comunicações:** não há envio real de e-mail, SMS ou WhatsApp.
- **Documentos:** não há upload seguro de documentos pessoais ou bancários.
- **Auditoria:** histórico local não é inviolável.
- **Qualidade:** verificações de sintaxe e links não substituem testes de interface.

## Por que essa arquitetura é adequada ao trabalho?
Permite demonstrar HTML, CSS, JavaScript, eventos, formulários, armazenamento, filtros, relacionamento entre entidades e experiência do usuário sem depender de servidor de aplicação ou infraestrutura externa.

## Como apresentar corretamente
Use sempre expressões como **simulado**, **demonstrativo** e **dados fictícios** ao falar de doações, login, repasses e cadastro. Não apresente a aplicação como serviço financeiro ou sistema de gestão oficial.
