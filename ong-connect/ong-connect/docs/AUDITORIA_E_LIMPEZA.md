# Auditoria estática e limpeza documental — 09/10/2026

**Origem:** `ong-connect-notificacoes-status.zip`.

## Verificações realizadas
- 15 páginas HTML analisadas.
- 5 arquivos JavaScript passaram em `node --check`.
- Nenhum alvo de `href` ou `src` local ausente detectado por inspeção estática.
- Inspeção das rotas, dados JSON, persistência, fluxos e documentos.
- Não houve execução de testes end-to-end em navegador nem auditoria de segurança de servidor.

## Componentes antigos e decisão
| Arquivo | Uso atual | Decisão |
|---|---|---|
| `pages/campanhas.html` | Redirecionamento para `projetos.html` | Manter por compatibilidade |
| `pages/voluntariado.html` | Redirecionamento para `projetos.html` | Manter por compatibilidade |
| `pages/login.html` | Página auxiliar/legada; entrada principal usa modal | Manter até confirmar links externos |
| `pages/contato.html` | Formulário auxiliar demonstrativo, sem envio real | Manter |
| `docs/HISTORICO_E_REGRAS_DE_NEGOCIO.md` | Histórico de decisões e versões | Manter como histórico |
| `docs/PROMPT_MESTRE_CODEX.md` | Prompt de planejamento | Manter como referência histórica |
| `data/*.json` | Carregamento inicial via `fetch` | Necessário |
| `assets/js/account.js`, `login-modal.js`, `complementar-ong.js` | Funcionalidades demonstrativas atuais | Necessários |

**Não foram removidos arquivos de aplicação:** exclusão automática poderia quebrar links antigos, CSS dinâmico ou fluxos sem cobertura de testes. A limpeza segura realizada foi a atualização e organização documental, distinguindo funcionalidades vigentes de componentes legados.

## Documentos atualizados
`README.md`, `docs/arquitetura.md`, `docs/requisitos.md`, `docs/casos-de-uso.md`, `docs/DOACOES_INTEGRADAS.md`, `docs/INTEGRACAO_VOLUNTARIADO.md`, `CHANGELOG.md`. Novos: `docs/FLUXOS_ATUAIS.md` e este relatório.

## Limitações identificadas
1. Persistência apenas em `localStorage`; não há compartilhamento entre dispositivos.
2. Painel sem autenticação real, autorização ou trilha inviolável.
3. Doações e indicadores usam valores fictícios; não demonstram dinheiro efetivamente recebido.
4. Sem lançamento e validação de repasses públicos.
5. Sem envio de e-mail, armazenamento seguro de documentos, API de CNPJ ou CEP.
6. Sem testes automatizados de interface; modais, formulários e estilos exigem regressão manual.

## Limpeza futura recomendada
Antes de excluir CSS, funções ou páginas legadas, criar testes de navegação e mapear uso dinâmico de seletores. Ausência de referência literal em HTML não demonstra que uma classe não é usada por JavaScript.
