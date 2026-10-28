# 10 — Testes e demonstração

Revisado em 26/10/2026.

A versão auditada teve 42 verificações de integração aprovadas por scripts/test-shared.cjs, incluindo permissões, concorrência, CSRF, filas, segmentos, relatórios e repasses. Os bancos de testes têm prefixo ong_connect_test_. Chrome validou relatórios, CSV, modais, documentos, cancelamento e mobile; o harness scripts/test-modelagem-browser.cjs depende de Chrome e de um banco de testes existente. Isso não constitui certificação de segurança ou de carga. O experimento acadêmico independente está em scripts/academic-json-comparison.php e cria somente tabelas temporárias. Veja o roteiro acadêmico para ordem e critérios da apresentação.

Referências: [README](../README.md), [modelo de dados](09-ESTRUTURA-DE-DADOS.md) e [relatório acadêmico](academico/RELATORIO-ACADEMICO.md).
