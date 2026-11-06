# QA local: execução e roteiro de conferência

Este guia reúne os testes automatizados e o checklist manual da versão atual. Execute os comandos no PowerShell, a partir da pasta externa que contém `scripts`, `config`, `database` e `.runtime`.

## 1. Preparar uma vez

- Configure `config/database.php` conforme `config/database.example.php`, apontando para uma instância local descartável de MariaDB. A configuração deve respeitar `DB_DATABASE` para permitir bancos separados por execução.
- Use PHP com `pdo_mysql`, `mbstring` e `fileinfo`, e Node.js 22 ou superior. Os scripts reconhecem os binários portáteis existentes em `.runtime/php/php.exe` e `.runtime/node.exe`; sem eles, usam o PATH. `PHP_BINARY`, quando definido, tem prioridade e deve apontar para um PHP já configurado com as extensões.
- A conta local do MariaDB precisa poder criar bancos e tabelas de testes. As credenciais da aplicação publicada não devem ser usadas. Os scripts aceitam somente `localhost`, `127.0.0.1` e `::1`; não use túnel ou encaminhamento de porta para produção.
- Na instalação portátil conhecida, o QA completo inicia o MariaDB da porta 3308 se estiver parado. Para outras instalações, inicie o MariaDB antes de executar. Não é preciso iniciar o site na porta 8080 nem usar Live Server.

Se o Windows bloquear scripts `.ps1`, execute os comandos abaixo com `-ExecutionPolicy Bypass`, limitado ao processo iniciado. Isso não altera permanentemente a política do Windows. Respeite eventuais políticas de execução gerenciadas pela organização.

## 2. Executar o QA automatizado

Rotina completa, recomendada antes de publicar:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/qa-local.ps1
```

Rotina rápida, durante a implementação, sem consultar ou iniciar banco:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/qa-local.ps1 -Quick
```

| Etapa | Rápido | Completo |
| --- | --- | --- |
| Conferir PHP e Node | Sim | Sim |
| Verificar sintaxe PHP e JavaScript | Sim | Sim |
| Testar senhas e compatibilidade de hashes | Sim | Sim |
| Testar cliente com API simulada | Sim | Sim |
| Validar configuração local e isolamento por DB_DATABASE | Não | Sim |
| Instalar/migrar banco novo e executar integração HTTP | Não | Sim |
| Testar permissões, CSRF, convites, limites e concorrência | Não | Sim |
| Abrir navegador e conferir apresentação | Não | Não |

O modo completo chama `test-shared.cjs`, que cria um banco exclusivo `ong_connect_test_...`, executa também os módulos de repasses, segmentos, relatórios e segurança P0 e utiliza servidores nas portas 18081 e 18082. A execução para na primeira etapa com falha. Não execute duas instâncias completas simultaneamente, pois as portas são fixas.

A validação de sintaxe também percorre scripts antigos: passar nessa etapa não significa que todos os fluxos antigos foram executados. As suítes de navegador existentes não foram incluídas neste comando porque precisam de revisão dos seletores, requisitos e preparação de dados.

## 3. Ler os resultados

Cada execução grava uma pasta `.runtime/qa/<data-hora-processo>/` com:

- `resumo.txt`: situação geral e duração das etapas;
- `resultado.json`: resultado estruturado, caminhos dos logs e eventual falha;
- `01.log`, `02.log`, etc.: saída de cada etapa.

Ao terminar, confira o código de saída:

```powershell
$LASTEXITCODE
```

`0` significa que todas as etapas do modo escolhido passaram; `1` indica falha. O relatório sempre mantém **QA manual pendente**, pois o script não confere a interface. O total de verificações pode aumentar conforme novas funcionalidades recebem testes; use os resultados e o código de saída, não um número fixo, como critério de aprovação.

Os servidores temporários de integração são encerrados pela suíte. O MariaDB iniciado pelo QA permanece ativo para a conferência manual. Os bancos de teste são preservados, não substituem o banco cotidiano e não são apagados automaticamente.

## 4. Abrir um ambiente exclusivo para QA manual

Após o QA completo, abra um terminal e execute:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/qa-manual.ps1
```

O comando valida o destino local, cria outro banco com prefixo `ong_connect_test_manual_`, instala tabelas/migrações e insere fixtures fictícias. Em seguida inicia um PHP na porta 18083. Abra:

```text
http://127.0.0.1:18083/
```

Mantenha o terminal aberto; encerre com `Ctrl+C`. Para outra porta: acrescente `-Port 18084`. Reiniciar o comando cria um banco novo e limpo, sem reaproveitar os contadores de bloqueio da execução anterior. Não execute `integration-fixtures.php` repetidamente no mesmo banco.

| Perfil fictício | E-mail | Senha exclusiva das fixtures |
| --- | --- | --- |
| Administrador | admin@example.com | SenhaFicticia123! |
| Responsável pela ONG de teste | ong@example.com | SenhaFicticia123! |
| Voluntário | voluntario@example.com | SenhaFicticia123! |

Essas contas são criadas apenas nos bancos de teste pelo script de fixtures. Não são credenciais do servidor publicado. Use uma janela normal e uma anônima para separar sessões; janelas anônimas do mesmo navegador podem compartilhar sessão entre si.

## 5. Checklist manual

Abra F12 e acompanhe Console e Rede/Network durante os cenários. Cadastre apenas dados fictícios. Não faça repetidas tentativas para esgotar limites manualmente: isso já é automatizado e pode atrapalhar os demais cenários.

| ID | Ação | Resultado esperado |
| --- | --- | --- |
| QA-01 | Abrir início, ONGs, projetos e transparência | Conteúdo carregado, links funcionais e nenhuma exceção JavaScript não tratada. |
| QA-02 | Entrar como voluntário, sair e tentar acessar uma operação privada | Login funciona; logout encerra a sessão; operação privada pede autenticação. |
| QA-03 | Criar voluntário com e-mail fictício único e senha válida | Cadastro concluído e login possível com a senha exata. |
| QA-04 | Solicitar ONG com CNPJ fictício de 14 dígitos ainda não usado e e-mail novo | Solicitação recebida e visível para o administrador. |
| QA-05 | Como administrador, revisar e publicar a ONG anterior | Painel mostra link de ativação e não mostra senha inicial. Copie o link antes de fechar. |
| QA-06 | Abrir o convite em janela separada e informar senhas diferentes; depois corrigir | Divergência é informada; com senhas iguais a conta é ativada e pode entrar. |
| QA-07 | Reabrir o convite já usado e tentar ativar novamente | Convite rejeitado; a senha definida anteriormente continua funcionando. |
| QA-08 | Publicar outra ONG com e-mail novo; reemitir o convite antes de ativar | Reemissão exige administrador; o link antigo falha e o novo permite ativação. |
| QA-09 | Entrar como responsável da ONG recém-ativada | Vê sua ONG no painel e não administra as outras; autorização também é coberta na integração. |
| QA-10 | Como voluntário, candidatar-se e acompanhar a situação; como gestor, analisar | Mensagens e situação são coerentes; decisões respeitam o projeto e a capacidade. |
| QA-11 | Fazer doação simulada, acompanhar e cancelar | Não há pagamento real; cancelamento atualiza a situação e os indicadores. |
| QA-12 | Como administrador, consultar relatórios, CSV e auditoria | Filtros e mensagens funcionam; exportação corresponde ao relatório. |
| QA-13 | Repetir telas principais em largura de celular | Menu, campos e botões utilizáveis; conteúdo essencial acessível. |
| QA-14 | Navegar com Tab, Shift+Tab e Enter, inclusive em formulários e modais | Foco visível e ordem utilizável; nenhuma ação essencial depende apenas do mouse. |

Expiração de convites, senhas com sufixos após 72 bytes, limites e concorrência são conferidos automaticamente no modo completo. Aprovação manual não substitui esses testes.

## 6. Diagnóstico de falhas

| Sintoma | O que conferir |
| --- | --- |
| Falha em requisitos | PHP/Node disponíveis, versão do Node e variável PHP_BINARY. |
| Extensão PHP ausente | php.ini do executável escolhido ou pasta ext da instalação portátil. |
| Banco recusado no preflight | Host local, porta e suporte a DB_DATABASE em config/database.php. |
| Conexão recusada | MariaDB iniciado na porta configurada; logs mariadb-error.log da execução se o QA tentou iniciá-lo. |
| Sem permissão para criar banco | Privilégios da conta local de testes; não trocar por credenciais de produção. |
| Porta 18081/18082 ocupada | Outra integração ativa ou processo anterior. Identifique-o antes de encerrá-lo. |
| Porta 18083 ocupada | QA manual já aberto; use outra porta ou encerre a sessão anterior. |
| API retorna 429 | Limite atingido; conferir Retry-After. Limpar cookies não zera limites por IP/conta. |
| API retorna 500 ou tela falha | Resposta da API, Console e saída do PHP no terminal. |

Para falhas da integração, consulte também `.runtime/shared-18081.log` e `.runtime/shared-18082.log`; os arquivos podem conter saídas de mais de uma execução. Registre a hora e o banco mostrado no log da etapa. No QA manual, a saída HTTP aparece no terminal que executa `qa-manual.ps1`.

## 7. Registrar e decidir

Copie este modelo para o registro da sua execução, sem incluir senhas, cookies ou tokens:

```text
Data/hora:
Versão/commit (se disponível):
Modo automatizado e resultado:
Pasta dos relatórios:
Banco de QA manual:
Navegador e largura da tela:
Cenários manuais aprovados:
Cenários reprovados ou não executados:
Falhas: ação realizada, resultado esperado, resultado recebido e evidência:
Decisão: aprovado / reprovado / pendente
```

Antes de publicar, exija modo completo aprovado e cenários manuais afetados aprovados. Cenário não executado deve constar como pendente. Nenhum destes comandos publica arquivos, altera o Nginx ou executa testes no domínio público.
