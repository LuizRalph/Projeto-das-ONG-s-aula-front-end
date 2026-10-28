> **Referência de evolução do backend.** Para o conjunto atual de funcionalidades, relatórios e modelagem, prevalecem [operação](PHP-MARIADB.md), [modelo](09-ESTRUTURA-DE-DADOS.md) e [README](../README.md). Exemplos de versões anteriores devem ser conferidos contra essas referências.

# Back-end compartilhado

## Repasses públicos — implementação local

O módulo de recebimentos públicos é independente dos apoios privados e usa a migração `005_public_transfers.sql`. A área administrativa oferece documentos privados, situação de prestação de contas e CSV; a página pública mostra apenas o total geral de recebimentos válidos. Esta etapa foi publicada em 24/10/2026 após autorização, com backup e preservação dos dados existentes. Consulte [Repasses públicos](REPASSES-PUBLICOS.md) para permissões, armazenamento, endpoints e testes.

## Conteúdo editorial dos projetos — etapa local

Os 17 exemplos em `data/projetos.json` contêm descrição completa e os cinco campos de orientação. O primeiro parágrafo de `descricao` funciona como resumo editorial; use até 140 caracteres e 18 palavras, seguido de uma linha vazia e do descritivo detalhado. Os cartões usam esse primeiro parágrafo, enquanto o modal apresenta toda a descrição e os campos complementares. Os limites visuais não reduzem o texto armazenado.

A carga local foi aplicada por `php scripts/update-project-descriptions.php`, após backup. Esse comando exige conexão local na porta 3308 e correspondência integral de quantidade, IDs e títulos; altera somente os seis campos textuais, registra auditoria e não repete alterações idênticas. Não deve ser usado para substituir o banco do servidor. A primeira instalação carrega os detalhes após as migrações; reexecutar o instalador não sobrescreve projetos existentes.

## Detalhamento de projetos — etapa local

`004_project_details.sql` acrescenta `objetivo`, `publico_alvo`, `atividades`, `orientacoes_voluntariado` e `uso_recursos` à tabela `projetos`. Novos cadastros exigem os cinco campos na API, com 10 a 3.000 caracteres cada, e o formulário de cadastro/edição também os exige. A edição por API preserva campos omitidos, para manter operações parciais existentes, e valida todo campo informado. Projetos anteriores ficam com valores vazios, sem dados inventados; a página pública informa que a ONG ainda precisa completar os detalhes.

O botão “Ver projeto” na aba Projetos da ONG usa `pages/projetos.html?projeto=ID`. A página abre automaticamente os detalhes do projeto solicitado, com objetivo, beneficiários, atividades, orientações de participação e uso previsto das contribuições. As vagas, modalidades, locais, dias, horários e inscrições continuam na estrutura de oportunidades; não são duplicados no cadastro do projeto. O apoio permanece simulado.

Testes: `scripts/test-shared.cjs` cobre obrigatoriedade, persistência, edição e autorização. Para validar o formulário e o link no Chrome, use o banco exclusivo gerado por essa suíte em `DB_DATABASE`, defina `PROJECT_DETAILS_TESTS=1` e execute `scripts/test-modelagem-browser.cjs`. Esta etapa foi publicada em 24/10/2026 após autorização, com backup e validação em cópia do banco remoto. Os 17 projetos de exemplo receberam os textos revisados; projetos exclusivos do servidor foram preservados.

## Evolução local de 24/10/2026: CNPJ e auditoria

A migração `003_cnpj_audit.sql` adiciona `controle_cnpj` e amplia os históricos e a auditoria. Execute `php scripts/migrate.php` após fazer backup. Esta etapa foi validada localmente e publicada no servidor em 24/10/2026, após autorização, com backup e migração testada primeiro em uma cópia do banco remoto.

O CNPJ normalizado identifica um controle permanente. Cada solicitação pode produzir somente uma rejeição contabilizada (`rejeicao_unica` com índice único). O histórico é a fonte da contagem: na terceira rejeição, a mesma transação bloqueia novos pedidos. O lock institucional serializa pedidos e decisões concorrentes. Rejeições legadas registradas no histórico são consideradas; eventos repetidos da mesma solicitação são preservados, mas contabilizados uma vez. CNPJs com três ou mais rejeições anteriores passam a bloqueados. Não existe desbloqueio na interface nesta etapa.

Excluir uma solicitação mantém o controle, o identificador original e o histórico; o vínculo com a solicitação passa a NULL. O painel de ONGs apresenta a quantidade de rejeições e a indicação de bloqueio. Não foi criada rota pública de exclusão de solicitações.

A tabela `auditoria` registra ações de escrita institucionais, candidaturas, doações, cadastro, login, logout e edição de perfil. Também registra falhas de negócio/validação em escritas, após rollback. Ações públicas podem ter autor NULL; nome e perfil do autor autenticado são preservados em campos próprios. Falhas inesperadas continuam no log técnico com identificador de correlação. Leituras e navegação não são registradas como eventos de auditoria. Não são armazenados corpos de requisição, senhas, tokens ou cookies. Metadados de falha incluem apenas o código HTTP. Registros antigos podem não possuir autor reconstruível ou identificador de requisição.

`GET api/index.php?resource=auditoria` é exclusivo do administrador e aceita `autorId`, `recurso`, `resultado`, `page` e `limit`. Outros métodos são recusados. A consulta visual fica em `dashboard/auditoria.html`, acessível pelo menu do administrador, com filtros e paginação. Não há edição nem exclusão pela API. Isso não constitui armazenamento inviolável: o administrador do banco ainda pode alterar registros.

Testes locais:

```powershell
& .runtime/node.exe scripts/test-shared.cjs
# Use o nome do banco exclusivo informado ao final do comando anterior:
$env:DB_DATABASE = 'ong_connect_test_SUBSTITUA_PELO_NOME_GERADO'
& .runtime/node.exe scripts/test-modelagem-browser.cjs
Remove-Item Env:DB_DATABASE
```

O teste de migração legada requer outro banco vazio, cujo nome comece por `ong_connect_test_`: execute `scripts/prepare-integration.php` e depois `scripts/test-modelagem.php` com esse DB_DATABASE. Os scripts PHP exigem PDO MySQL e mbstring. O teste de navegador usa o Chrome instalado, cria perfil isolado e usa PHP na porta 18085. Os testes preservam os bancos exclusivos para inspeção e nunca devem apontar para o banco da demonstração.

As correções de interação dos popups do prompt original não fazem parte desta etapa de modelagem; candidaturas e doações existentes foram verificadas pela suíte de regressão.

Referência da evolução de 23/10/2026. Este documento substitui as descrições anteriores de login visual, candidaturas e doações locais.

## Instalação e atualização

PHP com PDO MySQL e mbstring; MariaDB com InnoDB. Mantenha `config`, `database` e `scripts` fora da raiz pública `ong-connect`. Configure `config/database.php` a partir do exemplo. As variáveis DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME e DB_PASSWORD sobrescrevem os valores padrão.

Banco vazio: crie o banco configurado e execute `php scripts/install.php`. O instalador cria o esquema, importa os exemplos somente em banco vazio e aplica migrações.

Banco existente: faça um backup operacional e execute `php scripts/migrate.php`. Não importe novamente seed.sql. As migrações criam tabelas adicionais, preservam os registros e os totais demonstrativos originais dos projetos. O segundo passo preenche dias de oportunidades antigas a partir dos períodos reconhecidos, sem substituir agendas já cadastradas. Períodos não reconhecidos ficam sem dias e devem ser revisados pelo administrador antes do uso.

`schema_migrations` registra versões; GET_LOCK impede dois migradores simultâneos. O DDL não é envolvido em uma transação fictícia: MariaDB pode fazer commit implícito. As criações são repetíveis; uma falha não registra a versão como concluída. Novas migrações devem considerar execução parcialmente concluída. Não há reversão automática de esquema.

No ambiente portátil, substitua `php` por:

```powershell
& .runtime/php/php.exe -n -d extension_dir=.runtime/php/ext -d extension=pdo_mysql -d extension=mbstring scripts/migrate.php
```

Crie o administrador inicial pelo terminal, nunca por uma rota pública:

```powershell
$env:ONG_INITIAL_PASSWORD = 'SUBSTITUA-POR-UMA-SENHA-DE-12-OU-MAIS-CARACTERES'
php scripts/create-user.php admin@example.com 'Administrador fictício' admin
Remove-Item Env:ONG_INITIAL_PASSWORD
```

Para criar um responsável já vinculado à ONG 1:

```powershell
$env:ONG_INITIAL_PASSWORD = 'SUBSTITUA-POR-OUTRA-SENHA-LONGA'
php scripts/create-user.php responsavel@example.com 'Responsável fictício' ong 1
Remove-Item Env:ONG_INITIAL_PASSWORD
```

Use contas e dados fictícios na demonstração. Inicie com `php -S 127.0.0.1:8080 -t ong-connect` ou o script local existente. Não há administrador com senha padrão. O login e cadastro público ficam em `pages/login.html`; a mesma página apresenta o perfil, as candidaturas e as doações do voluntário autenticado.

### Conta da ONG na aprovação

Ao revisar e publicar uma solicitação, o sistema cria automaticamente um usuário com perfil `ong`, usando o e-mail revisado do cadastro e o nome do responsável (ou o nome da ONG quando o responsável não estiver preenchido). O servidor gera uma senha aleatória e persiste somente seu hash. A conta já nasce vinculada à ONG aprovada, com acesso aos seus projetos, oportunidades e candidaturas, sem os poderes do administrador geral.

A confirmação no painel apresenta e-mail e senha inicial uma única vez, para o administrador entregar ao responsável. A senha não é enviada por e-mail, não fica no localStorage e não aparece no catálogo nem no histórico. Ela desaparece ao fechar a confirmação; não existe consulta posterior à senha em texto claro. Ainda não há recuperação ou troca de senha pela interface.

Se o e-mail já pertencer a um usuário de perfil `ong`, a aprovação adiciona a ONG aos vínculos dessa conta e mantém a senha existente. Se pertencer a um perfil diferente, responde 409, mantém o pedido pendente e não publica uma ONG parcialmente. O administrador pode revisar o e-mail antes de tentar novamente. ONG, conta/vínculo, histórico e auditoria participam da mesma transação. Cadastro direto de ONG continua separado deste fluxo de aprovação e pode receber responsável via CLI/vínculos.

Verificação adicional: os 26 testes de integração passaram, incluindo login com a senha gerada, isolamento do novo responsável, reutilização de conta sem troca de senha, reversão em conflito de perfil e ausência da senha no catálogo/histórico. Logins bem-sucedidos zeram o contador de tentativas falhas do IP.

## Organização

- `api/bootstrap.php`: conexão, validações e exceção HTTP da aplicação.
- `api/security.php`: sessão, autenticação, CSRF, autorização e auditoria.
- `api/participation.php`: candidaturas, histórico, fila, doações, consultas paginadas e transações.
- `api/opportunities.php`: validação de oportunidades.
- `api/index.php`: despacho e operações institucionais existentes.
- `database/migrations`: alterações versionadas.

O roteador institucional ainda contém parte do acesso a dados e das regras de ONGs e projetos. A separação foi incremental, sem introdução de framework.

Oportunidades mantêm capacidade e agenda em JSON validado pela aplicação. Os identificadores de projeto e oportunidade são relacionais e indexados; bloquear a linha da oportunidade torna a capacidade consistente sem duplicar os campos do JSON. Candidaturas têm status, usuário e oportunidade relacionais. Uma coluna gerada com índice único impede duas candidaturas ativas do mesmo usuário na mesma oportunidade.

## Permissões

| Operação | Visitante | Voluntário | Responsável por ONG | Administrador |
|---|---|---|---|---|
| Catálogo público | Sim | Sim | Sim | Sim |
| Enviar pedido de ONG | Sim | Sim | Sim | Sim |
| Cadastro público de voluntário | Sim | Sim | Sim | Sim |
| Consultar/analisar pedidos de ONG | Não | Não | Não | Sim |
| Criar/excluir ONG | Não | Não | Não | Sim |
| Editar ONG | Não | Não | Vinculadas | Todas |
| Administrar projetos/vagas | Não | Não | Vinculadas | Todas |
| Criar candidatura | Não | Própria | Não | Não |
| Consultar candidaturas/histórico | Não | Próprias | Das ONGs vinculadas | Todas |
| Aprovar/rejeitar/mover para fila | Não | Não | Das ONGs vinculadas | Todas |
| Cancelar candidatura ativa | Não | Própria | Das ONGs vinculadas | Todas |
| Registrar doação simulada | Não | Própria | Própria | Própria |
| Consultar doações | Não | Próprias | Das ONGs vinculadas | Todas |
| Cancelar doação | Não | Própria | Própria | Todas |
| Adicionar/remover vínculo | Não | Não | Não | Sim |
| Editar nome e telefone do perfil | Não | Próprio | Próprio | Próprio |

O catálogo permanece público, incluindo os contatos institucionais publicados, mas não apresenta usuários, senhas, responsáveis individuais, candidaturas ou doadores. O contexto privado do responsável é filtrado pela API nas listagens de participações e pelo cliente nas telas de catálogo administrativo. Alterações verificam os vínculos novamente no servidor.

## Sessão e segurança

Sessões PHP com modo estrito, regeneração no login, expiração após 30 minutos de inatividade e cookies HttpOnly/SameSite=Lax. Secure é habilitado quando o PHP recebe HTTPS. Em proxy reverso, configure a indicação de HTTPS no servidor; não se confia cegamente em cabeçalhos enviados pelo cliente.

Obtenha `GET sessao` antes de uma escrita e envie `X-CSRF-Token` com o valor recebido em `csrf`. Login e cadastro também exigem esse token. Logout destrói a sessão e expira o cookie. O navegador guarda apenas o cookie de sessão; senhas não vão para localStorage.

Limite de 10 tentativas de login por IP em uma janela de 15 minutos, com HTTP 429 e Retry-After. Mensagens de login não distinguem conta inexistente de senha incorreta. Cadastro devolve a mesma mensagem para e-mail existente e novo, sempre criando apenas perfil voluntário. A proteção não substitui limitação de tráfego no servidor HTTP.

## Endpoints

URLs relativas: `api/index.php?resource=NOME`; quando necessário, acrescente `&id=ID`. Escritas recebem objeto JSON de até 64 KiB.

| Recurso | Método | Dados / resposta |
|---|---|---|
| sessao | GET | usuario, csrf, ongs vinculadas |
| cadastro | POST | nome, email, senha (mínimo 12 caracteres); resposta genérica |
| login | POST | email, senha; usuario e novo csrf |
| logout | POST | Encerra sessão |
| perfil | PUT | nome, telefone; usuario atualizado |
| vinculos | POST / DELETE | usuarioId de responsável existente, ongId |
| catalogo | GET | ongs, projetos e oportunidades; totais calculados |
| solicitacoes | GET | Solicitações e histórico, somente administrador |
| solicitacoes | POST | Campos institucionais e consentimento true |
| publicar / rejeitar | POST | id e campos de publicação / motivo |
| ongs | POST / PUT / DELETE | Contratos institucionais existentes |
| projetos | POST / PUT / DELETE | ongId, titulo, categoria, descricao, meta, status e campos visuais |
| oportunidades | POST / PUT | projetoId, titulo, modalidade, local, vagas, diasAtuacao, horarioInicio, horarioFim, ativa |
| candidaturas | GET | Lista e histórico autorizados |
| candidaturas | POST | oportunidadeId, consentimento true e dados complementares do formulário |
| candidaturas | PUT | id, status, justificativa |
| doacoes | GET | Lista autorizada de simulações |
| doacoes | POST | projetoId, valor decimal positivo, chave de reenvio |
| doacoes | PUT | id e status Cancelada |

Listagens de candidaturas, doações e solicitações aceitam `page` (mínimo 1) e `limit` (1–100; padrão 100), retornando `pagination: {page,limit,total}`. Candidaturas e doações aceitam ongId, projetoId e status; candidaturas também aceitam oportunidadeId. A ordem é fixa por data e ID; não há interpolação de ordenação fornecida pelo usuário. O cliente percorre as páginas para manter os filtros existentes. O catálogo ainda é carregado integralmente.

Exemplo após obter cookie de sessão e token:

```javascript
await fetch('api/index.php?resource=candidaturas', {
  method: 'POST',
  headers: {'Content-Type': 'application/json', 'X-CSRF-Token': csrf},
  body: JSON.stringify({oportunidadeId: 1, consentimento: true, motivacao: 'Apoio fictício'})
});
```

HTTP: 400 JSON malformado; 401 sem sessão; 403 sem permissão/CSRF; 404 inexistente; 405 método; 409 conflito; 413 tamanho; 422 validação; 429 tentativas; 500 erro interno; 503 indisponibilidade de conexão identificada. Erros internos recebem requestId. Logs registram correlação, classe e código de erro, sem payload, senha, SQL ou stack trace.

## Candidaturas e concorrência

| Estado atual | Próximos estados |
|---|---|
| Pendente | Aprovado, Rejeitado, Lista de espera, Cancelado |
| Lista de espera | Aprovado, Rejeitado, Cancelado |
| Aprovado | Cancelado |
| Rejeitado / Cancelado | Nenhum; permite nova inscrição independente |

Repetir o mesmo estado não duplica histórico. Rejeição exige justificativa. Autor e identidade vêm da sessão, mesmo que o formulário antigo peça o nome do responsável. Cancelado representa também a desistência de um aprovado.

Inscrição exige oportunidade aberta e projeto ativo; lotação direciona novas inscrições para a fila. Pendente, em espera e aprovado contam como candidaturas ativas para duplicidade e conflitos de agenda, preservando a regra anterior. Interseção de dias e intervalos sobrepostos gera conflito; horários adjacentes são permitidos. Agendas antigas sem horário ocupam o dia inteiro.

Ordem de bloqueios: usuário afetado, oportunidade, candidatura. A linha do usuário impede inscrições simultâneas com sobreposição em oportunidades diferentes; a linha da oportunidade protege a última vaga. Leituras usam READ COMMITTED. Aprovar a última vaga move pendentes dessa oportunidade para a fila com histórico. Redução abaixo dos aprovados e alteração de agenda com candidaturas ativas são recusadas.

Promoção permanece **manual**, revalida disponibilidade, capacidade e agenda, e exige o primeiro da fila por criado_em/id. Se o primeiro não for elegível, o administrador precisa rejeitá-lo com motivo antes de avançar. Cancelamento não aprova automaticamente ninguém. Não há reservas temporárias.

O bloqueio global mvp_lock foi mantido nas pequenas escritas institucionais para preservar a regra de CNPJ; candidaturas e doações não o utilizam. Deadlocks/timeouts retornam conflito controlado, sem repetição automática. O cliente pode repetir após atualizar.

## Doações, métricas e dados antigos

Toda contribuição é simulada. Identidade vem da sessão; não se armazena identificação de cobrança ou cartão. Valor usa DECIMAL e formato de até duas casas. A chave é única por usuário; repeti-la com projeto/valor iguais retorna o ID existente, com conteúdo diferente retorna 409.

Arrecadação soma somente doações Simulada. Participações contam candidaturas Aprovado, podendo contar a mesma pessoa em projetos/oportunidades diferentes. Projetos ativos filtram status Ativo. Campos legados arrecadado/voluntarios permanecem no banco como referência histórica, mas não são publicados como totais atuais nem atualizados pelos clientes. Não se criam transações fictícias para justificar esses números.

localStorage antigo permanece intacto e não é importado. Preferências, foto local e estados de visualização continuam locais. A carga automática de candidaturas/doações demonstrativas foi desativada. Para exemplos compartilhados, use contas fictícias e os fluxos normais da API; os scripts de fixtures novos são exclusivos dos bancos de teste.

## Verificação

```powershell
.runtime/node.exe scripts/test-shared.cjs
$env:BROWSER_TESTS = '1'
.runtime/node.exe scripts/test-shared.cjs
Remove-Item Env:BROWSER_TESTS
```

O teste cria um banco novo `ong_connect_test_TIMESTAMP`, preserva-o para inspeção e inicia dois processos PHP nas portas 18081/18082 com DB_DATABASE apontando exclusivamente para esse banco. Nunca limpa nem escreve no banco habitual. Requer permissão SQL para criar banco, PHP portátil e Node com fetch/WebSocket. PHP_BINARY pode selecionar outro executável compatível com as extensões configuradas pelo teste. O modo navegador usa Chrome e a porta 19229; CHROME_PATH pode selecionar o executável.

Há verificações de autenticação, CSRF, vínculos, cadastro sem privilégios, duplicidade, conflitos de agenda, última vaga com requisições paralelas reais, fila, idempotência, doações, indicadores, agenda protegida, oportunidade fechada, publicação/rejeição de ONG e preservação após reinstalação. O Chrome verifica login real, seis telas administrativas e a área do voluntário.

Validação da entrega: verificações de sintaxe PHP/JavaScript aprovadas; 22 verificações de integração e oito verificações no Chrome (incluindo o contexto do responsável por ONG). As migrações também foram aplicadas ao banco configurado e os arrays de dias das oportunidades foram verificados. Nenhuma conta administrativa foi criada automaticamente: provisione-a com a senha escolhida no comando acima.

Testes antigos de login visual e simulações de fila em localStorage descrevem o comportamento anterior e não devem ser usados como aceitação desta versão. O novo comando é a referência para o back-end compartilhado. Não foi declarada aprovação integral da suíte antiga.

## Limitações restantes

Sem recuperação de senha, confirmação de e-mail, pagamentos, notificações, consulta externa de CNPJ ou implantação. Contas de responsáveis são provisionadas por CLI e vínculos adicionais pela API; não há tela de administração de usuários. Catálogo público não paginado; painel carrega páginas de participações em memória para preservar filtros. A auditoria é persistida no banco, mas não é inviolável contra acesso administrativo direto ao SQL. Foto do perfil permanece no navegador. Operação em produção exige configuração de HTTPS, sessões, credenciais e backups no ambiente de hospedagem.
