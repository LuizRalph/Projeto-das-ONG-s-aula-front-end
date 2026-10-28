# Requisitos vigentes

Revisado em 26/10/2026. Estes requisitos descrevem a aplicação; os requisitos da disciplina estão na [matriz acadêmica](academico/MATRIZ-CONFORMIDADE.md).

| ID | Requisito |
|---|---|
| RF01 | Consultar ONGs, projetos, vagas e transparência pública |
| RF02 | Registrar e revisar solicitações de ONG, preservando histórico e controle de CNPJ |
| RF03 | Bloquear novas solicitações após três rejeições distintas do mesmo CNPJ |
| RF04 | Autenticar contas e restringir operações por perfil e vínculo da ONG |
| RF05 | Cadastrar projetos completos e selecionar segmentos gerenciados pelo administrador |
| RF06 | Gerenciar oportunidades, capacidade, agenda e abertura de inscrições |
| RF07 | Registrar candidaturas compartilhadas com duplicidade e conflito de agenda controlados |
| RF08 | Analisar, cancelar e promover candidaturas manualmente, com histórico |
| RF09 | Registrar doações simuladas com reenvio idempotente e cancelamento |
| RF10 | Separar repasses públicos, documentos privados e prestação de contas |
| RF11 | Consolidar relatórios por tipo, período e ONG, exportando CSV |
| RF12 | Consultar auditoria exclusivamente como administrador geral |

Restrições: chaves estrangeiras, transações, DECIMAL para valores, CSRF, senha com hash, validação no backend e testes de isolamento. O portal usa dados fictícios; não processa pagamentos nem representa aprovação de contas por órgão público. A auditoria não guarda todas as versões anteriores de cada campo. A documentação distingue recursos efetivos, experimentos e propostas futuras.
