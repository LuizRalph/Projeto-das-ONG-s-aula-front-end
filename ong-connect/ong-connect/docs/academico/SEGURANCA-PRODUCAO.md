# Segurança e melhorias para operação online

Revisão documental: **27/10/2026**. O grupo informa que o sistema está online. Esta análise combina inspeção do PDF de entrega e revisão estática da cópia local do código. Não foram realizados testes contra o servidor, acesso a configurações privadas ou verificação da versão publicada. Os achados locais não demonstram, por si, que o servidor está vulnerável.

## Escopo e situação das recomendações

Os itens abaixo são **melhorias propostas, ainda não implementadas nem validadas por esta revisão**. A prioridade indica a ordem sugerida de tratamento, considerando impacto potencial e exposição. Não corresponde a uma pontuação CVSS nem a um teste de invasão. Controles eventualmente existentes no proxy, firewall ou hospedagem precisam ser conferidos antes de concluir sobre a exposição real.

## Controles já identificados no código

- Consultas com parâmetros preparados no PDO e preparação emulada desativada.
- Hash de senhas com `password_hash` e verificação com `password_verify`.
- Tokens CSRF nas operações autenticadas, controle por perfil e autorização por vínculo à ONG.
- Modo estrito de sessão, cookie HttpOnly/SameSite e regeneração do identificador após login.
- Downloads sujeitos à autenticação e ao escopo da ONG, com verificação de SHA-256, disposição como anexo e proteção contra interpretação do conteúdo.
- Uploads com MIME permitido, nomes aleatórios, limite por arquivo e permissões de armazenamento restritas.
- Mensagens de erro genéricas para falhas internas, sem devolver a exceção técnica ao usuário.

Essas evidências não constituem certificação de segurança nem comprovam a configuração do ambiente publicado.

## 1. Cadastro público de solicitações de ONG

**Prioridade alta — fragilidade observada na aplicação local.** Em `ong-connect/api/index.php`, o POST de solicitações é público e fica fora da exigência geral de CSRF. Não foi identificado controle de frequência nessa rota. O processamento de gravações também utiliza bloqueio compartilhado por `mvp_lock`.

O risco principal é automação de cadastros, crescimento indevido de registros e disputa pelo bloqueio de escrita. A ausência de autenticação é compatível com um formulário público; o problema é a falta de controles de abuso na aplicação. A ausência de CSRF também permite considerar submissões induzidas por outros sites, conforme o formato aceito pela rota. Não foi demonstrada exploração no servidor.

**Melhoria proposta:** limites por IP e janela temporal, proteção contra automação, validação de origem/CSRF conforme o fluxo e redução do alcance do bloqueio. CSRF não substitui controles contra robôs.

**Critério de validação:** em homologação, excesso de envios deve receber 429 sem criar novos registros; solicitações legítimas devem continuar funcionando. Medir a concorrência para evitar que o formulário público prejudique outras gravações.

## 2. Ativação e senha inicial de responsáveis por ONG

**Prioridade alta — limitação observada no fluxo local.** A função `provisionOngAccess`, em `ong-connect/api/security.php`, gera senha aleatória e retorna `senhaInicial` ao administrador. Não foi identificado na API revisada um fluxo de ativação pelo titular ou troca dessa senha. A senha é aleatória e armazenada com hash; a preocupação está na distribuição e no ciclo de vida da credencial.

**Melhoria proposta:** substituir a entrega de senha por convite com token de uso único, expiração e armazenamento do hash do token. O responsável define a própria senha, por canal verificado. Prever recuperação de acesso e revogação de sessões quando necessário. Não registrar tokens ou senhas em logs.

**Critério de validação:** convite expirado ou reutilizado deve ser recusado; a API não deve retornar senha inicial ao administrador; o titular deve conseguir ativar e recuperar sua conta de forma controlada.

## 3. Proteção contra tentativas de login

**Prioridade média — limitação observada na aplicação local.** Em `security.php`, a chave do contador deriva apenas de `REMOTE_ADDR`, e o registro é apagado após autenticação bem-sucedida. Há limitação por IP, mas ela não cobre adequadamente tentativas distribuídas contra a mesma conta. Usuários de uma rede compartilhada também podem afetar o limite uns dos outros.

**Melhoria proposta:** combinar limites por conta e IP, atraso progressivo, mensagens genéricas e alertas para padrões suspeitos. Evitar bloqueio permanente que possa ser provocado contra terceiros. Considerar autenticação multifator para administradores.

**Critério de validação:** testar ataques distribuídos simulados e usuários atrás do mesmo endereço em homologação; um login legítimo não deve apagar toda a proteção contra abuso de outras contas.

## 4. HTTPS, proxy e cookie de sessão

**Prioridade condicionada à hospedagem — exposição não confirmada.** O atributo Secure é calculado a partir de `$_SERVER['HTTPS']`. Se um proxy terminar o HTTPS sem informar corretamente o protocolo ao PHP, o cookie poderá ser emitido sem esse atributo.

**Melhoria proposta:** conferir a topologia da hospedagem, forçar HTTPS e assegurar Secure no ambiente de produção. Quando houver proxy, aceitar informação de protocolo apenas de proxies confiáveis. Avaliar HSTS após validar o HTTPS e seu alcance. Conferir também CSP e proteção contra enquadramento nas páginas HTML; não presumir sua ausência apenas por não estarem na API.

**Critério de validação:** observar a resposta efetiva de produção e confirmar Secure, HttpOnly e SameSite no cookie, além do redirecionamento HTTP para HTTPS. Não confiar indiscriminadamente em cabeçalhos encaminhados pelo cliente.

## 5. Uploads e capacidade de armazenamento

**Prioridade média — oportunidade de endurecimento.** `ong-connect/api/public-transfers.php` verifica tamanho de até 2 MB, MIME PDF/JPEG/PNG, autorização, hash e nomes aleatórios. Não foi identificada nessa implementação cota acumulada por ONG nem análise antimalware. MIME e SHA-256 não demonstram que o conteúdo de um arquivo é seguro.

**Melhoria proposta:** cotas por organização, limites de frequência, monitoramento de disco e análise dos arquivos conforme o uso. Manter o conteúdo fora da raiz pública e impedir execução no armazenamento. Planejar retenção e limpeza, observando que exclusão lógica não libera espaço físico.

**Critério de validação:** ultrapassar a cota deve ser recusado sem deixar arquivos órfãos; downloads devem exigir autorização; arquivos não devem ser acessíveis por URL direta. Testar conteúdo suspeito somente com amostras de teste apropriadas em homologação.

## 6. Verificações necessárias no ambiente publicado

Estas são verificações pendentes, e não vulnerabilidades confirmadas:

- Confirmar a raiz pública e o bloqueio de acesso a `config`, `storage`, logs, backups, `.runtime`, `.git` e arquivos de ambiente. O caminho privado no código não comprova isolamento pelo servidor web.
- Conferir permissões mínimas da conta SQL e do usuário do serviço, versões suportadas dos componentes e atualização de dependências.
- Desativar exibição de erros em produção e restringir acesso aos logs. Manter alertas e rotação de registros.
- Executar backups protegidos do banco e dos documentos, com retenção definida e teste de restauração.
- Confirmar que contas e dados de demonstração não se confundem com cadastros reais e revisar os acessos administrativos.
- Validar autorização entre ONGs em ambiente controlado, inclusive leitura de documentos e alteração de registros por identificador.

## 7. Segurança e privacidade do PDF acadêmico

Na inspeção do arquivo de entrega não foram identificados anexos embutidos, JavaScript ou ações de execução. Os links encontrados são referências bibliográficas. A inspeção estrutural é limitada e não equivale a uma varredura antimalware completa.

O documento contém nomes e RGMs dos integrantes. Recomenda-se restringir a versão identificada ao contexto acadêmico e preparar cópia sem RGMs para publicação aberta. A exposição do modelo de tabelas, isoladamente, não caracteriza vulnerabilidade e não substitui a análise das permissões da aplicação.

## Ordem sugerida de execução

1. Conferir a exposição de diretórios privados, o HTTPS e a configuração efetiva das sessões no servidor.
2. Tratar abuso do cadastro público e substituir a distribuição de senha inicial por ativação segura.
3. Aperfeiçoar a limitação de login e acrescentar cotas de upload.
4. Validar as mudanças em homologação, testar restauração de backup e planejar implantação com possibilidade de retorno à versão anterior.

O sistema já estar publicado exige avaliar compatibilidade e continuidade do serviço antes de alterar autenticação ou armazenamento. Nenhuma alteração de código, implantação, varredura remota ou correção de servidor foi executada como parte desta revisão documental.

## Referências de segurança

- PHP. [Securing Session INI Settings](https://www.php.net/manual/en/session.security.ini.php). Orientação sobre configuração de sessões e cookies.
- OWASP. [File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html). Controles complementares para envio e armazenamento de arquivos.
- OWASP. [Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html). Proteção contra requisições induzidas entre sites.

Fontes do projeto: `ong-connect/api/index.php`, `security.php`, `bootstrap.php` e `public-transfers.php`. A evidência é a cópia local revisada em 27/10/2026; correspondência com a implantação online não verificada.
