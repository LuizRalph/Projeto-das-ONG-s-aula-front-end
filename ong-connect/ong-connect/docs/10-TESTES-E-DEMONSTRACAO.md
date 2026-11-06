# 10 — Testes e demonstração

Revisado em 05/11/2026.

O roteiro vigente está no [guia de QA local](QA-LOCAL.md), com comando único, modo rápido/completo, relatórios e checklist manual em banco exclusivo. Execute `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/qa-local.ps1` a partir da pasta externa. Para conferir a interface, use `scripts/qa-manual.ps1` conforme o guia.

A integração `scripts/test-shared.cjs` cobre permissões, concorrência, CSRF, filas, segmentos, relatórios, repasses e as [proteções P0](SEGURANCA-P0.md). Os bancos de testes têm prefixo `ong_connect_test_`. O GitHub Actions executa testes do cliente e integração; o novo comando PowerShell é a rotina local. As suítes de navegador antigas são opcionais, dependem de Chrome e precisam de revisão antes de integrar a rotina padrão. Esses testes não constituem certificação de segurança ou de carga. O experimento acadêmico independente está em `scripts/academic-json-comparison.php` e cria somente tabelas temporárias. Veja o roteiro acadêmico para ordem e critérios da apresentação.

Referências: [README](../README.md), [modelo de dados](09-ESTRUTURA-DE-DADOS.md) e [relatório acadêmico](academico/RELATORIO-ACADEMICO.md).
