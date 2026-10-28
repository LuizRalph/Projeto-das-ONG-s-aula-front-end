# 07 — Voluntariado

Revisado em 26/10/2026.

Usuários possuem perfil compartilhado com contato, nascimento, cidade/UF, disponibilidade, habilidades e experiência. A candidatura registra usuário, oportunidade, status e dados da inscrição no MariaDB. A agenda e a capacidade são validadas na API, inclusive na aprovação. A mesma pessoa não pode ter duas candidaturas ativas na mesma vaga; o índice com coluna gerada protege essa regra. Lista de espera depende de decisão manual. Transições são preservadas em historico_candidaturas; o perfil JSON não substitui as chaves do relacionamento.

Referências: [README](../README.md), [modelo de dados](09-ESTRUTURA-DE-DADOS.md) e [relatório acadêmico](academico/RELATORIO-ACADEMICO.md).
