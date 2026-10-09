> **Documento histórico / de planejamento.** Pode conter regras antigas. Para o funcionamento implementado nesta versão, consulte `../README.md`, `FLUXOS_ATUAIS.md` e `AUDITORIA_E_LIMPEZA.md`.

# ONG Connect — Histórico funcional, arquitetura e regras de negócio

**Versão de referência:** 08/10/2026 — última entrega `ong-connect-valores-compactos.zip`  
**Natureza:** protótipo acadêmico multi-ONG, executado no navegador.  
**Fonte de verificação:** arquivos `assets/js/app.js`, `assets/js/dashboard.js`, páginas HTML e JSON da última entrega, além das decisões registradas durante o desenvolvimento.

> **Importante:** os itens classificados como *implementados* são observados no código-fonte; isso não equivale a homologação funcional em todos os navegadores. Não há autenticação real, pagamentos reais ou auditoria inviolável.

## 1. Objetivo e escopo

Plataforma que conecta múltiplas organizações sociais, seus projetos, oportunidades de voluntariado e campanhas de arrecadação. Possui portal público e painel administrativo demonstrativo. O trabalho acadêmico prioriza HTML5 semântico, CSS3 responsivo, JavaScript, acessibilidade, versionamento e documentação.

## 2. Tecnologia e execução

- Frontend: HTML5, CSS3, JavaScript sem framework.
- Dados de referência: `data/ongs.json`, `data/projetos.json`, `data/oportunidades.json` carregados via `fetch`.
- Persistência demonstrativa: `localStorage`, com prefixo `ongconnect_`.
- Execução: VS Code + Live Server, via `http://127.0.0.1:5500/...` ou endereço equivalente.
- Abrir HTML diretamente via `file://` pode impedir carregamento JSON por restrições do navegador.
- A origem (protocolo, host e porta) e o perfil do navegador determinam o armazenamento acessível. Substituir o ZIP não migra nem exporta os dados do `localStorage`.

## 3. Páginas e módulos existentes

| Área | Arquivo principal | Finalidade |
|---|---|---|
| Início | `index.html` | Apresentação, contagem dinâmica de ONGs e projetos, destaques |
| ONGs | `pages/ongs.html` | Catálogo de organizações e acesso a seus projetos |
| Projetos | `pages/projetos.html` | Pesquisa, categoria, associação com ONG, campanhas |
| Voluntariado | `pages/voluntariado.html` | Oportunidades, vagas, modal de inscrição |
| Campanhas | `pages/campanhas.html` | Contribuições financeiras **simuladas** |
| Transparência | `pages/transparencia.html` | Indicadores e resultados por projeto |
| Login | `pages/login.html` | Interface demonstrativa; sem autenticação segura |
| Contato | `pages/contato.html` | Informações e contato |
| Dashboard | `dashboard/index.html` | Indicadores por organização |
| Gestão de ONGs | `dashboard/ongs.html` | Cadastro, edição, imagem institucional |
| Gestão de projetos | `dashboard/projetos.html` | Cadastro, edição, vínculo obrigatório com ONG |
| Gestão de voluntários | `dashboard/voluntarios.html` | Visualizar, aprovar, rejeitar e histórico |
| Gestão de doações | `dashboard/doacoes.html` | Histórico com ONG primeiro e filtros |
| Relatórios | `dashboard/relatorios.html` | Resumos e exportação CSV |

## 4. Entidades e relacionamentos

**ONG:** `id`, nome, sigla, categoria, cidade, e-mail, cor, descrição, missão, imagem.  
**Projeto:** `id`, `ongId`, título, categoria, meta, descrição, arrecadado, voluntários, status.  
**Oportunidade:** `id`, `projetoId`, título, local, período, modalidade, vagas.  
**Candidatura:** `id`, `oportunidadeId`, dados do candidato, data, status, histórico de decisões, motivo de rejeição.  
**Doação:** `id`, `projetoId`, valor, data, status `Simulada`.

Relações: ONG **1:N** projetos; projeto **1:N** oportunidades; oportunidade **1:N** candidaturas; projeto **1:N** doações. A ONG de uma doação é obtida indiretamente pelo projeto. A ONG de uma candidatura é obtida pela oportunidade → projeto → ONG.

## 5. Regras de negócio — cadastro de ONGs

**RN-ONG-01:** cadastrar múltiplas ONGs no mesmo portal.  
**RN-ONG-02:** permitir editar os dados institucionais existentes.  
**RN-ONG-03:** a imagem da organização pode ser PNG, JPG/JPEG ou WebP, com limite de 1 MB; é pré-visualizada antes de salvar e pode ser removida.  
**RN-ONG-04:** se houver imagem válida, apresentá-la no cartão público; se não houver, usar iniciais/sigla.  
**RN-ONG-05:** contagem da página inicial deve usar o total de ONGs carregadas e cadastradas, não texto fixo.  
**RN-ONG-06:** os dados de imagem são guardados localmente (Data URL), sujeitos à quota de armazenamento do navegador.  
**RN-ONG-07:** no protótipo, não há isolamento seguro de dados por usuário/ONG: a restrição multi-tenant deverá ser implementada no backend futuro.

## 6. Regras de negócio — projetos

**RN-PRO-01:** um projeto deve possuir exatamente uma ONG responsável (`ongId` válido).  
**RN-PRO-02:** a seleção da ONG é obrigatória no cadastro e pode ser alterada na edição.  
**RN-PRO-03:** não salvar projeto sem título, descrição, meta positiva ou ONG existente.  
**RN-PRO-04:** o catálogo público mostra a ONG associada e permite filtrar projetos de uma ONG.  
**RN-PRO-05:** a contagem da página inicial deve refletir o total efetivo de projetos carregados e cadastrados.  
**RN-PRO-06:** a associação é por identificador, não por nome textual.  
**RN-PRO-07:** não há atualmente uma política completa de exclusão, arquivamento ou transferência de dependências; definir antes de implantar.

## 7. Regras de negócio — voluntariado e vagas

**RN-VOL-01:** a inscrição é iniciada pelo botão `Candidatar-se`, que abre modal sobre a página, com a oportunidade e ONG selecionadas.  
**RN-VOL-02:** a candidatura começa como `Pendente`; a inscrição pendente **não** ocupa vaga.  
**RN-VOL-03:** `Aprovado` ocupa uma vaga da oportunidade.  
**RN-VOL-04:** `Rejeitado` não ocupa vaga; se antes estava aprovado, a rejeição devolve a vaga.  
**RN-VOL-05:** `vagasDisponiveis = max(0, vagasTotais − quantidadeDeCandidaturasAprovadasDaOportunidade)`.  
**RN-VOL-06:** quando as vagas disponíveis forem zero, exibir `Vagas esgotadas` e desabilitar nova candidatura.  
**RN-VOL-07:** bloquear aprovação quando não houver vagas.  
**RN-VOL-08:** bloquear inscrição duplicada com mesmo e-mail para a mesma oportunidade quando já houver candidatura `Pendente` ou `Aprovado`.  
**RN-VOL-09:** aprovação e rejeição exigem modal com responsável e justificativa (mínimo de 10 caracteres no código atual).  
**RN-VOL-10:** cada decisão deve registrar status anterior, status novo, responsável informado, justificativa e data/hora.  
**RN-VOL-11:** a tela `Visualizar` deve exibir dados cadastrais e histórico de decisões.  
**RN-VOL-12:** **rejeição definitiva**: candidatura com status `Rejeitado` não pode voltar a `Aprovado`, nem ter sua decisão alterada pelo fluxo normal. Botões ficam desabilitados e o handler JavaScript também rejeita a tentativa.  
**RN-VOL-13:** uma candidatura `Aprovado` pode ser rejeitada, liberando vaga; uma `Pendente` pode ser aprovada ou rejeitada.  
**RN-VOL-14:** decisões devem ser consultáveis, mas o histórico em `localStorage` é editável pelo usuário e não constitui trilha de auditoria legal ou segura.

### Matriz de transições

| Estado atual | Aprovar | Rejeitar | Visualizar |
|---|---|---|---|
| Pendente | Permitido, se houver vaga | Permitido | Permitido |
| Aprovado | Bloqueado | Permitido, devolve vaga | Permitido |
| Rejeitado | **Bloqueado definitivamente** | Bloqueado | Permitido |

### Exemplo

Oportunidade com 6 vagas: 2 candidaturas aprovadas, 3 pendentes e 1 rejeitada → **4 vagas disponíveis**. Aprovar mais uma reduz para 3; rejeitar uma das aprovadas devolve uma vaga.

## 8. Regras de negócio — doações e relatórios

**RN-DOA-01:** toda doação atual é **simulação**, sem transação financeira real.  
**RN-DOA-02:** registro contém projeto, valor, data e status; ONG é obtida pelo vínculo do projeto.  
**RN-DOA-03:** histórico administrativo apresenta colunas nesta ordem: **ONG responsável, Projeto, Valor, Data, Status**.  
**RN-DOA-04:** permitir filtros combinados por ONG, projeto, status e intervalo de datas.  
**RN-DOA-05:** ao escolher ONG, opções de projeto devem ser restritas aos projetos dessa ONG presentes no histórico.  
**RN-DOA-06:** incluir botão para limpar filtros, quantidade de registros filtrados e total monetário filtrado.  
**RN-DOA-07:** quando um projeto/ONG não for encontrado, mostrar identificação neutra (`Projeto não encontrado` / `ONG não identificada`), não inventar vínculo.  
**RN-DOA-08:** relatórios usam valores completos, não abreviações.

## 9. Regras de negócio — indicadores e moeda

**RN-IND-01:** total de ONGs e projetos da home é dinâmico.  
**RN-IND-02:** cartões monetários do Dashboard e Transparência devem abreviar valores para evitar overflow.  
**RN-IND-03:** abreviações: `mil` a partir de R$ 1.000, `mi` a partir de R$ 1.000.000, `bi` a partir de R$ 1.000.000.000; máximo de duas casas decimais na representação compacta.  
**RN-IND-04:** o valor exato em BRL (`pt-BR`) deve aparecer **somente no hover ou foco** do indicador (tooltip/title); não deve aparecer como legenda fixa sob o número.  
**RN-IND-05:** tabelas e relatórios devem manter o valor completo.  
**RN-IND-06:** cartões precisam ser responsivos e evitar invasão visual de cartões vizinhos.  
**RN-IND-07:** o percentual de metas é calculado a partir dos valores de arrecadação e meta dos projetos; é um indicador demonstrativo, não prova de resultado financeiro real.

Exemplos: `R$ 53.700,00 → R$ 53,7 mil`; `R$ 1.250.000,00 → R$ 1,25 mi`; `R$ 1.500.000.000,00 → R$ 1,5 bi`.

## 10. Perfis de usuários — visão funcional planejada

- **Visitante:** consultar ONGs, projetos, campanhas e transparência.
- **Voluntário:** cadastrar-se em oportunidades e acompanhar candidaturas (acompanhamento individual autenticado é futuro).
- **Doador:** simular contribuições e consultar projetos (pagamentos e conta pessoal são futuros).
- **Administrador da ONG:** gerenciar sua organização, projetos, candidaturas e campanhas (segregação segura é futura).
- **Superadministrador:** administrar todas as ONGs e usuários (controle seguro é futuro).

**Atenção:** esses perfis representam requisitos e arquitetura desejada. O painel atual é demonstrativo e não implementa controle de acesso seguro.

## 11. Histórico cronológico das decisões

1. Definição do tema: plataforma multi-ONG em vez de site de uma única organização.
2. Criação do portal público, painel administrativo, três ONGs fictícias, nove projetos e oportunidades de voluntariado.
3. Configuração para executar no VS Code com Live Server devido ao bloqueio de `fetch` via `file://`.
4. Substituição do `prompt()` de candidatura por modal de cadastro de voluntário.
5. Implementação de cadastro/edição de ONGs, edição de projetos e contadores dinâmicos na página inicial.
6. Inclusão de análise de candidaturas com visualizar/aprovar/rejeitar e redução de vagas por aprovações.
7. Exigência de associação obrigatória de cada projeto a uma ONG.
8. Criação de modal de decisão com responsável, justificativa e histórico.
9. Correção de disponibilidade do botão de rejeição; regra posteriormente alterada para rejeição definitiva.
10. Inclusão de ONG responsável no histórico de doações.
11. Reordenação das colunas de doações, colocando ONG primeiro, e criação de filtros combináveis.
12. Upload de imagem institucional da ONG, com prévia e fallback de iniciais.
13. Rejeição definitiva: candidatura rejeitada não pode ser posteriormente aprovada.
14. Correção da apresentação monetária: abreviação em mil/mi/bi e valor exato no hover/foco, sem texto fixo por extenso.

## 12. Estado real, limites e riscos conhecidos

- Persistência apenas local: cada navegador/origem possui seu conjunto de dados.
- Sem banco de dados, autenticação, autorização real, isolamento entre ONGs ou sincronização multiusuário.
- Dados pessoais de voluntários armazenados no navegador: **usar apenas dados fictícios em demonstrações**; não adequado para operação real ou conformidade de produção com a LGPD.
- Upload de imagem como Data URL pode esgotar a quota do `localStorage`.
- Doações não processam pagamento.
- O histórico de decisão pode ser alterado manualmente no navegador; para auditoria real, requer backend, identidade autenticada e logs imutáveis/append-only.
- O painel de dashboard ainda apresenta alguns campos de participações exemplificativas (`p.voluntarios`), que não devem ser confundidos com contagem de candidaturas aprovadas sem uma revisão específica.
- Os indicadores de arrecadação derivam de campos dos projetos; validar separadamente se cada doação simulada altera ou não esses campos para evitar dupla contagem e divergências.
- A versão verificada em código possui oportunidades definidas em JSON; a criação de projeto não cria automaticamente uma nova oportunidade de voluntariado.
- Não há homologação E2E documentada para todas as operações; realizar testes de regressão.

## 13. Casos de teste de regressão

1. Criar ONG com imagem e conferir cartão, contador e persistência após atualizar página.
2. Editar ONG, remover imagem e verificar retorno das iniciais.
3. Criar projeto selecionando ONG; verificar catálogo, contador e relatórios.
4. Editar projeto e trocar ONG; verificar vínculo em projetos e histórico de doações.
5. Abrir modal de voluntariado; criar candidatura pendente e verificar que vagas não mudam.
6. Aprovar candidatura com justificativa; verificar histórico e redução de uma vaga.
7. Tentar aprovar quando vagas esgotadas; operação deve ser recusada.
8. Rejeitar candidatura aprovada; verificar devolução da vaga e registro de motivo.
9. Tentar aprovar candidatura rejeitada; botão e lógica devem bloquear.
10. Tentar duplicar candidatura pendente/aprovada com mesmo e-mail na mesma oportunidade; deve bloquear.
11. Criar doações simuladas; filtrar por ONG/projeto/status/data e conferir totais.
12. Testar moeda em R$ 950, R$ 53.700, R$ 1.250.000 e R$ 1.500.000.000; valor completo apenas no hover/foco.
13. Testar layouts desktop e mobile, navegação por teclado e mensagens de erro.
14. Atualizar página e verificar persistência; testar em outra origem para demonstrar limite do `localStorage`.

## 14. Próximos passos propostos, NÃO implementados

1. Autenticação segura, senhas com hash e papéis por ONG.
2. Backend PHP + MariaDB com chaves estrangeiras e transações.
3. Armazenamento de imagens no servidor e controle de tamanho/formato.
4. Log de auditoria persistente e não alterável pelo usuário final.
5. Gestão de oportunidades no painel, com criação/edição e vínculo a projetos.
6. Exportação/importação de dados e migração do `localStorage`.
7. Portal autenticado de voluntário, notificações e proteção de dados pessoais.
8. Conciliação de doações e integração com pagamentos, somente após definição de requisitos e segurança.

## 15. Política de continuidade

- Entregar **sempre o projeto completo** em um ZIP, preservando páginas, dados e funcionalidades anteriores.
- Não alterar nomes de chaves de `localStorage` sem rotina de migração.
- Não remover regras de negócio existentes ao corrigir um módulo.
- Revisar dependências entre ONG, projeto, oportunidade, candidatura e doação antes de qualquer alteração.
- Verificar sintaxe JS, integridade do ZIP e testes manuais dos fluxos alterados.
- Atualizar este documento e um `CHANGELOG.md` em toda nova entrega.
