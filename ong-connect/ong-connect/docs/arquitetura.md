# Arquitetura atual

Aplicação estática HTML5, CSS3 e JavaScript sem framework. `assets/js/app.js` carrega JSON inicial (`data/ongs.json`, `projetos.json`, `oportunidades.json`) com `fetch`, combina cadastros e edições persistidos no `localStorage` e oferece funções compartilhadas. `assets/js/dashboard.js` gerencia módulos administrativos. `assets/js/complementar-ong.js` processa complementação local; `login-modal.js` e `account.js` implementam interfaces demonstrativas de acesso/perfil.

## Modelo lógico
ONG 1:N Projetos; Projeto 1:N Oportunidades; Oportunidade 1:N Candidaturas; Projeto 1:N Contribuições simuladas. Solicitações de ONG têm status e rascunhos próprios.

## Persistência
Chaves `ongconnect_ongs`, `ongconnect_ongs_edicoes`, `ongconnect_projetos`, `ongconnect_projetos_edicoes`, `ongconnect_candidaturas`, `ongconnect_doacoes`, `ongconnect_solicitacoes_ongs` e `ongconnect_ongs_cadastro_rascunhos`, além de preferências/perfil demonstrativos. Os JSON de origem não são alterados.

## Limitações
Sem backend, API, autenticação real, isolamento por ONG, pagamentos ou armazenamento seguro. O `localStorage` é por origem e navegador, sujeito a perda, manipulação e limite de tamanho.

## Produção
API PHP ou equivalente, MariaDB, autenticação, RBAC com escopo por ONG, validação no servidor, proteção LGPD, trilhas de auditoria, upload seguro, e-mail transacional e integração financeira. Parcerias públicas devem registrar valor previsto, repassado e aplicado separadamente.
